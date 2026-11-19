"""Streaming download of the two SEC bulk archives (Requirements 20.4, 21.1 to 21.8).

A cached zip younger than 24 hours is not downloaded again. A download goes to a
``.part`` file, is checked (size, zip central directory), hashed, renamed, and described
by a small JSON record next to the zip. A failed check deletes the ``.part`` file and
leaves any older zip and record untouched. There is no resume.
"""
from __future__ import annotations

import hashlib
import json
import os
import time
import uuid
import zipfile
from dataclasses import asdict, dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any, Callable

import requests

from pipeline.config import BulkDownloadError, MissingBulkFileError
from pipeline.http import BACKOFF_SECONDS, RateLimiter, RequestStats, parse_retry_after, redact

COMPANYFACTS_URL = "https://www.sec.gov/Archives/edgar/daily-index/xbrl/companyfacts.zip"
SUBMISSIONS_URL = "https://www.sec.gov/Archives/edgar/daily-index/bulkdata/submissions.zip"
CHUNK_BYTES = 1 << 20
MAX_AGE = timedelta(hours=24)
MAX_ATTEMPTS = 5
CONNECT_TIMEOUT = 10.0
READ_TIMEOUT = 120.0


@dataclass(frozen=True)
class BulkRecord:
    """Written as ``<zip>.json`` next to the zip (21.6)."""

    url: str
    downloaded_at: str  # ISO 8601 UTC
    size_bytes: int
    sha256: str
    last_modified: str | None


@dataclass(frozen=True)
class BulkFile:
    name: str
    path: Path
    record: BulkRecord
    from_cache: bool


def zip_path(cache_dir: Path, url: str) -> Path:
    return cache_dir / url.rsplit("/", 1)[-1]


def record_path(path: Path) -> Path:
    return path.with_name(path.name + ".json")


def read_record(path: Path) -> BulkRecord | None:
    """The record of ``path``, or None when it or the zip is missing, unreadable, or the
    recorded size differs from the file on disk."""
    try:
        raw = json.loads(record_path(path).read_text(encoding="utf-8"))
        rec = BulkRecord(
            url=str(raw["url"]),
            downloaded_at=str(raw["downloaded_at"]),
            size_bytes=int(raw["size_bytes"]),
            sha256=str(raw["sha256"]),
            last_modified=None if raw.get("last_modified") is None else str(raw["last_modified"]),
        )
        if path.stat().st_size != rec.size_bytes:
            return None
        _parse_time(rec.downloaded_at)
    except (OSError, ValueError, KeyError, TypeError):
        return None
    return rec


def _parse_time(text: str) -> datetime:
    when = datetime.fromisoformat(text.replace("Z", "+00:00"))
    return when if when.tzinfo else when.replace(tzinfo=UTC)


def is_fresh(record: BulkRecord, now: datetime) -> bool:
    """True when the record is less than 24 hours old (21.5). A time in the future is not fresh."""
    try:
        age = now - _parse_time(record.downloaded_at)
    except ValueError:
        return False
    return timedelta(0) <= age < MAX_AGE


def write_record(path: Path, record: BulkRecord) -> None:
    target = record_path(path)
    tmp = target.with_name(f".{target.name}.{uuid.uuid4().hex}.tmp")
    try:
        tmp.write_text(json.dumps(asdict(record), indent=2) + "\n", encoding="utf-8")
        os.replace(tmp, target)
    except BaseException:
        tmp.unlink(missing_ok=True)
        raise


def sha256_of(path: Path, chunk: int = CHUNK_BYTES) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        while block := fh.read(chunk):
            h.update(block)
    return h.hexdigest()


def stream_to_part(resp: Any, part: Path, chunk: int = CHUNK_BYTES) -> tuple[int, str]:
    """Write the response body to ``part`` in chunks. Returns (bytes written, SHA-256 hex).
    The hash is computed while writing, so the archive is never held in memory (21.2)."""
    h = hashlib.sha256()
    written = 0
    part.parent.mkdir(parents=True, exist_ok=True)
    with open(part, "wb") as fh:
        for block in resp.iter_content(chunk_size=chunk):
            if not block:
                continue
            fh.write(block)
            h.update(block)
            written += len(block)
    return written, h.hexdigest()


def check_download(part: Path, written: int, expected: int | None) -> None:
    """Raise BulkDownloadError unless the byte count matches ``expected`` (when known) and the
    file opens as a zip archive with at least one member (21.3)."""
    if expected is not None and written != expected:
        raise BulkDownloadError(
            f"download of {part.name.removesuffix('.part')} is incomplete: expected {expected} bytes, got {written}",
            "21.3",
        )
    try:
        with zipfile.ZipFile(part) as zf:
            if not zf.namelist():
                raise BulkDownloadError(f"{part.name.removesuffix('.part')} is a zip with no members", "21.3")
    except zipfile.BadZipFile as exc:
        raise BulkDownloadError(
            f"{part.name.removesuffix('.part')} is not a readable zip archive ({exc}); expected size "
            f"{expected if expected is not None else 'unknown'}, got {written}",
            "21.3",
        ) from exc


def _expected_length(headers: Any) -> int | None:
    """Content-Length, only when the response was not content-encoded (the bytes we count are
    decoded bytes, so a compressed transfer would give a false mismatch)."""
    get = getattr(headers, "get", None)
    if get is None or get("Content-Encoding"):
        return None
    try:
        value = int(str(get("Content-Length")).strip())
    except (TypeError, ValueError):
        return None
    return value if value >= 0 else None


def _fail(message: str, secrets: list[str]) -> BulkDownloadError:
    return BulkDownloadError(redact(message, secrets), "21.3")


def _cached_file(path: Path, record: BulkRecord | None) -> BulkFile:
    rec = record or BulkRecord(
        url="",
        downloaded_at=datetime.fromtimestamp(path.stat().st_mtime, UTC).isoformat(),
        size_bytes=path.stat().st_size,
        sha256=sha256_of(path),
        last_modified=None,
    )
    return BulkFile(name=path.name, path=path, record=rec, from_cache=True)


def fetch_bulk(
    *,
    url: str,
    cache_dir: Path,
    session: Any,
    limiter: RateLimiter,
    email: str,
    stats: RequestStats,
    use_cached: bool = False,
    now: datetime | None = None,
    sleep: Callable[[float], None] = time.sleep,
) -> BulkFile:
    """Return the bulk zip at ``url``, downloading it only when needed (21.1 to 21.8)."""
    now = now or datetime.now(UTC)
    path = zip_path(cache_dir, url)
    record = read_record(path) if path.is_file() else None
    secrets = [email]

    if path.is_file() and (use_cached or (record is not None and is_fresh(record, now))):
        return _cached_file(path, record)
    if use_cached:
        raise MissingBulkFileError(f"{path.name} is not cached under {cache_dir}; run download first", "20.4")

    cache_dir.mkdir(parents=True, exist_ok=True)
    part = path.with_name(path.name + ".part")
    headers = {"User-Agent": f"ZombieFirmRadar {email.strip()}"}
    last_error = "request failed"
    resp: Any = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        limiter.acquire()
        stats.sent += 1
        retry_after: float | None = None
        try:
            resp = session.get(url, headers=dict(headers), timeout=(CONNECT_TIMEOUT, READ_TIMEOUT), stream=True)
            status = int(resp.status_code)
        except (requests.ConnectionError, requests.Timeout) as exc:
            last_error = f"{type(exc).__name__}: {exc}"
        except requests.RequestException as exc:
            raise _fail(f"{path.name}: {type(exc).__name__}: {exc}", secrets) from exc
        else:
            if 200 <= status < 300:
                break
            last_error = f"HTTP {status}"
            retryable = status == 429 or 500 <= status < 600
            retry_after = parse_retry_after((getattr(resp, "headers", None) or {}).get("Retry-After"), now)
            _close(resp)
            resp = None
            if not retryable:
                raise _fail(f"{path.name}: HTTP {status}", secrets)
        if attempt < MAX_ATTEMPTS:
            stats.retried += 1
            delay = BACKOFF_SECONDS[min(attempt - 1, len(BACKOFF_SECONDS) - 1)]
            sleep(max(delay, retry_after) if retry_after is not None else delay)
    if resp is None:
        raise _fail(f"{path.name}: {last_error} after {MAX_ATTEMPTS} attempts", secrets)

    try:
        written, digest = stream_to_part(resp, part)
        check_download(part, written, _expected_length(resp.headers))
    except BulkDownloadError:
        part.unlink(missing_ok=True)
        raise
    except (requests.RequestException, OSError) as exc:
        part.unlink(missing_ok=True)
        raise _fail(f"{path.name}: stream failed: {type(exc).__name__}: {exc}", secrets) from exc
    finally:
        _close(resp)

    last_modified = (getattr(resp, "headers", None) or {}).get("Last-Modified")
    new_record = BulkRecord(
        url=url,
        downloaded_at=now.astimezone(UTC).isoformat(),
        size_bytes=written,
        sha256=digest,
        last_modified=last_modified or None,
    )
    os.replace(part, path)
    write_record(path, new_record)
    return BulkFile(name=path.name, path=path, record=new_record, from_cache=False)


def _close(resp: Any) -> None:
    close = getattr(resp, "close", None)
    if callable(close):
        close()
