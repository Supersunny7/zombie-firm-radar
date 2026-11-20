"""Fact extractor: turns a companyfacts document into per-fiscal-year values.

Pure functions, no I/O. Rules follow Requirements 6.1-6.16 and 7.1-7.12 of the
data-pipeline spec. This module never divides EBIT by interest (see metrics.icr).
"""

from __future__ import annotations

import math
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass
from datetime import date

FLOW_TAGS: dict[str, tuple[str, ...]] = {
    "revenue": (
        "Revenues",
        "RevenueFromContractWithCustomerExcludingAssessedTax",
        "SalesRevenueNet",
        "RevenueFromContractWithCustomerIncludingAssessedTax",  # 4th choice (7.2)
    ),
    # Used only when none of the four tags above has a value: goods + services (7.2a).
    "revenue_components": ("SalesRevenueGoodsNet", "SalesRevenueServicesNet"),
    "ebit": ("OperatingIncomeLoss",),
    "pretax": (
        "IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest",
    ),
    "interest": (
        "InterestExpense",
        "InterestExpenseNonoperating",
        "InterestExpenseDebt",
        "InterestAndDebtExpense",
        "InterestExpenseOperating",  # 5th choice (7.6)
    ),
}
DEBT_PART_TAGS = ("LongTermDebtNoncurrent", "LongTermDebtCurrent", "ShortTermBorrowings")
DEBT_FALLBACK_TAG = "LongTermDebt"
# Stage 2 of the total debt rule (7.9a): used only when stage 1 (parts, then LongTermDebt) gives nothing.
DEBT_TOTAL_TAGS = ("DebtLongtermAndShorttermCombinedAmount", "DebtAndCapitalLeaseObligations")
DEBT_NONCURRENT_ALT_TAGS = ("LongTermDebtAndCapitalLeaseObligations", "LongTermNotesPayable")
DEBT_CURRENT_ALT_TAGS = (
    "LongTermDebtAndCapitalLeaseObligationsCurrent",
    "DebtCurrent",
    "NotesPayableCurrent",
)
DEBT_LAST_TAG = "NotesPayable"
DEBT_STAGE2_TAGS = DEBT_TOTAL_TAGS + DEBT_NONCURRENT_ALT_TAGS + DEBT_CURRENT_ALT_TAGS + (DEBT_LAST_TAG,)
ASSETS_TAG = "Assets"
EQUITY_TAG = "StockholdersEquity"
INSTANT_TAGS = DEBT_PART_TAGS + (DEBT_FALLBACK_TAG,) + DEBT_STAGE2_TAGS + (ASSETS_TAG, EQUITY_TAG)
ALL_TAGS: tuple[str, ...] = tuple(t for tags in FLOW_TAGS.values() for t in tags) + INSTANT_TAGS
REVENUE_TAG_JOIN = "+"  # revenue_tag of a goods + services year: "SalesRevenueGoodsNet+SalesRevenueServicesNet"
ANNUAL_FORMS = frozenset({"10-K", "10-K/A"})
INSTANT_WINDOW_DAYS = 7
FLOW_MIN_DAYS, FLOW_MAX_DAYS = 350, 380
WINDOW_YEARS = 5


@dataclass(frozen=True)
class Fact:
    tag: str
    start: date | None  # None for instants
    end: date
    val: int | float
    accn: str
    filed: date
    form: str  # "10-K" | "10-K/A"


@dataclass(frozen=True)
class YearValues:
    fy: int
    revenue: int | float | None
    ebit: int | float | None
    interest: int | float | None
    total_debt: int | float | None
    total_assets: int | float | None
    equity: int | float | None
    ebit_tag: str | None
    revenue_tag: str | None
    debt_tags: tuple[str, ...]
    interest_tag: str | None  # Run_Report only (7.7); not in the firm file
    sources: tuple[Fact, ...]  # every fact behind a written value

    @property
    def is_gap(self) -> bool:
        return not self.sources


@dataclass(frozen=True)
class ExtractResult:
    has_annual_facts: bool
    window: tuple[int, ...]  # Firm_Window, ascending, <= 5 FYs
    years: tuple[YearValues, ...]  # every FY from window[0] to window[-1]

    @property
    def latest_fy(self) -> int | None:
        return self.window[-1] if self.window else None


TaggedFacts = Mapping[str, Sequence[Fact]]


def compustat_fy(end: date) -> int:
    """Jan-May period ends belong to the previous year (6.3)."""
    return end.year - 1 if end.month <= 5 else end.year


def _parse_date(raw: object) -> date | None:
    if not isinstance(raw, str):
        return None
    try:
        return date.fromisoformat(raw)
    except ValueError:
        return None


def _is_number(val: object) -> bool:
    return isinstance(val, (int, float)) and not isinstance(val, bool)


def _is_finite_number(val: object) -> bool:
    return _is_number(val) and math.isfinite(val)  # type: ignore[arg-type]


def _is_annual(raw: Mapping[str, object]) -> bool:
    return raw.get("form") in ANNUAL_FORMS and raw.get("fp") == "FY"


def annual_facts(companyfacts: Mapping[str, object], tag: str) -> list[Fact]:
    """us-gaap, USD, 10-K and 10-K/A, fp FY, finite numeric value (6.1, 7.12)."""
    facts = companyfacts.get("facts")
    if not isinstance(facts, Mapping):
        return []
    gaap = facts.get("us-gaap")
    if not isinstance(gaap, Mapping):
        return []
    entry = gaap.get(tag)
    if not isinstance(entry, Mapping):
        return []
    units = entry.get("units")
    if not isinstance(units, Mapping):
        return []
    rows = units.get("USD")
    if not isinstance(rows, list):
        return []
    out: list[Fact] = []
    for raw in rows:
        if not isinstance(raw, Mapping) or not _is_annual(raw):
            continue
        val = raw.get("val")
        if not _is_finite_number(val):
            continue
        end = _parse_date(raw.get("end"))
        filed = _parse_date(raw.get("filed"))
        accn = raw.get("accn")
        if end is None or filed is None or not isinstance(accn, str):
            continue
        start_raw = raw.get("start")
        start = _parse_date(start_raw)
        if start_raw is not None and start is None:
            continue
        out.append(
            Fact(
                tag=tag,
                start=start,
                end=end,
                val=val,  # type: ignore[arg-type]
                accn=accn,
                filed=filed,
                form=str(raw["form"]),
            )
        )
    return out


def has_any_annual_fact(companyfacts: Mapping[str, object]) -> bool:
    """Any taxonomy and unit; used for the no_annual_facts exclusion (2.10)."""
    facts = companyfacts.get("facts")
    if not isinstance(facts, Mapping):
        return False
    for taxonomy in facts.values():
        if not isinstance(taxonomy, Mapping):
            continue
        for entry in taxonomy.values():
            units = entry.get("units") if isinstance(entry, Mapping) else None
            if not isinstance(units, Mapping):
                continue
            for rows in units.values():
                if not isinstance(rows, list):
                    continue
                for raw in rows:
                    if isinstance(raw, Mapping) and _is_annual(raw) and _is_number(raw.get("val")):
                        return True
    return False


def dedupe(facts: Iterable[Fact]) -> list[Fact]:
    """Per (start, end) keep the fact with the largest (filed, accn) (6.7, 6.8)."""
    best: dict[tuple[date | None, date], Fact] = {}
    for f in facts:
        key = (f.start, f.end)
        cur = best.get(key)
        if cur is None or (f.filed, f.accn) > (cur.filed, cur.accn):
            best[key] = f
    return sorted(best.values(), key=lambda f: (f.end, f.start or date.min))


def _is_annual_flow(f: Fact) -> bool:
    if f.start is None:
        return False
    return FLOW_MIN_DAYS <= (f.end - f.start).days <= FLOW_MAX_DAYS


def flow_by_fy(facts: Iterable[Fact]) -> dict[int, list[Fact]]:
    """Flow facts lasting 350 to 380 days inclusive, keyed by Compustat FY (6.4)."""
    out: dict[int, list[Fact]] = {}
    for f in facts:
        if _is_annual_flow(f):
            out.setdefault(compustat_fy(f.end), []).append(f)
    return out


def fiscal_year_ends(flows: Mapping[str, Mapping[int, Sequence[Fact]]]) -> dict[int, date]:
    """Latest usable flow end date per FY across all flow tags (6.12)."""
    ends: dict[int, date] = {}
    for by_fy in flows.values():
        for fy, facts in by_fy.items():
            for f in facts:
                if fy not in ends or f.end > ends[fy]:
                    ends[fy] = f.end
    return ends


def pick_flow(facts_for_fy: Sequence[Fact], fye: date) -> Fact | None:
    """The single usable flow fact ending on the Fiscal_Year_End, else None (7.1).

    Facts ending on another date are ignored (6.12). If several distinct periods
    end on fye, the value is ambiguous and not usable.
    """
    hits = [f for f in facts_for_fy if f.end == fye and _is_annual_flow(f)]
    return hits[0] if len(hits) == 1 else None


def pick_instant(facts: Sequence[Fact], fye: date) -> Fact | None:
    """Exact date, else closest within 7 days, tie goes to the earlier date (6.5, 6.6, 6.14).

    Among facts on the chosen date the largest (filed, accn) wins (6.16).
    """
    cands = [f for f in facts if f.start is None and abs((f.end - fye).days) <= INSTANT_WINDOW_DAYS]
    if not cands:
        return None
    # Distance first, then the earlier date on equal distance.
    best_date = min(cands, key=lambda f: (abs((f.end - fye).days), f.end)).end
    return max((f for f in cands if f.end == best_date), key=lambda f: (f.filed, f.accn))


def _flow_pick(tagged: TaggedFacts, tag: str, fy: int, fye: date) -> Fact | None:
    return pick_flow(flow_by_fy(dedupe(tagged.get(tag, ()))).get(fy, []), fye)


def _instant_pick(tagged: TaggedFacts, tag: str, fye: date) -> Fact | None:
    return pick_instant(tagged.get(tag, ()), fye)


def _gap_row(fy: int) -> YearValues:
    return YearValues(
        fy=fy,
        revenue=None,
        ebit=None,
        interest=None,
        total_debt=None,
        total_assets=None,
        equity=None,
        ebit_tag=None,
        revenue_tag=None,
        debt_tags=(),
        interest_tag=None,
        sources=(),
    )


def build_year(fy: int, fye: date, tagged: TaggedFacts) -> YearValues:
    """Apply the tag priorities of Requirement 7 for one fiscal year."""
    sources: list[Fact] = []

    def use(f: Fact | None) -> Fact | None:
        if f is not None and f not in sources:
            sources.append(f)
        return f

    revenue: Fact | None = None
    for tag in FLOW_TAGS["revenue"]:
        revenue = _flow_pick(tagged, tag, fy, fye)
        if revenue is not None:
            break
    revenue_val: int | float | None = revenue.val if revenue else None
    revenue_tag: str | None = revenue.tag if revenue else None
    if revenue is None:
        # 7.2a: no total-revenue tag has a value. Goods + services, or the one that is present.
        goods = _flow_pick(tagged, FLOW_TAGS["revenue_components"][0], fy, fye)
        services = _flow_pick(tagged, FLOW_TAGS["revenue_components"][1], fy, fye)
        present = [f for f in (goods, services) if f is not None]
        if present:
            revenue_val = sum(f.val for f in present)
            revenue_tag = REVENUE_TAG_JOIN.join(f.tag for f in present)
            for f in present:
                use(f)
    use(revenue)

    interest: Fact | None = None
    for tag in FLOW_TAGS["interest"]:
        interest = _flow_pick(tagged, tag, fy, fye)
        if interest is not None:  # zero and negative values are usable (7.6)
            break
    use(interest)

    ebit_val: int | float | None = None
    ebit_tag: str | None = None
    op = _flow_pick(tagged, FLOW_TAGS["ebit"][0], fy, fye)
    if op is not None:
        ebit_val, ebit_tag = op.val, op.tag
        use(op)
    else:
        pretax = _flow_pick(tagged, FLOW_TAGS["pretax"][0], fy, fye)
        if (
            pretax is not None
            and interest is not None
            and pretax.start == interest.start
            and pretax.end == interest.end
        ):
            ebit_val, ebit_tag = pretax.val + interest.val, pretax.tag
            use(pretax)

    parts: list[Fact] = []
    for tag in DEBT_PART_TAGS:
        part = _instant_pick(tagged, tag, fye)
        if part is not None:
            parts.append(part)
    debt_val: int | float | None = None
    debt_tags: tuple[str, ...] = ()
    if parts:
        debt_val = sum(p.val for p in parts)
        debt_tags = tuple(p.tag for p in parts)
        for p in parts:
            use(p)
    else:
        lt = _instant_pick(tagged, DEBT_FALLBACK_TAG, fye)
        if lt is not None:
            debt_val, debt_tags = lt.val, (lt.tag,)
            use(lt)
    if debt_val is None:
        # 7.9a, stage 2: only when stage 1 gave nothing, so no overlap with the stage 1 tags is possible.
        # A total tag; else the first present tag of each bucket (never two of one bucket); else NotesPayable.
        total = next((f for t in DEBT_TOTAL_TAGS if (f := _instant_pick(tagged, t, fye)) is not None), None)
        if total is not None:
            debt_val, debt_tags = total.val, (total.tag,)
            use(total)
        else:
            buckets = (DEBT_NONCURRENT_ALT_TAGS, DEBT_CURRENT_ALT_TAGS)
            chosen = [
                f for tags in buckets
                if (f := next((x for t in tags if (x := _instant_pick(tagged, t, fye)) is not None), None)) is not None
            ]
            if not chosen:
                last = _instant_pick(tagged, DEBT_LAST_TAG, fye)
                chosen = [last] if last is not None else []
            if chosen:
                debt_val = sum(f.val for f in chosen)
                debt_tags = tuple(f.tag for f in chosen)
                for f in chosen:
                    use(f)

    assets = use(_instant_pick(tagged, ASSETS_TAG, fye))
    equity = use(_instant_pick(tagged, EQUITY_TAG, fye))

    return YearValues(
        fy=fy,
        revenue=revenue_val,
        ebit=ebit_val,
        interest=interest.val if interest else None,
        total_debt=debt_val,
        total_assets=assets.val if assets else None,
        equity=equity.val if equity else None,
        ebit_tag=ebit_tag,
        revenue_tag=revenue_tag,
        debt_tags=debt_tags,
        interest_tag=interest.tag if interest else None,
        sources=tuple(sources),
    )


def extract(companyfacts: Mapping[str, object]) -> ExtractResult:
    """Build the Firm_Window (latest 5 FYs with a flow value) and the year rows (6.9, 6.10, 6.13)."""
    has_annual = has_any_annual_fact(companyfacts)
    tagged: dict[str, list[Fact]] = {}
    for tag in ALL_TAGS:
        facts = dedupe(annual_facts(companyfacts, tag))
        if facts:
            tagged[tag] = facts

    flows: dict[str, dict[int, list[Fact]]] = {
        tag: flow_by_fy(tagged.get(tag, ()))
        for tags in FLOW_TAGS.values()
        for tag in tags
    }
    ends = fiscal_year_ends(flows)
    if not ends:
        return ExtractResult(has_annual_facts=has_annual, window=(), years=())

    window = tuple(sorted(ends)[-WINDOW_YEARS:])
    years = tuple(
        build_year(fy, ends[fy], tagged) if fy in ends else _gap_row(fy)
        for fy in range(window[0], window[-1] + 1)
    )
    return ExtractResult(has_annual_facts=has_annual, window=window, years=years)
