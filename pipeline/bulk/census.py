"""Tag census for the core firms that miss total debt, interest expense or revenue in FY2024
(Requirement 30.4 to 30.8).

Read-only: it changes no tag list, no panel column and no contract file. It reads the three
Phase 1 tables and, one member at a time, the companyfacts members of the census population,
and writes ``tag_census.md`` and three small CSVs.
"""
from __future__ import annotations

import json
import re
from collections import Counter
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Any, Callable, Sequence

import pandas as pd

from pipeline.bulk.download import COMPANYFACTS_URL, zip_path
from pipeline.bulk.reader import MemberStats, iter_members
from pipeline.bulk.report import (
    DISCLAIMER,
    _atomic_write,
    csv_bytes,
    load_tables,
    md_table,
    prepare,
    source_info,
    _source_block,
)
from pipeline.config import MissingBulkFileError
from pipeline.facts import (
    DEBT_FALLBACK_TAG,
    DEBT_PART_TAGS,
    FLOW_TAGS,
    annual_facts,
    compustat_fy,
    dedupe,
    flow_by_fy,
    pick_flow,
    pick_instant,
)

CENSUS_FY = 2024
TOP_N = 30
EVIDENCE_TOLERANCE = 0.01


@dataclass(frozen=True)
class FieldSpec:
    name: str  # census name
    panel_col: str
    kind: str  # "instant" (balance sheet) or "flow" (income statement)
    existing: tuple[str, ...]
    candidates: tuple[str, ...]
    include: re.Pattern[str]
    exclude: re.Pattern[str]
    report_only: frozenset[str] = frozenset()


DEBT = FieldSpec(
    "debt", "total_debt", "instant",
    existing=(*DEBT_PART_TAGS, DEBT_FALLBACK_TAG),
    candidates=(
        "DebtCurrent", "LongTermDebtAndCapitalLeaseObligations", "LongTermDebtAndCapitalLeaseObligationsCurrent",
        "LongTermNotesPayable", "NotesPayable", "NotesPayableCurrent", "ConvertibleNotesPayable", "LinesOfCreditCurrent",
        "CommercialPaper", "SeniorNotes", "SecuredDebt", "OtherLongTermDebt", "DebtInstrumentCarryingAmount",
    ),
    include=re.compile(r"(Debt|Notes|Borrowing|Loan|Debenture|Bond|LineOfCredit|LinesOfCredit|CommercialPaper|CreditFacility|Convertible)"),
    exclude=re.compile(
        r"(Fair|Discount|Premium|Issuance|Unamortized|FaceAmount|Maturit|Covenant|Capacity|Unused|Remaining|Increase|Decrease|"
        r"Receivable|Interest|Expense|Gain|Loss|Rate|Percentage|Ratio|Excess|Payments|Repayment|Proceeds|Securities|Policy|"
        r"Number|Weighted|Amortization|Extinguishment|Conversion|Deferred|Collateral|Guarantee|Disclosure|Assumed|Forgiven)"
    ),
)
REVENUE = FieldSpec(
    "revenue", "revenue", "flow",
    existing=FLOW_TAGS["revenue"],
    candidates=(
        "RevenueFromContractWithCustomerIncludingAssessedTax", "SalesRevenueGoodsNet", "SalesRevenueServicesNet",
        "RevenuesNetOfInterestExpense",
    ),
    include=re.compile(r"(Revenue|Sales)"),
    exclude=re.compile(
        r"(Cost|Deferred|Receivable|Allowance|Reduction|Percentage|Gain|Loss|Expense|Return|Discount|Reserve|Unearned|Remaining|"
        r"Concentration|Increase|Decrease|Marketing|Proceeds|Maturities|Securities|ContractWithCustomerAsset|ContractWithCustomerLiability|"
        r"SaleOf|SalesType|ProForma|Pro Forma|Tax$|Segment|Intersegment|Related|Acquisition|Disposal|Discontinued)"
    ),
)
INTEREST = FieldSpec(
    "interest", "interest_expense", "flow",
    existing=FLOW_TAGS["interest"],
    candidates=("InterestExpenseRelatedParty", "InterestExpenseOperating", "InterestCostsIncurred", "InterestPaidNet"),
    include=re.compile(r"(Interest\w*(Expense|Costs?|Paid|Incurred)|(Expense|Costs?)\w*Interest)"),
    exclude=re.compile(r"(Noncontrolling|Minority|Rate|Income|Receivable|Capitalized|Payable|Accrued|Unpaid|Imputed|Deferred|Fair|Gain|Loss|Increase|Decrease|Amortization|Tax)"),
    report_only=frozenset({"InterestPaidNet"}),
)
SPECS = (DEBT, REVENUE, INTEREST)

# What each named tag normally contains, and whether it can be added to the existing parts.
# These are judgments from the XBRL definitions; the evidence columns test them on the data.
NOTES: dict[str, str] = {
    "LongTermDebtNoncurrent": "Long-term debt without the current portion. Part of today's sum.",
    "LongTermDebtCurrent": "Current portion of long-term debt. Part of today's sum.",
    "ShortTermBorrowings": "Bank loans, commercial paper and lines of credit due within a year. Part of today's sum.",
    "LongTermDebt": "Total long-term debt, usually including the current portion. Used only when no part exists, so it cannot double count.",
    "DebtCurrent": "All debt due within a year (short-term borrowings plus the current portion of long-term debt). Overlaps LongTermDebtCurrent and ShortTermBorrowings: use instead of them, never on top.",
    "LongTermDebtAndCapitalLeaseObligations": "Noncurrent debt including finance leases. Same role as LongTermDebtNoncurrent: use instead of it, never both. May include leases that tag excludes.",
    "LongTermDebtAndCapitalLeaseObligationsCurrent": "Current debt including finance leases. Same role as LongTermDebtCurrent: instead of it, never both.",
    "LongTermNotesPayable": "Noncurrent notes payable. Same role as LongTermDebtNoncurrent when a filer lacks that tag; a component of it if both exist.",
    "NotesPayable": "Notes payable, current and noncurrent as the filer shows them. Overlaps every other debt tag. Fallback only.",
    "NotesPayableCurrent": "Current notes payable. Overlaps ShortTermBorrowings, DebtCurrent and LongTermDebtCurrent. Fallback only.",
    "ConvertibleNotesPayable": "Convertible notes. A component of long-term debt: add only when no parent tag exists.",
    "LinesOfCreditCurrent": "Drawn lines of credit due within a year. A component of ShortTermBorrowings and DebtCurrent.",
    "CommercialPaper": "Commercial paper outstanding. A component of ShortTermBorrowings and DebtCurrent.",
    "SeniorNotes": "Senior notes, one class of debt. A component of LongTermDebt: double counts if added to a parent.",
    "SecuredDebt": "Secured debt, one class. A component of LongTermDebt: double counts if added to a parent.",
    "OtherLongTermDebt": "Other long-term debt. A component when the filer shows classes, the whole amount for a small filer.",
    "DebtInstrumentCarryingAmount": "Carrying amount of debt instruments, often one table of a note. May overlap every other tag. Last fallback only.",
    "Revenues": "Total revenue. First choice today.",
    "RevenueFromContractWithCustomerExcludingAssessedTax": "Revenue from contracts, without sales taxes. Second choice today.",
    "SalesRevenueNet": "Older total sales tag. Third choice today.",
    "RevenueFromContractWithCustomerIncludingAssessedTax": "Same concept as the ExcludingAssessedTax tag but with sales taxes included, so slightly higher. An alternative to it, never both.",
    "SalesRevenueGoodsNet": "Revenue from goods only. A component: the total is goods plus services (SalesRevenueServicesNet), so one alone understates.",
    "SalesRevenueServicesNet": "Revenue from services only. A component, see SalesRevenueGoodsNet.",
    "RevenuesNetOfInterestExpense": "Bank revenue after interest expense. A net tag, mainly financial firms, not comparable to gross revenue.",
    "InterestExpense": "Interest expense. First choice today.",
    "InterestExpenseNonoperating": "Interest expense shown below operating income. Second choice today.",
    "InterestExpenseDebt": "Interest on debt. Third choice today.",
    "InterestAndDebtExpense": "Interest and debt expense including fees. Fourth choice today.",
    "InterestExpenseRelatedParty": "Interest paid to related parties. A component of total interest expense: alone it understates.",
    "InterestExpenseOperating": "Interest expense inside operating costs (finance arms, banks). Overlaps InterestExpense: an alternative, never both.",
    "InterestCostsIncurred": "Interest cost before capitalising part of it, so at least the expense. Do not mix with expense tags.",
    "InterestPaidNet": "Cash paid for interest (cash-flow statement), net of capitalised interest. Timing differs from expense. Reported only, never proposed.",
}


@dataclass
class TagStat:
    missing: int = 0  # firms missing the field that report the tag
    reporting: int = 0  # all census firms that report the tag
    both: int = 0  # firms with a panel value that also report the tag
    within: int = 0  # ... tag value within 1% of the panel value
    below: int = 0
    above: int = 0


@dataclass
class CensusResult:
    population: int = 0
    missing: dict[str, int] = field(default_factory=dict)
    stats: dict[str, dict[str, TagStat]] = field(default_factory=dict)
    debt_buckets: Counter = field(default_factory=Counter)  # (any debt-like tag, interest state) -> firms missing debt
    debt_strict_buckets: Counter = field(default_factory=Counter)  # same, but only named tags
    members: MemberStats = field(default_factory=MemberStats)
    parse_failed: list[dict[str, str]] = field(default_factory=list)


def status_of(spec: FieldSpec, tag: str) -> str:
    return "existing" if tag in spec.existing else "candidate" if tag in spec.candidates else "found by name"


def matches(spec: FieldSpec, tag: str) -> bool:
    return tag in spec.existing or tag in spec.candidates or bool(spec.include.search(tag) and not spec.exclude.search(tag))


def _num(x: object) -> float | None:
    return None if x is None or (isinstance(x, float) and x != x) else float(x)  # type: ignore[arg-type]


def reported_value(cf: dict[str, Any], tag: str, spec: FieldSpec, fye: date) -> float | None:
    """The firm's value for ``tag`` in the fiscal year ending ``fye``: annual forms, USD, a flow of
    350 to 380 days ending on ``fye`` or an instant within 7 days of it (the extractor's rules)."""
    facts = dedupe(annual_facts(cf, tag))
    if spec.kind == "instant":
        hit = pick_instant(facts, fye)
    else:
        hit = pick_flow(flow_by_fy(facts).get(compustat_fy(fye), []), fye)
    return None if hit is None else float(hit.val)


def firm_reported(cf: dict[str, Any], fye: date) -> dict[str, dict[str, float]]:
    """For each field, the tags (existing, named or found by name) the firm reports for that year."""
    gaap = (cf.get("facts") or {}).get("us-gaap")
    out: dict[str, dict[str, float]] = {s.name: {} for s in SPECS}
    if not isinstance(gaap, dict):
        return out
    for tag in gaap:
        for spec in SPECS:
            if matches(spec, tag):
                v = reported_value(cf, tag, spec, fye)
                if v is not None:
                    out[spec.name][tag] = v
    return out


def _interest_state(v: float | None) -> str:
    return "missing" if v is None else "zero" if v == 0 else "negative" if v < 0 else "positive"


def tally(result: CensusResult, reported: dict[str, dict[str, float]], panel: dict[str, float | None]) -> None:
    """Add one firm to the census. ``panel`` has the firm's FY2024 panel values by panel column."""
    result.population += 1
    for spec in SPECS:
        pv = panel[spec.panel_col]
        is_missing = pv is None
        if is_missing:
            result.missing[spec.name] = result.missing.get(spec.name, 0) + 1
        table = result.stats.setdefault(spec.name, {})
        for tag, v in reported[spec.name].items():
            st = table.setdefault(tag, TagStat())
            st.reporting += 1
            if is_missing:
                st.missing += 1
            elif pv != 0:
                st.both += 1
                if abs(v - pv) <= EVIDENCE_TOLERANCE * abs(pv):
                    st.within += 1
                elif v < pv:
                    st.below += 1
                else:
                    st.above += 1
    if panel["total_debt"] is None:
        debt_tags = reported["debt"]
        named = any(t in DEBT.existing or t in DEBT.candidates for t in debt_tags)
        state = _interest_state(panel["interest_expense"])
        result.debt_buckets[(bool(debt_tags), state)] += 1
        result.debt_strict_buckets[(named, state)] += 1


def census_population(df: pd.DataFrame) -> pd.DataFrame:
    """Core firms with a present FY2024 row, with their Fiscal_Year_End and panel values."""
    rows = df[(df["fy"] == CENSUS_FY) & df["core"] & df["present"] & df["fye"].notna()]
    return rows[["cik", "fye", "total_debt", "revenue", "interest_expense"]].sort_values("cik", kind="mergesort").reset_index(drop=True)


def run_census(
    out_dir: Path, zip_dir: Path, progress: Callable[[int, int], None] | None = None,
) -> CensusResult:
    tables = load_tables(out_dir)
    pop = census_population(prepare(tables.panel, tables.firms))
    cf_zip = zip_path(zip_dir, COMPANYFACTS_URL)
    if not cf_zip.is_file():
        raise MissingBulkFileError(f"{cf_zip.name} is not cached under {zip_dir}; run `download` first", "20.4")
    by_cik = {r.cik: r for r in pop.itertuples(index=False)}
    result = CensusResult()
    done = 0
    for member in iter_members(cf_zip, result.members, ciks=set(by_cik)):
        if member.kind != "main":
            continue
        row = by_cik[member.cik]
        doc: Any = None
        if member.error is None:
            try:
                doc = json.loads(member.data or b"")
                if not isinstance(doc, dict):
                    raise ValueError("top level is not an object")
            except ValueError as exc:
                result.parse_failed.append({"member": member.name, "error": f"{type(exc).__name__}: {exc}"})
                doc = None
        else:
            result.parse_failed.append({"member": member.name, "error": f"{type(member.error).__name__}: {member.error}"})
        done += 1
        if progress is not None:
            progress(done, len(by_cik))
        if doc is None:
            continue
        tally(result, firm_reported(doc, row.fye.date()),
              {"total_debt": _num(row.total_debt), "revenue": _num(row.revenue), "interest_expense": _num(row.interest_expense)})
        del doc, member
    return result


# --- tables and text ----------------------------------------------------------------------------
def field_table(spec: FieldSpec, result: CensusResult) -> pd.DataFrame:
    """Top 30 tags by firms missing the field, plus every named candidate and existing tag."""
    stats = result.stats.get(spec.name, {})
    n_missing = result.missing.get(spec.name, 0)
    rows = []
    for tag, st in stats.items():
        rows.append((tag, st))
    named = [t for t in (*spec.existing, *spec.candidates)]
    for t in named:
        if t not in stats:
            rows.append((t, TagStat()))
    rows.sort(key=lambda r: (-r[1].missing, -r[1].reporting, r[0]))
    top = {t: i + 1 for i, (t, _) in enumerate(rows[:TOP_N])}
    keep = [(t, s) for t, s in rows if t in top or t in named]
    out = pd.DataFrame([{
        "rank": top.get(t),
        "tag": t, "status": status_of(spec, t) + (" (report only)" if t in spec.report_only else ""),
        "firms_missing_field_reporting": s.missing,
        "share_of_missing": round(s.missing / n_missing, 6) if n_missing else float("nan"),
        "firms_reporting_all": s.reporting,
        "both_reported": s.both, "within_1pct": s.within, "tag_below_panel": s.below, "tag_above_panel": s.above,
        "double_count_note": NOTES.get(t, "Found by name, not assessed. See the evidence columns."),
    } for t, s in keep])
    out["rank"] = out["rank"].astype("Int64")
    return out


def _debt_free_table(result: CensusResult) -> pd.DataFrame:
    rows = []
    for state in ("zero", "missing", "positive", "negative"):
        no_tag = result.debt_buckets.get((False, state), 0)
        any_tag = result.debt_buckets.get((True, state), 0)
        no_named = result.debt_strict_buckets.get((False, state), 0)
        rows.append({"interest_expense_fy2024": state, "no_debt_like_tag": no_tag, "reports_a_debt_like_tag": any_tag,
                     "no_named_debt_tag": no_named, "reports_a_named_debt_tag": result.debt_strict_buckets.get((True, state), 0)})
    return pd.DataFrame(rows)


def likely_debt_free(result: CensusResult) -> int:
    return sum(result.debt_buckets.get((False, s), 0) for s in ("zero", "missing"))


def render_census(result: CensusResult, info) -> tuple[str, dict[str, pd.DataFrame]]:
    frames = {f"tag_census_{s.name}.csv": field_table(s, result) for s in SPECS}
    debt_free = _debt_free_table(result)
    md = (
        "# Tag census\n\n" + DISCLAIMER + "\n\n"
        "This file changes nothing. It shows which XBRL tags the core firms that miss a value in FY2024 do report, so the tag "
        "lists can be chosen from facts.\n\n## Source\n\n" + _source_block(info) + "\n"
        "## Population and method\n\n"
        f"- Census population: core firms (not financial, not utility, age at FY{CENSUS_FY} of 10 or more) with a present "
        f"FY{CENSUS_FY} row: **{result.population}**.\n"
        + "".join(f"- Missing {s.panel_col} in the panel: **{result.missing.get(s.name, 0)}**.\n" for s in SPECS)
        + "- A firm *reports* a tag when the tag has an annual-form (10-K, 10-K/A) USD value for the firm's fiscal year: a flow of "
        "350 to 380 days ending on the fiscal year end, or a balance-sheet value within 7 days of it. These are the extractor's rules.\n"
        "- Tags are those on Frank's list (`candidate`), the tags in today's priority list (`existing`), and tags whose names match a keyword "
        "pattern and are not obviously something else (`found by name`). The keyword patterns are heuristics: expect some noise.\n"
        "- `firms_missing_field_reporting` counts firms that miss the field in the panel and report the tag. "
        "`both_reported`, `within_1pct`, `tag_below_panel` and `tag_above_panel` are measured on all census firms that have a panel value and "
        "also report the tag: they show whether the tag is the same number as the existing value (within 1%), a part of it (below) or something larger (above).\n"
        "- `existing` tags can still show firms missing the field: their value was rejected by a rule (for example two different periods on the same end date).\n"
        f"- Members read: {result.members.read}; not selected: {result.members.not_selected}; parse failures: {len(result.parse_failed)}.\n\n"
    )
    for spec, title in ((DEBT, "Total debt"), (REVENUE, "Revenue"), (INTEREST, "Interest expense")):
        t = frames[f"tag_census_{spec.name}.csv"]
        n = result.missing.get(spec.name, 0)
        shown = t[t["rank"].notna()].drop(columns=["double_count_note", "rank"])
        named = t[t["status"].str.startswith(("candidate", "existing"))][["tag", "status", "firms_missing_field_reporting", "firms_reporting_all", "double_count_note"]]
        md += (
            f"## {title}\n\n{n} census firms miss {spec.panel_col}.\n\n"
            f"### Top {TOP_N} tags reported by those firms\n\n" + md_table(shown, {"share_of_missing": "{:.1%}"})
            + "\n### Named candidates and today's tags, with double-count notes\n\n" + md_table(named) + "\n"
        )
        if spec is DEBT:
            md += (
                "### Firms missing total debt that report no debt-like tag\n\n"
                f"Of the {n} firms, **{likely_debt_free(result)}** report no debt-like tag at all (not on the list and no keyword match) and have "
                "FY2024 interest expense of 0 or missing: these are **likely debt-free, not missing data**. The second pair of columns uses only "
                "today's and Frank's named tags.\n\n" + md_table(debt_free) + "\n"
            )
    md += (
        "## What to read from this\n\n"
        "- A tag with many `firms_missing_field_reporting` and `within_1pct` near `both_reported` is the same number as the existing value in another tag: "
        "adding it as an alternative recovers firms without changing firms that already have a value.\n"
        "- A tag mostly `tag_below_panel` is a part of the total: it can only be added when the parent is absent.\n"
        "- A tag mostly `tag_above_panel` is a broader concept (for example lease-inclusive or gross): adding it changes definitions.\n"
    )
    return md, frames


def write_census(result: CensusResult, info, reports_dir: Path) -> list[str]:
    md, frames = render_census(result, info)
    reports_dir.mkdir(parents=True, exist_ok=True)
    names = []
    for name, frame in sorted(frames.items()):
        _atomic_write(reports_dir / name, csv_bytes(frame))
        names.append(name)
    _atomic_write(reports_dir / "tag_census.md", md.encode("utf-8"))
    return names + ["tag_census.md"]


def run(
    out_dir: Path, zip_dir: Path, reports_dir: Path, run_date: str,
    progress: Callable[[int, int], None] | None = None,
) -> tuple[list[str], dict[str, Any]]:
    result = run_census(out_dir, zip_dir, progress)
    files = write_census(result, source_info(zip_dir, run_date), reports_dir)
    summary = {
        "population": result.population, "missing": dict(sorted(result.missing.items())),
        "likely_debt_free": likely_debt_free(result), "members": {"read": result.members.read, "not_selected": result.members.not_selected},
        "parse_failed": result.parse_failed,
    }
    return files, summary
