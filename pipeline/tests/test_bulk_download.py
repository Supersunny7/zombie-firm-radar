"""Bulk download rules (Requirements 20.4, 21.1 to 21.8, 28.8)."""
from __future__ import annotations

import hashlib
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from hypothesis import given
from hypothesis import strategies as st

from pipeline.bulk import download as dl
from pipeline.bulk.download import (
    COMPANYFACTS_URL,
    SUBMISSIONS_URL,
    BulkRecord,
    fetch_bulk,
    is_fresh,
    read_record,
    stream_to_part,
    zip_path,
)
from pipeline.config import BulkDownloadError, MissingBulkFileError
from pipeline.http import RateLimiter, RequestStats
from pipeline.tests.builders import make_zip
from pipeline.tests.conftest import StreamResponse, StreamSession

EMAIL = "frank@example.invalid"
NOW = datetime(2026, 11, 20, 12, 0, tzinfo=UTC)
ZIP_BYTES = make_zip({"CIK0000000001.json": {"a": 1}, "CIK0000000002.json": {"b": 2}})


class Clock:
    def __init__(self) -> None:
        self.t = 0.0
        self.sleeps: list[float] = []

    def now(self) -> float:
        return self.t

    def sleep(self, s: float) -> None:
        self.sleeps.append(s)
        self.t += s


def _fetch(tmp_path: Path, session: StreamSession, url: str = COMPANYFACTS_URL, *, use_cached: bool = False,
           now: datetime = NOW, clock: Clock | None = None):
    clock = clock or Clock()
    stats = RequestStats()
    result = fetch_bulk(
        url=url, cache_dir=tmp_path, session=session,
        limiter=RateLimiter(5.0, clock=clock.now, sleep=clock.sleep),
        email=EMAIL, stats=stats, use_cached=use_cached, now=now, sleep=clock.sleep,
    )
    return result, stats, clock


def _ok(body: bytes = ZIP_BYTES, **headers: str) -> StreamResponse:
    return StreamResponse(200, {"Content-Length": str(len(body)), **headers}, body)


def test_cold_download_writes_zip_record_and_hash(tmp_path: Path) -> None:
    stamped = _ok(**{"Last-Modified": "Sun, 15 Nov 2026 08:00:00 GMT"})
    session = StreamSession({COMPANYFACTS_URL: [stamped]})
    result, stats, _ = _fetch(tmp_path, session)
    assert result.from_cache is False
    assert result.path == tmp_path / "companyfacts.zip"
    assert result.path.read_bytes() == ZIP_BYTES
    assert result.record.size_bytes == len(ZIP_BYTES)
    assert result.record.sha256 == hashlib.sha256(ZIP_BYTES).hexdigest()
    assert result.record.last_modified == "Sun, 15 Nov 2026 08:00:00 GMT"
    assert result.record.downloaded_at == NOW.isoformat()
    assert read_record(result.path) == result.record
    assert len(session.requests) == 1 and stats.sent == 1  # exactly one request per zip
    assert session.requests[0]["stream"] is True
    assert session.requests[0]["headers"]["User-Agent"] == f"ZombieFirmRadar {EMAIL}"
    assert not (tmp_path / "companyfacts.zip.part").exists()


def test_missing_last_modified_is_recorded_as_null(tmp_path: Path) -> None:
    result, _, _ = _fetch(tmp_path, StreamSession({SUBMISSIONS_URL: [_ok()]}), SUBMISSIONS_URL)
    assert result.record.last_modified is None


def test_fresh_record_means_zero_requests(tmp_path: Path) -> None:
    first, _, _ = _fetch(tmp_path, StreamSession({COMPANYFACTS_URL: [_ok()]}))
    session = StreamSession()  # any request raises AssertionError
    again, stats, _ = _fetch(tmp_path, session, now=NOW + timedelta(hours=23, minutes=59))
    assert again.from_cache is True and again.record == first.record
    assert session.requests == [] and stats.sent == 0


def test_stale_record_refetches(tmp_path: Path) -> None:
    _fetch(tmp_path, StreamSession({COMPANYFACTS_URL: [_ok()]}))
    new_zip = make_zip({"CIK0000000009.json": {"c": 3}})
    session = StreamSession({COMPANYFACTS_URL: [_ok(new_zip)]})
    result, _, _ = _fetch(tmp_path, session, now=NOW + timedelta(hours=24))
    assert result.from_cache is False and len(session.requests) == 1
    assert result.path.read_bytes() == new_zip


def test_stale_zip_with_failed_refetch_raises_and_keeps_the_old_zip(tmp_path: Path) -> None:
    first, _, _ = _fetch(tmp_path, StreamSession({COMPANYFACTS_URL: [_ok()]}))
    session = StreamSession({COMPANYFACTS_URL: [StreamResponse(403, {}, b"")]})
    with pytest.raises(BulkDownloadError, match="HTTP 403"):
        _fetch(tmp_path, session, now=NOW + timedelta(days=2))
    assert first.path.read_bytes() == ZIP_BYTES  # unchanged, but never returned as fresh
    assert read_record(first.path) == first.record


def test_use_cached_ignores_age(tmp_path: Path) -> None:
    first, _, _ = _fetch(tmp_path, StreamSession({COMPANYFACTS_URL: [_ok()]}))
    session = StreamSession()
    again, _, _ = _fetch(tmp_path, session, use_cached=True, now=NOW + timedelta(days=30))
    assert again.from_cache is True and again.record.sha256 == first.record.sha256
    assert session.requests == []


def test_use_cached_without_a_zip_names_the_missing_file(tmp_path: Path) -> None:
    with pytest.raises(MissingBulkFileError, match="companyfacts.zip"):
        _fetch(tmp_path, StreamSession(), use_cached=True)


def test_size_mismatch_deletes_part_and_keeps_the_older_zip(tmp_path: Path) -> None:
    first, _, _ = _fetch(tmp_path, StreamSession({COMPANYFACTS_URL: [_ok()]}))
    bigger = make_zip({"CIK0000000003.json": {"d": 4}})
    bad = StreamResponse(200, {"Content-Length": str(len(bigger) + 10)}, bigger)
    with pytest.raises(BulkDownloadError) as err:
        _fetch(tmp_path, StreamSession({COMPANYFACTS_URL: [bad]}), now=NOW + timedelta(days=2))
    assert f"expected {len(bigger) + 10} bytes, got {len(bigger)}" in str(err.value)
    assert not (tmp_path / "companyfacts.zip.part").exists()
    assert first.path.read_bytes() == ZIP_BYTES and read_record(first.path) == first.record


def test_stream_cut_short_fails_the_same_way(tmp_path: Path) -> None:
    cut = StreamResponse(200, {"Content-Length": str(len(ZIP_BYTES))}, ZIP_BYTES, cut_after=len(ZIP_BYTES) // 2)
    with pytest.raises(BulkDownloadError, match="incomplete"):
        _fetch(tmp_path, StreamSession({COMPANYFACTS_URL: [cut]}))
    assert not (tmp_path / "companyfacts.zip.part").exists()
    assert not (tmp_path / "companyfacts.zip").exists()


def test_body_that_is_not_a_zip_fails(tmp_path: Path) -> None:
    junk = StreamResponse(200, {"Content-Length": "9"}, b"not a zip")
    with pytest.raises(BulkDownloadError, match="not a readable zip"):
        _fetch(tmp_path, StreamSession({COMPANYFACTS_URL: [junk]}))
    assert not list(tmp_path.glob("*.part"))


def test_content_encoding_skips_the_length_check(tmp_path: Path) -> None:
    resp = StreamResponse(200, {"Content-Length": "5", "Content-Encoding": "gzip"}, ZIP_BYTES)
    result, _, _ = _fetch(tmp_path, StreamSession({COMPANYFACTS_URL: [resp]}))
    assert result.record.size_bytes == len(ZIP_BYTES)


def test_record_with_a_size_that_differs_from_the_file_is_ignored(tmp_path: Path) -> None:
    first, _, _ = _fetch(tmp_path, StreamSession({COMPANYFACTS_URL: [_ok()]}))
    first.path.write_bytes(ZIP_BYTES + b"x")
    assert read_record(first.path) is None
    session = StreamSession({COMPANYFACTS_URL: [_ok()]})
    _fetch(tmp_path, session)  # not fresh any more, so it is downloaded again
    assert len(session.requests) == 1


def test_429_on_connect_retries_with_backoff_then_succeeds(tmp_path: Path) -> None:
    session = StreamSession({COMPANYFACTS_URL: [StreamResponse(429, {}, b""), StreamResponse(503, {}, b""), _ok()]})
    result, stats, clock = _fetch(tmp_path, session)
    assert result.from_cache is False
    assert clock.sleeps == [1.0, 2.0]
    assert stats.sent == 3 and stats.retried == 2


def test_retry_after_larger_than_backoff_wins(tmp_path: Path) -> None:
    session = StreamSession({COMPANYFACTS_URL: [StreamResponse(429, {"Retry-After": "30"}, b""), _ok()]})
    _, _, clock = _fetch(tmp_path, session)
    assert clock.sleeps == [30.0]


def test_five_failed_attempts_raise(tmp_path: Path) -> None:
    session = StreamSession({COMPANYFACTS_URL: [StreamResponse(503, {}, b"")]})
    with pytest.raises(BulkDownloadError, match="after 5 attempts"):
        _fetch(tmp_path, session)
    assert len(session.requests) == 5


def test_the_contact_email_never_appears_in_an_error(tmp_path: Path) -> None:
    class Boom:
        def get(self, *a, **k):
            import requests
            raise requests.RequestException(f"failed for {EMAIL}")

    with pytest.raises(BulkDownloadError) as err:
        fetch_bulk(url=COMPANYFACTS_URL, cache_dir=tmp_path, session=Boom(),
                   limiter=RateLimiter(5.0), email=EMAIL, stats=RequestStats(), now=NOW)
    assert EMAIL not in str(err.value) and "[REDACTED]" in str(err.value)


def test_is_fresh_boundaries() -> None:
    rec = BulkRecord("u", NOW.isoformat(), 1, "h", None)
    assert is_fresh(rec, NOW + timedelta(hours=23, minutes=59, seconds=59))
    assert not is_fresh(rec, NOW + timedelta(hours=24))
    assert not is_fresh(rec, NOW - timedelta(seconds=1))  # a time in the future is not fresh


def test_the_two_zips_get_their_own_names_and_records(tmp_path: Path) -> None:
    a, _, _ = _fetch(tmp_path, StreamSession({COMPANYFACTS_URL: [_ok()]}))
    b, _, _ = _fetch(tmp_path, StreamSession({SUBMISSIONS_URL: [_ok()]}), SUBMISSIONS_URL)
    assert zip_path(tmp_path, SUBMISSIONS_URL).name == "submissions.zip"
    assert a.path.name == "companyfacts.zip" and b.path.name == "submissions.zip"
    assert (tmp_path / "companyfacts.zip.json").is_file() and (tmp_path / "submissions.zip.json").is_file()


# Feature: data-pipeline, Property 36: Streaming digest does not depend on chunking
# Validates: Requirements 21.2, 21.4
@given(data=st.binary(max_size=3000), chunk=st.integers(min_value=1, max_value=700))
def test_streaming_digest_does_not_depend_on_chunking(data: bytes, chunk: int, tmp_path_factory) -> None:
    part = tmp_path_factory.mktemp("p36") / "x.zip.part"

    class Resp:
        def iter_content(self, chunk_size: int = 1):
            for i in range(0, len(data), chunk_size):
                yield data[i : i + chunk_size]

    written, digest = stream_to_part(Resp(), part, chunk)
    assert written == len(data)
    assert digest == hashlib.sha256(data).hexdigest()
    assert part.read_bytes() == data
