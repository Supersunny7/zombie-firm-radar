"""Status-rule fixture tests for the scorer (Requirements 9.1 to 9.10, 17.6, 17.7).

One test per case in fixtures/status_cases.json. A missing, unparseable or empty
fixture file fails the suite; it is never skipped.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from pipeline.metrics import score
from pipeline.tests.strategies import build_extract

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "status_cases.json"
REQUIRED_KEYS = {"id", "age_years", "years", "expected_status", "expected_reasons"}


def _load_cases() -> tuple[list[dict[str, Any]], int, str | None]:
    try:
        doc = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        return [], 0, f"cannot load {FIXTURE_PATH}: {exc!r}"
    cases = doc.get("cases") if isinstance(doc, dict) else None
    if not isinstance(cases, list) or not cases:
        return [], 0, f"{FIXTURE_PATH} has no cases"
    for i, case in enumerate(cases):
        if not isinstance(case, dict) or not REQUIRED_KEYS <= case.keys():
            return [], 0, f"{FIXTURE_PATH} case {i} lacks one of {sorted(REQUIRED_KEYS)}"
    return cases, doc.get("latest_fy", 2024), None


CASES, LATEST_FY, LOAD_ERROR = _load_cases()


def test_status_fixture_file_loads_with_cases() -> None:
    assert LOAD_ERROR is None, LOAD_ERROR
    assert len(CASES) > 0


@pytest.mark.parametrize("case", CASES, ids=[c.get("id", f"case-{i}") for i, c in enumerate(CASES)])
def test_status_case(case: dict[str, Any]) -> None:
    rows = [
        {
            "revenue": None,
            "ebit": y["ebit"],
            "interest": y["interest"],
            "total_debt": None,
            "total_assets": None,
            "equity": None,
        }
        for y in case["years"]
    ]
    first_fy = case["years"][0]["fy"]
    assert case["years"][-1]["fy"] == LATEST_FY
    firm = score(
        cik="0000000001",
        name="Case Corp",
        ticker="CASE",
        sector="Manufacturing",
        sic="2000",
        first_filing_year=2025 - case["age_years"],
        age_years=case["age_years"],
        extracted=build_extract(rows, first_fy),
        selected_by=frozenset({"tickers"}),
    )
    assert firm.status == case["expected_status"]
    assert firm.reasons == case["expected_reasons"]


# ---------------------------------------------------------------------------
# Flags and rescue inputs (Requirements 10.1 to 10.5, 11.1 to 11.5, 11.8, 11.11)
# ---------------------------------------------------------------------------

import math  # noqa: E402

from pipeline.metrics import (  # noqa: E402
    OwnHistory,
    RawStats,
    finalize_rescue_inputs,
    implied_rate,
    own_history_stats,
    rescue_eligible,
    sector_medians,
    shock_eligible,
)

_KEYS = ("revenue", "ebit", "interest", "total_debt", "total_assets", "equity")


def _row(**kw: Any) -> dict[str, Any]:
    base: dict[str, Any] = dict.fromkeys(_KEYS, 100)
    base.update(kw)
    return base


def _firm(rows: list[dict[str, Any]], first_fy: int = 2020):
    return score(
        cik="0000000001",
        name="Flag Corp",
        ticker="FLAG",
        sector="Manufacturing",
        sic="2000",
        first_filing_year=2000,
        age_years=25,
        extracted=build_extract(rows, first_fy),
        selected_by=frozenset({"tickers"}),
    )


def _latest(**kw: Any):
    return build_extract([_row(**kw)], 2024).years[-1]


@pytest.mark.parametrize("debt", [None, 0, -50])
def test_implied_rate_none_for_missing_zero_or_negative_debt(debt: Any) -> None:
    assert implied_rate(_latest(total_debt=debt, interest=10)) is None


def test_implied_rate_is_interest_over_debt_unrounded() -> None:
    assert implied_rate(_latest(total_debt=3, interest=1)) == 1 / 3
    firm = _firm([_row(total_debt=3, interest=1, ebit=1)] * 3)
    assert firm.implied_rate == 1 / 3  # not rounded to 6 decimals


@pytest.mark.parametrize("interest", [0, None])
def test_shock_eligible_false_for_zero_and_missing_interest(interest: Any) -> None:
    firm = _firm([_row(interest=interest)] * 3)
    assert firm.shock_eligible is False
    assert shock_eligible(firm.implied_rate) is False


def test_shock_eligible_true_with_positive_rate() -> None:
    assert _firm([_row(interest=5)] * 3).shock_eligible is True


def test_rescue_eligible_needs_all_six_values() -> None:
    assert rescue_eligible(_latest(), 3) is True
    for key in _KEYS:
        assert rescue_eligible(_latest(**{key: None}), 5) is False, key
    # a reported zero is a value, not missing
    assert rescue_eligible(_latest(equity=0), 3) is True


def test_rescue_eligible_needs_three_window_years() -> None:
    assert rescue_eligible(_latest(), 2) is False
    assert rescue_eligible(_latest(), 3) is True
    assert _firm([_row()] * 2).rescue_eligible is False
    assert _firm([_row()] * 3).rescue_eligible is True


def test_total_debt_usd_null_is_never_zero() -> None:
    assert _firm([_row(total_debt=None)] * 3).total_debt_usd is None
    assert _firm([_row(total_debt=0)] * 3).total_debt_usd == 0


def _margins(ebits: list[int], revenues: list[int] | None = None) -> list:
    revenues = revenues or [100] * len(ebits)
    rows = [_row(revenue=r, ebit=e) for r, e in zip(revenues, ebits)]
    return list(build_extract(rows, 2020).years)


def test_own_history_needs_four_usable_years() -> None:
    years = _margins([10, 20, 10, 30, 20])
    assert own_history_stats(years, range(2020, 2025)).stats is not None
    three = own_history_stats(years[:3], range(2020, 2023))
    assert three.stats is None and three.history_years == 3
    # an unusable year (missing EBIT, non-positive revenue) does not count
    bad_ebit = [*years[:3], build_extract([_row(ebit=None)], 2023).years[0]]
    assert own_history_stats(bad_ebit, range(2020, 2024)).history_years == 3
    bad_rev = [*years[:3], build_extract([_row(revenue=0)], 2023).years[0]]
    assert own_history_stats(bad_rev, range(2020, 2024)).stats is None


def test_own_history_needs_two_consecutive_changes() -> None:
    def usable(fys: list[int]):
        return [build_extract([_row()], fy).years[0] for fy in fys]

    window = range(2010, 2030)
    no_pairs = own_history_stats(usable([2015, 2017, 2019, 2021]), window)
    one_pair = own_history_stats(usable([2015, 2016, 2018, 2020]), window)
    two_pairs = own_history_stats(usable([2015, 2016, 2018, 2019]), window)
    assert (no_pairs.stats, no_pairs.history_years) == (None, 4)
    assert (one_pair.stats, one_pair.history_years) == (None, 4)
    assert two_pairs.stats is not None


def test_sample_standard_deviation_uses_n_minus_one() -> None:
    years = _margins([10, 20, 10, 30])  # margins .1 .2 .1 .3, changes .1 -.1 .2
    stats = own_history_stats(years, range(2020, 2024)).stats
    assert stats is not None
    changes = [0.2 - 0.1, 0.1 - 0.2, 0.3 - 0.1]
    mean = sum(changes) / 3
    ss = sum((c - mean) ** 2 for c in changes)
    assert stats.margin_change_sd == pytest.approx(math.sqrt(ss / 2))
    assert stats.margin_change_sd != pytest.approx(math.sqrt(ss / 3))
    assert stats.margin_mean == pytest.approx(0.175)
    assert stats.margin_change_mean == pytest.approx(mean)
    assert stats.revenue_growth_median == 0


def _stats(v: float) -> RawStats:
    return RawStats(v, v / 2, v / 3, v / 4)


def test_fallback_copies_sector_medians() -> None:
    med = {"Manufacturing": RawStats(0.05, -0.002, 0.03, 0.01)}
    out = finalize_rescue_inputs(OwnHistory(None, 2), med, "Manufacturing")
    assert (out.margin_mean, out.margin_change_mean) == (0.05, -0.002)
    assert (out.margin_change_sd, out.revenue_growth_median) == (0.03, 0.01)
    assert out.used_sector_fallback is True
    assert out.history_years == 2


def test_sector_without_own_history_uses_global_median() -> None:
    a, b, c = _stats(0.1), _stats(0.2), _stats(0.9)
    out = sector_medians({"A": [a, b], "B": [c], "C": []})
    assert out["C"].margin_mean == 0.2
    assert out["C"].margin_change_sd == round(0.2 / 3, 6)
    assert out["A"].margin_mean == pytest.approx(0.15)
    assert out["B"].margin_mean == 0.9


def test_values_rounded_to_six_decimals_but_icr_and_rate_are_not() -> None:
    raw = RawStats(1 / 3, 2 / 3, 1 / 7, 1 / 9)
    own = finalize_rescue_inputs(OwnHistory(raw, 5), {}, "Manufacturing")
    assert own.margin_mean == round(1 / 3, 6) != 1 / 3
    assert own.margin_change_sd == round(1 / 7, 6)
    assert own.revenue_growth_median == round(1 / 9, 6)
    assert own.used_sector_fallback is False and own.history_years == 5
    med = sector_medians({"S": [raw]})["S"]
    assert med.margin_change_mean == round(2 / 3, 6)
    firm = _firm([_row(ebit=1, interest=3, total_debt=7)] * 3)
    assert firm.latest_icr == 1 / 3
    assert firm.implied_rate == 3 / 7


# ---------------------------------------------------------------------------
# Property 8: every zombie meets the definition
# ---------------------------------------------------------------------------
from hypothesis import given, settings  # noqa: E402

from pipeline.metrics import icr  # noqa: E402
from pipeline.tests.strategies import st_scored_firm  # noqa: E402


@settings(settings.get_profile("pipeline"))
@given(st_scored_firm())
def test_property_8_every_zombie_meets_the_definition(firm) -> None:
    """Feature: data-pipeline, Property 8: Every zombie meets the definition.

    Validates: Requirements 9.5, 9.9, 9.10, 9.12.
    Years are looked up by FY number, so a gap year breaks the streak.
    """
    by_fy = {y.fy: y for y in firm.years}
    latest_fy = max(by_fy)
    last3 = (latest_fy - 2, latest_fy - 1, latest_fy)
    ratios = [
        icr(by_fy[fy].ebit, by_fy[fy].interest) if fy in by_fy else None for fy in last3
    ]
    three_below_one = all(r is not None and r < 1 for r in ratios)

    if firm.status == "zombie":
        assert firm.age_years >= 10
        assert three_below_one
        assert firm.reasons == [f"ICR below 1 in FY{last3[0]}, FY{last3[1]}, FY{last3[2]}"]

    # Converse: non-null ICRs imply positive interest and present EBIT, so rules 2-4 cannot preempt.
    if firm.age_years >= 10 and three_below_one:
        assert firm.status == "zombie"


# ---------------------------------------------------------------------------
# Property 9: status invariants for the other statuses
# ---------------------------------------------------------------------------


@settings(settings.get_profile("pipeline"))
@given(st_scored_firm())
def test_property_9_status_invariants_for_other_statuses(firm) -> None:
    """Feature: data-pipeline, Property 9: Status invariants for the other statuses.

    Validates: Requirements 9.1, 9.11, 9.15.
    """
    by_fy = {y.fy: y for y in firm.years}
    L = max(by_fy)
    latest = by_fy[L]
    last3 = (L - 2, L - 1, L)
    ratios = {fy: (icr(by_fy[fy].ebit, by_fy[fy].interest) if fy in by_fy else None) for fy in last3}
    below = [fy for fy, r in ratios.items() if r is not None and r < 1]
    latest_icr = ratios[L]
    zombie_cond = firm.age_years >= 10 and len(below) == 3

    def usable(fy: int) -> bool:
        y = by_fy.get(fy)
        return y is not None and y.ebit is not None and y.interest is not None and y.interest >= 0

    has_streak = any(usable(fy) and usable(fy + 1) and usable(fy + 2) for fy in by_fy)
    insufficient_cond = (
        latest.interest is None
        or latest.ebit is None
        or latest.interest < 0
        or not has_streak
    )
    endangered_cond = (latest_icr is not None and latest_icr < 1) or len(below) >= 2

    # Exactly one allowed status, with at least one non-empty reason.
    assert firm.status in {"zombie", "endangered", "healthy", "insufficient_data"}
    assert firm.reasons and all(isinstance(r, str) and r.strip() for r in firm.reasons)

    if firm.status == "insufficient_data":
        assert insufficient_cond
    if insufficient_cond:
        assert firm.status == "insufficient_data"
        return

    if latest.interest == 0 and not zombie_cond:
        assert firm.status == "healthy"
        assert firm.reasons == [f"No interest expense in FY{L}"]

    if firm.status == "endangered":
        assert endangered_cond
        assert not zombie_cond
    elif firm.status == "healthy" and latest.interest != 0:
        assert latest_icr is not None and latest_icr >= 1
        assert len(below) < 2
    if endangered_cond and not zombie_cond and latest.interest != 0:
        assert firm.status == "endangered"
# ---------------------------------------------------------------------------
# Property 10: eligibility flags follow the contract
# ---------------------------------------------------------------------------
@settings(settings.get_profile("pipeline"))
@given(st_scored_firm())
def test_property_10_eligibility_flags_follow_the_contract(firm) -> None:
    """Feature: data-pipeline, Property 10: Eligibility flags follow the contract.
    Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5.
    """
    latest = max(firm.years, key=lambda y: y.fy)
    interest, debt = latest.interest, latest.total_debt
    # 10.1: implied_rate is non-null exactly when both are present and debt > 0.
    if interest is not None and debt is not None and debt > 0:
        assert firm.implied_rate == interest / debt
    else:
        assert firm.implied_rate is None
    # 10.2: shock_eligible only for a non-null, positive implied rate.
    assert firm.shock_eligible == (firm.implied_rate is not None and firm.implied_rate > 0)
    # 10.3: rescue_eligible needs six non-null money fields and >= 3 window years.
    six = (
        latest.revenue, latest.ebit, latest.interest,
        latest.total_debt, latest.total_assets, latest.equity,
    )
    assert firm.rescue_eligible == (all(v is not None for v in six) and len(firm.years) >= 3)
    # 10.4: latest_icr is the shared icr().
    assert firm.latest_icr == icr(latest.ebit, latest.interest)
    # 10.5: total_debt_usd is None exactly when latest debt is None, never 0 as placeholder.
    assert (firm.total_debt_usd is None) == (debt is None)
    if debt is not None:
        assert firm.total_debt_usd == debt
# ---------------------------------------------------------------------------
# Property 11: own-history rescue inputs match a reference computation
# ---------------------------------------------------------------------------
from hypothesis import strategies as st  # noqa: E402
from pipeline.metrics import RawStats, finalize_rescue_inputs, own_history_stats  # noqa: E402

_REVENUE = st.one_of(
    st.none(),
    st.just(0),
    st.integers(min_value=-100, max_value=1000),
    st.integers(min_value=1, max_value=10**9),
)
_EBIT = st.one_of(st.none(), st.integers(min_value=-(10**9), max_value=10**9))


@st.composite
def _history_case(draw):
    first = draw(st.integers(min_value=1995, max_value=2030))
    n = draw(st.integers(min_value=1, max_value=8))
    rows = [
        {**_row(), "revenue": draw(_REVENUE), "ebit": draw(_EBIT)} for _ in range(n)
    ]
    fys = list(range(first, first + n))
    # window: the last 1..5 years (Firm_Window); earlier years are outside it
    size = draw(st.integers(min_value=1, max_value=min(5, n)))
    return build_extract(rows, first).years, fys[-size:]


def _reference(years, window):
    usable = {
        y.fy: (y.revenue, y.ebit / y.revenue)
        for y in years
        if y.fy in window and y.revenue is not None and y.revenue > 0 and y.ebit is not None
    }
    count = len(usable)
    pairs = [fy for fy in usable if fy - 1 in usable]
    if count < 4 or len(pairs) < 2:
        return None, count
    margins = [m for _, m in usable.values()]
    changes = [usable[fy][1] - usable[fy - 1][1] for fy in pairs]
    growth = sorted(usable[fy][0] / usable[fy - 1][0] - 1 for fy in pairs)
    mean_c = sum(changes) / len(changes)
    sd = math.sqrt(sum((c - mean_c) ** 2 for c in changes) / (len(changes) - 1))
    mid = len(growth) // 2
    med = growth[mid] if len(growth) % 2 else (growth[mid - 1] + growth[mid]) / 2
    return (sum(margins) / count, mean_c, sd, med), count


@settings(settings.get_profile("pipeline"))
@given(_history_case())
def test_property_11_own_history_rescue_inputs_match_reference(case) -> None:
    """Feature: data-pipeline, Property 11: Own-history rescue inputs match a reference computation.
    Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5.
    """
    years, window = case
    own = own_history_stats(years, window)
    expected, count = _reference(years, window)
    assert own.history_years == count and 0 <= count <= 5  # 11.1
    sector = RawStats(0.11, 0.22, 0.33, 0.44)
    result = finalize_rescue_inputs(own, {"S": sector}, "S")
    assert result.history_years == count
    if expected is None:  # 11.4, 11.5
        assert own.stats is None
        assert result.used_sector_fallback is True
        assert (
            result.margin_mean, result.margin_change_mean,
            result.margin_change_sd, result.revenue_growth_median,
        ) == (0.11, 0.22, 0.33, 0.44)
    else:  # 11.2, 11.3
        assert own.stats is not None
        got = (
            own.stats.margin_mean, own.stats.margin_change_mean,
            own.stats.margin_change_sd, own.stats.revenue_growth_median,
        )
        assert got == pytest.approx(expected, rel=1e-9, abs=1e-12)
        assert result.used_sector_fallback is False
        assert (
            result.margin_mean, result.margin_change_mean,
            result.margin_change_sd, result.revenue_growth_median,
        ) == tuple(round(v, 6) for v in got)


# ---------------------------------------------------------------------------
# Property 12: sector medians cover every output sector
# ---------------------------------------------------------------------------
import statistics  # noqa: E402

_STAT = st.floats(min_value=-1, max_value=1, allow_nan=False, allow_infinity=False)
_RAW = st.builds(RawStats, _STAT, _STAT, _STAT, _STAT)
_FIELDS = ("margin_mean", "margin_change_mean", "margin_change_sd", "revenue_growth_median")


@st.composite
def _sector_case(draw):
    names = draw(st.lists(st.sampled_from("ABCDEFGH"), min_size=1, max_size=6, unique=True))
    stats = {n: draw(st.lists(_RAW, max_size=4)) for n in names}
    if not any(stats.values()):
        stats[names[0]] = draw(st.lists(_RAW, min_size=1, max_size=4))
    return stats


@settings(max_examples=100, deadline=None)
@given(_sector_case())
def test_property_12_sector_medians_cover_every_output_sector(stats) -> None:
    """**Validates: Requirements 11.6, 11.7, 11.8, 11.10, 11.12**"""
    out = sector_medians(stats)
    assert set(out) == set(stats)
    everything = [s for items in stats.values() for s in items]
    for sector, items in stats.items():
        source = items or everything
        for f in _FIELDS:
            expected = round(statistics.median(getattr(s, f) for s in source), 6)
            got = getattr(out[sector], f)
            assert got is not None and got == expected
        fb = finalize_rescue_inputs(OwnHistory(None, 2), out, sector)
        assert fb.used_sector_fallback is True
        for f in _FIELDS:
            assert getattr(fb, f) == round(getattr(out[sector], f), 6)
