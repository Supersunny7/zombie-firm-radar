"""Small hand-written builders for SEC documents used by edge-case tests."""

from __future__ import annotations

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
