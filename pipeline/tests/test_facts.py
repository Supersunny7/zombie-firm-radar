"""Example tests for pipeline/facts.py (task 4.2).

Requirements: 6.1, 6.2, 6.4, 6.5, 6.6, 6.7, 6.8, 6.10, 6.12, 6.14, 6.15,
7.2-7.6, 7.8, 7.9, 7.11, 7.12, 17.11.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

import pytest

from pipeline.facts import compustat_fy, extract
from pipeline.tests.builders import companyfacts, fact

FYE = "2023-12-31"
REV = "Revenues"
PRETAX = "IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest"


def flow(val: float, end: str = FYE, *, days: int = 364, **kw: Any) -> dict[str, Any]:
    """A flow fact lasting `days` days (end - start)."""
    start = (date.fromisoformat(end) - timedelta(days=days)).isoformat()
    return fact(val, end, start=start, **kw)


def base(**extra: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    """Facts with one usable FY2023 revenue flow so a window exists."""
    facts: dict[str, list[dict[str, Any]]] = {REV: [flow(1000)]}
    facts.update(extra)
    return facts


def run(facts: dict[str, list[dict[str, Any]]]):
    return extract(companyfacts(1, facts))


def row(res, fy: int = 2023):
    return next(y for y in res.years if y.fy == fy)


# ---- duration rule (6.4) ---------------------------------------------------


@pytest.mark.parametrize("days,accepted", [(349, False), (350, True), (380, True), (381, False)])
def test_duration_bounds(days: int, accepted: bool) -> None:
    res = run({REV: [flow(1000, days=days)]})
    assert (res.window == (2023,)) is accepted
    if accepted:
        assert row(res).revenue == 1000
    else:
        assert res.years == ()


def test_missing_start_rejected() -> None:
    res = run({REV: [fact(1000, FYE)]})
    assert res.window == ()
    assert res.years == ()


# ---- instant window (6.5, 6.6, 6.14, 6.15) -----------------------------------


def test_exact_date_beats_fact_three_days_off() -> None:
    res = run(base(Assets=[fact(200, "2024-01-03"), fact(100, FYE)]))
    assert row(res).total_assets == 100


def test_three_days_off_beats_six_days_off() -> None:
    res = run(base(Assets=[fact(200, "2023-12-25"), fact(300, "2024-01-03")]))
    assert row(res).total_assets == 300


def test_eight_days_off_gives_null() -> None:
    res = run(base(Assets=[fact(200, "2024-01-08"), fact(300, "2023-12-23")]))
    assert row(res).total_assets is None


def test_equal_distance_picks_earlier_date() -> None:
    res = run(base(Assets=[fact(300, "2024-01-03"), fact(200, "2023-12-28")]))
    assert row(res).total_assets == 200


def test_each_debt_part_picks_its_own_instant_date() -> None:
    res = run(
        base(
            LongTermDebtNoncurrent=[fact(10, FYE), fact(99, "2023-12-29")],
            LongTermDebtCurrent=[fact(5, "2024-01-02")],
        )
    )
    y = row(res)
    assert y.total_debt == 15
    ends = {f.tag: f.end for f in y.sources if f.tag.startswith("LongTermDebt")}
    assert ends == {
        "LongTermDebtNoncurrent": date(2023, 12, 31),
        "LongTermDebtCurrent": date(2024, 1, 2),
    }


# ---- latest filed wins (6.7, 6.8) --------------------------------------------


def test_latest_filed_wins() -> None:
    res = run(
        {
            REV: [
                flow(1000, filed="2024-02-15", accn="0000000000-24-000009"),
                flow(1100, filed="2024-06-01", accn="0000000000-24-000001", form="10-K/A"),
            ]
        }
    )
    assert row(res).revenue == 1100


def test_larger_accession_wins_on_equal_filed_date() -> None:
    res = run(
        {
            REV: [
                flow(1100, filed="2024-02-15", accn="0000000000-24-000002"),
                flow(1000, filed="2024-02-15", accn="0000000000-24-000001"),
            ]
        }
    )
    assert row(res).revenue == 1100


# ---- tag priority (7.2-7.6) --------------------------------------------------


def test_revenue_order() -> None:
    contract = "RevenueFromContractWithCustomerExcludingAssessedTax"
    assert row(run({"SalesRevenueNet": [flow(3)]})).revenue_tag == "SalesRevenueNet"
    res = run({"SalesRevenueNet": [flow(3)], contract: [flow(2)]})
    assert (row(res).revenue, row(res).revenue_tag) == (2, contract)
    res = run({"SalesRevenueNet": [flow(3)], contract: [flow(2)], REV: [flow(1)]})
    assert (row(res).revenue, row(res).revenue_tag) == (1, REV)


@pytest.mark.parametrize("val", [0, -5])
def test_interest_zero_and_negative_used_as_reported(val: float) -> None:
    res = run(base(InterestExpense=[flow(val)], InterestExpenseNonoperating=[flow(50)]))
    y = row(res)
    assert y.interest == val
    assert y.interest_tag == "InterestExpense"


def test_interest_order_falls_to_next_tag_only_when_missing() -> None:
    res = run(base(InterestExpenseDebt=[flow(7)], InterestAndDebtExpense=[flow(9)]))
    assert (row(res).interest, row(res).interest_tag) == (7, "InterestExpenseDebt")
    res = run(base(InterestExpenseNonoperating=[flow(4)], InterestExpenseDebt=[flow(7)]))
    assert (row(res).interest, row(res).interest_tag) == (4, "InterestExpenseNonoperating")


def test_net_interest_tags_ignored() -> None:
    res = run(
        base(
            InterestIncomeExpenseNet=[flow(-12)],
            InterestIncomeExpenseNonoperatingNet=[flow(-13)],
        )
    )
    assert row(res).interest is None
    assert row(res).interest_tag is None


def test_ebit_operating_income_wins_over_fallback() -> None:
    res = run(
        base(OperatingIncomeLoss=[flow(80)], **{PRETAX: [flow(70)]}, InterestExpense=[flow(10)])
    )
    y = row(res)
    assert (y.ebit, y.ebit_tag) == (80, "OperatingIncomeLoss")


def test_ebit_fallback_with_same_period_parts() -> None:
    res = run(base(**{PRETAX: [flow(70)]}, InterestExpense=[flow(10)]))
    y = row(res)
    assert (y.ebit, y.ebit_tag) == (80, PRETAX)


def test_ebit_fallback_null_when_periods_differ() -> None:
    # Same end date, start dates one day apart: not the same period.
    res = run(base(**{PRETAX: [flow(70, days=364)]}, InterestExpense=[flow(10, days=363)]))
    y = row(res)
    assert y.ebit is None
    assert y.ebit_tag is None
    assert y.interest == 10


# ---- debt (7.8, 7.9, 7.11) ---------------------------------------------------


def test_debt_one_part_counts_others_as_zero() -> None:
    y = row(run(base(ShortTermBorrowings=[fact(30, FYE)])))
    assert y.total_debt == 30
    assert y.debt_tags == ("ShortTermBorrowings",)


def test_debt_sums_present_parts_and_ignores_long_term_debt() -> None:
    y = row(
        run(
            base(
                LongTermDebtNoncurrent=[fact(10, FYE)],
                ShortTermBorrowings=[fact(30, FYE)],
                LongTermDebt=[fact(999, FYE)],
            )
        )
    )
    assert y.total_debt == 40
    assert y.debt_tags == ("LongTermDebtNoncurrent", "ShortTermBorrowings")


def test_debt_long_term_debt_fallback() -> None:
    y = row(run(base(LongTermDebt=[fact(70, FYE)])))
    assert (y.total_debt, y.debt_tags) == (70, ("LongTermDebt",))


def test_debt_all_missing_is_null_and_empty() -> None:
    y = row(run(base()))
    assert y.total_debt is None
    assert y.debt_tags == ()


# ---- filtered facts (6.1, 7.12) ----------------------------------------------


@pytest.mark.parametrize(
    "kw",
    [
        {"form": "10-Q", "fp": "Q3"},
        {"form": "10-Q", "fp": "FY"},
        {"form": "10-KT"},
        {"form": "10-K405"},
    ],
)
def test_non_annual_forms_ignored(kw: dict[str, str]) -> None:
    res = extract(companyfacts(1, {REV: [flow(1000, **kw)]}))
    assert res.window == ()
    assert res.years == ()
    assert res.has_annual_facts is False


def test_non_annual_form_does_not_override_10k() -> None:
    res = run({REV: [flow(1000), flow(5000, form="10-Q", fp="Q4", filed="2025-01-01")]})
    assert row(res).revenue == 1000


def test_non_usd_units_ignored() -> None:
    doc = companyfacts(1, {REV: [flow(1000)]})
    doc["facts"]["us-gaap"][REV]["units"] = {"EUR": [flow(1000)]}
    res = extract(doc)
    assert res.window == ()
    assert res.years == ()


# ---- period assignment (6.10, 6.12, 6.3) -------------------------------------


def test_comparative_prior_year_fact_assigned_by_end_date() -> None:
    res = run(
        {
            REV: [
                flow(900, "2022-12-31", fy=2023, filed="2024-02-15"),  # comparative in FY2023 10-K
                flow(1000, FYE, fy=2023, filed="2024-02-15"),
            ]
        }
    )
    assert res.window == (2022, 2023)
    assert row(res, 2022).revenue == 900
    assert row(res, 2023).revenue == 1000


def test_gap_year_inside_window_is_null_row() -> None:
    res = run(
        {
            REV: [
                flow(1, "2019-12-31"),
                flow(2, "2020-12-31"),
                flow(4, "2022-12-31"),
                flow(5, "2023-12-31"),
            ]
        }
    )
    assert res.window == (2019, 2020, 2022, 2023)
    assert [y.fy for y in res.years] == [2019, 2020, 2021, 2022, 2023]
    gap = row(res, 2021)
    assert gap.is_gap
    assert gap.revenue is None and gap.ebit is None and gap.interest is None
    assert gap.total_debt is None and gap.total_assets is None and gap.equity is None
    assert gap.debt_tags == ()


def test_january_year_end_maps_to_previous_year() -> None:
    assert compustat_fy(date(2025, 1, 31)) == 2024
    res = run({REV: [fact(1000, "2025-01-31", start="2024-02-01")]})
    assert res.window == (2024,)
    assert row(res, 2024).revenue == 1000


# ---- Property 6: total debt rule never invents a zero (task 4.6) --------------

from hypothesis import given, strategies as st  # noqa: E402

_DEBT_PARTS = ("LongTermDebtNoncurrent", "LongTermDebtCurrent", "ShortTermBorrowings")
_DEBT_TAGS = _DEBT_PARTS + ("LongTermDebt",)
# One optional instant per debt tag: (value, day offset from the fiscal year end).
# Offsets reach past the 7-day window so unusable facts are generated too.
_debt_fact = st.one_of(
    st.none(),
    st.tuples(st.integers(-10**6, 10**10), st.integers(-10, 10)),
)


@given(st.fixed_dictionaries({tag: _debt_fact for tag in _DEBT_TAGS}))
def test_property_total_debt_never_invents_a_zero(spec: dict[str, tuple[int, int] | None]) -> None:
    """**Property 6: Total debt rule never invents a zero**

    **Validates: Requirements 7.8, 7.9, 7.11**
    """
    fye = date.fromisoformat(FYE)
    facts: dict[str, list[dict[str, Any]]] = {REV: [flow(1000)]}
    for tag, item in spec.items():
        if item is not None:
            val, off = item
            facts[tag] = [fact(val, (fye + timedelta(days=off)).isoformat())]
    y = row(run(facts))

    usable = {
        tag: item[0] for tag, item in spec.items() if item is not None and abs(item[1]) <= 7
    }
    parts = [t for t in _DEBT_PARTS if t in usable]
    if parts:
        assert y.total_debt == sum(usable[t] for t in parts)
        assert y.debt_tags == tuple(parts)
    elif "LongTermDebt" in usable:
        assert y.total_debt == usable["LongTermDebt"]
        assert y.debt_tags == ("LongTermDebt",)
    else:
        assert y.total_debt is None
        assert y.debt_tags == ()
