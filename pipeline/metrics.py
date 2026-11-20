"""Shared metric functions for the pipeline.

``icr()`` is the only place in ``pipeline/*.py`` that divides EBIT by interest.
"""

from __future__ import annotations

import math


def _is_finite_number(value: object) -> bool:
    if value is None or isinstance(value, bool):
        return False
    if not isinstance(value, (int, float)):
        return False
    try:
        return math.isfinite(value)
    except OverflowError:
        return False


def icr(ebit: object, interest: object) -> float | None:
    """Interest coverage ratio EBIT / interest, or None when not computable.

    Returns None for None, bool, non-int/float, NaN or infinite inputs, and
    for interest <= 0.
    """
    if not _is_finite_number(ebit) or not _is_finite_number(interest):
        return None
    if interest <= 0:  # type: ignore[operator]
        return None
    try:
        result = ebit / interest  # type: ignore[operator]
    except OverflowError:
        return None
    return result if math.isfinite(result) else None


# ---------------------------------------------------------------------------
# Scorer: status, flags, rescue inputs, sector medians
# ---------------------------------------------------------------------------

import statistics  # noqa: E402
from collections.abc import Mapping, Sequence  # noqa: E402
from dataclasses import dataclass  # noqa: E402
from typing import Literal  # noqa: E402

from pipeline.config import NoSectorMedianError  # noqa: E402
from pipeline.facts import ExtractResult, YearValues  # noqa: E402

Status = Literal["zombie", "endangered", "healthy", "insufficient_data"]

MIN_USABLE_YEARS = 4
MIN_CHANGES = 2
ROUND_DIGITS = 6


@dataclass(frozen=True)
class RawStats:
    margin_mean: float
    margin_change_mean: float
    margin_change_sd: float
    revenue_growth_median: float


@dataclass(frozen=True)
class OwnHistory:
    stats: RawStats | None  # None -> sector fallback
    history_years: int  # 0..5 (11.1)


@dataclass(frozen=True)
class RescueInputs:
    margin_mean: float
    margin_change_mean: float
    margin_change_sd: float
    revenue_growth_median: float
    history_years: int
    used_sector_fallback: bool


@dataclass
class ScoredFirm:
    cik: str
    name: str
    ticker: str | None
    sector: str
    sic: str
    first_filing_year: int
    age_years: int
    status: Status
    reasons: list[str]
    latest_icr: float | None
    total_debt_usd: int | float | None
    implied_rate: float | None
    shock_eligible: bool
    rescue_eligible: bool
    years: list[YearValues]
    own: OwnHistory
    rescue_inputs: RescueInputs | None  # set after sector medians are known
    as_of_filing: dict
    selected_by: frozenset[str]


def _by_fy(years: Sequence[YearValues]) -> dict[int, YearValues]:
    return {y.fy: y for y in years}


def _year_list(fys: Sequence[int]) -> str:
    return ", ".join(f"FY{fy}" for fy in fys)


def status_and_reasons(
    years: Sequence[YearValues], latest_fy: int, age_years: int
) -> tuple[Status, list[str]]:
    """Rules 2 to 8 of Requirement 9, in order; the first match wins."""
    rows = _by_fy(years)
    latest = rows.get(latest_fy)
    L = latest_fy

    # Rule 2: Missing_Interest in Latest_FY.
    if latest is None or latest.interest is None:
        return "insufficient_data", [f"Interest expense missing in FY{L}"]

    # Rule 3: EBIT missing and/or negative interest in Latest_FY.
    reasons: list[str] = []
    if latest.ebit is None:
        reasons.append(f"EBIT missing in FY{L}")
    if latest.interest < 0:
        reasons.append(f"Interest expense negative in FY{L}")
    if reasons:
        return "insufficient_data", reasons

    # Rule 4: three adjacent years with EBIT present and interest >= 0.
    def available(fy: int) -> bool:
        y = rows.get(fy)
        return y is not None and y.ebit is not None and y.interest is not None and y.interest >= 0

    has_streak = any(available(fy) and available(fy + 1) and available(fy + 2) for fy in rows)
    if not has_streak:
        return "insufficient_data", [
            "Fewer than 3 consecutive fiscal years with both EBIT and interest expense available"
        ]

    last3 = (L - 2, L - 1, L)
    ratios: dict[int, float | None] = {}
    for fy in last3:
        y = rows.get(fy)
        ratios[fy] = icr(y.ebit, y.interest) if y is not None else None

    # Rule 5: zombie.
    if age_years >= 10 and all(r is not None and r < 1 for r in ratios.values()):
        return "zombie", [f"ICR below 1 in {_year_list(last3)}"]

    # Rule 6: reported zero interest in Latest_FY.
    if latest.interest == 0:
        return "healthy", [f"No interest expense in FY{L}"]

    # Rule 7: endangered.
    below = [fy for fy in last3 if ratios[fy] is not None and ratios[fy] < 1]  # type: ignore[operator]
    latest_icr = ratios[L]
    if (latest_icr is not None and latest_icr < 1) or len(below) >= 2:
        return "endangered", [f"ICR below 1 in {_year_list(below)}"]

    # Rule 8: healthy.
    return "healthy", [f"ICR {latest_icr:.2f} in FY{L}, at least 1"]  # type: ignore[str-format]


def implied_rate(latest: YearValues) -> float | None:
    """Interest / total debt, only when total debt > 0 (10.1). icr() is the one division."""
    if latest.interest is None:
        return None
    rate = icr(latest.interest, latest.total_debt)
    # A ratio that overflows to infinity is not a usable rate (10.1: finite only).
    return rate if rate is not None and math.isfinite(rate) else None


def shock_eligible(rate: float | None) -> bool:
    return rate is not None and rate > 0


def rescue_eligible(latest: YearValues, window_size: int) -> bool:
    values = (
        latest.revenue,
        latest.ebit,
        latest.interest,
        latest.total_debt,
        latest.total_assets,
        latest.equity,
    )
    return all(v is not None for v in values) and window_size >= 3


def own_history_stats(years: Sequence[YearValues], window: Sequence[int]) -> OwnHistory:
    """Own-history statistics (11.1 to 11.5). stats is None when the sector fallback applies."""
    in_window = set(window)
    usable: dict[int, tuple[float, float]] = {}  # fy -> (revenue, margin)
    for y in sorted(years, key=lambda v: v.fy):
        if y.fy not in in_window or y.revenue is None or y.ebit is None or y.revenue <= 0:
            continue
        margin = icr(y.ebit, y.revenue)
        if margin is None:
            continue
        usable[y.fy] = (y.revenue, margin)
    n = len(usable)
    if n < MIN_USABLE_YEARS:
        return OwnHistory(None, n)
    fys = sorted(usable)
    changes = [usable[fy][1] - usable[fy - 1][1] for fy in fys if fy - 1 in usable]
    growth: list[float] = []
    for fy in fys:
        if fy - 1 in usable:
            ratio = icr(usable[fy][0], usable[fy - 1][0])
            if ratio is not None:
                growth.append(ratio - 1)
    if len(changes) < MIN_CHANGES or not growth:
        return OwnHistory(None, n)
    stats = RawStats(
        margin_mean=statistics.fmean(m for _, m in usable.values()),
        margin_change_mean=statistics.fmean(changes),
        margin_change_sd=statistics.stdev(changes),
        revenue_growth_median=statistics.median(growth),
    )
    return OwnHistory(stats, n)


def _round_stats(s: RawStats) -> RawStats:
    return RawStats(
        round(s.margin_mean, ROUND_DIGITS),
        round(s.margin_change_mean, ROUND_DIGITS),
        round(s.margin_change_sd, ROUND_DIGITS),
        round(s.revenue_growth_median, ROUND_DIGITS),
    )


def _median_stats(items: Sequence[RawStats]) -> RawStats:
    return RawStats(
        statistics.median(s.margin_mean for s in items),
        statistics.median(s.margin_change_mean for s in items),
        statistics.median(s.margin_change_sd for s in items),
        statistics.median(s.revenue_growth_median for s in items),
    )


def sector_medians(stats: Mapping[str, Sequence[RawStats]]) -> dict[str, RawStats]:
    """Per-sector medians of own-history firms, rounded once at the end (11.6 to 11.8, 11.12).

    Every key of ``stats`` gets an entry; a sector with no own-history firm gets the
    global median. Raises NoSectorMedianError when no firm has own-history inputs (11.9).
    """
    everything = [s for items in stats.values() for s in items]
    if not everything:
        raise NoSectorMedianError("no sector median could be computed: no firm has own-history inputs")
    global_median = _median_stats(everything)
    return {
        sector: _round_stats(_median_stats(items) if items else global_median)
        for sector, items in stats.items()
    }


def finalize_rescue_inputs(
    own: OwnHistory, medians: Mapping[str, RawStats], sector: str
) -> RescueInputs:
    """Own-history inputs, or the sector medians copied in; rounded to 6 decimals (11.11)."""
    if own.stats is not None:
        s = _round_stats(own.stats)
        return RescueInputs(
            s.margin_mean,
            s.margin_change_mean,
            s.margin_change_sd,
            s.revenue_growth_median,
            own.history_years,
            False,
        )
    m = _round_stats(medians[sector])
    return RescueInputs(
        m.margin_mean,
        m.margin_change_mean,
        m.margin_change_sd,
        m.revenue_growth_median,
        own.history_years,
        True,
    )


def score(
    *,
    cik: str,
    name: str,
    ticker: str | None,
    sector: str,
    sic: str,
    first_filing_year: int,
    age_years: int,
    extracted: ExtractResult,
    selected_by: frozenset[str] = frozenset(),
) -> ScoredFirm:
    """Wire the pure scorer pieces for one firm. rescue_inputs is set later."""
    latest_fy = extracted.latest_fy
    if latest_fy is None:
        raise ValueError("score() needs a firm with a Firm_Window")
    years = list(extracted.years)
    latest = _by_fy(years)[latest_fy]
    status, reasons = status_and_reasons(years, latest_fy, age_years)
    rate = implied_rate(latest)
    newest = max(latest.sources, key=lambda f: (f.filed, f.accn))
    return ScoredFirm(
        cik=cik,
        name=name,
        ticker=ticker,
        sector=sector,
        sic=sic,
        first_filing_year=first_filing_year,
        age_years=age_years,
        status=status,
        reasons=reasons,
        latest_icr=icr(latest.ebit, latest.interest),
        total_debt_usd=latest.total_debt,
        implied_rate=rate,
        shock_eligible=shock_eligible(rate),
        rescue_eligible=rescue_eligible(latest, len(extracted.window)),
        years=years,
        own=own_history_stats(years, extracted.window),
        rescue_inputs=None,
        as_of_filing={
            "fiscal_year": latest_fy,
            "filed": newest.filed.isoformat(),
            "form": newest.form,
        },
        selected_by=selected_by,
    )
