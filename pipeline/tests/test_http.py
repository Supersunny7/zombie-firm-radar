"""Example tests for the HTTP layer (Requirements 4.1, 4.3, 4.7-4.9, 4.11, 5.2-5.4, 5.7, 5.8, 19.3, 19.4)."""
from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

import requests

from pipeline.http import (
    Cache,
    FredClient,
    RateLimiter,
    RequestStats,
    SecClient,
)
from pipeline.tests.conftest import FakeResponse, FakeSession

EMAIL = "secret.person@example.invalid"
KEY = "abcd1234fredkey"
NOW = datetime(2025, 6, 15, 12, 0, 0, tzinfo=UTC)
CF_URL = "https://data.sec.gov/api/xbrl/companyfacts/CIK0000000001.json"
OK_BODY = json.dumps({"ok": True}).encode()


class Scripted:
    """Session returning scripted responses in order; records requests."""

    def __init__(self, *items):
        self.items = list(items)
        self.requests: list[dict] = []

    def get(self, url, headers=None, timeout=None, **_):
        self.requests.append({"url": url, "headers": dict(headers or {})})
        item = self.items.pop(0)
        if isinstance(item, Exception):
            raise item
        status, hdrs, body = item
        return FakeResponse(status, hdrs, body, url)


class Limiter:
    def __init__(self):
        self.calls = 0

    def acquire(self):
        self.calls += 1


class World:
    def __init__(self, tmp_path: Path, *items, max_attempts=5):
        self.clock_now = NOW
        self.sleeps: list[float] = []
        self.stats = RequestStats()
        self.cache = Cache(tmp_path, clock=lambda: self.clock_now)
        self.session = Scripted(*items)
        self.limiter = Limiter()
        self.sec = SecClient(
            self.cache, self.limiter, self.session, EMAIL, self.stats,
            sleep=self.sleeps.append, max_attempts=max_attempts, clock=lambda: self.clock_now,
        )


def r(status, body=OK_BODY, headers=None):
    return (status, headers or {}, body)


def test_retry_waits_are_1_2_4_8(tmp_path):
    w = World(tmp_path, r(503), r(500), r(429), r(502), r(200))
    res = w.sec.get_json(CF_URL)
    assert res.ok and w.sleeps == [1.0, 2.0, 4.0, 8.0]
    assert w.stats.sent == 5 and w.stats.retried == 4


def test_retries_exhausted_fails_without_extra_sleep(tmp_path):
    w = World(tmp_path, *[r(503)] * 5)
    res = w.sec.get_json(CF_URL)
    assert not res.ok and res.status == 503 and res.body is None
    assert w.sleeps == [1.0, 2.0, 4.0, 8.0]


def test_connection_errors_are_retried(tmp_path):
    w = World(tmp_path, requests.ConnectionError("boom"), r(200))
    assert w.sec.get_json(CF_URL).ok
    assert w.sleeps == [1.0]


def test_retry_after_larger_than_backoff_wins(tmp_path):
    w = World(tmp_path, r(429, headers={"Retry-After": "30"}), r(429, headers={"Retry-After": "0"}), r(200))
    assert w.sec.get_json(CF_URL).ok
    assert w.sleeps == [30.0, 2.0]


def test_403_not_retried(tmp_path):
    w = World(tmp_path, r(403))
    res = w.sec.get_json(CF_URL)
    assert not res.ok and res.status == 403
    assert len(w.session.requests) == 1 and w.sleeps == []


def test_companyfacts_404_returns_without_retry(tmp_path):
    w = World(tmp_path, r(404, b"not found"))
    res = w.sec.companyfacts("0000000001")
    assert not res.ok and res.status == 404
    assert len(w.session.requests) == 1 and w.sleeps == []


def test_failed_fetch_writes_no_cache_entry(tmp_path):
    w = World(tmp_path, r(404), r(403), *[r(503)] * 5)
    w.sec.companyfacts("0000000001")
    w.sec.get_json("https://data.sec.gov/a.json")
    w.sec.get_json("https://data.sec.gov/b.json")
    http_dir = tmp_path / "http"
    assert not http_dir.exists() or list(http_dir.iterdir()) == []


def test_stale_entry_refetched_and_failed_refetch_not_returned_and_kept(tmp_path):
    w = World(tmp_path, r(200, b'{"v": 1}'), *[r(503)] * 5)
    w.sec.get_json(CF_URL)
    w.clock_now = NOW + timedelta(hours=25)
    files_before = {p.name: p.read_bytes() for p in (tmp_path / "http").iterdir()}
    res = w.sec.get_json(CF_URL)
    assert not res.ok and res.body is None and not res.from_cache
    assert {p.name: p.read_bytes() for p in (tmp_path / "http").iterdir()} == files_before


def test_stale_entry_refetched_successfully(tmp_path):
    w = World(tmp_path, r(200, b'{"v": 1}'), r(200, b'{"v": 2}'))
    w.sec.get_json(CF_URL)
    w.clock_now = NOW + timedelta(hours=25)
    res = w.sec.get_json(CF_URL)
    assert res.ok and not res.from_cache and json.loads(res.body) == {"v": 2}


def test_fresh_entry_within_24h_is_served(tmp_path):
    w = World(tmp_path, r(200, b'{"v": 1}'))
    w.sec.get_json(CF_URL)
    w.clock_now = NOW + timedelta(hours=23)
    assert w.sec.get_json(CF_URL).from_cache


def test_corrupt_cache_entry_refetched(tmp_path):
    w = World(tmp_path, r(200, b'{"v": 1}'), r(200, b'{"v": 2}'))
    w.sec.get_json(CF_URL)
    body_file = next((tmp_path / "http").glob("*.body"))
    body_file.write_bytes(b"{not json")
    res = w.sec.get_json(CF_URL)
    assert res.ok and not res.from_cache and json.loads(res.body) == {"v": 2}
    assert len(w.session.requests) == 2


def test_corrupt_meta_refetched(tmp_path):
    w = World(tmp_path, r(200, b'{"v": 1}'), r(200, b'{"v": 2}'))
    w.sec.get_json(CF_URL)
    next((tmp_path / "http").glob("*.meta.json")).write_text("garbage")
    assert not w.sec.get_json(CF_URL).from_cache


def test_cache_hit_sends_no_request_and_uses_no_limiter_slot(tmp_path):
    w = World(tmp_path, r(200))
    w.sec.get_json(CF_URL)
    calls, sent = w.limiter.calls, w.stats.sent
    res = w.sec.get_json(CF_URL)
    assert res.ok and res.from_cache
    assert len(w.session.requests) == 1
    assert w.limiter.calls == calls and w.stats.sent == sent
    assert w.stats.cache_hits == 1


def test_each_attempt_takes_one_limiter_slot(tmp_path):
    w = World(tmp_path, r(503), r(200))
    w.sec.get_json(CF_URL)
    assert w.limiter.calls == 2


def test_user_agent_on_every_attempt_but_not_in_stats_or_errors(tmp_path):
    w = World(tmp_path, *[r(503)] * 5)
    res = w.sec.get_json(CF_URL)
    ua = f"ZombieFirmRadar {EMAIL}"
    assert len(w.session.requests) == 5
    assert all(q["headers"].get("User-Agent") == ua for q in w.session.requests)
    assert EMAIL not in repr(w.stats) and "ZombieFirmRadar" not in repr(w.stats)
    assert EMAIL not in (res.error or "")


def test_email_redacted_from_exception_error_strings(tmp_path):
    exc = requests.ConnectionError(f"failed for ZombieFirmRadar {EMAIL}")
    w = World(tmp_path, *[exc] * 5)
    res = w.sec.get_json(CF_URL)
    assert not res.ok and EMAIL not in (res.error or "")


def test_fred_key_never_in_cache_names_or_contents(tmp_path):
    stats = RequestStats()
    sess = FakeSession(urls_json=None)
    url = (
        "https://api.stlouisfed.org/fred/series/observations"
        f"?series_id=DGS10&file_type=json&sort_order=desc&limit=30&api_key={KEY}"
    )
    sess.set_body(url, {"observations": [{"date": "2025-06-13", "value": "4.2"}]})
    client = FredClient(Cache(tmp_path, clock=lambda: NOW), sess, KEY, stats, sleep=lambda s: None,
                        clock=lambda: NOW)
    res = client.dgs10()
    assert res.ok
    files = list((tmp_path / "http").iterdir())
    assert files
    for p in files:
        assert KEY not in p.name
        assert KEY.encode() not in p.read_bytes()
    # Second call is served from cache keyed by the redacted URL.
    assert client.dgs10().from_cache and len(sess.requests) == 1


def test_fred_key_redacted_from_error(tmp_path):
    exc = requests.ConnectionError(f"bad url ...api_key={KEY}&x=1")
    client = FredClient(Cache(tmp_path, clock=lambda: NOW), Scripted(*[exc] * 5), KEY, RequestStats(),
                        sleep=lambda s: None, clock=lambda: NOW)
    res = client.dgs10()
    assert not res.ok and KEY not in (res.error or "")


def test_rate_limiter_sleeps_when_window_full():
    t = [0.0]
    sleeps: list[float] = []

    def sleep(s):
        sleeps.append(s)
        t[0] += s

    lim = RateLimiter(5, clock=lambda: t[0], sleep=sleep)
    for _ in range(5):
        lim.acquire()
    assert sleeps == []
    lim.acquire()
    assert sleeps == [1.0]
