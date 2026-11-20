"""Phase 1 config additions, run report field and test helpers (Requirements 20.5, 21.7, 27.1, 29.3)."""
from __future__ import annotations

import json
import zipfile
from io import BytesIO

from pipeline import config
from pipeline.config import (
    BULK_CACHE_DIR,
    PHASE1_OUT_DIR,
    PHASE1_REPORTS_DIR,
    REPO_ROOT,
    BulkDownloadError,
    BulkWriteError,
    MissingBulkFileError,
    PipelineError,
    is_protected,
)
from pipeline.run_report import RunReport
from pipeline.tests.builders import make_zip, merge_facts, submissions_main, submissions_older, year_facts
from pipeline.tests.conftest import StreamResponse, StreamSession

PIPELINE_DIR = REPO_ROOT / "pipeline"


def test_phase1_paths_are_inside_pipeline_and_not_protected() -> None:
    for path in (BULK_CACHE_DIR, PHASE1_OUT_DIR, PHASE1_REPORTS_DIR):
        assert PIPELINE_DIR in path.parents
        assert not is_protected(path)
    assert BULK_CACHE_DIR == REPO_ROOT / "pipeline" / ".cache" / "bulk"
    assert PHASE1_OUT_DIR == REPO_ROOT / "pipeline" / "out"
    assert PHASE1_REPORTS_DIR == REPO_ROOT / "pipeline" / "reports"


def test_gitignore_keeps_cache_and_out_ignored_and_reports_tracked() -> None:
    lines = {ln.strip() for ln in (REPO_ROOT / ".gitignore").read_text(encoding="utf-8").splitlines()}
    assert "pipeline/.cache/" in lines
    assert "pipeline/out/" in lines
    assert "pipeline/reports/" not in lines


def test_bulk_exceptions_have_distinct_exit_codes_from_the_phase1_table() -> None:
    assert issubclass(BulkDownloadError, PipelineError) and BulkDownloadError.exit_code == 3
    assert issubclass(MissingBulkFileError, PipelineError) and MissingBulkFileError.exit_code == 4
    assert issubclass(BulkWriteError, PipelineError) and BulkWriteError.exit_code == 5
    assert config.PreflightError.exit_code == 2  # existing, unchanged


def test_run_report_without_bulk_keeps_its_existing_fields() -> None:
    d = RunReport().to_dict()
    assert d["bulk"] is None
    for key in ("started_at", "exit_code", "attempted_firms", "exclusions", "requests", "failure_pct"):
        assert key in d


def test_run_report_bulk_section_is_redacted() -> None:
    rep = RunReport()
    rep.bulk = {
        "command": "all",
        "zips": {"companyfacts.zip": {"url": "https://x/y?api_key=SECRETKEY", "error": "boom frank@example.com"}},
        "members": {"companyfacts": {"read": 3, "parse_failed": []}},
    }
    text = rep.to_json(["frank@example.com"])
    assert "frank@example.com" not in text
    assert "SECRETKEY" not in text
    assert json.loads(text)["bulk"]["members"]["companyfacts"]["read"] == 3


def test_make_zip_round_trips_json_and_keeps_member_order() -> None:
    data = make_zip({"b.json": {"x": 1}, "a.json": [1, 2], "c.txt": "hi"})
    with zipfile.ZipFile(BytesIO(data)) as zf:
        assert zf.namelist() == ["b.json", "a.json", "c.txt"]
        assert json.loads(zf.read("b.json")) == {"x": 1}
        assert zf.read("c.txt") == b"hi"


def test_year_facts_builds_a_december_year_and_omits_absent_tags() -> None:
    facts = year_facts(2020, revenue=100.0, ebit=10.0, interest=5.0, debt=50.0, cash=0.0)
    assert set(facts) == {
        "Revenues", "OperatingIncomeLoss", "InterestExpense",
        "LongTermDebtNoncurrent", "CashAndCashEquivalentsAtCarryingValue",
    }
    flow = facts["Revenues"][0]
    assert flow["end"] == "2020-12-31" and flow["start"] == "2020-01-02"
    assert "start" not in facts["LongTermDebtNoncurrent"][0]
    assert facts["CashAndCashEquivalentsAtCarryingValue"][0]["val"] == 0.0  # zero is kept, not dropped
    merged = merge_facts(year_facts(2019, revenue=1.0), year_facts(2020, revenue=2.0))
    assert [o["val"] for o in merged["Revenues"]] == [1.0, 2.0]


def test_submissions_builders_put_arrays_in_main_and_older_page() -> None:
    main = submissions_main(
        5, [("0000000005-20-000001", "2020-03-01", "8-K", "1.03,9.01")], older_pages=["CIK0000000005-submissions-001.json"]
    )
    assert main["filings"]["recent"]["items"] == ["1.03,9.01"]
    assert main["filings"]["files"][0]["name"] == "CIK0000000005-submissions-001.json"
    page = submissions_older([("0000000005-10-000001", "2010-01-05", "10-K", "")])
    assert page["form"] == ["10-K"] and "filings" not in page


def test_stream_session_serves_scripted_responses_and_can_cut_the_stream() -> None:
    url = "https://example.test/a.zip"
    session = StreamSession(
        {url: [StreamResponse(429, {}, b""), StreamResponse(200, {"Content-Length": "6"}, b"abcdef", cut_after=4)]}
    )
    first = session.get(url, headers={"User-Agent": "x"}, stream=True)
    second = session.get(url, headers={}, stream=True)
    third = session.get(url, headers={}, stream=True)  # the last response repeats
    assert first.status_code == 429
    assert b"".join(second.iter_content(2)) == b"abcd"
    assert third is second
    assert len(session.requests) == 3 and session.requests[0]["stream"] is True
