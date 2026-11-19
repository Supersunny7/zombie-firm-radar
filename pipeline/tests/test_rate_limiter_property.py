"""Property test for the rate limiter. Feature: data-pipeline, Property 14."""
from __future__ import annotations

import math
import tempfile
from datetime import UTC, datetime
from pathlib import Path

from hypothesis import given
from hypothesis import strategies as st

from pipeline.http import Cache, HttpClient, RateLimiter, RequestStats
from pipeline.tests.conftest import FakeSession

_NOW = datetime(2025, 6, 15, 12, 0, 0, tzinfo=UTC)


class FakeClock:
    def __init__(self) -> None:
        self.t = 0.0

    def now(self) -> float:
        return self.t

    def sleep(self, seconds: float) -> None:
        assert seconds >= 0
        self.t += seconds


# Gaps: zero (bursts / retries), tiny, sub-second, and multi-second pauses.
gaps = st.one_of(
    st.just(0.0),
    st.floats(min_value=0.0, max_value=0.05),
    st.floats(min_value=0.0, max_value=1.5),
    st.floats(min_value=0.0, max_value=5.0),
)
rates = st.one_of(
    st.floats(min_value=0.01, max_value=10.0, allow_nan=False, allow_infinity=False),
    st.integers(min_value=1, max_value=10).map(float),
    st.sampled_from([0.5, 1.0, 1.9, 2.0, 5.0, 9.99, 10.0]),
)


# Feature: data-pipeline, Property 14
# Validates: Requirements 4.3, 4.6
@given(rate=rates, gap_list=st.lists(gaps, min_size=1, max_size=120))
def test_rate_limiter_never_exceeds_rate_in_any_one_second_window(rate, gap_list):
    clock = FakeClock()
    limiter = RateLimiter(rate, clock=clock.now, sleep=clock.sleep)
    k = max(1, math.floor(rate))
    sends: list[float] = []
    for gap in gap_list:
        clock.t += gap
        before = clock.t
        limiter.acquire()
        sends.append(clock.t)
        assert clock.t >= before  # never goes back in time
    # No more than k sends in any half-open 1-second window.
    for i in range(len(sends) - k):
        assert sends[i + k] - sends[i] >= 1.0 - 1e-9  # float rounding, 1 ulp
    assert sends == sorted(sends)


# Feature: data-pipeline, Property 14 (cache hits consume no slots)
# Validates: Requirements 4.3, 4.6
@given(n_cached=st.integers(min_value=1, max_value=30), rate=rates)
def test_cache_hits_do_not_consume_rate_limiter_slots(n_cached, rate):
    clock = FakeClock()
    limiter = RateLimiter(rate, clock=clock.now, sleep=clock.sleep)
    with tempfile.TemporaryDirectory() as tmp:
        cache = Cache(Path(tmp), clock=lambda: _NOW)
        urls = [f"https://data.sec.gov/test/{i}.json" for i in range(n_cached)]
        for url in urls:
            cache.put(url, b"{}", _NOW)
        session = FakeSession(urls_json=None)
        stats = RequestStats()
        client = HttpClient(cache, limiter, session, [], stats, sleep=clock.sleep, clock=lambda: _NOW)
        for url in urls:
            res = client.get(url, json_body=True, headers={})
            assert res.ok and res.from_cache
    assert session.requests == []
    assert stats.sent == 0 and stats.cache_hits == n_cached
    assert clock.t == 0.0  # no waiting
    assert len(limiter._sent) == 0  # no slots used
