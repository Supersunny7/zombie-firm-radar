"""`python -m pipeline.bulk` download and panel commands (Requirements 20, 22.4, 23, 25, 27, 28.1, 28.11)."""
from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

import pytest

from pipeline.bulk.cli import BulkPaths, main
from pipeline.bulk.download import COMPANYFACTS_URL, SUBMISSIONS_URL
from pipeline.bulk.tables import read_table
from pipeline.tests.builders import (
    companyfacts,
    fact,
    make_zip,
    merge_facts,
    submissions_main,
    submissions_older,
    year_facts,
)
from pipeline.tests.conftest import StreamResponse, StreamSession

EMAIL = "frank@example.invalid"
NOW = datetime(2026, 11, 20, 12, 0, tzinfo=UTC)
ENV = {"SEC_CONTACT_EMAIL": EMAIL}
BAD = dict(revenue=100.0, ebit=5.0, interest=10.0)  # icr 0.5
GOOD = dict(revenue=100.0, ebit=50.0, interest=10.0)


def _cik(n: int) -> str:
    return f"{n:010d}"


def _world() -> tuple[bytes, bytes]:
    """Eight companyfacts members and submissions for the cases of task 28.2."""
    def cf(n: int, years: dict[int, dict], **kw):
        return companyfacts(_cik(n), merge_facts(*[year_facts(fy, **a) for fy, a in years.items()]), entity_name=f"Entity {n}", **kw)

    page3 = "CIK0000000003-submissions-001.json"
    cf_members = {
        f"CIK{_cik(1)}.json": cf(1, {fy: BAD for fy in range(2015, 2025)}),  # December zombie
        f"CIK{_cik(2)}.json": cf(2, {2018: dict(GOOD, fye="2019-01-31"), 2019: dict(GOOD, fye="2020-01-31")}),
        f"CIK{_cik(3)}.json": cf(3, {fy: BAD for fy in range(2015, 2020)}),  # bankrupt in 2020, stops filing
        f"CIK{_cik(4)}.json": cf(4, {fy: GOOD for fy in range(2015, 2025)}),  # financial
        f"CIK{_cik(5)}.json": cf(5, {2020: GOOD}),  # no submissions file
        f"CIK{_cik(7)}.json": companyfacts(_cik(7), {"Revenues": [fact(1.0, "2020-12-31", start="2020-01-02", form="10-Q", fp="Q1")]}),
        f"CIK{_cik(8)}.json": b"{not json",
        "README.txt": b"hello",
    }
    sub_members = {
        f"CIK{_cik(1)}.json": submissions_main(1, [("0000000001-16-000001", "2016-03-01", "10-K", ""), ("0000000001-98-000001", "1998-03-01", "10-K", "")], name="One Inc", sic="3571", tickers=["ONE"]),
        f"CIK{_cik(2)}.json": submissions_main(2, [("0000000002-16-000001", "2016-03-01", "10-K", "")], name="Two Inc", sic="5400"),
        f"CIK{_cik(3)}.json": submissions_main(3, [("0000000003-19-000001", "2019-03-01", "10-K", "")], name="Three Inc", sic="2000", older_pages=[page3]),
        page3: submissions_older([("0000000003-20-000009", "2020-08-14", "8-K", "1.03,9.01"), ("0000000003-98-000001", "1998-02-01", "10-K", "")]),
        f"CIK{_cik(4)}.json": submissions_main(4, [("0000000004-16-000001", "2016-03-01", "10-K", "")], name="Bank Corp", sic="6021"),
        f"CIK{_cik(6)}.json": submissions_main(6, [("0000000006-20-000001", "2020-01-01", "8-K", "1.03")], name="Only Subs", sic="3000"),
    }
    return make_zip(cf_members), make_zip(sub_members)


def _paths(tmp_path: Path) -> BulkPaths:
    return BulkPaths(zip_dir=tmp_path / "bulk", out_dir=tmp_path / "out", reports_dir=tmp_path / "reports",
                     run_report=tmp_path / "run_report.json")


def _session(cf: bytes, sub: bytes) -> StreamSession:
    def ok(b: bytes) -> list[StreamResponse]:
        return [StreamResponse(200, {"Content-Length": str(len(b))}, b)]
    return StreamSession({COMPANYFACTS_URL: ok(cf), SUBMISSIONS_URL: ok(sub)})


def _run(tmp_path: Path, command: str, session: StreamSession | None = None, env=ENV, extra: list[str] | None = None) -> int:
    return main([command, *(extra or [])], paths=_paths(tmp_path), session=session or StreamSession(), env=env, now=NOW, sleep=lambda s: None)


def _report(tmp_path: Path) -> dict:
    return json.loads((tmp_path / "run_report.json").read_text())


def test_missing_email_exits_2_with_zero_requests(tmp_path: Path) -> None:
    session = StreamSession()
    assert _run(tmp_path, "download", session, env={}) == 2
    assert _run(tmp_path, "all", session, env={"SEC_CONTACT_EMAIL": "  "}) == 2
    assert session.requests == []
    assert not (tmp_path / "run_report.json").exists()  # not written for an argument error


@pytest.mark.parametrize("rate", ["0", "-1", "10.5", "nan"])
def test_bad_rate_exits_2(tmp_path: Path, rate: str) -> None:
    assert _run(tmp_path, "download", extra=["--rate", rate]) == 2


def test_unknown_command_exits_2(tmp_path: Path) -> None:
    assert _run(tmp_path, "launch") == 2


def test_output_paths_inside_data_or_protected_dirs_are_refused(tmp_path: Path) -> None:
    from pipeline.config import REPO_ROOT
    for bad in (REPO_ROOT / "data" / "out", REPO_ROOT / "data" / "mock", REPO_ROOT / "web" / "x"):
        paths = BulkPaths(zip_dir=tmp_path / "z", out_dir=bad, reports_dir=tmp_path / "r", run_report=tmp_path / "rr.json")
        assert main(["panel"], paths=paths, env=ENV, now=NOW) == 2
    assert not (REPO_ROOT / "data" / "out").exists()


def test_panel_without_zips_exits_4_and_names_the_file(tmp_path: Path, capsys) -> None:
    session = StreamSession()
    assert _run(tmp_path, "panel", session, env={}) == 4  # panel needs no email
    assert "companyfacts.zip" in capsys.readouterr().err
    assert session.requests == [] and _report(tmp_path)["exit_code"] == 4
    assert not (tmp_path / "out").exists() or not list((tmp_path / "out").iterdir())


def test_use_cached_without_a_zip_exits_4(tmp_path: Path) -> None:
    assert _run(tmp_path, "download", extra=["--use-cached"]) == 4


def test_download_then_panel_builds_the_three_tables(tmp_path: Path) -> None:
    cf, sub = _world()
    session = _session(cf, sub)
    assert _run(tmp_path, "download", session) == 0
    assert len(session.requests) == 2  # one request per zip
    assert _run(tmp_path, "panel", session) == 0
    assert len(session.requests) == 2  # panel sends none

    firms = read_table(tmp_path / "out" / "firms.csv.gz").set_index("cik")
    assert list(firms.index) == [_cik(n) for n in (1, 2, 3, 4, 5, 8)]  # 7 has no annual facts, 6 is submissions-only
    assert firms.loc[_cik(1), "name"] == "One Inc" and firms.loc[_cik(1), "tickers"] == "ONE"
    assert firms.loc[_cik(4), "is_financial"] == "true" and firms.loc[_cik(1), "is_financial"] == "false"
    assert firms.loc[_cik(5), "no_sic"] == "true" and firms.loc[_cik(5), "name"] == "Entity 5"
    assert firms.loc[_cik(8), "parse_error"] == "true"
    assert firms.loc[_cik(3), "first_filing_date"] == "1998-02-01"  # from the older page
    assert firms.loc[_cik(3), "last_10k_date"] == "2019-03-01"

    panel = read_table(tmp_path / "out" / "panel.csv.gz")
    assert len(panel) == 6 * 11
    assert list(panel["cik"]) == sorted(panel["cik"])  # sorted by CIK, then by year
    one = panel[panel["cik"] == _cik(1)].set_index("fy")
    assert one.loc["2024", "zombie_flag"] == "true" and one.loc["2025", "fye"] != one.loc["2025", "fye"]  # NaN
    two = panel[panel["cik"] == _cik(2)].set_index("fy")
    assert two.loc["2018", "fye"] == "2019-01-31"  # January year end belongs to FY2018
    three = panel[panel["cik"] == _cik(3)]
    assert len(three) == 11 and three[three["fy"].astype(int) >= 2020]["fye"].isna().all()
    eight = panel[panel["cik"] == _cik(8)]
    assert len(eight) == 11 and eight["fye"].isna().all()

    events = read_table(tmp_path / "out" / "events.csv.gz")
    assert [(r.cik, r.event_type, r.date, r.source_member) for r in events.itertuples()] == [
        (_cik(3), "bankruptcy", "2020-08-14", "CIK0000000003-submissions-001.json")
    ]  # firm 6's bankruptcy is dropped: it is not in Universe_P1


def test_run_report_bulk_section(tmp_path: Path) -> None:
    cf, sub = _world()
    session = _session(cf, sub)
    assert _run(tmp_path, "download", session) == 0
    assert _run(tmp_path, "panel", session) == 0
    rep = _report(tmp_path)
    bulk = rep["bulk"]
    assert rep["exit_code"] == 0 and bulk["command"] == "panel"
    assert set(bulk["zips"]) == {"companyfacts.zip", "submissions.zip"}
    assert bulk["zips"]["companyfacts.zip"]["size_bytes"] == len(cf)
    assert bulk["universe_p1"] == 6 and bulk["companyfacts_without_annual_facts"] == 1
    assert bulk["submissions_only_ciks"] == 1 and bulk["orphan_pages"] == []
    assert bulk["panel_rows"] == 66 and bulk["gap_rows"] > 0
    assert bulk["events"] == {"bankruptcy": 1, "acquisition_disposition": 0, "delisting": 0, "deregistration": 0}
    assert bulk["events_outside_universe_dropped"] == 1
    assert bulk["members"]["companyfacts"]["ignored"] == 1
    assert [f["member"] for f in bulk["members"]["companyfacts"]["parse_failed"]] == ["CIK0000000008.json"]
    assert EMAIL not in json.dumps(rep)


def test_download_report_counts_requests_and_cache_hits(tmp_path: Path) -> None:
    cf, sub = _world()
    session = _session(cf, sub)
    assert _run(tmp_path, "download", session) == 0
    assert _report(tmp_path)["requests"]["sec"] == {"sent": 2, "cache_hits": 0, "retried": 0}
    assert _run(tmp_path, "download", session) == 0  # records are fresh: no new request
    assert len(session.requests) == 2
    assert _report(tmp_path)["requests"]["sec"] == {"sent": 0, "cache_hits": 2, "retried": 0}


def test_download_failure_exits_3_and_is_reported(tmp_path: Path) -> None:
    cf, sub = _world()
    bad = StreamResponse(200, {"Content-Length": str(len(cf) + 5)}, cf)
    session = StreamSession({COMPANYFACTS_URL: [bad]})
    assert _run(tmp_path, "download", session) == 3
    rep = _report(tmp_path)
    assert rep["exit_code"] == 3 and rep["failure"]["requirement"] == "21.3"
    assert EMAIL not in json.dumps(rep)
    assert not list((tmp_path / "bulk").glob("*.part"))


def test_panel_output_is_byte_identical_on_a_second_run(tmp_path: Path) -> None:
    cf, sub = _world()
    session = _session(cf, sub)
    _run(tmp_path, "download", session)
    _run(tmp_path, "panel", session)
    first = {n: (tmp_path / "out" / n).read_bytes() for n in ("panel.csv.gz", "firms.csv.gz", "events.csv.gz")}
    _run(tmp_path, "panel", session)
    assert first == {n: (tmp_path / "out" / n).read_bytes() for n in first}
