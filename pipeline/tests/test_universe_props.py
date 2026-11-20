"""Property test for universe.classify (task 5.3). Offline, pure."""
from __future__ import annotations

from hypothesis import given
from hypothesis import strategies as st

from pipeline.facts import ExtractResult
from pipeline.universe import Submissions, classify, sic_division

RUN_YEAR = 2025

sic_raw = st.one_of(
    st.none(),
    st.just(""),
    st.just("  "),
    st.text(max_size=5),
    st.booleans(),
    st.floats(allow_nan=False),
    st.integers(min_value=-50, max_value=10_100),
    st.integers(min_value=0, max_value=10_100).map(lambda n: f"{n:04d}"),
    st.sampled_from([4899, 4900, 4999, 5000, 5999, 6000, 6799, 6800, 99, 100, 9999]),
)


def _reference(sic: int | None, age: int | None, facts, skip: bool) -> str | None:
    if sic is None or sic_division(sic) is None:
        return "no_sic"
    if 6000 <= sic <= 6799:
        return "financial"
    if 4900 <= sic <= 4999:
        return "utility"
    if age is None or age < 10:
        return "age_under_10"
    if facts is None:
        return None
    if not facts.has_annual_facts:
        return "no_annual_facts"
    if not skip and facts.latest_fy is not None and facts.latest_fy < 2024:
        return "not_recent"
    return None


@given(
    raw=sic_raw,
    first_year=st.one_of(st.none(), st.integers(min_value=1990, max_value=RUN_YEAR + 2)),
    facts_kind=st.sampled_from(["none", "no_annual", "annual_no_window", "annual"]),
    latest_fy=st.integers(min_value=2015, max_value=2026),
    skip=st.booleans(),
)
def test_exclusion_reason_is_first_matching_rule(raw, first_year, facts_kind, latest_fy, skip):
    """Property 7: Exclusion reason is the first matching rule.

    **Validates: Requirements 2.3, 2.4, 2.5, 2.7, 2.8, 2.9, 2.11**
    """
    page = {} if first_year is None else {"filingDate": [f"{first_year}-03-01"]}
    sub = Submissions(cik="0000000001", name="X", sic=raw, tickers=(), pages=(page,))
    facts = {
        "none": None,
        "no_annual": ExtractResult(False, (), ()),
        "annual_no_window": ExtractResult(True, (), ()),
        "annual": ExtractResult(True, (latest_fy,), ()),
    }[facts_kind]
    age = None if first_year is None else RUN_YEAR - first_year
    expected = _reference(sub.sic_int, age, facts, skip)
    assert classify(sub, facts, RUN_YEAR, skip) == expected
    if expected is None:
        assert classify(sub, facts, RUN_YEAR, skip) is None
