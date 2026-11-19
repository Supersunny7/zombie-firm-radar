"""Small hand-written builders for SEC documents used by edge-case tests."""

from __future__ import annotations

import io
import zipfile
from typing import Any


def fact(
    val: float | int,
    end: str,
    *,
    start: str | None = None,
    fy: int | None = None,
    fp: str = "FY",
    form: str = "10-K",
    filed: str | None = None,
    accn: str = "0000000000-00-000001",
) -> dict[str, Any]:
    """One companyfacts observation. `start` is omitted for instant (balance-sheet) values."""
    item: dict[str, Any] = {
        "end": end,
        "val": val,
        "accn": accn,
        "fy": fy if fy is not None else int(end[:4]),
        "fp": fp,
        "form": form,
        "filed": filed or f"{int(end[:4]) + 1}-02-15",
    }
    if start is not None:
        item["start"] = start
    return item


def companyfacts(
    cik: str | int,
    facts: dict[str, list[dict[str, Any]]] | None = None,
    *,
    entity_name: str = "Test Corp",
    namespace: str = "us-gaap",
) -> dict[str, Any]:
    """Companyfacts document; `facts` maps tag -> list of USD observations."""
    return {
        "cik": int(cik),
        "entityName": entity_name,
        "facts": {
            namespace: {
                tag: {"label": tag, "description": tag, "units": {"USD": list(obs)}}
                for tag, obs in (facts or {}).items()
            }
        },
    }


def submissions(
    cik: str | int,
    *,
    name: str = "Test Corp",
    sic: str | None = "3570",
    tickers: list[str] | None = None,
    filing_dates: list[str] | None = None,
    older_pages: list[str] | None = None,
) -> dict[str, Any]:
    """Submissions document; `older_pages` are file names listed under filings.files."""
    dates = filing_dates if filing_dates is not None else ["2015-03-01"]
    return {
        "cik": str(int(cik)),
        "name": name,
        "sic": sic,
        "tickers": list(tickers) if tickers is not None else [],
        "filings": {
            "recent": {
                "accessionNumber": [f"0000000000-00-{i:06d}" for i in range(len(dates))],
                "filingDate": list(dates),
                "form": ["10-K"] * len(dates),
            },
            "files": [
                {"name": n, "filingCount": 0, "filingFrom": "1994-01-01", "filingTo": "2000-01-01"}
                for n in (older_pages or [])
            ],
        },
    }


def submissions_page(filing_dates: list[str]) -> dict[str, Any]:
    """An older submissions page (bare `recent`-style arrays, as served for filings.files)."""
    return {
        "accessionNumber": [f"0000000000-00-{i:06d}" for i in range(len(filing_dates))],
        "filingDate": list(filing_dates),
        "form": ["10-K"] * len(filing_dates),
    }


def company_tickers(rows: list[tuple[int | str, str, str]]) -> dict[str, Any]:
    """company_tickers.json from (cik, ticker, title) rows; keys are "0", "1", ..."""
    return {
        str(i): {"cik_str": int(cik), "ticker": ticker, "title": title}
        for i, (cik, ticker, title) in enumerate(rows)
    }

# --- Phase 1 helpers (bulk zips) ------------------------------------------------
def make_zip(members: dict[str, bytes | str | dict | list]) -> bytes:
    """An in-memory zip archive. dict/list members are written as JSON. Member order is kept."""
    import json
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, body in members.items():
            if isinstance(body, bytes):
                data = body
            elif isinstance(body, str):
                data = body.encode("utf-8")
            else:
                data = json.dumps(body).encode("utf-8")
            zf.writestr(name, data)
    return buf.getvalue()
def year_facts(
    fy: int,
    *,
    revenue: float | None = None,
    ebit: float | None = None,
    interest: float | None = None,
    debt: float | None = None,
    assets: float | None = None,
    equity: float | None = None,
    cash: float | None = None,
    fye: str | None = None,
    accn: str | None = None,
    filed: str | None = None,
    form: str = "10-K",
) -> dict[str, list[dict[str, Any]]]:
    """Facts for one annual period as tag -> [observation]. None means the tag is absent.
    Default year end is 31 December of `fy`. `debt` is reported as LongTermDebtNoncurrent.
    The flow period starts 364 days before `fye` (a 52-week year, inside 350 to 380 days).
    """
    from datetime import date, timedelta
    end = date.fromisoformat(fye) if fye else date(fy, 12, 31)
    start = (end - timedelta(days=364)).isoformat()
    end_s = end.isoformat()
    accession = accn or f"0000000000-{(end.year + 1) % 100:02d}-{fy % 1000:06d}"
    kw: dict[str, Any] = {"form": form, "filed": filed or f"{end.year + 1}-02-15", "accn": accession, "fy": fy}
    out: dict[str, list[dict[str, Any]]] = {}
    for tag, val in (
        ("Revenues", revenue),
        ("OperatingIncomeLoss", ebit),
        ("InterestExpense", interest),
    ):
        if val is not None:
            out[tag] = [fact(val, end_s, start=start, **kw)]
    for tag, val in (
        ("LongTermDebtNoncurrent", debt),
        ("Assets", assets),
        ("StockholdersEquity", equity),
        ("CashAndCashEquivalentsAtCarryingValue", cash),
    ):
        if val is not None:
            out[tag] = [fact(val, end_s, **kw)]
    return out
def merge_facts(*parts: dict[str, list[dict[str, Any]]]) -> dict[str, list[dict[str, Any]]]:
    """Merge several tag -> observations dicts (for example one per year)."""
    out: dict[str, list[dict[str, Any]]] = {}
    for part in parts:
        for tag, obs in part.items():
            out.setdefault(tag, []).extend(obs)
    return out
def submissions_main(
    cik: str | int,
    filings: list[tuple[str, str, str, str]] | None = None,
    *,
    name: str = "Test Corp",
    sic: str | None = "3570",
    tickers: list[str] | None = None,
    older_pages: list[str] | None = None,
) -> dict[str, Any]:
    """Main submissions file. `filings` rows are (accession, filing date, form, items).
    Older pages are named under filings.files; the page bodies come from `submissions_older`.
    """
    rows = filings if filings is not None else [("0000000000-16-000001", "2016-02-15", "10-K", "")]
    return {
        "cik": str(int(cik)),
        "name": name,
        "sic": sic,
        "tickers": list(tickers) if tickers is not None else [],
        "filings": {
            "recent": {
                "accessionNumber": [r[0] for r in rows],
                "filingDate": [r[1] for r in rows],
                "form": [r[2] for r in rows],
                "items": [r[3] for r in rows],
            },
            "files": [
                {"name": n, "filingCount": 0, "filingFrom": "1994-01-01", "filingTo": "2000-01-01"}
                for n in (older_pages or [])
            ],
        },
    }
def submissions_older(filings: list[tuple[str, str, str, str]]) -> dict[str, Any]:
    """Older submissions page: the arrays sit at the top level. Rows as in `submissions_main`."""
    return {
        "accessionNumber": [r[0] for r in filings],
        "filingDate": [r[1] for r in filings],
        "form": [r[2] for r in filings],
        "items": [r[3] for r in filings],
    }
