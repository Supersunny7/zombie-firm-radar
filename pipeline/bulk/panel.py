"""Firm-year panel from one companyfacts document (Requirements 24.1 to 24.9).

``extract_panel`` mirrors ``facts.extract`` but over a fixed fiscal-year range. It reuses the
same extractor functions (``annual_facts``, ``dedupe``, ``flow_by_fy``, ``fiscal_year_ends``,
``build_year``, ``pick_instant``) and the shared ``icr()``. It does not call or change
``extract()``.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Mapping

from pipeline.bulk.submissions import filing_url
from pipeline.facts import (
    ALL_TAGS,
    ASSETS_TAG,
    DEBT_FALLBACK_TAG,
    DEBT_PART_TAGS,
    DEBT_STAGE2_TAGS,
    EQUITY_TAG,
    FLOW_TAGS,
    REVENUE_TAG_JOIN,
    Fact,
    YearValues,
    annual_facts,
    build_year,
    compustat_fy,
    dedupe,
    fiscal_year_ends,
    flow_by_fy,
    pick_instant,
)
from pipeline.metrics import icr

PANEL_FIRST_FY = 2015
PANEL_LAST_FY = 2025
PANEL_YEARS = tuple(range(PANEL_FIRST_FY, PANEL_LAST_FY + 1))
FLAG_LOOKBACK = 2  # the flag of year Y needs icr of Y-1 and Y-2
CALC_FIRST_FY = PANEL_FIRST_FY - FLAG_LOOKBACK
MIN_ZOMBIE_AGE = 10
CASH_TAG = "CashAndCashEquivalentsAtCarryingValue"
FIELDS = (
    "operating_income",
    "interest_expense",
    "revenue",
    "total_debt",
    "cash",
    "total_assets",
    "equity",
)
FIELD_SUFFIXES = ("", "_tag", "_end", "_accn", "_url")
_BALANCE_SHEET_TAGS = (*DEBT_PART_TAGS, DEBT_FALLBACK_TAG, *DEBT_STAGE2_TAGS, ASSETS_TAG, EQUITY_TAG, CASH_TAG)


@dataclass(frozen=True)
class FirmFacts:
    """What the panel pass keeps in memory about one companyfacts member."""

    cik: str
    entity_name: str | None
    has_annual: bool
    parse_error: bool = False


def age_at_fy(first_filing: date | None, fye: date | None) -> int | None:
    """Whole years from the first filing date to the fiscal year end (Age_At_FY).
    A year is complete on its anniversary; None when either date is missing."""
    if first_filing is None or fye is None:
        return None
    return fye.year - first_filing.year - ((fye.month, fye.day) < (first_filing.month, first_filing.day))


def zombie_flags(
    icr_by_fy: Mapping[int, float | None],
    age_by_fy: Mapping[int, int | None],
    years: tuple[int, ...] | list[int],
) -> dict[int, bool]:
    """Zombie_Flag per year: age at Y >= 10 and icr non-null and below 1 in Y, Y-1 and Y-2.
    A null age or any null icr gives False."""
    out: dict[int, bool] = {}
    for y in years:
        age = age_by_fy.get(y)
        values = [icr_by_fy.get(y - k) for k in range(FLAG_LOOKBACK + 1)]
        out[y] = (
            age is not None
            and age >= MIN_ZOMBIE_AGE
            and all(v is not None and v < 1 for v in values)
        )
    return out


def field_facts(y: YearValues, cash: Fact | None) -> dict[str, tuple[Fact, ...]]:
    """Facts behind each field, in the order of Requirement 7, found by tag in ``y.sources``."""
    by_tag = {f.tag: f for f in y.sources}

    def one(tag: str | None) -> tuple[Fact, ...]:
        return (by_tag[tag],) if tag is not None and tag in by_tag else ()

    if y.ebit_tag == FLOW_TAGS["ebit"][0]:
        operating = one(y.ebit_tag)
    elif y.ebit_tag is not None:  # EBIT fallback: pretax income, then the interest fact
        operating = one(y.ebit_tag) + one(y.interest_tag)
    else:
        operating = ()
    return {
        "operating_income": operating,
        "interest_expense": one(y.interest_tag),
        "revenue": tuple(f for t in (y.revenue_tag or "").split(REVENUE_TAG_JOIN) for f in one(t or None)),
        "total_debt": tuple(f for t in y.debt_tags for f in one(t)),
        "cash": (cash,) if cash is not None else (),
        "total_assets": one(ASSETS_TAG),
        "equity": one(EQUITY_TAG),
    }


def _values(y: YearValues, cash: Fact | None) -> dict[str, int | float | None]:
    return {
        "operating_income": y.ebit,
        "interest_expense": y.interest,
        "revenue": y.revenue,
        "total_debt": y.total_debt,
        "cash": cash.val if cash is not None else None,
        "total_assets": y.total_assets,
        "equity": y.equity,
    }


def blank_row(cik: str, fy: int) -> dict[str, object]:
    """A Gap_Row skeleton: only cik and fy set, every other column empty, flags false."""
    row: dict[str, object] = {"cik": cik, "fy": fy, "fye": None, "age_at_fy": None}
    for f in FIELDS:
        for suffix in FIELD_SUFFIXES:
            row[f + suffix] = None
    row.update({"icr": None, "zombie_flag": False, "gap_has_balance_sheet": False, "likely_debt_free": False})
    return row


def panel_row(
    cik: str,
    y: YearValues,
    cash: Fact | None,
    fye: date,
    age: int | None,
    icr_value: float | None,
    flag: bool,
) -> dict[str, object]:
    """One Panel row for a year that has a Fiscal_Year_End (pure)."""
    row = blank_row(cik, y.fy)
    row["fye"] = fye
    row["age_at_fy"] = age
    values = _values(y, cash)
    facts = field_facts(y, cash)
    for f in FIELDS:
        used = facts[f]
        row[f] = values[f]
        if used:
            row[f + "_tag"] = ";".join(x.tag for x in used)
            row[f + "_end"] = ";".join(x.end.isoformat() for x in used)
            row[f + "_accn"] = ";".join(x.accn for x in used)
            row[f + "_url"] = ";".join(filing_url(cik, x.accn) for x in used)
    row["icr"] = icr_value
    row["zombie_flag"] = flag
    # No value from any debt tag in the final lists, and interest expense is 0 or missing (Requirement 30.9).
    row["likely_debt_free"] = y.total_debt is None and (y.interest is None or y.interest == 0)
    return row


def gap_panel(cik: str) -> list[dict[str, object]]:
    """Eleven Gap_Rows, used for a member that could not be parsed."""
    return [blank_row(cik, fy) for fy in PANEL_YEARS]


def extract_panel(
    cik: str,
    companyfacts: Mapping[str, object],
    first_filing: date | None,
) -> list[dict[str, object]]:
    """Exactly one row for each of FY2015 to FY2025, ascending (24.1).

    icr() is computed for FY2013 to FY2025 so that the flags of FY2015 and FY2016 can look
    back; the rows of FY2013 and FY2014 are not written (24.8).
    """
    tagged: dict[str, list[Fact]] = {}
    for tag in (*ALL_TAGS, CASH_TAG):
        facts = dedupe(annual_facts(companyfacts, tag))
        if facts:
            tagged[tag] = facts
    flows = {tag: flow_by_fy(tagged.get(tag, ())) for tags in FLOW_TAGS.values() for tag in tags}
    ends = fiscal_year_ends(flows)

    built: dict[int, tuple[YearValues, Fact | None, date]] = {}
    icr_by_fy: dict[int, float | None] = {}
    age_by_fy: dict[int, int | None] = {}
    for fy in range(CALC_FIRST_FY, PANEL_LAST_FY + 1):
        if fy not in ends:
            continue
        y = build_year(fy, ends[fy], tagged)
        cash = pick_instant(tagged.get(CASH_TAG, ()), ends[fy])
        built[fy] = (y, cash, ends[fy])
        icr_by_fy[fy] = icr(y.ebit, y.interest)
        age_by_fy[fy] = age_at_fy(first_filing, ends[fy])
    flags = zombie_flags(icr_by_fy, age_by_fy, PANEL_YEARS)

    rows: list[dict[str, object]] = []
    for fy in PANEL_YEARS:
        if fy in built:
            y, cash, fye = built[fy]
            rows.append(panel_row(cik, y, cash, fye, age_by_fy[fy], icr_by_fy[fy], flags[fy]))
        else:
            row = blank_row(cik, fy)
            row["gap_has_balance_sheet"] = any(
                compustat_fy(f.end) == fy
                for tag in _BALANCE_SHEET_TAGS
                for f in tagged.get(tag, ())
                if f.start is None
            )
            rows.append(row)
    return rows
