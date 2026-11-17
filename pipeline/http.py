"""HTTP building blocks: rate limiter, on-disk cache, redaction, Retry-After parsing."""

from __future__ import annotations

import hashlib
import json
import math
import os
import re
import threading
import time
import uuid
from collections import deque
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any, Callable

import requests

from pipeline.config import REDACTED

CACHE_MAX_AGE = timedelta(hours=24)

_API_KEY_URL = re.compile(r"(?i)(\bapi_key=)[^&#]*")
_API_KEY_TEXT = re.compile(r"(?i)(\bapi_key=)[^&#\s\"'<>)]+")


class RateLimiter:
    """Sliding window of the last floor(rate) send times (Requirements 4.3, 4.6).

    Guarantees t[i + k] - t[i] >= 1.0 with k = floor(rate), so no half-open
    1-second window holds more than k sends.
    """

    def __init__(
        self,
        rate: float,
        clock: Callable[[], float] = time.monotonic,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        if isinstance(rate, bool) or not isinstance(rate, (int, float)) or not math.isfinite(rate) or rate <= 0:
            raise ValueError(f"invalid rate: {rate!r}")
        self.rate = rate
        self.slots = max(1, math.floor(rate))
        self._clock = clock
        self._sleep = sleep
        self._sent: deque[float] = deque(maxlen=self.slots)
        self._lock = threading.Lock()

    def acquire(self) -> None:
        with self._lock:
            now = self._clock()
            if len(self._sent) == self.slots:
                earliest = self._sent[0] + 1.0
                if now < earliest:
                    self._sleep(earliest - now)
                    now = max(self._clock(), earliest)
            self._sent.append(now)


@dataclass(frozen=True)
class CacheHit:
    body: bytes
    fetched_at: datetime


class Cache:
    """Raw-response cache: ``http/{key}.body`` and ``http/{key}.meta.json``."""

    def __init__(self, root: Path, clock: Callable[[], datetime] = lambda: datetime.now(UTC)) -> None:
        self.root = Path(root)
        self._clock = clock

    @property
    def _dir(self) -> Path:
        return self.root / "http"

    def key(self, redacted_url: str) -> str:
        return hashlib.sha256(redacted_url.encode("utf-8")).hexdigest()

    def _paths(self, redacted_url: str) -> tuple[Path, Path]:
        k = self.key(redacted_url)
        return self._dir / f"{k}.body", self._dir / f"{k}.meta.json"

    def get(self, redacted_url: str, *, json_body: bool) -> CacheHit | None:
        body_path, meta_path = self._paths(redacted_url)
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            body = body_path.read_bytes()
        except (OSError, ValueError):
            return None
        if not isinstance(meta, dict):
            return None
        raw_ts = meta.get("fetched_at")
        if not isinstance(raw_ts, str) or not raw_ts:
            return None
        try:
            fetched_at = datetime.fromisoformat(raw_ts.replace("Z", "+00:00"))
        except ValueError:
            return None
        if fetched_at.tzinfo is None:
            fetched_at = fetched_at.replace(tzinfo=UTC)
        if self._clock() - fetched_at >= CACHE_MAX_AGE:
            return None
        if json_body:
            try:
                json.loads(body)
            except ValueError:
                return None
        return CacheHit(body=body, fetched_at=fetched_at)

    def put(self, redacted_url: str, body: bytes, fetched_at: datetime) -> None:
        body_path, meta_path = self._paths(redacted_url)
        if fetched_at.tzinfo is None:
            fetched_at = fetched_at.replace(tzinfo=UTC)
        stamp = fetched_at.astimezone(UTC).isoformat().replace("+00:00", "Z")
        meta = json.dumps({"url": redacted_url, "fetched_at": stamp}, ensure_ascii=False)
        self._dir.mkdir(parents=True, exist_ok=True)
        # Body first, meta last: an entry without fresh meta is never served.
        _atomic_write(body_path, body)
        _atomic_write(meta_path, meta.encode("utf-8"))


def _atomic_write(path: Path, data: bytes) -> None:
    tmp = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    try:
        with open(tmp, "wb") as fh:
            fh.write(data)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp, path)
    except BaseException:
        try:
            tmp.unlink()
        except OSError:
            pass
        raise


def redact(text: str, secrets: list[str]) -> str:
    """Remove every secret value and any ``api_key=...`` value from ``text``."""
    for secret in sorted({s for s in secrets if s}, key=len, reverse=True):
        text = text.replace(secret, REDACTED)
    return _API_KEY_TEXT.sub(lambda m: m.group(1) + REDACTED, text)


def redact_url(url: str) -> str:
    """Replace the ``api_key`` query value with ``[REDACTED]``."""
    return _API_KEY_URL.sub(lambda m: m.group(1) + REDACTED, url)


def parse_retry_after(value: str | None, now: datetime) -> float | None:
    """Seconds to wait from a Retry-After header (delta-seconds or HTTP-date)."""
    if value is None:
        return None
    value = value.strip()
    if not value:
        return None
    if re.fullmatch(r"\d+(\.\d+)?", value):
        return float(value)
    try:
        when = parsedate_to_datetime(value)
    except (TypeError, ValueError, IndexError):
        return None
    if when is None:
        return None
    if when.tzinfo is None:
        when = when.replace(tzinfo=UTC)
    if now.tzinfo is None:
        now = now.replace(tzinfo=UTC)
    return max(0.0, (when - now).total_seconds())


# --- clients ------------------------------------------------------------------

BACKOFF_SECONDS: tuple[float, ...] = (1.0, 2.0, 4.0, 8.0)
REQUEST_TIMEOUT = 30.0

SEC_COMPANY_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"
SEC_SUBMISSIONS_URL = "https://data.sec.gov/submissions/CIK{cik}.json"
SEC_SUBMISSIONS_PAGE_URL = "https://data.sec.gov/submissions/{name}"
SEC_COMPANYFACTS_URL = "https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"
FRED_CSV_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10"
FRED_API_URL = (
    "https://api.stlouisfed.org/fred/series/observations"
    "?series_id=DGS10&file_type=json&sort_order=desc&limit=30&api_key={key}"
)


@dataclass(frozen=True)
class FetchResult:
    ok: bool
    status: int | None
    body: bytes | None
    from_cache: bool
    error: str | None  # redacted


@dataclass
class RequestStats:
    """Counters only. Never stores headers, the User-Agent or the contact email."""

    sent: int = 0
    cache_hits: int = 0
    retried: int = 0


class HttpClient:
    """Shared cache + retry logic (Requirements 4.3, 4.7-4.9, 5.2-5.5, 5.7, 19.5)."""

    def __init__(
        self,
        cache: Cache,
        limiter: RateLimiter | None,
        session: Any,
        secrets: list[str],
        stats: RequestStats,
        sleep: Callable[[float], None] = time.sleep,
        max_attempts: int = 5,
        clock: Callable[[], datetime] = lambda: datetime.now(UTC),
        timeout: float = REQUEST_TIMEOUT,
    ) -> None:
        if isinstance(max_attempts, bool) or not isinstance(max_attempts, int) or max_attempts < 1:
            raise ValueError(f"invalid max_attempts: {max_attempts!r}")
        self.cache = cache
        self.limiter = limiter
        self.session = session
        self.secrets = [s for s in secrets if s]
        self.stats = stats
        self._sleep = sleep
        self.max_attempts = max_attempts
        self._clock = clock
        self.timeout = timeout

    def _redact(self, text: str) -> str:
        return redact(text, self.secrets)

    def _fail(self, status: int | None, message: str) -> FetchResult:
        return FetchResult(ok=False, status=status, body=None, from_cache=False, error=self._redact(message))

    def _backoff(self, attempt: int, retry_after: float | None) -> float:
        """Wait before attempt ``attempt + 1`` (``attempt`` is 1-based)."""
        delay = BACKOFF_SECONDS[min(attempt - 1, len(BACKOFF_SECONDS) - 1)]
        return max(delay, retry_after) if retry_after is not None else delay

    def get(
        self,
        url: str,
        *,
        json_body: bool,
        headers: dict[str, str],
        no_retry_statuses: frozenset[int] = frozenset(),
    ) -> FetchResult:
        cache_key_url = redact_url(url)
        hit = self.cache.get(cache_key_url, json_body=json_body)
        if hit is not None:
            self.stats.cache_hits += 1
            return FetchResult(ok=True, status=None, body=hit.body, from_cache=True, error=None)

        last_status: int | None = None
        last_error = "request failed"
        for attempt in range(1, self.max_attempts + 1):
            if self.limiter is not None:
                self.limiter.acquire()
            self.stats.sent += 1
            retry_after: float | None = None
            try:
                resp = self.session.get(url, headers=dict(headers), timeout=self.timeout)
                status = int(resp.status_code)
            except (requests.ConnectionError, requests.Timeout) as exc:
                last_status = None
                last_error = f"{type(exc).__name__}: {exc}"
            except requests.RequestException as exc:
                return self._fail(None, f"{type(exc).__name__}: {exc}")
            else:
                last_status = status
                if 200 <= status < 300:
                    try:
                        body = resp.content
                        if not isinstance(body, (bytes, bytearray)):
                            raise ValueError("response body is not bytes")
                        body = bytes(body)
                        if json_body:
                            json.loads(body)
                    except (requests.RequestException, ValueError) as exc:
                        return self._fail(status, f"HTTP {status}: unreadable body ({type(exc).__name__}: {exc})")
                    self.cache.put(cache_key_url, body, self._clock())
                    return FetchResult(ok=True, status=status, body=body, from_cache=False, error=None)
                retryable = (status == 429 or 500 <= status < 600) and status not in no_retry_statuses
                if not retryable:
                    return self._fail(status, f"HTTP {status}")
                last_error = f"HTTP {status}"
                headers_in = getattr(resp, "headers", None) or {}
                retry_after = parse_retry_after(headers_in.get("Retry-After"), self._clock())
            if attempt < self.max_attempts:
                self.stats.retried += 1
                self._sleep(self._backoff(attempt, retry_after))
        return self._fail(last_status, f"{last_error} after {self.max_attempts} attempts")


class SecClient(HttpClient):
    """SEC access with the ``ZombieFirmRadar <email>`` User-Agent and the shared limiter."""

    def __init__(
        self,
        cache: Cache,
        limiter: RateLimiter,
        session: Any,
        email: str,
        stats: RequestStats,
        secrets: list[str] | None = None,
        sleep: Callable[[float], None] = time.sleep,
        max_attempts: int = 5,
        clock: Callable[[], datetime] = lambda: datetime.now(UTC),
        timeout: float = REQUEST_TIMEOUT,
    ) -> None:
        email = email.strip()
        if not email:
            raise ValueError("contact email is empty")
        super().__init__(
            cache, limiter, session, [email, *(secrets or [])], stats, sleep, max_attempts, clock, timeout
        )
        self._user_agent = f"ZombieFirmRadar {email}"

    def _sec_get(self, url: str, *, no_retry_statuses: frozenset[int] = frozenset()) -> FetchResult:
        return self.get(
            url,
            json_body=True,
            headers={"User-Agent": self._user_agent},
            no_retry_statuses=no_retry_statuses,
        )

    def get_json(self, url: str) -> FetchResult:
        return self._sec_get(url)

    def company_tickers(self) -> FetchResult:
        return self._sec_get(SEC_COMPANY_TICKERS_URL)

    def submissions(self, cik: str) -> FetchResult:
        return self._sec_get(SEC_SUBMISSIONS_URL.format(cik=cik))

    def submissions_page(self, name: str) -> FetchResult:
        return self._sec_get(SEC_SUBMISSIONS_PAGE_URL.format(name=name))

    def companyfacts(self, cik: str) -> FetchResult:
        # 404 is never retried and comes back as FetchResult(status=404): "no annual facts" (4.11).
        return self._sec_get(SEC_COMPANYFACTS_URL.format(cik=cik), no_retry_statuses=frozenset({404}))


class FredClient(HttpClient):
    """FRED DGS10 (no SEC limiter). Cache keyed by ``redact_url(url)`` (19.4)."""

    def __init__(
        self,
        cache: Cache,
        session: Any,
        api_key: str | None,
        stats: RequestStats,
        secrets: list[str] | None = None,
        sleep: Callable[[float], None] = time.sleep,
        max_attempts: int = 5,
        clock: Callable[[], datetime] = lambda: datetime.now(UTC),
        timeout: float = REQUEST_TIMEOUT,
    ) -> None:
        key = api_key.strip() if api_key and api_key.strip() else None
        super().__init__(
            cache, None, session, [*([key] if key else []), *(secrets or [])], stats, sleep, max_attempts, clock, timeout
        )
        self._api_key = key

    def dgs10(self) -> FetchResult:
        if self._api_key is None:
            return self.get(FRED_CSV_URL, json_body=False, headers={})
        return self.get(FRED_API_URL.format(key=self._api_key), json_body=True, headers={})
