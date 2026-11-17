#!/usr/bin/env python3
"""Generate the mock data files in data/mock/ (data contract v2).

Writes firms_index.json, firms/{cik}.json (rescue-eligible firms only),
macro.json and keeper_log.json, then validates every file against
data/schema/. Exits with status 1 if anything does not match.

Run from anywhere:  .venv/bin/python pipeline/scripts/make_mock.py

Standard library plus jsonschema only. Output is reproducible (fixed seed).
All firms are fictional. Statuses and reasons are computed from the rules in
.kiro/steering/zombie-definition.md; the generator only chooses the ICR
pattern each firm's financials are built from.
"""
from __future__ import annotations

import json
import math
import random
import re
import statistics
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

SEED = 20250331
REPO = Path(__file__).resolve().parents[2]
SCHEMA_DIR = REPO / "data" / "schema"
CHECK_BUNDLE = REPO / "web" / "scripts" / "check-bundle.mjs"
OUT_DIR = REPO / "data" / "mock"

FISCAL_YEARS = [2020, 2021, 2022, 2023, 2024]
LATEST_FY = FISCAL_YEARS[-1]
N_GENERIC = 199  # randomly generated firms; Ashgrove Works and the Act 1 firms come on top
N_ACT1 = 3
N_FIRMS = N_GENERIC + 1 + N_ACT1
MIN_AGE = 10  # universe rule: only firms with age_years >= 10 appear in any output file
DGS10 = 0.042  # mock 10-year Treasury, also written to macro.json
REFERENCE_YEAR = 2025  # age = years since first filing, measured at the 2025 filings
GENERATED_AT = "2025-03-31T00:00:00Z"
DEFINITION_VERSION = "2.0"

# Exact SEC SIC division names. Finance, Insurance and Real Estate is excluded
# by the contract (SIC 6000-6799, REITs included); Public Administration is left out
# to get to 8 divisions. Utilities (SIC 4900-4999) are excluded too, so the
# Transportation division pools hold no 49xx code.
# name -> (SIC code pool, firm count incl. Ashgrove and the Act 1 firms)
SECTORS = {
    "Agriculture, Forestry and Fishing": (["0100", "0200", "0700", "0900"], 10),
    "Mining": (["1000", "1040", "1311", "1400"], 19),
    "Construction": (["1520", "1531", "1600", "1700"], 16),
    "Manufacturing": (["2834", "3310", "3490", "3559", "3674"], 51),
    "Transportation, Communications, Electric, Gas and Sanitary Services": (
        ["4011", "4213", "4412", "4731", "4813"], 24),
    "Wholesale Trade": (["5000", "5065", "5122", "5140"], 19),
    "Retail Trade": (["5311", "5400", "5651", "5812", "5961"], 24),
    "Services": (["7370", "7389", "8011", "8200", "8741"], 40),
}

# Mock sector medians (hand-set, plausible). Used for fallback rescue_inputs.
SECTOR_MEDIANS = {
    "Agriculture, Forestry and Fishing":
        dict(margin_mean=0.060, margin_change_mean=-0.002, margin_change_sd=0.022, revenue_growth_median=0.015),
    "Mining":
        dict(margin_mean=0.090, margin_change_mean=-0.004, margin_change_sd=0.045, revenue_growth_median=0.010),
    "Construction":
        dict(margin_mean=0.055, margin_change_mean=-0.001, margin_change_sd=0.020, revenue_growth_median=0.025),
    "Manufacturing":
        dict(margin_mean=0.070, margin_change_mean=-0.002, margin_change_sd=0.018, revenue_growth_median=0.020),
    "Transportation, Communications, Electric, Gas and Sanitary Services":
        dict(margin_mean=0.110, margin_change_mean=-0.001, margin_change_sd=0.016, revenue_growth_median=0.020),
    "Wholesale Trade":
        dict(margin_mean=0.035, margin_change_mean=-0.001, margin_change_sd=0.012, revenue_growth_median=0.020),
    "Retail Trade":
        dict(margin_mean=0.045, margin_change_mean=-0.002, margin_change_sd=0.015, revenue_growth_median=0.018),
    "Services":
        dict(margin_mean=0.080, margin_change_mean=-0.002, margin_change_sd=0.025, revenue_growth_median=0.030),
}

NAME_PREFIXES = [
    "Alderwick", "Bramblecote", "Calloway", "Dunmore", "Elmstead", "Fenwick", "Garrowby", "Hartsmere",
    "Ingleby", "Juniper Hollow", "Kestrel Ridge", "Lowmoor", "Marlowe", "Netherby", "Oakhaven",
    "Pellham", "Quillon", "Ravenscar", "Saltmarsh", "Tindall", "Underhill", "Valemont", "Wexcombe",
    "Yarrowdale", "Zelmont", "Applegarth", "Brackenfell", "Cinderford", "Dovecote", "Eastmere",
    "Foxglove", "Greywater", "Hollinger", "Ironbridge", "Kingsmoor", "Moorcroft",
    "Northgate", "Ormsby", "Penhallow", "Redfern", "Stonebrook", "Thornbury", "Upperton", "Whitlock",
    "Ainsley", "Birchall", "Cresswell", "Dalbury", "Everard", "Fairlight", "Gilmore", "Halloran",
    "Ketteridge", "Lindhurst", "Mossgrove", "Nettlefold", "Osgood", "Pemberly", "Rowntree",
]
NAME_NOUNS = {
    "Agriculture, Forestry and Fishing": ["Farms", "Timber", "Fisheries", "Growers"],
    "Mining": ["Minerals", "Coal", "Resources", "Drilling"],
    "Construction": ["Builders", "Contracting", "Homes", "Civil"],
    "Manufacturing": ["Works", "Industries", "Mills", "Fabrication"],
    "Transportation, Communications, Electric, Gas and Sanitary Services": ["Freight", "Logistics", "Telecom", "Carriers"],
    "Wholesale Trade": ["Supply", "Distribution", "Trading", "Wholesale"],
    "Retail Trade": ["Stores", "Outfitters", "Markets", "Retail"],
    "Services": ["Partners", "Systems", "Health", "Consulting"],
}
NAME_SUFFIXES = ["Inc.", "Corp.", "Holdings", "Group", "Co."]

EBIT_TAG_PRIMARY = "OperatingIncomeLoss"
EBIT_TAG_FALLBACK = "IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest"
REVENUE_TAGS = ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "SalesRevenueNet"]
DEBT_TAG_SETS = [
    ["LongTermDebtNoncurrent", "LongTermDebtCurrent"],
    ["LongTermDebtNoncurrent", "LongTermDebtCurrent", "ShortTermBorrowings"],
    ["LongTermDebtNoncurrent"],
    ["LongTermDebt"],
]


class MockError(Exception):
    pass


def load_forbidden_markers():
    """Read FORBIDDEN_MARKERS from web/scripts/check-bundle.mjs (the build fails if any
    appears in dist/). Fails loudly if the list cannot be found, so the guard never goes silent."""
    text = CHECK_BUNDLE.read_text(encoding="utf-8")
    m = re.search(r"FORBIDDEN_MARKERS\s*=\s*\[(.*?)\]", text, re.S)
    markers = re.findall(r"'([^']+)'|\"([^\"]+)\"", m.group(1)) if m else []
    markers = [a or b for a, b in markers]
    if not markers:
        raise MockError(f"could not read FORBIDDEN_MARKERS from {CHECK_BUNDLE}")
    return markers


# ---------------------------------------------------------------------------
# Shared rules (zombie-definition.md)
# ---------------------------------------------------------------------------

def icr(ebit, interest):
    """EBIT / interest. Mirrors web/src/engine/icr.ts: null unless interest > 0."""
    if not isinstance(ebit, (int, float)) or isinstance(ebit, bool) or math.isnan(ebit):
        return None
    if not isinstance(interest, (int, float)) or isinstance(interest, bool):
        return None
    if not math.isfinite(interest) or not interest > 0:
        return None
    return ebit / interest


def fy_list(years):
    return ", ".join(f"FY{y}" for y in years)


def has_three_consecutive_complete(years):
    """True if 3 consecutive fiscal years each have both EBIT and interest expense."""
    complete = {y["fy"] for y in years if y["ebit_usd"] is not None and y["interest_expense_usd"] is not None}
    return any(all((fy + k) in complete for k in range(3)) for fy in complete)


def classify(age, years):
    """Return (status, reasons) using the rules in zombie-definition.md."""
    if not has_three_consecutive_complete(years):
        return "insufficient_data", [
            "Fewer than 3 consecutive fiscal years with both EBIT and interest expense available"
        ]

    by_fy = {y["fy"]: y["icr"] for y in years}
    latest = by_fy.get(LATEST_FY)
    if latest is None:
        raise MockError("generator produced a firm whose latest-year ICR is null but who has enough data")

    last3 = [LATEST_FY - 2, LATEST_FY - 1, LATEST_FY]
    last3_icr = [by_fy.get(fy) for fy in last3]
    below = [fy for fy, v in zip(last3, last3_icr) if v is not None and v < 1]
    all_three_below = len(below) == 3

    if all_three_below and age >= 10:
        return "zombie", [
            f"ICR below 1 in {fy_list(below)}",
            f"Firm age {age} years (first filing proxy), at least 10",
        ]
    if latest < 1 or len(below) >= 2:
        reasons = []
        if all_three_below:
            reasons.append(f"ICR below 1 in {fy_list(below)}")
            reasons.append(f"Firm age {age} years (first filing proxy), under 10, so not a zombie")
        elif latest < 1:
            reasons.append(f"ICR below 1 in the most recent year (FY{LATEST_FY}, {latest:.2f})")
            if len(below) >= 2:
                reasons.append(f"ICR below 1 in {len(below)} of the last 3 years ({fy_list(below)})")
        else:
            reasons.append(f"ICR below 1 in {len(below)} of the last 3 years ({fy_list(below)})")
        return "endangered", reasons
    return "healthy", [f"ICR {latest:.2f} in FY{LATEST_FY}, at least 1", "No more than one year below 1 in the last 3"]


# ---------------------------------------------------------------------------
# Firm construction
# ---------------------------------------------------------------------------

def draw_low(rng):
    """An ICR below 1 (never within rounding distance of 1)."""
    if rng.random() < 0.8:
        return rng.uniform(0.35, 0.93)
    return rng.uniform(-1.1, 0.2)


def draw_high(rng):
    return rng.uniform(1.15, 7.0)


def pattern_zombie(rng):
    seq = []
    for _ in range(2):
        seq.append(draw_low(rng) if rng.random() < 0.4 else draw_high(rng))
    return seq + [draw_low(rng) for _ in range(3)]


def pattern_from_flags(rng, flags):
    return [draw_low(rng) if f == "L" else draw_high(rng) for f in flags]


# Shaped classes the frontend needs (see the builders below). Counts are part of the contract
# with the frontend: at least 30 / 3 / 3 once the rules have been applied.
N_NEAR_LINE_HEALTHY = 24
N_NEAR_LINE_ENDANGERED = 8
N_MISLABELED = 4
N_OVERPRICED_ENDANGERED = 2
N_OVERPRICED_HEALTHY = 2
N_NEAR_LINE = N_NEAR_LINE_HEALTHY + N_NEAR_LINE_ENDANGERED
CRIT_MIN_PP, CRIT_MAX_PP = 0.25, 4.95  # near-line critical points spread evenly over this range
SHAPED_KINDS = ("near_line_healthy", "near_line_endangered", "mislabeled_growth",
                "overpriced_endangered", "overpriced_healthy")
N_SHAPED = N_NEAR_LINE + N_MISLABELED + N_OVERPRICED_ENDANGERED + N_OVERPRICED_HEALTHY


def build_archetypes(rng):
    """List of (archetype, expected_status). N_GENERIC firms; Ashgrove and the Act 1 firms are added separately."""
    arch = []
    arch += [("zombie", "zombie")] * 26
    arch += [("endangered_a", "endangered")] * 10   # only the latest year below 1
    arch += [("endangered_b", "endangered")] * 4    # L H L
    arch += [("endangered_c", "endangered")] * 4    # L L H: 2 of 3, latest fine
    arch += [("endangered_d", "endangered")] * 12   # H L L
    arch += [("healthy_clean", "healthy")] * 59
    arch += [("healthy_dip", "healthy")] * 20
    arch += [("healthy_norev", "healthy")] * 7      # revenue missing early: sector fallback
    arch += [("healthy_nodebt", "healthy")] * 8     # total debt missing in latest year
    arch += [("insufficient_mid", "insufficient_data")] * 5
    arch += [("insufficient_alt", "insufficient_data")] * 2
    arch += [("insufficient_latest", "insufficient_data")] * 2
    # Shaped classes. "expected" is only a self-check: statuses are always computed by classify().
    arch += [("near_line_healthy", "healthy")] * N_NEAR_LINE_HEALTHY
    arch += [("near_line_endangered", "endangered")] * N_NEAR_LINE_ENDANGERED
    arch += [("mislabeled_growth", "zombie")] * N_MISLABELED
    arch += [("overpriced_endangered", "endangered")] * N_OVERPRICED_ENDANGERED
    arch += [("overpriced_healthy", "healthy")] * N_OVERPRICED_HEALTHY
    assert len(arch) == N_GENERIC, len(arch)
    return arch


def icr_pattern(rng, kind):
    if kind == "zombie":
        return pattern_zombie(rng)
    if kind == "endangered_a":
        return pattern_from_flags(rng, "HHHHL")
    if kind == "endangered_b":
        return pattern_from_flags(rng, "HHLHL")
    if kind == "endangered_c":
        return pattern_from_flags(rng, "HHLLH")
    if kind == "endangered_d":
        return pattern_from_flags(rng, "HHHLL")
    if kind == "healthy_dip":
        flags = ["H"] * 5
        flags[rng.randint(0, 3)] = "L"
        return pattern_from_flags(rng, flags)
    # healthy_*, insufficient_*: healthy-looking numbers underneath
    if kind.startswith("insufficient"):
        return pattern_from_flags(rng, "HHLHH" if rng.random() < 0.5 else "HHHHH")
    return pattern_from_flags(rng, "HHHHH")


def pick_first_filing_year(rng, kind):
    if kind in ("zombie", "endangered_a", "endangered_b", "endangered_c", "endangered_d",
                "healthy_clean", "healthy_dip", "healthy_norev", "healthy_nodebt",
                "insufficient_mid", "insufficient_alt", "insufficient_latest") + SHAPED_KINDS:
        return REFERENCE_YEAR - rng.randint(MIN_AGE, 38)
    raise MockError(kind)


def build_years(rng, kind, ff, icr_targets):
    """Build the list of year dicts (ascending) from ICR targets."""
    first_fy = max(ff, FISCAL_YEARS[0])
    fys = [fy for fy in FISCAL_YEARS if fy >= first_fy]

    rev = math.exp(rng.uniform(math.log(8e7), math.log(1.5e10)))
    lev = rng.uniform(0.25, 0.9)
    debt = rev * lev
    base_rate = rng.uniform(0.035, 0.085)
    growth = rng.uniform(-0.03, 0.07)
    if kind == "zombie":
        growth = rng.uniform(-0.05, 0.02)
    ebit_tag = EBIT_TAG_FALLBACK if rng.random() < 0.15 else EBIT_TAG_PRIMARY
    rev_tag = REVENUE_TAGS[0] if rng.random() < 0.7 else rng.choice(REVENUE_TAGS[1:])
    debt_tags = list(rng.choice(DEBT_TAG_SETS))
    zombieish = kind == "zombie" or kind.startswith("endangered")

    rows = []
    for fy in fys:
        idx = FISCAL_YEARS.index(fy)
        rev *= 1 + growth + rng.uniform(-0.03, 0.03)
        debt *= 1 + rng.uniform(-0.04, 0.05)
        rate = base_rate + 0.003 * max(0, fy - 2021) + rng.uniform(-0.002, 0.002)
        interest = debt * rate
        target = icr_targets[idx]
        if target >= 1:
            target = min(target, 0.30 * rev / interest)  # keep margins plausible
        ebit = target * interest
        assets = max(rev * rng.uniform(0.9, 1.8), debt * 1.2)
        equity = assets * (rng.uniform(-0.15, 0.12) if zombieish and kind != "endangered_a" else rng.uniform(0.05, 0.35))
        rows.append(dict(
            fy=fy,
            revenue_usd=round(rev), ebit_usd=round(ebit), interest_expense_usd=round(interest),
            total_debt_usd=round(debt), total_assets_usd=round(assets), equity_usd=round(equity),
            ebit_tag=ebit_tag, revenue_tag=rev_tag, debt_tags=list(debt_tags),
        ))

    by_fy = {r["fy"]: r for r in rows}

    def blank(fy, *fields):
        r = by_fy.get(fy)
        if r is None:
            return
        for f in fields:
            r[f] = None
            if f == "revenue_usd":
                r["revenue_tag"] = None
            if f == "ebit_usd":
                r["ebit_tag"] = None
            if f == "total_debt_usd":
                r["debt_tags"] = []

    if kind == "insufficient_mid":
        blank(2022, "interest_expense_usd" if rng.random() < 0.5 else "ebit_usd")
    elif kind == "insufficient_alt":
        for fy in (2021, 2023):
            blank(fy, "ebit_usd", "interest_expense_usd")
    elif kind == "insufficient_latest":
        for fy in (2022, 2024):
            blank(fy, "ebit_usd")
    elif kind == "healthy_norev":
        for fy in (2020, 2021):
            blank(fy, "revenue_usd")
    elif kind == "healthy_nodebt":
        blank(2024, "total_debt_usd")

    for r in rows:
        r["icr"] = icr(r["ebit_usd"], r["interest_expense_usd"])
    return rows


def _finish_rows(rng, rows_spec, equity_mode):
    """rows_spec: list of dict(fy, revenue, ebit, interest, debt). Adds assets, equity and tags."""
    ebit_tag = EBIT_TAG_FALLBACK if rng.random() < 0.15 else EBIT_TAG_PRIMARY
    rev_tag = REVENUE_TAGS[0] if rng.random() < 0.7 else rng.choice(REVENUE_TAGS[1:])
    debt_tags = list(rng.choice(DEBT_TAG_SETS))
    rows = []
    for sp in rows_spec:
        if equity_mode == "growth":
            assets = sp["revenue"] * rng.uniform(1.0, 2.0)
            equity = assets * rng.uniform(0.40, 0.70)
        else:
            assets = max(sp["revenue"] * rng.uniform(0.9, 1.8), sp["debt"] * 1.2)
            equity = assets * (rng.uniform(-0.15, 0.12) if equity_mode == "thin" else rng.uniform(0.05, 0.35))
        rows.append(dict(
            fy=sp["fy"], revenue_usd=round(sp["revenue"]), ebit_usd=round(sp["ebit"]),
            interest_expense_usd=round(sp["interest"]), total_debt_usd=round(sp["debt"]),
            total_assets_usd=round(assets), equity_usd=round(equity),
            ebit_tag=ebit_tag, revenue_tag=rev_tag, debt_tags=list(debt_tags),
        ))
    for r in rows:
        r["icr"] = icr(r["ebit_usd"], r["interest_expense_usd"])
    return rows


def build_years_priced(rng, ff, icr_targets, rate_latest, lev):
    """Years whose latest-year implied rate and ICR are set directly (near-line and overpriced firms)."""
    fys = [fy for fy in FISCAL_YEARS if fy >= max(ff, FISCAL_YEARS[0])]
    rev_latest = math.exp(rng.uniform(math.log(8e7), math.log(1.5e10)))
    debt_latest = rev_latest * lev
    growth = rng.uniform(-0.03, 0.05)
    spec = []
    for fy in fys:
        back = LATEST_FY - fy
        rev = rev_latest / (1 + growth) ** back * (1 + rng.uniform(-0.02, 0.02) * (back > 0))
        debt = debt_latest * (1 + rng.uniform(-0.03, 0.03) * (back > 0))
        rate = rate_latest if back == 0 else rate_latest * (1 - 0.03 * back) * (1 + rng.uniform(-0.01, 0.01))
        interest = debt * rate
        spec.append(dict(fy=fy, revenue=rev, ebit=icr_targets[FISCAL_YEARS.index(fy)] * interest,
                         interest=interest, debt=debt))
    return spec


def near_line_rate(rng, crit_pp):
    """Implied rate for a firm with latest ICR in (1.02, 1.8] and critical point crit_pp.
    crit = (icr - 1) * rate * 100  =>  icr = 1 + crit / (100 * rate)."""
    lo = max(0.035, crit_pp / 100 / 0.78)   # keeps ICR <= 1.78
    hi = min(0.10, crit_pp / 100 / 0.03)    # keeps ICR >= 1.03
    if lo > hi:
        raise MockError(f"cannot place a near-line firm at critical point {crit_pp}")
    return rng.uniform(lo, hi)


def build_near_line(rng, kind, ff, crit_pp):
    rate = near_line_rate(rng, crit_pp)
    latest_icr = 1 + crit_pp / 100 / rate
    if kind == "near_line_endangered":
        targets = [rng.uniform(1.15, 3.0), rng.uniform(1.15, 3.0), draw_low(rng), draw_low(rng), latest_icr]
    else:
        targets = [rng.uniform(1.15, 3.0) for _ in range(4)] + [latest_icr]
    spec = build_years_priced(rng, ff, targets, rate, rng.uniform(0.25, 0.80))
    return _finish_rows(rng, spec, "thin" if kind == "near_line_endangered" else "normal")


def build_overpriced(rng, kind, ff):
    """Implied rate 12-16%, latest ICR 0.8-1.5, refinance applies at delta = 0 (checked later)."""
    if kind == "overpriced_endangered":
        latest_icr = rng.uniform(0.82, 0.95)
        rate = rng.uniform(0.140, 0.160)   # icr < 1 -> spread 9%: needs rate > 1.02 * 13.2% = 13.46%
    else:
        latest_icr = rng.uniform(1.25, 1.50)
        rate = rng.uniform(0.120, 0.160)   # 1 <= icr < 1.5 -> spread 6%: needs rate > 10.4%
    targets = [rng.uniform(1.15, 1.8) for _ in range(4)] + [latest_icr]
    spec = build_years_priced(rng, ff, targets, rate, rng.uniform(0.25, 0.65))
    return _finish_rows(rng, spec, "normal")


def build_mislabeled_growth(rng, ff):
    """A fast-growing, unprofitable, nearly debt-free firm: negative EBIT in all 5 years, revenue
    growth 35-60% a year, debt under 5% of assets, small positive interest. The rules call it a zombie."""
    rev = rng.uniform(1.5e7, 6e7)
    rate = rng.uniform(0.05, 0.09)
    margin = rng.uniform(-0.30, -0.12)
    spec, growths = [], []
    for fy in FISCAL_YEARS:
        if fy != FISCAL_YEARS[0]:
            rev *= 1 + rng.uniform(0.35, 0.60)
        margin = min(-0.05, margin + rng.uniform(-0.03, 0.04))
        debt = rev * rng.uniform(0.008, 0.025)  # assets are at least 1.0 x revenue, so debt < 2.5% of assets
        interest = debt * rate * rng.uniform(0.95, 1.05)
        spec.append(dict(fy=fy, revenue=rev, ebit=rev * margin, interest=interest, debt=debt))
    return _finish_rows(rng, spec, "growth")


def key_order(r):
    return {
        "fy": r["fy"],
        "revenue_usd": r["revenue_usd"],
        "ebit_usd": r["ebit_usd"],
        "interest_expense_usd": r["interest_expense_usd"],
        "total_debt_usd": r["total_debt_usd"],
        "total_assets_usd": r["total_assets_usd"],
        "equity_usd": r["equity_usd"],
        "icr": r["icr"],
        "ebit_tag": r["ebit_tag"],
        "revenue_tag": r["revenue_tag"],
        "debt_tags": r["debt_tags"],
    }


MONEY_FIELDS = ["revenue_usd", "ebit_usd", "interest_expense_usd",
                "total_debt_usd", "total_assets_usd", "equity_usd"]


def rescue_eligible(years):
    """Latest FY has all six money fields, and at least 3 years of complete history."""
    latest = next((y for y in years if y["fy"] == LATEST_FY), None)
    if latest is None or any(latest[f] is None for f in MONEY_FIELDS):
        return False
    complete = [y for y in years if all(y[f] is not None for f in MONEY_FIELDS)]
    return len(complete) >= 3


def implied_rate_of(latest):
    if latest is None:
        return None
    interest, debt = latest["interest_expense_usd"], latest["total_debt_usd"]
    if interest is None or debt is None or not debt > 0:
        return None
    return interest / debt


def shock_eligible_of(latest):
    rate = implied_rate_of(latest)
    return rate is not None and rate > 0


def compute_rescue_inputs(years, sector):
    """Own-history inputs (margin = EBIT / revenue); sector fallback below 4 usable years."""
    usable = [y for y in years if y["revenue_usd"] and y["revenue_usd"] > 0 and y["ebit_usd"] is not None]
    if len(usable) < 4:
        med = SECTOR_MEDIANS[sector]
        return dict(
            margin_mean=med["margin_mean"],
            margin_change_mean=med["margin_change_mean"],
            margin_change_sd=med["margin_change_sd"],
            revenue_growth_median=med["revenue_growth_median"],
            history_years=len(usable),
            used_sector_fallback=True,
        )
    margins = {y["fy"]: y["ebit_usd"] / y["revenue_usd"] for y in usable}
    revs = {y["fy"]: y["revenue_usd"] for y in usable}
    changes = [margins[fy] - margins[fy - 1] for fy in sorted(margins) if fy - 1 in margins]
    growth = [revs[fy] / revs[fy - 1] - 1 for fy in sorted(revs) if fy - 1 in revs]
    if len(changes) < 2 or not growth:
        raise MockError("usable years are too scattered for margin statistics")
    return dict(
        margin_mean=round(statistics.fmean(margins.values()), 6),
        margin_change_mean=round(statistics.fmean(changes), 6),
        margin_change_sd=round(statistics.stdev(changes), 6),
        revenue_growth_median=round(statistics.median(growth), 6),
        history_years=len(usable),
        used_sector_fallback=False,
    )


# ---------------------------------------------------------------------------
# Ashgrove Works (fixed fixture shared with the frontend)
# ---------------------------------------------------------------------------

ASHGROVE_ROWS = [  # fy, revenue, EBIT, interest, debt, assets, equity
    (2020, 1.14e9, 92e6, 58e6, 1.00e9, 1.55e9, 260e6),
    (2021, 1.16e9, 70e6, 59e6, 1.02e9, 1.56e9, 235e6),
    (2022, 1.17e9, 52e6, 60e6, 1.03e9, 1.58e9, 195e6),
    (2023, 1.18e9, 45e6, 60.5e6, 1.04e9, 1.59e9, 165e6),
    (2024, 1.20e9, 38e6, 61e6, 1.05e9, 1.60e9, 140e6),
]


def make_ashgrove():
    years = []
    for fy, rev, ebit, interest, debt, assets, equity in ASHGROVE_ROWS:
        r = dict(
            fy=fy, revenue_usd=round(rev), ebit_usd=round(ebit), interest_expense_usd=round(interest),
            total_debt_usd=round(debt), total_assets_usd=round(assets), equity_usd=round(equity),
            ebit_tag=EBIT_TAG_PRIMARY, revenue_tag="Revenues",
            debt_tags=["LongTermDebtNoncurrent", "LongTermDebtCurrent"],
        )
        r["icr"] = icr(r["ebit_usd"], r["interest_expense_usd"])
        years.append(r)
    return dict(
        cik="9999000001", name="Ashgrove Works", sector="Manufacturing", sic="3490",
        first_filing_year=2001, filed="2025-02-20", form="10-K", years=years,
        rescue_inputs=dict(
            margin_mean=0.035, margin_change_mean=-0.004, margin_change_sd=0.018,
            revenue_growth_median=0.01, history_years=5, used_sector_fallback=False,
        ),
        expected_status="zombie", kind="fixture",
    )

# ---------------------------------------------------------------------------
# Act 1 firms: three hand-built manufacturing firms, one per diagnosis
# ---------------------------------------------------------------------------

# (fy, revenue, EBIT, interest, debt, assets, equity), in USD millions.
ACT1_SPECS = [
    dict(  # temporary profit drop: healthy margin, then one bad year; low debt
        kind="act1_temporary_drop", expected="endangered", cik="9999000201",
        name="Harrowgate Tooling Co.", sic="3559", first_filing_year=1998, filed="2025-02-27",
        rows=[(2020, 402, 22.1, 6.7, 95, 360, 150),
              (2021, 411, 22.6, 6.8, 97, 365, 158),
              (2022, 423, 23.3, 6.9, 98, 370, 166),
              (2023, 431, 23.7, 7.0, 99, 372, 172),
              (2024, 438, -17.5, 7.1, 100, 375, 150)]),
    dict(  # too much debt: flat EBIT, interest rising every year, high debt
        kind="act1_too_much_debt", expected="zombie", cik="9999000202",
        name="Penrose Steelworks Group", sic="3310", first_filing_year=1994, filed="2025-02-18",
        rows=[(2020, 905, 52.4, 49.0, 700, 1300, 320),
              (2021, 902, 51.8, 60.0, 760, 1330, 300),
              (2022, 898, 52.9, 68.0, 830, 1370, 280),
              (2023, 907, 52.1, 75.0, 910, 1410, 255),
              (2024, 901, 52.5, 82.0, 1000, 1450, 230)]),
    dict(  # broken business: EBIT negative in 4 of 5 years, shrinking revenue
        kind="act1_broken_business", expected="zombie", cik="9999000203",
        name="Wickersham Appliance Corp.", sic="3630", first_filing_year=1991, filed="2025-03-06",
        rows=[(2020, 612, 14.2, 10.9, 160, 430, 140),
              (2021, 571, -9.1, 11.3, 165, 405, 118),
              (2022, 533, -27.6, 11.9, 170, 370, 84),
              (2023, 502, -33.8, 12.3, 172, 340, 48),
              (2024, 468, -41.5, 12.8, 175, 310, 9)]),
]


def make_act1_firms():
    """Fixed figures, no randomness. Every firm is old enough and rescue-eligible."""
    firms = []
    for sp in ACT1_SPECS:
        years = []
        for fy, rev, ebit, interest, debt, assets, equity in sp["rows"]:
            m = 1_000_000
            r = dict(
                fy=fy, revenue_usd=round(rev * m), ebit_usd=round(ebit * m),
                interest_expense_usd=round(interest * m), total_debt_usd=round(debt * m),
                total_assets_usd=round(assets * m), equity_usd=round(equity * m),
                ebit_tag=EBIT_TAG_PRIMARY, revenue_tag="Revenues",
                debt_tags=["LongTermDebtNoncurrent", "LongTermDebtCurrent"],
            )
            r["icr"] = icr(r["ebit_usd"], r["interest_expense_usd"])
            years.append(r)
        firms.append(dict(
            cik=sp["cik"], name=sp["name"], sector="Manufacturing", sic=sp["sic"],
            first_filing_year=sp["first_filing_year"], filed=sp["filed"], form="10-K",
            years=years, expected_status=sp["expected"], kind=sp["kind"],
        ))
    return firms


# PROVISIONAL: stand-in for the rescue engine until rescue-engine v2 exists. Replace this block
# with the real engine once it can be run from Python (or a shared fixture). Assumptions: 3-year
# projection from the latest year; revenue flat; debt constant; interest = latest implied rate x
# debt; margin reverts toward the 5-year mean margin with kappa 0.3 per year; CUT COSTS adds
# 0.08 x (revenue - EBIT) to year-0 EBIT and that gain reverts with the margin; CUT DEBT halves
# debt and interest; a tool "holds" if ICR >= 1 in all 3 years.
PROVISIONAL_KAPPA = 0.3
PROVISIONAL_TOOLS = ("do_nothing", "cut_costs", "cut_debt")
# (do nothing, cut costs, cut debt): True = holds all 3 years, False = fails at least one year.
# Extra per-year conditions are in PROVISIONAL_YEAR_RULES.
ACT1_EXPECTED_HOLDS = {
    "act1_temporary_drop": (False, True, False),
    "act1_too_much_debt": (False, False, True),
    "act1_broken_business": (False, False, False),
}
# Year-level requirements: (tool, year) -> must the ICR be >= 1 in that year (1-based).
PROVISIONAL_YEAR_RULES = {
    "act1_temporary_drop": {("do_nothing", 1): False, ("cut_debt", 1): False},
    "act1_too_much_debt": {("cut_costs", 1): True},
}


def provisional_projection(doc):
    """PROVISIONAL. Returns {tool: [ICR year 1, 2, 3]} for the firm file doc."""
    last = doc["years"][-1]
    rev, ebit, debt = last["revenue_usd"], last["ebit_usd"], last["total_debt_usd"]
    interest = last["interest_expense_usd"] / debt * debt  # latest implied rate x debt
    mean = doc["rescue_inputs"]["margin_mean"]
    out = {}
    for tool in PROVISIONAL_TOOLS:
        e0 = ebit + (0.08 * (rev - ebit) if tool == "cut_costs" else 0.0)
        i = interest / 2 if tool == "cut_debt" else interest
        m, icrs = e0 / rev, []
        for _ in range(3):
            m += PROVISIONAL_KAPPA * (mean - m)
            icrs.append(icr(m * rev, i))
        out[tool] = icrs
    return out


def provisional_check_act1(firms, firm_files):
    """PROVISIONAL. Each Act 1 firm must have exactly the tool outcomes in ACT1_EXPECTED_HOLDS."""
    table = {}
    for f in firms:
        if not f["kind"].startswith("act1_"):
            continue
        proj = provisional_projection(firm_files[f["cik"]])
        table[f["name"]] = proj
        holds = {t: all(v is not None and v >= 1 for v in proj[t]) for t in PROVISIONAL_TOOLS}
        want = dict(zip(PROVISIONAL_TOOLS, ACT1_EXPECTED_HOLDS[f["kind"]]))
        if holds != want:
            raise MockError(f"{f['name']} (PROVISIONAL tool check): holds {holds}, expected {want}; ICR {proj}")
        for (tool, year), must in PROVISIONAL_YEAR_RULES.get(f["kind"], {}).items():
            v = proj[tool][year - 1]
            if (v is not None and v >= 1) != must:
                raise MockError(f"{f['name']} (PROVISIONAL tool check): {tool} year {year} ICR {v}, "
                                f"expected {'>= 1' if must else '< 1'}")
        if f["kind"] == "act1_too_much_debt" and all(v >= 1 for v in proj["cut_costs"]):
            raise MockError(f"{f['name']} (PROVISIONAL tool check): cut_costs must fail in year 2 or 3")
    return table


def check_act1(firms, index_rows, firm_files):
    """Each Act 1 firm must show its diagnosis in the finished data. Raises MockError otherwise."""
    rows = {r["cik"]: r for r in index_rows}
    for f in firms:
        if not f["kind"].startswith("act1_"):
            continue
        row, doc = rows[f["cik"]], firm_files.get(f["cik"])
        if doc is None or not row["rescue_eligible"] or row["age_years"] < MIN_AGE or row["sector"] != "Manufacturing":
            raise MockError(f"{f['cik']} ({f['kind']}) is not an old, rescue-eligible manufacturing firm")
        ys = doc["years"]
        if len(ys) != 5:
            raise MockError(f"{f['cik']}: expected 5 years")
        if f["kind"] == "act1_temporary_drop":
            mean_margin = doc["rescue_inputs"]["margin_mean"]
            last = ys[-1]
            if not (last["ebit_usd"] < 0.25 * mean_margin * last["revenue_usd"]
                    and last["icr"] < 1 and last["total_debt_usd"] < 0.25 * last["revenue_usd"]
                    and all(y["icr"] > 3 for y in ys[:-1]) and last["ebit_usd"] < 0):
                raise MockError(f"{f['cik']}: not a temporary profit drop")
        elif f["kind"] == "act1_too_much_debt":
            ebits = [y["ebit_usd"] for y in ys]
            ints = [y["interest_expense_usd"] for y in ys]
            if not (max(ebits) / min(ebits) < 1.03 and all(b > a for a, b in zip(ints, ints[1:]))
                    and ys[-1]["total_debt_usd"] > 0.8 * ys[-1]["revenue_usd"] and ys[-1]["icr"] < 1):
                raise MockError(f"{f['cik']}: not a too-much-debt firm")
        else:
            if sum(1 for y in ys if y["ebit_usd"] < 0) < 3:
                raise MockError(f"{f['cik']}: not a broken business")


# ---------------------------------------------------------------------------
# Whole universe
# ---------------------------------------------------------------------------

def make_names(rng, sectors):
    prefixes = NAME_PREFIXES[:]
    rng.shuffle(prefixes)
    used, names = set(), []
    for i, sector in enumerate(sectors):
        for attempt in range(1000):
            prefix = prefixes[(i + attempt) % len(prefixes)]
            name = f"{prefix} {rng.choice(NAME_NOUNS[sector])} {rng.choice(NAME_SUFFIXES)}"
            if name not in used and not name.startswith("Ashgrove"):
                used.add(name)
                names.append(name)
                break
        else:
            raise MockError("could not generate a unique firm name")
    return names


def make_universe(rng):
    sectors = []
    for name, (_, count) in SECTORS.items():
        # Ashgrove and the Act 1 firms (all Manufacturing) take slots
        sectors += [name] * (count - (1 + N_ACT1 if name == "Manufacturing" else 0))
    assert len(sectors) == N_GENERIC
    rng.shuffle(sectors)

    archetypes = build_archetypes(rng)
    rng.shuffle(archetypes)
    names = make_names(rng, sectors)

    # Critical points of the near-line firms: evenly spaced, handed out in shuffled order.
    crit_values = [CRIT_MIN_PP + (CRIT_MAX_PP - CRIT_MIN_PP) * k / (N_NEAR_LINE - 1) for k in range(N_NEAR_LINE)]
    rng.shuffle(crit_values)

    firms = []
    for i, ((kind, expected), sector, name) in enumerate(zip(archetypes, sectors, names), start=2):
        ff = pick_first_filing_year(rng, kind)
        if kind.startswith("near_line"):
            years = build_near_line(rng, kind, ff, crit_values.pop())
        elif kind.startswith("overpriced"):
            years = build_overpriced(rng, kind, ff)
        elif kind == "mislabeled_growth":
            years = build_mislabeled_growth(rng, ff)
        else:
            targets = icr_pattern(rng, kind)
            years = build_years(rng, kind, ff, targets)
        filed = date(2025, 2, 10) + timedelta(days=rng.randint(0, 48))
        firms.append(dict(
            cik=f"9999{i:06d}", name=name, sector=sector, sic=rng.choice(SECTORS[sector][0]),
            first_filing_year=ff, filed=filed.isoformat(), form="10-K", years=years,
            expected_status=expected, kind=kind,
        ))
    firms.append(make_ashgrove())
    firms += make_act1_firms()
    firms.sort(key=lambda f: f["cik"])
    return firms


def finalize(firm):
    """Compute status, reasons, index row and (if eligible) firm file for one firm."""
    age = REFERENCE_YEAR - firm["first_filing_year"]
    years = [key_order(r) for r in firm["years"]]
    status, reasons = classify(age, years)
    if status != firm["expected_status"]:
        raise MockError(f"{firm['cik']} ({firm['kind']}): computed {status}, generator intended {firm['expected_status']}")

    latest = next((y for y in years if y["fy"] == LATEST_FY), None)
    eligible = rescue_eligible(years)
    index_row = {
        "cik": firm["cik"],
        "ticker": None,
        "name": firm["name"],
        "sector": firm["sector"],
        "sic": firm["sic"],
        "first_filing_year": firm["first_filing_year"],
        "age_years": age,
        "status": status,
        "latest_icr": latest["icr"] if latest else None,
        "total_debt_usd": latest["total_debt_usd"] if latest else None,
        "implied_rate": implied_rate_of(latest),
        "shock_eligible": shock_eligible_of(latest),
        "rescue_eligible": eligible,
    }
    firm_file = None
    if eligible:
        inputs = firm.get("rescue_inputs") or compute_rescue_inputs(years, firm["sector"])
        firm_file = {
            "cik": firm["cik"],
            "name": firm["name"],
            "ticker": None,
            "sector": firm["sector"],
            "status": status,
            "reasons": reasons,
            "as_of_filing": {"fiscal_year": LATEST_FY, "filed": firm["filed"], "form": firm["form"]},
            "years": years,
            "rescue_inputs": inputs,
        }
    return index_row, firm_file


KEEPER_TEMPLATES = [
    "{z} newly dead, {r} back from the grave, {n} filings read. Nobody sent flowers.",
    "{n} filings read, {z} added to the graveyard. The ledger did not comment.",
    "Quiet week. {z} zombies noticed, {r} revived, {n} filings read.",
    "{r} firms climbed out of the ground. {z} walked in. {n} filings read.",
    "{n} filings read. The interest bills kept coming.",
    "{z} more firms failed to cover their interest. Paperwork filed accordingly.",
    "{r} revived on thin margins. The keeper stays unconvinced.",
    "{n} filings read, {z} verdicts delivered, no appeals heard.",
    "Another {n} filings read. Debt remains undefeated.",
    "{z} new residents, {r} departures. The graveyard stays at capacity.",
]


def make_keeper_log(rng, index_rows):
    zombies = [r["cik"] for r in index_rows if r["status"] == "zombie"]
    revived_pool = [r["cik"] for r in index_rows if r["status"] == "healthy"]
    rng.shuffle(zombies)
    rng.shuffle(revived_pool)
    zombies = [c for c in zombies if c != "9999000001"]
    entries = []
    day = date(2025, 3, 28)
    for i, template in enumerate(KEEPER_TEMPLATES):
        z = [] if i in (4, 8) else zombies[i * 2: i * 2 + rng.randint(1, 2)]
        r = [] if i in (1, 5) else revived_pool[i: i + rng.randint(0, 2)]
        if i == 0:
            z = ["9999000001"] + z[:1]  # Ashgrove is the newest resident
        n = rng.randint(180, 1400)
        entries.append({
            "date": day.isoformat(),
            "new_zombies": z,
            "revived": r,
            "filings_read": n,
            "summary": template.format(z=len(z), r=len(r), n=n),
        })
        day -= timedelta(days=7)
    return {"entries": entries}


# ---------------------------------------------------------------------------
# Shaped classes: independent checks on the finished data
# ---------------------------------------------------------------------------

def spread_for(icr_pre):
    """Credit spread by pre-refinance ICR (rescue-rules.md, tool 4)."""
    if icr_pre < 1:
        return 0.09
    if icr_pre < 1.5:
        return 0.06
    if icr_pre < 3:
        return 0.035
    return 0.02


def refinance_applies(ebit, debt, rate, delta, dgs10):
    """Tool 4 with no other tool applied: new rate = dgs10 + delta + spread(icr_pre);
    applies only if 1.02 * new rate < rate + delta."""
    icr_pre = ebit / (debt * (rate + delta))
    new_rate = dgs10 + delta + spread_for(icr_pre)
    return 1.02 * new_rate < rate + delta


def critical_point_pp(row):
    """(EBIT - interest) / total debt * 100 = (latest_icr - 1) * implied_rate * 100."""
    return (row["latest_icr"] - 1) * row["implied_rate"] * 100


def is_near_line(row):
    return (row["age_years"] >= 10 and row["shock_eligible"] and row["rescue_eligible"]
            and row["latest_icr"] is not None and 1.0 <= row["latest_icr"] <= 1.8)


def is_mislabeled_growth(row, doc):
    if doc is None or row["age_years"] < 10 or row["status"] != "zombie" or not row["rescue_eligible"]:
        return False
    ys = doc["years"]
    if len(ys) != len(FISCAL_YEARS) or any(y["ebit_usd"] is None or y["ebit_usd"] >= 0 for y in ys):
        return False
    if any(not (y["interest_expense_usd"] and y["interest_expense_usd"] > 0) for y in ys):
        return False
    if any(b["revenue_usd"] / a["revenue_usd"] - 1 <= 0.30 for a, b in zip(ys, ys[1:])):
        return False
    return all(y["total_debt_usd"] < 0.05 * y["total_assets_usd"] for y in ys)


def is_overpriced_debt(row, doc):
    if doc is None or not row["rescue_eligible"] or row["implied_rate"] is None or row["latest_icr"] is None:
        return False
    if not (0.12 <= row["implied_rate"] <= 0.16 and 0.8 <= row["latest_icr"] <= 1.5):
        return False
    y = doc["years"][-1]
    return refinance_applies(y["ebit_usd"], y["total_debt_usd"], y["interest_expense_usd"] / y["total_debt_usd"],
                             0.0, DGS10)


def check_shaped_classes(firms, index_rows, firm_files):
    """Every firm built as a shaped class must satisfy its class rule on the finished data, and the
    class sizes must reach the minimums. Returns counts per class. Raises MockError otherwise."""
    rows = {r["cik"]: r for r in index_rows}
    pred = {
        "near_line": lambda r, d: is_near_line(r),
        "mislabeled_growth": is_mislabeled_growth,
        "overpriced_debt": is_overpriced_debt,
    }
    built = {"near_line": ("near_line_healthy", "near_line_endangered"),
             "mislabeled_growth": ("mislabeled_growth",),
             "overpriced_debt": ("overpriced_endangered", "overpriced_healthy")}
    minimum = {"near_line": 30, "mislabeled_growth": 3, "overpriced_debt": 3}
    counts = {}
    for cls, kinds in built.items():
        for f in firms:
            if f["kind"] in kinds:
                row, doc = rows[f["cik"]], firm_files.get(f["cik"])
                if not pred[cls](row, doc):
                    raise MockError(f"{f['cik']} built as {f['kind']} but fails the {cls} rule")
                if cls == "overpriced_debt":  # explicit assert of the delta = 0 refinance condition
                    y = doc["years"][-1]
                    r = y["interest_expense_usd"] / y["total_debt_usd"]
                    assert refinance_applies(y["ebit_usd"], y["total_debt_usd"], r, 0.0, DGS10), f["cik"]
        counts[cls] = sum(1 for f in firms if pred[cls](rows[f["cik"]], firm_files.get(f["cik"])))
        if counts[cls] < minimum[cls]:
            raise MockError(f"only {counts[cls]} {cls} firms, need at least {minimum[cls]}")
    # Near-line firms: critical points must be spread evenly over 0.25..5 pp (at least 2 per 0.5-pp bin).
    crit = [critical_point_pp(rows[f["cik"]]) for f in firms if f["kind"].startswith("near_line")]
    bins = [sum(1 for c in crit if 0.5 * b <= c < 0.5 * (b + 1)) for b in range(10)]
    if min(crit) < 0.2 or max(crit) > 5.0 or min(bins) < 2:
        raise MockError(f"near-line critical points are not spread evenly: bins {bins}, range {min(crit):.3f}..{max(crit):.3f}")
    counts["near_line_bins"] = bins
    return counts


# ---------------------------------------------------------------------------
# Validation and output
# ---------------------------------------------------------------------------

def load_validator(name):
    schema = json.loads((SCHEMA_DIR / name).read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    return Draft202012Validator(schema, format_checker=FormatChecker())


def validate_doc(validator, doc, label, problems):
    for err in sorted(validator.iter_errors(doc), key=lambda e: list(e.absolute_path)):
        where = "/".join(str(p) for p in err.absolute_path) or "(root)"
        problems.append(f"{label}: {where}: {err.message}")


def cross_checks(index, firm_files, macro, keeper, problems):
    """Checks the JSON Schemas cannot express."""
    try:
        datetime.fromisoformat(index["meta"]["generated_at"].replace("Z", "+00:00"))
    except ValueError:
        problems.append("firms_index.json: meta.generated_at is not an ISO 8601 date-time")
    rows = index["firms"]
    ciks = [r["cik"] for r in rows]
    if len(set(ciks)) != len(ciks):
        problems.append("firms_index.json: duplicate CIKs")
    for r in rows:
        if not r["cik"].startswith("9999"):
            problems.append(f"firms_index.json: {r['cik']} does not start with 9999")
        if r["sector"] not in macro["sector_medians"]:
            problems.append(f"firms_index.json: sector {r['sector']!r} missing from macro.sector_medians")
        if r["age_years"] < MIN_AGE:
            problems.append(f"firms_index.json: {r['cik']} is younger than {MIN_AGE} years")
        if r["sic"].isdigit() and (6000 <= int(r["sic"]) <= 6799 or 4900 <= int(r["sic"]) <= 4999):
            problems.append(f"firms_index.json: excluded SIC {r['sic']} for {r['cik']}")
        if "Finance" in r["sector"]:
            problems.append(f"firms_index.json: financial sector present for {r['cik']}")
        if r["ticker"] is not None:
            problems.append(f"firms_index.json: {r['cik']} has a ticker")
    counts = {k: sum(1 for r in rows if r["status"] == k) for k in index["meta"]["counts"]}
    if counts != index["meta"]["counts"]:
        problems.append(f"firms_index.json: meta.counts {index['meta']['counts']} != actual {counts}")
    eligible = {r["cik"] for r in rows if r["rescue_eligible"]}
    if eligible != set(firm_files):
        problems.append("firms/: files do not match the set of rescue_eligible firms")
    for cik, f in firm_files.items():
        fys = [y["fy"] for y in f["years"]]
        if fys != sorted(fys):
            problems.append(f"firms/{cik}.json: years not ascending")
    known = set(ciks)
    for e in keeper["entries"]:
        for c in e["new_zombies"] + e["revived"]:
            if c not in known:
                problems.append(f"keeper_log.json: unknown CIK {c}")
    dates = [e["date"] for e in keeper["entries"]]
    if dates != sorted(dates, reverse=True):
        problems.append("keeper_log.json: entries are not newest first")
    if len(keeper["entries"]) != 10:
        problems.append("keeper_log.json: expected 10 entries")
    if len(sector_names := set(macro["sector_medians"])) != 8:
        problems.append(f"macro.json: expected 8 sectors, got {len(sector_names)}")


def dump(path, doc):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def read_all_from_disk():
    index = json.loads((OUT_DIR / "firms_index.json").read_text(encoding="utf-8"))
    macro = json.loads((OUT_DIR / "macro.json").read_text(encoding="utf-8"))
    keeper = json.loads((OUT_DIR / "keeper_log.json").read_text(encoding="utf-8"))
    firm_files = {p.stem: json.loads(p.read_text(encoding="utf-8"))
                  for p in sorted((OUT_DIR / "firms").glob("*.json"))}
    return index, firm_files, macro, keeper


def validate_all(index, firm_files, macro, keeper):
    problems = []
    v_index = load_validator("firms_index.schema.json")
    v_firm = load_validator("firm.schema.json")
    v_macro = load_validator("macro.schema.json")
    v_keeper = load_validator("keeper_log.schema.json")
    validate_doc(v_index, index, "firms_index.json", problems)
    validate_doc(v_macro, macro, "macro.json", problems)
    validate_doc(v_keeper, keeper, "keeper_log.json", problems)
    for cik, doc in firm_files.items():
        validate_doc(v_firm, doc, f"firms/{cik}.json", problems)
        if doc["cik"] != cik:
            problems.append(f"firms/{cik}.json: cik field is {doc['cik']}")
    if not problems:
        cross_checks(index, firm_files, macro, keeper, problems)
    return problems


def check_ashgrove(firm_files, index):
    """The frontend fixture must be reproduced exactly."""
    f = firm_files.get("9999000001")
    row = next((r for r in index["firms"] if r["cik"] == "9999000001"), None)
    problems = []
    if f is None or row is None:
        return ["Ashgrove Works (9999000001) is missing"]
    if f["rescue_inputs"] != dict(margin_mean=0.035, margin_change_mean=-0.004, margin_change_sd=0.018,
                                  revenue_growth_median=0.01, history_years=5, used_sector_fallback=False):
        problems.append("Ashgrove Works: rescue_inputs differ from the fixture")
    if (f["name"], f["sector"], f["ticker"]) != ("Ashgrove Works", "Manufacturing", None):
        problems.append("Ashgrove Works: name/sector/ticker differ from the fixture")
    if f["as_of_filing"] != {"fiscal_year": 2024, "filed": "2025-02-20", "form": "10-K"}:
        problems.append("Ashgrove Works: as_of_filing differs from the fixture")
    if row["first_filing_year"] != 2001 or f["status"] != "zombie":
        problems.append("Ashgrove Works: expected first filing 2001 and status zombie")
    got = [(y["fy"], y["revenue_usd"], y["ebit_usd"], y["interest_expense_usd"],
            y["total_debt_usd"], y["total_assets_usd"], y["equity_usd"]) for y in f["years"]]
    want = [(fy, round(a), round(b), round(c), round(d), round(e), round(g)) for fy, a, b, c, d, e, g in ASHGROVE_ROWS]
    if got != want:
        problems.append("Ashgrove Works: yearly figures differ from the fixture")
    return problems


def main():
    rng = random.Random(SEED)
    firms = make_universe(rng)

    index_rows, firm_files = [], {}
    for firm in firms:
        row, ff = finalize(firm)
        index_rows.append(row)
        if ff is not None:
            firm_files[firm["cik"]] = ff

    counts = {k: sum(1 for r in index_rows if r["status"] == k)
              for k in ("zombie", "endangered", "healthy", "insufficient_data")}
    if len(index_rows) != N_FIRMS:
        raise MockError(f"expected {N_FIRMS} firms, built {len(index_rows)}")
    class_counts = check_shaped_classes(firms, index_rows, firm_files)
    check_act1(firms, index_rows, firm_files)
    act1_table = provisional_check_act1(firms, firm_files)
    index = {
        "meta": {
            "generated_at": GENERATED_AT,
            "source": "MOCK (fictional firms, pipeline/scripts/make_mock.py)",
            "definition_version": DEFINITION_VERSION,
            "fiscal_years": FISCAL_YEARS,
            "counts": counts,
        },
        "firms": index_rows,
    }
    macro = {
        "dgs10": {"value": DGS10, "date": "2025-03-28", "source": "FRED DGS10"},
        "sector_medians": {name: dict(SECTOR_MEDIANS[name]) for name in SECTORS},
    }
    keeper = make_keeper_log(rng, index_rows)

    # Guard: no generated text may contain a dev-only marker from check-bundle.mjs.
    markers = load_forbidden_markers()
    blob = json.dumps([index, firm_files, macro, keeper], ensure_ascii=False)
    hits = [mk for mk in markers if mk in blob]
    if hits:
        raise MockError(f"generated data contains forbidden marker(s) from check-bundle.mjs: {hits}")

    # Validate in memory first, so a bad run never overwrites good files.
    problems = validate_all(index, firm_files, macro, keeper) + check_ashgrove(firm_files, index)
    if problems:
        fail(problems)

    firms_dir = OUT_DIR / "firms"
    firms_dir.mkdir(parents=True, exist_ok=True)
    for stale in firms_dir.glob("9999*.json"):  # only files this script owns
        stale.unlink()
    dump(OUT_DIR / "firms_index.json", index)
    dump(OUT_DIR / "macro.json", macro)
    dump(OUT_DIR / "keeper_log.json", keeper)
    for cik, doc in firm_files.items():
        dump(firms_dir / f"{cik}.json", doc)

    # Validate what is actually on disk.
    disk_index, disk_firms, disk_macro, disk_keeper = read_all_from_disk()
    problems = validate_all(disk_index, disk_firms, disk_macro, disk_keeper)
    problems += check_ashgrove(disk_firms, disk_index)
    if problems:
        fail(problems)

    total = len(index_rows)
    print(f"Wrote {total} firms, {len(firm_files)} firm files, macro.json and keeper_log.json to {OUT_DIR}")
    print("Status counts:")
    for k, v in counts.items():
        print(f"  {k:<18}{v:>4}  ({v / total:.1%})")
    print("Shaped classes (counted by the class rules, on the written data):")
    print(f"  near the line (age>=10, ICR 1.0-1.8)      {class_counts['near_line']:>3}")
    print(f"    critical points per 0.5-pp bin 0..5: {class_counts['near_line_bins']}")
    print(f"  mislabeled growth                         {class_counts['mislabeled_growth']:>3}")
    print(f"  overpriced debt (refinance applies, d=0)  {class_counts['overpriced_debt']:>3}")
    for f in firms:
        if f["kind"].startswith("act1_"):
            doc = firm_files[f["cik"]]
            print(f"Act 1: {f['name']} ({f['kind']}), status = {doc['status']}")
    print("Act 1 tool check (PROVISIONAL until rescue-engine v2): ICR in years 1 / 2 / 3")
    for name, proj in act1_table.items():
        for tool, v in proj.items():
            print(f"  {name:<28}{tool:<12}" + "  ".join(f"{x:>7.2f}" for x in v))
    ash = firm_files["9999000001"]
    print(f"Ashgrove Works: status = {ash['status']}")
    for reason in ash["reasons"]:
        print(f"  - {reason}")
    print("All output files validate against data/schema/.")


def fail(problems):
    print("VALIDATION FAILED:", file=sys.stderr)
    for p in problems[:50]:
        print(f"  {p}", file=sys.stderr)
    if len(problems) > 50:
        print(f"  ... and {len(problems) - 50} more", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except MockError as exc:
        print(f"GENERATION FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
