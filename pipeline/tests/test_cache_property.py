"""Property tests for the raw-response cache.

Feature: data-pipeline, Property 15: Cache round trip

**Validates: Requirements 5.1, 5.2, 5.3, 19.4**
"""

from __future__ import annotations

import hashlib
import uuid
from datetime import UTC, datetime, timedelta

from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from pipeline.config import Config
from pipeline.http import (
    CACHE_MAX_AGE,
    FRED_API_URL,
    Cache,
    FredClient,
    HttpClient,
    RequestStats,
    redact_url,
)
from pipeline.tests.conftest import FakeSession

T0 = datetime(2025, 6, 15, 12, 0, 0, tzinfo=UTC)

_NO_FIXTURE_CHECK = settings(suppress_health_check=[HealthCheck.function_scoped_fixture])

paths = st.text(alphabet="abcdefghijklmnopqrstuvwxyz0123456789", min_size=1, max_size=20)
bodies = st.binary(min_size=0, max_size=200)
fresh_ages = st.timedeltas(min_value=timedelta(0), max_value=CACHE_MAX_AGE - timedelta(microseconds=1))
stale_ages = st.timedeltas(min_value=CACHE_MAX_AGE, max_value=timedelta(days=30))
api_keys = st.text(alphabet="abcdefghijklmnopqrstuvwxyz0123456789", min_size=8, max_size=32)


class Clock:
    def __init__(self, now: datetime) -> None:
        self.now = now

    def __call__(self) -> datetime:
        return self.now


class CountingLimiter:
    def __init__(self) -> None:
        self.acquired = 0

    def acquire(self) -> None:
        self.acquired += 1


def _client(cfg: Config, session: FakeSession, clock: Clock, limiter: CountingLimiter | None = None):
    root = cfg.cache_dir / uuid.uuid4().hex
    cache = Cache(root, clock=clock)
    client = HttpClient(
        cache, limiter, session, [], RequestStats(), sleep=lambda _s: None, max_attempts=1, clock=clock
    )
    return client, cache, root


@_NO_FIXTURE_CHECK
@given(path=paths, body=bodies, age=fresh_ages)
def test_fresh_entry_served_byte_for_byte_without_network(tmp_config, path, body, age):
    """Feature: data-pipeline, Property 15: Cache round trip (fresh entry, no request, no slot)."""
    url = f"https://example.invalid/{path}"
    clock = Clock(T0)
    session = FakeSession({url: body}, urls_json=None)
    limiter = CountingLimiter()
    client, _cache, _root = _client(tmp_config, session, clock, limiter)

    first = client.get(url, json_body=False, headers={})
    assert first.ok and first.body == body and not first.from_cache
    sent, slots = len(session.requests), limiter.acquired

    clock.now = T0 + age
    second = client.get(url, json_body=False, headers={})
    assert second.ok and second.from_cache
    assert second.body == body
    assert len(session.requests) == sent
    assert limiter.acquired == slots


@_NO_FIXTURE_CHECK
@given(path=paths, old=bodies, new=bodies, age=stale_ages)
def test_stale_entry_refetched_and_replaced(tmp_config, path, old, new, age):
    """Feature: data-pipeline, Property 15: Cache round trip (>= 24 h old triggers refetch)."""
    url = f"https://example.invalid/{path}"
    clock = Clock(T0)
    session = FakeSession({url: old}, urls_json=None)
    client, cache, _root = _client(tmp_config, session, clock)
    assert client.get(url, json_body=False, headers={}).body == old

    clock.now = T0 + age
    session.set_body(url, new)
    result = client.get(url, json_body=False, headers={})
    assert result.ok and not result.from_cache and result.body == new
    assert len(session.requests) == 2

    hit = cache.get(url, json_body=False)
    assert hit is not None and hit.body == new and hit.fetched_at == T0 + age


@_NO_FIXTURE_CHECK
@given(path=paths, old=bodies, age=stale_ages, status=st.sampled_from([404, 500, 503]))
def test_failed_refetch_keeps_old_body_and_timestamp(tmp_config, path, old, age, status):
    """Feature: data-pipeline, Property 15: Cache round trip (replace only after refetch succeeds)."""
    url = f"https://example.invalid/{path}"
    clock = Clock(T0)
    session = FakeSession({url: old}, urls_json=None)
    client, cache, root = _client(tmp_config, session, clock)
    client.get(url, json_body=False, headers={})
    body_path, meta_path = cache._paths(url)
    meta_before = meta_path.read_bytes()

    clock.now = T0 + age
    session.override(url, status=status, body=b"error page")
    result = client.get(url, json_body=False, headers={})
    assert not result.ok
    assert body_path.read_bytes() == old
    assert meta_path.read_bytes() == meta_before


@_NO_FIXTURE_CHECK
@given(key_a=api_keys, key_b=api_keys, age=fresh_ages)
def test_key_is_sha256_of_redacted_url_and_api_key_never_stored(tmp_config, key_a, key_b, age):
    """Feature: data-pipeline, Property 15: Cache round trip (redacted key, api_key never on disk)."""
    body = b'{"observations": []}'
    url_a = FRED_API_URL.format(key=key_a)
    url_b = FRED_API_URL.format(key=key_b)
    clock = Clock(T0)
    root = tmp_config.cache_dir / uuid.uuid4().hex
    cache = Cache(root, clock=clock)

    session_a = FakeSession({url_a: body}, urls_json=None)
    fred_a = FredClient(cache, session_a, key_a, RequestStats(), sleep=lambda _s: None, max_attempts=1, clock=clock)
    assert fred_a.dgs10().ok

    # Same redacted URL -> same sha256 key, whatever the api_key value.
    redacted = redact_url(url_a)
    assert redacted == redact_url(url_b)
    expected = hashlib.sha256(redacted.encode("utf-8")).hexdigest()
    assert cache.key(redacted) == expected
    files = sorted(p for p in (root / "http").iterdir())
    assert [p.name for p in files] == [f"{expected}.body", f"{expected}.meta.json"]

    # A client with another key gets the cached entry: no request is sent.
    clock.now = T0 + age
    session_b = FakeSession({}, urls_json=None)
    fred_b = FredClient(cache, session_b, key_b, RequestStats(), sleep=lambda _s: None, max_attempts=1, clock=clock)
    res = fred_b.dgs10()
    assert res.ok and res.from_cache and res.body == body
    assert session_b.requests == []

    # The api_key never appears in file names or contents.
    for secret in (key_a, key_b):
        for p in files:
            assert secret not in p.name
            assert secret.encode() not in p.read_bytes()
