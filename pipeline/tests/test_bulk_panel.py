"""Panel extractor, zombie flag, age and tables (Requirements 23.1 to 23.6, 24.1 to 24.10, 28.2 to 28.4, 28.9)."""
from __future__ import annotations

import gzip
from datetime import date
from pathlib import Path

from hypothesis import given
from hypothesis import strategies as st

from pipeline.bulk.panel import (
    FIELDS,
    PANEL_YEARS,
    FirmFacts,
    age_at_fy,
    extract_panel,
    gap_panel,
    zombie_flags,
)
from pipeline.bulk.submissions import SubAgg, filing_url
from pipeline.bulk.tables import (
    FIRM_COLUMNS,
    PANEL_COLUMNS,
    GzipCsvWriter,
    build_firm_row,
    cell,
    read_table,
)
from pipeline.tests.builders import companyfacts, fact, merge_facts, year_facts

CIK = "0000000001"
FIRST = date(2000, 1, 1)
PRETAX = "IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest"


def _panel(years: dict[int, dict], first: date | None = FIRST, cik: str = CIK):
    cf = companyfacts(cik, merge_facts(*[year_facts(fy, **kw) for fy, kw in sorted(years.items())]))
    return {r["fy"]: r for r in extract_panel(cik, cf, first)}


def test_eleven_rows_ascending_with_a_gap_year_in_the_middle() -> None:
    rows = _panel({fy: dict(revenue=100.0, ebit=10.0, interest=2.0, assets=500.0) for fy in (2015, 2016, 2017, 2019, 2020)})
    assert sorted(rows) == list(PANEL_YEARS) and len(rows) == 11
    gap = rows[2018]
    assert all(gap[f + s] is None for f in FIELDS for s in ("", "_tag", "_end", "_accn", "_url"))
    assert gap["fye"] is None and gap["icr"] is None and gap["age_at_fy"] is None
    assert gap["zombie_flag"] is False and gap["gap_has_balance_sheet"] is False
    assert rows[2017]["revenue"] == 100.0 and rows[2017]["fye"] == date(2017, 12, 31)


def test_a_firm_that_stops_filing_in_2019_keeps_11_rows() -> None:
    rows = _panel({fy: dict(revenue=10.0, ebit=1.0, interest=1.0) for fy in range(2015, 2020)})
    assert len(rows) == 11
    assert all(rows[fy]["fye"] is None for fy in range(2020, 2026))


def test_january_and_may_year_ends_map_to_the_prior_fiscal_year() -> None:
    rows = _panel({
        2020: dict(revenue=1.0, ebit=1.0, interest=1.0, fye="2021-01-31"),
        2018: dict(revenue=2.0, ebit=1.0, interest=1.0, fye="2019-05-31"),
        2017: dict(revenue=3.0, ebit=1.0, interest=1.0, fye="2017-06-30"),
    })
    assert rows[2020]["fye"] == date(2021, 1, 31) and rows[2020]["revenue"] == 1.0
    assert rows[2018]["fye"] == date(2019, 5, 31) and rows[2018]["revenue"] == 2.0
    assert rows[2017]["fye"] == date(2017, 6, 30) and rows[2017]["revenue"] == 3.0


def _fallback_facts() -> dict:
    start, end = "2019-01-02", "2019-12-31"
    kw = dict(filed="2020-02-20", fy=2019)
    return {
        PRETAX: [fact(40.0, end, start=start, accn="0000000001-20-000007", **kw)],
        "InterestExpense": [fact(10.0, end, start=start, accn="0000000001-20-000008", **kw)],
        "Revenues": [fact(900.0, end, start=start, accn="0000000001-20-000007", **kw)],
    }


def test_ebit_fallback_value_and_tag_columns() -> None:
    row = {r["fy"]: r for r in extract_panel(CIK, companyfacts(CIK, _fallback_facts()), FIRST)}[2019]
    assert row["operating_income"] == 50.0
    assert row["operating_income_tag"] == f"{PRETAX};InterestExpense"
    assert row["operating_income_accn"] == "0000000001-20-000007;0000000001-20-000008"
    assert row["operating_income_url"] == ";".join(filing_url(CIK, a) for a in ("0000000001-20-000007", "0000000001-20-000008"))
    assert row["interest_expense_tag"] == "InterestExpense" and row["icr"] == 5.0


def test_cash_within_seven_days_and_absent_cash_is_empty() -> None:
    cf = merge_facts(year_facts(2019, revenue=1.0, ebit=1.0, interest=1.0), year_facts(2020, revenue=1.0, ebit=1.0, interest=1.0))
    cf["CashAndCashEquivalentsAtCarryingValue"] = [fact(55.0, "2019-12-28", fy=2019)]  # 3 days before the year end
    rows = {r["fy"]: r for r in extract_panel(CIK, companyfacts(CIK, cf), FIRST)}
    assert rows[2019]["cash"] == 55.0
    assert rows[2019]["cash_tag"] == "CashAndCashEquivalentsAtCarryingValue" and rows[2019]["cash_end"] == "2019-12-28"
    assert rows[2020]["cash"] is None and rows[2020]["cash_tag"] is None and rows[2020]["cash_url"] is None


def test_fy2013_and_fy2014_feed_the_first_flags_but_have_no_rows() -> None:
    bad = dict(revenue=100.0, ebit=5.0, interest=10.0)  # icr 0.5
    rows = _panel({2013: bad, 2014: bad, 2015: bad, 2017: bad})
    assert sorted(rows) == list(PANEL_YEARS)
    assert rows[2015]["zombie_flag"] is True  # 2013, 2014, 2015 all below 1, age 15
    assert rows[2016]["zombie_flag"] is False  # no facts for 2016
    assert rows[2017]["zombie_flag"] is False  # 2016 is a gap, so the streak breaks


def test_flag_is_false_when_any_of_the_three_icr_values_is_null() -> None:
    bad = dict(revenue=100.0, ebit=5.0, interest=10.0)
    rows = _panel({2014: bad, 2015: bad, 2016: dict(revenue=100.0, ebit=5.0), 2017: bad, 2018: bad})  # 2016 interest missing
    assert rows[2016]["icr"] is None
    assert rows[2016]["zombie_flag"] is False and rows[2017]["zombie_flag"] is False and rows[2018]["zombie_flag"] is False
    zero = _panel({2014: bad, 2015: bad, 2016: dict(revenue=100.0, ebit=5.0, interest=0.0)})
    assert zero[2016]["interest_expense"] == 0.0 and zero[2016]["icr"] is None and zero[2016]["zombie_flag"] is False


def test_flag_needs_age_ten_at_that_year() -> None:
    bad = dict(revenue=100.0, ebit=5.0, interest=10.0)
    young = _panel({fy: bad for fy in range(2013, 2018)}, first=date(2010, 1, 1))
    assert young[2015]["age_at_fy"] == 5 and young[2015]["zombie_flag"] is False
    assert young[2017]["age_at_fy"] == 7
    assert _panel({fy: bad for fy in range(2013, 2016)}, first=date(2005, 12, 31))[2015]["zombie_flag"] is True  # exactly 10
    assert _panel({fy: bad for fy in range(2013, 2016)}, first=date(2006, 1, 1))[2015]["zombie_flag"] is False  # 9 years and 364 days
    assert _panel({fy: bad for fy in range(2013, 2016)}, first=None)[2015]["age_at_fy"] is None


def test_multi_fact_debt_lists_every_part_in_order() -> None:
    end = "2020-12-31"
    cf = merge_facts(year_facts(2020, revenue=1.0, ebit=1.0, interest=1.0), {
        "LongTermDebtNoncurrent": [fact(70.0, end, accn="0000000001-21-000001", filed="2021-02-01")],
        "ShortTermBorrowings": [fact(30.0, end, accn="0000000001-21-000002", filed="2021-02-02")],
    })
    row = {r["fy"]: r for r in extract_panel(CIK, companyfacts(CIK, cf), FIRST)}[2020]
    assert row["total_debt"] == 100.0
    assert row["total_debt_tag"] == "LongTermDebtNoncurrent;ShortTermBorrowings"
    assert row["total_debt_accn"] == "0000000001-21-000001;0000000001-21-000002"
    assert row["total_debt_end"] == "2020-12-31;2020-12-31"
    assert row["total_debt_url"].count(";") == 1


def test_single_fact_columns_carry_tag_end_accession_and_url() -> None:
    row = _panel({2020: dict(revenue=7.0, ebit=1.0, interest=1.0, accn="0000000001-21-000099")})[2020]
    assert (row["revenue_tag"], row["revenue_end"], row["revenue_accn"]) == ("Revenues", "2020-12-31", "0000000001-21-000099")
    assert row["revenue_url"] == filing_url(CIK, "0000000001-21-000099")


def test_zero_is_kept_and_missing_is_empty() -> None:
    row = _panel({2020: dict(revenue=0.0, ebit=0, interest=1.0, equity=0.0)})[2020]
    assert row["revenue"] == 0.0 and row["operating_income"] == 0 and row["equity"] == 0.0
    assert row["total_debt"] is None and row["total_assets"] is None
    assert row["icr"] == 0.0
    assert cell(0) == "0" and cell(0.0) == "0.0" and cell(None) == "" and cell(False) == "false" and cell(True) == "true"
    assert cell(date(2020, 1, 2)) == "2020-01-02"


def test_gap_has_balance_sheet_is_true_only_on_a_gap_row_with_a_balance_sheet_fact() -> None:
    cf = merge_facts(year_facts(2016, revenue=1.0, ebit=1.0, interest=1.0), year_facts(2018, assets=100.0))
    rows = {r["fy"]: r for r in extract_panel(CIK, companyfacts(CIK, cf), FIRST)}
    assert rows[2018]["gap_has_balance_sheet"] is True and rows[2018]["total_assets"] is None  # still a Gap_Row
    assert rows[2017]["gap_has_balance_sheet"] is False
    assert rows[2016]["gap_has_balance_sheet"] is False


def test_firm_without_facts_and_parse_error_gap_panel() -> None:
    rows = gap_panel(CIK)
    assert [r["fy"] for r in rows] == list(PANEL_YEARS)
    assert all(r["zombie_flag"] is False and r["fye"] is None for r in rows)
    assert len(extract_panel(CIK, companyfacts(CIK, {}), FIRST)) == 11


def test_age_at_fy_on_anniversaries_and_29_february() -> None:
    first = date(2000, 2, 29)
    assert age_at_fy(first, date(2020, 2, 28)) == 19
    assert age_at_fy(first, date(2020, 2, 29)) == 20
    assert age_at_fy(first, date(2021, 2, 28)) == 20
    assert age_at_fy(first, date(2021, 3, 1)) == 21
    assert age_at_fy(date(2010, 6, 30), date(2020, 6, 29)) == 9
    assert age_at_fy(date(2010, 6, 30), date(2020, 6, 30)) == 10
    assert age_at_fy(None, date(2020, 1, 1)) is None and age_at_fy(first, None) is None


def _agg(sic, first=date(2000, 1, 1), name="Sub Name", tickers=("AA",), parse_error=False) -> SubAgg:
    return SubAgg(cik=CIK, main_present=True, has_main=True, name=name, tickers=tickers, sic=sic,
                  first_filing=first, last_filing=date(2024, 5, 5), last_10k=date(2024, 3, 3), parse_error=parse_error)


def test_firm_table_flags_for_each_kind_of_firm() -> None:
    facts = FirmFacts(CIK, "Entity Name", True)
    fin = build_firm_row(CIK, _agg("6021"), facts, 2026)
    util = build_firm_row(CIK, _agg("4911"), facts, 2026)
    plain = build_firm_row(CIK, _agg("3571"), facts, 2026)
    nosic = build_firm_row(CIK, _agg(""), facts, 2026)
    young = build_firm_row(CIK, _agg("3571", first=date(2020, 5, 1)), facts, 2026)
    exactly_ten = build_firm_row(CIK, _agg("3571", first=date(2016, 5, 1)), facts, 2026)
    assert (fin["is_financial"], fin["is_utility"], fin["sic_division"]) == (True, False, "Finance, Insurance and Real Estate")
    assert (util["is_financial"], util["is_utility"]) == (False, True)
    assert (plain["is_financial"], plain["is_utility"], plain["no_sic"], plain["age_under_10"]) == (False, False, False, False)
    assert plain["sic"] == "3571" and plain["sic_division"] == "Manufacturing" and plain["tickers"] == "AA"
    assert nosic["no_sic"] is True and nosic["is_financial"] is False and nosic["sic"] is None and nosic["sic_division"] is None
    assert young["age_under_10"] is True and exactly_ten["age_under_10"] is False
    assert plain["name"] == "Sub Name" and plain["last_10k_date"] == date(2024, 3, 3)


def test_firm_without_a_submissions_record_is_kept_and_flagged() -> None:
    row = build_firm_row(CIK, None, FirmFacts(CIK, "Entity Name", True), 2026)
    assert row["name"] == "Entity Name" and row["no_sic"] is True and row["age_under_10"] is True
    assert row["tickers"] == "" and row["first_filing_date"] is None and row["parse_error"] is False
    errored = build_firm_row(CIK, _agg("3571", parse_error=True), FirmFacts(CIK, None, False), 2026)
    assert errored["parse_error"] is True
    assert set(row) == set(FIRM_COLUMNS)


def test_gzip_csv_is_byte_identical_and_reads_back(tmp_path: Path) -> None:
    rows = [r for r in extract_panel(CIK, companyfacts(CIK, merge_facts(*[year_facts(fy, revenue=1.5, ebit=0, interest=2.0) for fy in range(2015, 2019)])), FIRST)]
    paths = []
    for name in ("a.csv.gz", "b.csv.gz"):
        with GzipCsvWriter(tmp_path / name, PANEL_COLUMNS) as w:
            w.write_rows(rows)
            assert w.rows == 11
        paths.append(tmp_path / name)
    assert paths[0].read_bytes() == paths[1].read_bytes()
    assert not list(tmp_path.glob(".*.tmp"))
    text = gzip.decompress(paths[0].read_bytes()).decode()
    assert text.splitlines()[0].split(",") == list(PANEL_COLUMNS)
    df = read_table(paths[0])
    assert len(df) == 11 and df["cik"].iloc[0] == CIK
    first = df[df["fy"] == "2015"].iloc[0]
    assert first["operating_income"] == "0" and first["revenue"] == "1.5" and first["zombie_flag"] == "false"
    assert df[df["fy"] == "2024"].iloc[0]["revenue"] != df[df["fy"] == "2024"].iloc[0]["revenue"]  # NaN: an empty cell


def test_failed_write_leaves_no_file(tmp_path: Path) -> None:
    try:
        with GzipCsvWriter(tmp_path / "x.csv.gz", FIRM_COLUMNS) as w:
            w.write_row({"cik": CIK})
            raise RuntimeError("boom")
    except RuntimeError:
        pass
    assert list(tmp_path.iterdir()) == []


# --- properties -------------------------------------------------------------------------
_money = st.one_of(
    st.none(),
    st.just(0),
    st.integers(min_value=-10**9, max_value=10**9),
    st.floats(min_value=-1e12, max_value=1e12, allow_nan=False, allow_infinity=False),
)
_year_args = st.fixed_dictionaries({k: _money for k in ("revenue", "ebit", "interest", "debt", "assets", "equity", "cash")})
_ARG_OF = {"operating_income": "ebit", "interest_expense": "interest", "revenue": "revenue", "total_debt": "debt",
           "total_assets": "assets", "equity": "equity", "cash": "cash"}


# Feature: data-pipeline, Property 28: Missing is never written as 0
# Validates: Requirements 7.11, 24.2, 24.9
@given(years=st.dictionaries(st.integers(min_value=2013, max_value=2025), _year_args, max_size=13))
def test_missing_is_never_written_as_zero(years) -> None:
    cf = companyfacts(CIK, merge_facts(*[year_facts(fy, **a) for fy, a in sorted(years.items())]))
    rows = {r["fy"]: r for r in extract_panel(CIK, cf, FIRST)}
    for fy in PANEL_YEARS:
        row = rows[fy]
        args = years.get(fy)
        has_flow = args is not None and any(args[k] is not None for k in ("revenue", "ebit", "interest"))
        for field, arg in _ARG_OF.items():
            expected = args[arg] if has_flow else None  # a year without a flow value is a Gap_Row
            if expected is None:
                assert row[field] is None and cell(row[field]) == ""
                assert all(row[field + s] is None for s in ("_tag", "_end", "_accn", "_url"))
            else:
                assert row[field] == expected and cell(row[field]) != ""
                assert all(row[field + s] for s in ("_tag", "_end", "_accn", "_url"))
    # EBIT fallback with one missing part never invents a value.
    only_pretax = companyfacts(CIK, {PRETAX: [fact(5.0, "2019-12-31", start="2019-01-02", fy=2019)]})
    row = {r["fy"]: r for r in extract_panel(CIK, only_pretax, FIRST)}[2019]
    assert row["operating_income"] is None and row["operating_income_tag"] is None


_sic = st.sampled_from([None, "", "6021", "6798", "4911", "4999", "3571", "1800", "0100", "abc"])
_firm = st.tuples(
    _sic,
    st.one_of(st.none(), st.dates(min_value=date(1994, 1, 1), max_value=date(2025, 12, 31))),
    st.booleans(),  # parse error
    st.booleans(),  # has a submissions record
    st.sets(st.integers(min_value=2013, max_value=2025), max_size=13),
)


# Feature: data-pipeline, Property 29: Every firm keeps all 11 rows and stays in the Firm_Table
# Validates: Requirements 23.1, 23.6, 24.1
@given(firms=st.lists(_firm, min_size=1, max_size=8))
def test_every_firm_keeps_all_rows_and_stays_in_the_firm_table(firms) -> None:
    panel_rows, firm_rows = [], []
    for i, (sic, first, parse_error, has_sub, years) in enumerate(firms, start=1):
        cik = f"{i:010d}"
        if parse_error:
            rows = gap_panel(cik)
        else:
            cf = companyfacts(cik, merge_facts(*[year_facts(fy, revenue=1.0, ebit=1.0, interest=1.0) for fy in sorted(years)]))
            rows = extract_panel(cik, cf, first)
        panel_rows.append(rows)
        agg = SubAgg(cik=cik, main_present=True, has_main=True, sic=sic, first_filing=first) if has_sub else None
        firm_rows.append(build_firm_row(cik, agg, FirmFacts(cik, "N", not parse_error, parse_error), 2026))
    assert len(firm_rows) == len(firms) and len({r["cik"] for r in firm_rows}) == len(firms)
    for rows in panel_rows:
        assert [r["fy"] for r in rows] == list(PANEL_YEARS)
    for row, (sic, _first, _pe, has_sub, _y) in zip(firm_rows, firms):
        in_fin = has_sub and sic in ("6021", "6798")
        assert row["is_financial"] == in_fin
        assert row["is_utility"] == (has_sub and sic in ("4911", "4999"))
        assert row["no_sic"] == (not has_sub or sic in (None, "", "abc"))


_icr = st.one_of(st.none(), st.floats(min_value=-5, max_value=5, allow_nan=False))
_age = st.one_of(st.none(), st.integers(min_value=-2, max_value=40))


# Feature: data-pipeline, Property 30: The yearly zombie flag matches the definition
# Validates: Requirements 24.8, 28.4
@given(
    icrs=st.fixed_dictionaries({y: _icr for y in range(2013, 2026)}),
    ages=st.fixed_dictionaries({y: _age for y in range(2013, 2026)}),
)
def test_zombie_flag_matches_the_definition(icrs, ages) -> None:
    got = zombie_flags(icrs, ages, PANEL_YEARS)
    for y in PANEL_YEARS:
        streak = 0
        for back in (0, 1, 2):
            v = icrs[y - back]
            if v is None or not v < 1:
                break
            streak += 1
        expected = streak == 3 and ages[y] is not None and ages[y] >= 10
        assert got[y] is expected
        if any(icrs[y - b] is None for b in (0, 1, 2)):
            assert got[y] is False


def _anniversary(first: date, k: int) -> date:
    try:
        return first.replace(year=first.year + k)
    except ValueError:  # 29 February in a non-leap year: the year is complete on 1 March
        return date(first.year + k, 3, 1)


# Feature: data-pipeline, Property 31: Age at a fiscal year
# Validates: Requirements 24.6
@given(
    first=st.dates(min_value=date(1994, 1, 1), max_value=date(2025, 1, 1)),
    gap1=st.integers(min_value=0, max_value=12000),
    gap2=st.integers(min_value=0, max_value=4000),
)
def test_age_at_fy_counts_completed_anniversaries(first: date, gap1: int, gap2: int) -> None:
    fye1 = date.fromordinal(first.toordinal() + gap1)
    fye2 = date.fromordinal(fye1.toordinal() + gap2)
    for fye in (fye1, fye2):
        k = 0
        while _anniversary(first, k + 1) <= fye:
            k += 1
        assert age_at_fy(first, fye) == k
    assert age_at_fy(first, fye1) <= age_at_fy(first, fye2)
    assert age_at_fy(None, fye1) is None and age_at_fy(first, None) is None
