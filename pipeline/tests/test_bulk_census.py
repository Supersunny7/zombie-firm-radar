"""Tag census (Requirements 30.4 to 30.8)."""
from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

import pandas as pd

from pipeline.bulk import census
from pipeline.bulk.cli import BulkPaths, main
from pipeline.bulk.download import COMPANYFACTS_URL, SUBMISSIONS_URL, zip_path
from pipeline.tests.builders import companyfacts, fact, make_zip, merge_facts, submissions_main, year_facts

NOW = datetime(2026, 11, 20, 12, 0, tzinfo=UTC)
OLD = ("0000000000-98-000001", "1998-03-01", "10-K", "")
RECENT = ("0000000000-25-000001", "2025-03-01", "10-K", "")
END = "2024-12-31"


def _inst(tag: str, val: float) -> dict:
    return {tag: [fact(val, END, fy=2024, accn="0000000099-25-000001")]}


def _flow(tag: str, val: float) -> dict:
    return {tag: [fact(val, END, start="2024-01-02", fy=2024, accn="0000000099-25-000001")]}


def _world() -> tuple[bytes, bytes]:
    def cf(n: int, *parts: dict):
        return companyfacts(f"{n:010d}", merge_facts(*parts))

    members = {
        # F1: no debt value; reports DebtCurrent and NotesPayableCurrent; interest positive
        "CIK0000000001.json": cf(1, year_facts(2024, revenue=100.0, ebit=-5.0, interest=2.0), _inst("DebtCurrent", 30.0), _inst("NotesPayableCurrent", 20.0)),
        # F2: no debt, no debt-like tag, interest exactly 0: likely debt-free
        "CIK0000000002.json": cf(2, year_facts(2024, revenue=100.0, ebit=10.0, interest=0.0)),
        # F3: no debt, no debt-like tag, interest missing: likely debt-free
        "CIK0000000003.json": cf(3, year_facts(2024, revenue=100.0)),
        # F4: no debt, no debt-like tag, but interest is positive: odd, not debt-free
        "CIK0000000004.json": cf(4, year_facts(2024, revenue=100.0, ebit=1.0, interest=3.0)),
        # F5: no revenue, reports the IncludingAssessedTax tag
        "CIK0000000005.json": cf(5, year_facts(2024, ebit=1.0, interest=1.0, debt=10.0), _flow("RevenueFromContractWithCustomerIncludingAssessedTax", 77.0)),
        # F6: has debt (100); another tag with the same number, a part, and a bigger one
        "CIK0000000006.json": cf(6, year_facts(2024, revenue=50.0, ebit=5.0, interest=1.0, debt=100.0),
                                 _inst("LongTermDebtAndCapitalLeaseObligations", 100.5), _inst("NotesPayable", 40.0), _inst("DebtInstrumentCarryingAmount", 250.0)),
        # F7: financial firm, excluded by the SIC rule
        "CIK0000000007.json": cf(7, year_facts(2024, revenue=100.0, ebit=5.0, interest=1.0), _inst("DebtCurrent", 5.0)),
        # F8: young firm, excluded by age
        "CIK0000000008.json": cf(8, year_facts(2024, revenue=100.0, ebit=5.0, interest=1.0), _inst("DebtCurrent", 5.0)),
        # F9: missing interest; reports a related-party and a cash-paid tag
        "CIK0000000009.json": cf(9, year_facts(2024, revenue=100.0, ebit=5.0, debt=3.0), _flow("InterestExpenseRelatedParty", 4.0), _flow("InterestPaidNet", 2.0)),
    }
    sub = {f"CIK{n:010d}.json": submissions_main(n, [OLD, RECENT], name=f"Firm {n}", sic="3571") for n in range(1, 10)}
    sub["CIK0000000007.json"] = submissions_main(7, [OLD, RECENT], name="Bank", sic="6021")
    sub["CIK0000000008.json"] = submissions_main(8, [("0000000008-20-000001", "2020-03-01", "10-K", ""), RECENT], name="Young", sic="3571")
    return make_zip(members), make_zip(sub)


def _prepare(tmp_path: Path) -> BulkPaths:
    paths = BulkPaths(zip_dir=tmp_path / "bulk", out_dir=tmp_path / "out", reports_dir=tmp_path / "reports", run_report=tmp_path / "rr.json")
    cf, sub = _world()
    paths.zip_dir.mkdir(parents=True)
    zip_path(paths.zip_dir, COMPANYFACTS_URL).write_bytes(cf)
    zip_path(paths.zip_dir, SUBMISSIONS_URL).write_bytes(sub)
    assert main(["panel"], paths=paths, env={}, now=NOW) == 0
    return paths


def test_matches_and_status() -> None:
    assert census.matches(census.DEBT, "DebtCurrent") and census.matches(census.DEBT, "SomeOddConvertibleNotesPayable")
    assert not census.matches(census.DEBT, "DebtInstrumentFairValue") and not census.matches(census.DEBT, "InterestExpenseDebt")
    assert census.matches(census.REVENUE, "RevenueFromContractWithCustomerIncludingAssessedTax")
    assert not census.matches(census.REVENUE, "CostOfRevenue") and not census.matches(census.REVENUE, "DeferredRevenue")
    assert census.matches(census.INTEREST, "InterestPaidNet") and census.matches(census.INTEREST, "InterestExpenseLongTermDebt")
    assert not census.matches(census.INTEREST, "InterestIncomeExpenseNet") and not census.matches(census.INTEREST, "NoncontrollingInterestExpense")
    assert census.status_of(census.DEBT, "LongTermDebt") == "existing" and census.status_of(census.DEBT, "DebtCurrent") == "candidate"
    assert census.status_of(census.DEBT, "TermLoan") == "found by name"


def test_census_counts_on_a_tiny_world(tmp_path: Path) -> None:
    paths = _prepare(tmp_path)
    result = census.run_census(paths.out_dir, paths.zip_dir)
    # F7 (financial) and F8 (young) are not core
    assert result.population == 7
    assert result.missing["debt"] == 4  # F1 to F4
    assert result.missing["revenue"] == 1 and result.missing["interest"] == 2  # F3 and F9
    assert result.members.read == 7 and result.members.not_selected == 2

    debt = result.stats["debt"]
    assert debt["DebtCurrent"].missing == 1 and debt["DebtCurrent"].reporting == 1  # F7 is outside the population
    assert debt["NotesPayableCurrent"].missing == 1
    # F6: LongTermDebtAndCapitalLeaseObligations 100.5 vs panel 100 (within 1%), NotesPayable 40 below, carrying amount 250 above
    assert (debt["LongTermDebtAndCapitalLeaseObligations"].both, debt["LongTermDebtAndCapitalLeaseObligations"].within) == (1, 1)
    assert (debt["NotesPayable"].below, debt["NotesPayable"].above) == (1, 0)
    assert (debt["DebtInstrumentCarryingAmount"].above, debt["DebtInstrumentCarryingAmount"].missing) == (1, 0)
    assert debt["LongTermDebtNoncurrent"].reporting == 3 and debt["LongTermDebtNoncurrent"].within == 3  # F5, F6, F9: the same number

    assert result.stats["revenue"]["RevenueFromContractWithCustomerIncludingAssessedTax"].missing == 1
    interest = result.stats["interest"]
    assert interest["InterestExpenseRelatedParty"].missing == 1 and interest["InterestPaidNet"].missing == 1

    # debt-like tags among the 4 firms missing debt: F1 yes (positive); F2 no (zero); F3 no (missing); F4 no (positive)
    assert result.debt_buckets == {(True, "positive"): 1, (False, "zero"): 1, (False, "missing"): 1, (False, "positive"): 1}
    assert census.likely_debt_free(result) == 2


def test_tables_notes_and_files(tmp_path: Path) -> None:
    paths = _prepare(tmp_path)
    files, summary = census.run(paths.out_dir, paths.zip_dir, paths.reports_dir, "2026-11-20")
    assert set(files) == {"tag_census.md", "tag_census_debt.csv", "tag_census_revenue.csv", "tag_census_interest.csv"}
    assert summary["population"] == 7 and summary["likely_debt_free"] == 2
    d = pd.read_csv(paths.reports_dir / "tag_census_debt.csv").set_index("tag")
    for tag in census.DEBT.candidates + census.DEBT.existing:  # every named tag is listed, even with zero firms
        assert tag in d.index and isinstance(d.loc[tag, "double_count_note"], str) and len(d.loc[tag, "double_count_note"]) > 20
    assert d.loc["DebtCurrent", "firms_missing_field_reporting"] == 1 and d.loc["DebtCurrent", "status"] == "candidate"
    assert d.loc["LongTermDebt", "status"] == "existing"
    i = pd.read_csv(paths.reports_dir / "tag_census_interest.csv").set_index("tag")
    assert i.loc["InterestPaidNet", "status"] == "candidate (report only)"
    assert "never proposed" in i.loc["InterestPaidNet", "double_count_note"]
    text = (paths.reports_dir / "tag_census.md").read_text()
    assert "likely debt-free" in text and "This file changes nothing" in text and "Data: SEC EDGAR. Not investment advice." in text
    assert "double count" in text.lower() or "double-count" in text.lower()


def test_census_is_deterministic_and_read_only(tmp_path: Path) -> None:
    paths = _prepare(tmp_path)
    before = {n: (paths.out_dir / n).read_bytes() for n in ("panel.csv.gz", "firms.csv.gz", "events.csv.gz")}
    census.run(paths.out_dir, paths.zip_dir, paths.reports_dir, "2026-11-20")
    first = {p.name: p.read_bytes() for p in paths.reports_dir.iterdir()}
    census.run(paths.out_dir, paths.zip_dir, paths.reports_dir, "2026-11-20")
    assert first == {p.name: p.read_bytes() for p in paths.reports_dir.iterdir()}
    assert before == {n: (paths.out_dir / n).read_bytes() for n in before}  # the panel is untouched


def test_census_command_needs_no_email_or_network_and_exit_4_without_tables(tmp_path: Path) -> None:
    paths = BulkPaths(zip_dir=tmp_path / "bulk", out_dir=tmp_path / "out", reports_dir=tmp_path / "reports", run_report=tmp_path / "rr.json")
    assert main(["census"], paths=paths, env={}, now=NOW) == 4
    paths = _prepare(tmp_path / "w")
    assert main(["census"], paths=paths, env={}, now=NOW) == 0
    rep = json.loads(paths.run_report.read_text())
    assert rep["bulk"]["census"]["population"] == 7 and "tag_census.md" in rep["bulk"]["census"]["files"]
    assert rep["requests"]["sec"]["sent"] == 0
