"""Hypothesis strategies shared by the pipeline property tests."""

from __future__ import annotations

from datetime import date, timedelta

from hypothesis import strategies as st

from pipeline.facts import ExtractResult, Fact, YearValues
from pipeline.metrics import ScoredFirm, score

FLOW_TAGS = ("Revenues", "OperatingIncomeLoss", "InterestExpense")
INSTANT_TAGS = ("Assets", "StockholdersEquity", "LongTermDebtNoncurrent")


def st_money() -> st.SearchStrategy[int | float]:
    """Finite money amounts: integers and floats, negative, zero and positive."""
    return st.one_of(
        st.just(0),
        st.integers(min_value=-(10**12), max_value=10**12),
        st.floats(min_value=-1e12, max_value=1e12, allow_nan=False, allow_infinity=False),
    )


def st_window(max_len: int = 5) -> st.SearchStrategy[tuple[int, ...]]:
    """An ascending run of consecutive fiscal years, length 1 to max_len."""
    return st.builds(
        lambda start, n: tuple(range(start, start + n)),
        st.integers(min_value=1995, max_value=2030),
        st.integers(min_value=1, max_value=max_len),
    )


@st.composite
def st_fact(draw: st.DrawFn, flow: bool | None = None) -> Fact:
    """An annual Fact; flows last 350 to 380 days, instants have no start."""
    is_flow = draw(st.booleans()) if flow is None else flow
    end = draw(st.dates(min_value=date(1996, 1, 1), max_value=date(2031, 12, 31)))
    start = end - timedelta(days=draw(st.integers(350, 380))) if is_flow else None
    filed = end + timedelta(days=draw(st.integers(1, 400)))
    return Fact(
        tag=draw(st.sampled_from(FLOW_TAGS if is_flow else INSTANT_TAGS)),
        start=start,
        end=end,
        val=draw(st_money()),
        accn=f"{draw(st.integers(0, 9999999)):07d}",
        filed=filed,
        form=draw(st.sampled_from(("10-K", "10-K/A"))),
    )


def _year(fy: int, values: dict[str, int | float | None], with_source: bool) -> YearValues:
    end = date(fy, 12, 31)
    sources: list[Fact] = []
    for tag, key in (
        ("Revenues", "revenue"),
        ("OperatingIncomeLoss", "ebit"),
        ("InterestExpense", "interest"),
    ):
        if values[key] is not None:
            sources.append(
                Fact(tag, end - timedelta(days=364), end, values[key], "0000000001", end, "10-K")
            )
    for tag, key in (
        ("LongTermDebtNoncurrent", "total_debt"),
        ("Assets", "total_assets"),
        ("StockholdersEquity", "equity"),
    ):
        if values[key] is not None:
            sources.append(Fact(tag, None, end, values[key], "0000000001", end, "10-K"))
    if with_source and not sources:
        # score() needs a filing for the latest year even when every value is null.
        sources.append(Fact("Revenues", end - timedelta(days=364), end, 0, "0000000001", end, "10-K"))
    return YearValues(
        fy=fy,
        revenue=values["revenue"],
        ebit=values["ebit"],
        interest=values["interest"],
        total_debt=values["total_debt"],
        total_assets=values["total_assets"],
        equity=values["equity"],
        ebit_tag="OperatingIncomeLoss" if values["ebit"] is not None else None,
        revenue_tag="Revenues" if values["revenue"] is not None else None,
        debt_tags=("LongTermDebtNoncurrent",) if values["total_debt"] is not None else (),
        interest_tag="InterestExpense" if values["interest"] is not None else None,
        sources=tuple(sources),
    )


def build_extract(rows: list[dict[str, int | float | None]], first_fy: int) -> ExtractResult:
    """Build an ExtractResult from per-year value dicts (keys revenue, ebit, interest, ...)."""
    years = tuple(
        _year(first_fy + i, row, with_source=(i == len(rows) - 1)) for i, row in enumerate(rows)
    )
    return ExtractResult(
        has_annual_facts=True, window=tuple(y.fy for y in years), years=years
    )


@st.composite
def st_scored_firm(draw: st.DrawFn) -> ScoredFirm:
    """A ScoredFirm built through metrics.score from a random 1 to 5 year window."""
    window = draw(st_window())
    opt = st.one_of(st.none(), st_money())
    rows = [
        {
            "revenue": draw(opt),
            "ebit": draw(opt),
            "interest": draw(opt),
            "total_debt": draw(opt),
            "total_assets": draw(opt),
            "equity": draw(opt),
        }
        for _ in window
    ]
    age = draw(st.integers(min_value=10, max_value=60))
    n = draw(st.integers(min_value=1, max_value=999999))
    return score(
        cik=f"{n:010d}",
        name=f"Firm {n}",
        ticker=draw(st.one_of(st.none(), st.just(f"T{n}"))),
        sector=draw(st.sampled_from(("Manufacturing", "Retail Trade", "Services"))),
        sic=draw(st.sampled_from(("2000", "5200", "7370"))),
        first_filing_year=2025 - age,
        age_years=age,
        extracted=build_extract(rows, window[0]),
        selected_by=frozenset({"tickers"}),
    )
