"""Universe: SIC divisions, ticker map, input files, exclusions and the per-firm fetcher.

Pure helpers do no I/O. ``FirmFetcher`` is the only part that talks to ``SecClient``.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Any, Callable

from pipeline.facts import ExtractResult
from pipeline.http import (
    SEC_COMPANYFACTS_URL,
    SEC_SUBMISSIONS_PAGE_URL,
    SEC_SUBMISSIONS_URL,
    FetchResult,
    SecClient,
)
from pipeline.run_report import RunReport

# --- SIC divisions -------------------------------------------------------------

EXCLUDED_DIVISION = "Finance, Insurance and Real Estate"

SIC_DIVISIONS: tuple[tuple[int, int, str], ...] = (
    (100, 999, "Agriculture, Forestry and Fishing"),
    (1000, 1499, "Mining"),
    (1500, 1799, "Construction"),
    (2000, 3999, "Manufacturing"),
    (4000, 4999, "Transportation, Communications, Electric, Gas and Sanitary Services"),
    (5000, 5199, "Wholesale Trade"),
    (5200, 5999, "Retail Trade"),
    (6000, 6799, EXCLUDED_DIVISION),
    (7000, 8999, "Services"),
    (9100, 9729, "Public Administration"),
    (9900, 9999, "Nonclassifiable Establishments"),
)

OUTPUT_DIVISIONS: tuple[str, ...] = tuple(
    sorted(name for _, _, name in SIC_DIVISIONS if name != EXCLUDED_DIVISION)
)

FINANCIAL_RANGE = (6000, 6799)
UTILITY_RANGE = (4900, 4999)
MIN_AGE_YEARS = 10
MIN_LATEST_FY = 2024
ANNUAL_10K_FORMS = frozenset({"10-K", "10-K/A"})

_CIK_RE = re.compile(r"[0-9]{1,10}")


def sic_division(sic: int) -> str | None:
    """SIC_Division name for a SIC code, or None if the code is in no division."""
    for low, high, name in SIC_DIVISIONS:
        if low <= sic <= high:
            return name
    return None


def parse_sic(raw: object) -> int | None:
    """Integer in 100..9999, else None. Accepts ints and digit strings like ``"0100"``."""
    if isinstance(raw, bool):
        return None
    value: int
    if isinstance(raw, int):
        value = raw
    elif isinstance(raw, str):
        text = raw.strip()
        if not re.fullmatch(r"[0-9]+", text):
            return None
        value = int(text)
    else:
        return None
    return value if 100 <= value <= 9999 else None


def match_sector(name: str) -> str | None:
    """Canonical output division for ``name`` (casefold, stripped), else None.

    The finance division is not an output division, so it returns None (1.7).
    """
    wanted = name.strip().casefold()
    for division in OUTPUT_DIVISIONS:
        if division.casefold() == wanted:
            return division
    return None


# --- ticker map and input files -----------------------------------------------


def _pad_cik(raw: object) -> str | None:
    if isinstance(raw, bool):
        return None
    if isinstance(raw, int):
        text = str(raw) if raw >= 0 else ""
    elif isinstance(raw, str):
        text = raw.strip()
    else:
        return None
    if not _CIK_RE.fullmatch(text):
        return None
    return text.zfill(10)


@dataclass(frozen=True)
class TickerMap:
    by_ticker: dict[str, str]  # TICKER (upper case) -> 10-digit CIK, first entry wins
    first_ticker: dict[str, str]  # CIK -> first ticker in key order
    ciks: tuple[str, ...]  # unique CIKs, ascending

    def cik_for(self, ticker: str) -> str | None:
        """Case-insensitive lookup (1.2)."""
        return self.by_ticker.get(ticker.strip().upper())


def load_ticker_map(body: dict) -> TickerMap:
    """Build the map from ``company_tickers.json`` (keys ``"0"``, ``"1"``, ...)."""
    items = list(body.items()) if isinstance(body, dict) else []

    def order(pair: tuple[int, tuple[Any, Any]]) -> tuple[int, int]:
        idx, (key, _) = pair
        k = str(key)
        return (int(k) if k.isdigit() else 10**12, idx)

    by_ticker: dict[str, str] = {}
    first_ticker: dict[str, str] = {}
    ciks: set[str] = set()
    for _, (_, entry) in sorted(enumerate(items), key=order):
        if not isinstance(entry, dict):
            continue
        cik = _pad_cik(entry.get("cik_str"))
        if cik is None:
            continue
        ciks.add(cik)
        ticker = entry.get("ticker")
        if isinstance(ticker, str) and ticker.strip():
            t = ticker.strip().upper()
            by_ticker.setdefault(t, cik)
            first_ticker.setdefault(cik, ticker.strip())
    return TickerMap(by_ticker=by_ticker, first_ticker=first_ticker, ciks=tuple(sorted(ciks)))


@dataclass(frozen=True)
class SkippedInput:
    reason: str  # "invalid_cik" | "ticker_not_found"
    text: str


def read_ticker_file(path: Path) -> list[str]:
    """One ticker per line; blank lines and surrounding whitespace ignored (1.2)."""
    text = Path(path).read_text(encoding="utf-8")
    return [line.strip() for line in text.splitlines() if line.strip()]


def read_cik_file(path: Path) -> tuple[list[str], list[SkippedInput]]:
    """One CIK per line, 1-10 ASCII digits, zero-padded, de-duplicated in file order (1.3, 1.12)."""
    text = Path(path).read_text(encoding="utf-8")
    ciks: list[str] = []
    skipped: list[SkippedInput] = []
    seen: set[str] = set()
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if not _CIK_RE.fullmatch(stripped):
            skipped.append(SkippedInput("invalid_cik", stripped))
            continue
        cik = stripped.zfill(10)
        if cik not in seen:
            seen.add(cik)
            ciks.append(cik)
    return ciks, skipped


# --- submissions helpers ------------------------------------------------------


def _filing_dates(page: dict) -> list[Any]:
    dates = page.get("filingDate") if isinstance(page, dict) else None
    return dates if isinstance(dates, list) else []


def _parse_date(raw: object) -> date | None:
    if not isinstance(raw, str):
        return None
    try:
        return date.fromisoformat(raw[:10])
    except ValueError:
        return None


def first_filing_year(pages: list[dict]) -> int | None:
    """Earliest filing year over the main page and every older page."""
    years = [d.year for page in pages for raw in _filing_dates(page) if (d := _parse_date(raw))]
    return min(years) if years else None


def has_recent_10k(pages: list[dict], since: date) -> bool:
    """Any 10-K or 10-K/A filed on or after ``since``."""
    for page in pages:
        forms = page.get("form") if isinstance(page, dict) else None
        if not isinstance(forms, list):
            continue
        for form, raw in zip(forms, _filing_dates(page)):
            filed = _parse_date(raw)
            if form in ANNUAL_10K_FORMS and filed is not None and filed >= since:
                return True
    return False


@dataclass(frozen=True)
class Submissions:
    cik: str
    name: str
    sic: object  # raw value from the document
    tickers: tuple[str, ...]
    pages: tuple[dict, ...]  # filings.recent first, then every older page loaded
    older_files: tuple[str, ...] = ()  # page names listed under filings.files
    complete: bool = True  # False when older_files exist but have not been loaded

    @property
    def sic_int(self) -> int | None:
        return parse_sic(self.sic)

    @property
    def division(self) -> str | None:
        sic = self.sic_int
        return sic_division(sic) if sic is not None else None

    @property
    def first_filing_year(self) -> int | None:
        return first_filing_year(list(self.pages))

    def age_years(self, run_year: int) -> int | None:
        first = self.first_filing_year
        return None if first is None else run_year - first


def classify(
    sub: Submissions,
    facts: ExtractResult | None,
    run_year: int,
    skip_recency: bool,
) -> str | None:
    """First matching exclusion reason, or None (2.11).

    Order: no_sic, financial, utility, age_under_10, no_annual_facts, not_recent.
    ``facts`` None means companyfacts were not fetched: the two facts rules are not applied.
    A firm without a first filing date has unknown age and is treated as age_under_10.
    A firm with annual facts but no Firm_Window has no Latest_FY; it is not ``not_recent``
    (the caller lists it under ``no_firm_window``).
    """
    sic = sub.sic_int
    if sic is None or sic_division(sic) is None:
        return "no_sic"
    if FINANCIAL_RANGE[0] <= sic <= FINANCIAL_RANGE[1]:
        return "financial"
    if UTILITY_RANGE[0] <= sic <= UTILITY_RANGE[1]:
        return "utility"
    age = sub.age_years(run_year)
    if age is None or age < MIN_AGE_YEARS:
        return "age_under_10"
    if facts is None:
        return None
    if not facts.has_annual_facts:
        return "no_annual_facts"
    latest = facts.latest_fy
    if not skip_recency and latest is not None and latest < MIN_LATEST_FY:
        return "not_recent"
    return None


# --- per-firm fetcher ---------------------------------------------------------


@dataclass(frozen=True)
class Failed:
    cik: str
    url: str
    reason: str


@dataclass(frozen=True)
class NotFound:
    """companyfacts answered 404: the firm has no annual facts (4.11)."""


NOT_FOUND = NotFound()


def _failure_reason(res: FetchResult) -> str:
    if res.status is None:
        cls = (res.error or "request failed").split(":", 1)[0].strip() or "error"
        return f"connection_error: {cls}"
    return res.error or f"HTTP {res.status}"


@dataclass
class FirmFetcher:
    """Fetches each CIK at most once per run and counts Attempted/Failed firms (4.9, 4.10)."""

    sec: SecClient
    report: RunReport
    _attempted: set[str] = field(default_factory=set, init=False, repr=False)
    _main: dict[str, Submissions | Failed] = field(default_factory=dict, init=False, repr=False)
    _full: dict[str, Submissions | Failed] = field(default_factory=dict, init=False, repr=False)
    _facts: dict[str, dict | NotFound | Failed] = field(default_factory=dict, init=False, repr=False)

    def _attempt(self, cik: str) -> None:
        self._attempted.add(cik)
        self.report.attempted_firms = len(self._attempted)

    def _fail(self, cik: str, url: str, reason: str) -> Failed:
        self.report.add_failed(cik, url, reason)
        return Failed(cik, url, reason)

    def _get_dict(self, cik: str, url: str, res: FetchResult) -> dict | Failed:
        if not res.ok or res.body is None:
            return self._fail(cik, url, _failure_reason(res))
        try:
            doc = json.loads(res.body)
        except ValueError as exc:
            return self._fail(cik, url, f"parse error: {type(exc).__name__}")
        if not isinstance(doc, dict):
            return self._fail(cik, url, "parse error: unexpected JSON structure")
        return doc

    def submissions(self, cik: str, *, with_older_pages: bool = True) -> Submissions | Failed:
        main = self._main.get(cik)
        if main is None:
            self._attempt(cik)
            url = SEC_SUBMISSIONS_URL.format(cik=cik)
            doc = self._get_dict(cik, url, self.sec.submissions(cik))
            if isinstance(doc, Failed):
                main = doc
            else:
                main = self._parse_main(cik, doc)
            self._main[cik] = main
        if isinstance(main, Failed) or not with_older_pages or not main.older_files:
            return main
        full = self._full.get(cik)
        if full is None:
            full = self._load_older(cik, main)
            self._full[cik] = full
        return full

    @staticmethod
    def _parse_main(cik: str, doc: dict) -> Submissions:
        filings = doc.get("filings")
        filings = filings if isinstance(filings, dict) else {}
        recent = filings.get("recent")
        recent = recent if isinstance(recent, dict) else {}
        files = filings.get("files")
        names = tuple(
            f["name"] for f in (files if isinstance(files, list) else [])
            if isinstance(f, dict) and isinstance(f.get("name"), str) and f["name"]
        )
        tickers = doc.get("tickers")
        name = doc.get("name")
        return Submissions(
            cik=cik,
            name=name if isinstance(name, str) else "",
            sic=doc.get("sic"),
            tickers=tuple(t for t in (tickers if isinstance(tickers, list) else []) if isinstance(t, str)),
            pages=(recent,),
            older_files=names,
            complete=not names,
        )

    def _load_older(self, cik: str, main: Submissions) -> Submissions | Failed:
        pages = list(main.pages)
        for name in main.older_files:
            url = SEC_SUBMISSIONS_PAGE_URL.format(name=name)
            page = self._get_dict(cik, url, self.sec.submissions_page(name))
            if isinstance(page, Failed):
                return page  # a partial history could give a wrong First_Filing_Year (2.2)
            pages.append(page)
        return Submissions(
            cik=main.cik,
            name=main.name,
            sic=main.sic,
            tickers=main.tickers,
            pages=tuple(pages),
            older_files=main.older_files,
            complete=True,
        )

    def companyfacts(self, cik: str) -> dict | NotFound | Failed:
        cached = self._facts.get(cik)
        if cached is not None:
            return cached
        self._attempt(cik)
        url = SEC_COMPANYFACTS_URL.format(cik=cik)
        res = self.sec.companyfacts(cik)
        result: dict | NotFound | Failed
        if not res.ok and res.status == 404:
            result = NOT_FOUND
        else:
            result = self._get_dict(cik, url, res)
        self._facts[cik] = result
        return result


def select_sector(
    division: str,
    cik_list: list[str],
    fetcher: FirmFetcher,
    run_year: int,
    progress: Callable[[int, int], None],
) -> list[str]:
    """CIKs in ``division`` that pass the submissions-based exclusions (1.6).

    The facts-based rules (no_annual_facts, not_recent) are applied later in the per-firm
    step, which also records them in the Run_Report. Failed firms are skipped.
    """
    total = len(cik_list)
    selected: list[str] = []
    for i, cik in enumerate(cik_list, start=1):
        sub = fetcher.submissions(cik)
        if isinstance(sub, Submissions) and sub.division == division:
            if classify(sub, None, run_year, skip_recency=True) is None:
                selected.append(cik)
        if i % 100 == 0 or i == total:
            progress(i, total)
    return selected
