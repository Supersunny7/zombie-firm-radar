"""Example tests for pipeline/universe.py (task 5.2). Offline: FakeSession only."""

from __future__ import annotations

from pathlib import Path

import pytest

from pipeline.facts import ExtractResult
from pipeline.http import (
    SEC_COMPANYFACTS_URL,
    SEC_SUBMISSIONS_PAGE_URL,
    SEC_SUBMISSIONS_URL,
    Cache,
    RateLimiter,
    RequestStats,
    SecClient,
)
from pipeline.run_report import RunReport
from pipeline.tests.builders import company_tickers, submissions, submissions_page
from pipeline.tests.conftest import FakeSession
from pipeline.universe import (
    EXCLUDED_DIVISION,
    Failed,
    FirmFetcher,
    Submissions,
    classify,
    first_filing_year,
    load_ticker_map,
    match_sector,
    read_cik_file,
    read_ticker_file,
    sic_division,
)

RUN_YEAR = 2025
CIK = "0000000001"


def _sub(sic: object = "3570", dates: list[str] | None = None) -> Submissions:
    doc = submissions(CIK, sic=sic, filing_dates=dates if dates is not None else ["2015-03-01"])
    return FirmFetcher._parse_main(CIK, doc)


def _facts(latest_fy: int | None, has_annual: bool = True) -> ExtractResult:
    window = () if latest_fy is None else (latest_fy,)
    return ExtractResult(has_annual_facts=has_annual, window=window, years=())


def _fetcher(session: FakeSession, tmp_path: Path) -> tuple[FirmFetcher, RunReport]:
    sec = SecClient(
        Cache(tmp_path / "cache"),
        RateLimiter(1000.0, sleep=lambda _s: None),
        session,
        "test@example.invalid",
        RequestStats(),
        sleep=lambda _s: None,
    )
    report = RunReport()
    return FirmFetcher(sec, report), report


# --- input files (1.2, 1.3, 1.12) ----------------------------------------------


def test_ticker_file_ignores_blank_lines_and_whitespace(tmp_path: Path) -> None:
    f = tmp_path / "t.txt"
    f.write_text("  aapl \n\n\t\nMSFT\n   \nbrk-b\n", encoding="utf-8")
    assert read_ticker_file(f) == ["aapl", "MSFT", "brk-b"]


def test_ticker_lookup_is_case_insensitive() -> None:
    tm = load_ticker_map(company_tickers([(320193, "AAPL", "Apple"), (789019, "MSFT", "Microsoft")]))
    assert tm.cik_for("aapl") == "0000320193"
    assert tm.cik_for(" Msft ") == "0000789019"
    assert tm.cik_for("nope") is None


def test_two_tickers_on_one_cik() -> None:
    tm = load_ticker_map(
        company_tickers([(1652044, "GOOGL", "Alphabet"), (1652044, "GOOG", "Alphabet"), (5, "AAA", "A")])
    )
    assert tm.cik_for("GOOG") == "0001652044"
    assert tm.cik_for("googl") == "0001652044"
    assert tm.first_ticker["0001652044"] == "GOOGL"
    assert tm.ciks == ("0000000005", "0001652044")


def test_cik_file_pads_dedupes_and_records_invalid(tmp_path: Path) -> None:
    f = tmp_path / "c.txt"
    f.write_text("  320193 \n\n0000320193\nabc\n12345678901\n-5\n1 2\n789019\n", encoding="utf-8")
    ciks, skipped = read_cik_file(f)
    assert ciks == ["0000320193", "0000789019"]
    assert [(s.reason, s.text) for s in skipped] == [
        ("invalid_cik", "abc"),
        ("invalid_cik", "12345678901"),
        ("invalid_cik", "-5"),
        ("invalid_cik", "1 2"),
    ]


def test_invalid_cik_and_ticker_not_found_are_recorded(tmp_path: Path) -> None:
    f = tmp_path / "c.txt"
    f.write_text("xyz\n", encoding="utf-8")
    _, skipped = read_cik_file(f)
    tm = load_ticker_map(company_tickers([(1, "AAA", "A")]))
    report = RunReport()
    for s in skipped:
        report.add_skipped(s.reason, s.text)
    for t in ["AAA", "zzz"]:
        if tm.cik_for(t) is None:
            report.add_skipped("ticker_not_found", t)
    assert report.to_dict()["skipped_inputs"] == [
        {"reason": "invalid_cik", "text": "xyz"},
        {"reason": "ticker_not_found", "text": "zzz"},
    ]


# --- SIC boundaries (1.6, 2.1, 2.3) -------------------------------------------


@pytest.mark.parametrize(
    ("sic", "expected"),
    [
        ("4899", None),
        ("4900", "utility"),
        ("4999", "utility"),
        ("5000", None),
        ("5999", None),
        ("6000", "financial"),
        ("6799", "financial"),
        ("6800", "no_sic"),  # not financial, but in no SIC_Division (Requirement 3.7)
    ],
)
def test_sic_boundaries(sic: str, expected: str | None) -> None:
    assert classify(_sub(sic), None, RUN_YEAR, skip_recency=True) == expected


def test_sic_division_edges() -> None:
    assert sic_division(4899) == sic_division(4900) == sic_division(4999)
    assert sic_division(5000) == "Wholesale Trade"
    assert sic_division(5999) == "Retail Trade"
    assert sic_division(6000) == sic_division(6799) == EXCLUDED_DIVISION
    assert sic_division(6800) is None  # gap between 6799 and 7000: no division


@pytest.mark.parametrize("sic", [None, "", "  ", "abc"])
def test_missing_or_empty_sic_is_no_sic(sic: str | None) -> None:
    assert classify(_sub(sic), None, RUN_YEAR, skip_recency=True) == "no_sic"


# --- age, recency (2.4, 2.5, 2.7) ----------------------------------------------


def test_age_exactly_10_kept_and_9_excluded() -> None:
    assert classify(_sub(dates=["2015-12-31"]), None, RUN_YEAR, skip_recency=True) is None
    assert classify(_sub(dates=["2016-01-01"]), None, RUN_YEAR, skip_recency=True) == "age_under_10"


def test_latest_fy_2024_kept_and_2023_excluded() -> None:
    assert classify(_sub(), _facts(2024), RUN_YEAR, skip_recency=False) is None
    assert classify(_sub(), _facts(2023), RUN_YEAR, skip_recency=False) == "not_recent"


def test_ciks_mode_skips_recency() -> None:
    assert classify(_sub(), _facts(2023), RUN_YEAR, skip_recency=True) is None


def test_no_annual_facts() -> None:
    assert classify(_sub(), _facts(None, has_annual=False), RUN_YEAR, skip_recency=True) == "no_annual_facts"


# --- fetcher: older pages (2.2, 2.8, 2.9) --------------------------------------


def test_older_page_changes_first_filing_year(tmp_path: Path) -> None:
    session = FakeSession(urls_json=None)
    session.set_body(
        SEC_SUBMISSIONS_URL.format(cik=CIK),
        submissions(CIK, filing_dates=["2020-03-01"], older_pages=["CIK0000000001-submissions-001.json"]),
    )
    session.set_body(
        SEC_SUBMISSIONS_PAGE_URL.format(name="CIK0000000001-submissions-001.json"),
        submissions_page(["1999-05-05", "2005-01-01"]),
    )
    fetcher, _ = _fetcher(session, tmp_path)

    main = fetcher.submissions(CIK, with_older_pages=False)
    assert isinstance(main, Submissions)
    assert main.first_filing_year == 2020
    assert classify(main, None, RUN_YEAR, skip_recency=True) == "age_under_10"

    full = fetcher.submissions(CIK)
    assert isinstance(full, Submissions)
    assert full.first_filing_year == 1999
    assert full.age_years(RUN_YEAR) == 26
    assert classify(full, None, RUN_YEAR, skip_recency=True) is None


def test_first_filing_year_over_pages() -> None:
    assert first_filing_year([{"filingDate": ["2010-01-01"]}, {"filingDate": ["2001-06-01", "bad"]}]) == 2001
    assert first_filing_year([{}]) is None


def test_failed_older_page_makes_failed_firm(tmp_path: Path) -> None:
    page_name = "CIK0000000001-submissions-001.json"
    page_url = SEC_SUBMISSIONS_PAGE_URL.format(name=page_name)
    session = FakeSession(urls_json=None)
    session.set_body(
        SEC_SUBMISSIONS_URL.format(cik=CIK),
        submissions(CIK, filing_dates=["2010-03-01"], older_pages=[page_name]),
    )
    session.override(page_url, status=404)
    fetcher, report = _fetcher(session, tmp_path)

    result = fetcher.submissions(CIK)
    assert isinstance(result, Failed)
    assert result.url == page_url
    assert report.failed_firms == [{"cik": CIK, "url": page_url, "reason": "HTTP 404"}]
    assert report.attempted_firms == 1
    assert report.failure_pct == 100.0


def test_fetcher_memoises_and_counts_attempted(tmp_path: Path) -> None:
    session = FakeSession(urls_json=None)
    session.set_body(SEC_SUBMISSIONS_URL.format(cik=CIK), submissions(CIK))
    fetcher, report = _fetcher(session, tmp_path)
    fetcher.submissions(CIK)
    fetcher.submissions(CIK)
    assert len(session.requests) == 1
    assert report.attempted_firms == 1


def test_companyfacts_404_is_not_found_not_failed(tmp_path: Path) -> None:
    session = FakeSession(urls_json=None)
    session.override(SEC_COMPANYFACTS_URL.format(cik=CIK), status=404)
    fetcher, report = _fetcher(session, tmp_path)
    res = fetcher.companyfacts(CIK)
    assert not isinstance(res, (dict, Failed))
    assert report.failed_firms == []


# --- sector names (1.7) --------------------------------------------------------


def test_sector_match_ignores_case_and_whitespace() -> None:
    assert match_sector("  manufacturing ") == "Manufacturing"
    assert match_sector("RETAIL TRADE") == "Retail Trade"
    assert match_sector("services\n") == "Services"


def test_sector_match_rejects_finance_and_unknown() -> None:
    assert match_sector(EXCLUDED_DIVISION) is None
    assert match_sector(" finance, insurance and real estate ") is None
    assert match_sector("Widgets") is None
