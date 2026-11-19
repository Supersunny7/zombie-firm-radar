"""Data shape report sections (Requirements 26.x, 28.10) and Properties 34, 35, 37."""
from __future__ import annotations

import math
from datetime import date

import numpy as np
import pandas as pd
from hypothesis import given
from hypothesis import strategies as st

from pipeline.bulk.download import BulkRecord
from pipeline.bulk.panel import FIELDS, PANEL_YEARS
from pipeline.bulk.report import (
    OUTCOME_CATEGORIES,
    SourceInfo,
    Tables,
    breaking_rate_pp,
    bucket_index,
    build_sections,
    classify_outcome,
    count_below,
    csv_bytes,
    histogram,
    prepare,
    render_markdown,
    s1_firm_counts,
    s2_zombies,
    s3_outcomes,
    s4_reversals,
    s5_zombie_then_bankrupt,
    s6_breaking_rate,
    s7_data_quality,
    s8_largest,
    write_report,
)

NAN = float("nan")


def _row(cik: str, fy: int, **kw) -> dict:
    row = {"cik": cik, "fy": fy, "fye": pd.Timestamp(fy, 12, 31), "age_at_fy": 15.0, "icr": NAN, "zombie_flag": False,
           "gap_has_balance_sheet": False, **{f: NAN for f in FIELDS}}
    row.update(kw)
    return row


def _gap(cik: str, fy: int) -> dict:
    return _row(cik, fy, fye=pd.NaT, age_at_fy=NAN)


def _firm_rows(cik: str, spec: dict[int, dict]) -> list[dict]:
    return [_row(cik, fy, **spec[fy]) if fy in spec else _gap(cik, fy) for fy in PANEL_YEARS]


def _firm(cik: str, name: str = "Name", *, fin: bool = False, util: bool = False, tickers: str = "") -> dict:
    return {"cik": cik, "name": name, "tickers": tickers, "sic_division": "Manufacturing", "is_financial": fin,
            "is_utility": util, "no_sic": False, "age_under_10": False, "parse_error": False}


def _ev(cik: str, etype: str, d: str) -> dict:
    return {"cik": cik, "date": pd.Timestamp(d), "event_type": etype, "form": "8-K", "accession": f"{cik}-{etype}-{d}"}


def _tables(firm_specs, events=None):
    panel = pd.DataFrame([r for f, spec in firm_specs for r in _firm_rows(f["cik"], spec)])
    firms = pd.DataFrame([f for f, _ in firm_specs])
    ev = pd.DataFrame(events or [], columns=["cik", "date", "event_type", "form", "accession"])
    ev["date"] = pd.to_datetime(ev["date"])
    return panel, firms, ev


def _df(firm_specs, events=None):
    panel, firms, ev = _tables(firm_specs, events)
    return prepare(panel, firms), ev


Z = dict(zombie_flag=True, icr=0.5, revenue=100.0)  # a zombie row with revenue present


def test_s1_counts_present_and_core_firms_per_year() -> None:
    df, _ = _df([
        (_firm("0000000001"), {2015: dict(revenue=1.0), 2016: dict(revenue=1.0)}),
        (_firm("0000000002", fin=True), {2015: dict(revenue=1.0)}),
        (_firm("0000000003"), {2015: dict(revenue=1.0, age_at_fy=9.0)}),  # too young to be core
    ])
    t = s1_firm_counts(df).frames["s1_firm_counts.csv"].set_index("fy")
    assert (t.loc[2015, "firms_present"], t.loc[2015, "core_firms_present"]) == (3, 1)
    assert (t.loc[2016, "firms_present"], t.loc[2016, "core_firms_present"]) == (1, 1)
    assert (t.loc[2017, "firms_present"], t.loc[2017, "core_firms_present"]) == (0, 0)
    assert list(t.index) == list(range(2015, 2026))


def test_s2_counts_and_both_shares() -> None:
    df, _ = _df([
        (_firm("0000000001"), {2018: dict(Z)}),
        (_firm("0000000002"), {2018: dict(revenue=1.0, icr=2.0)}),
        (_firm("0000000003"), {2018: dict(revenue=1.0)}),  # present, no icr
        (_firm("0000000004", fin=True), {2018: dict(Z)}),  # not core
    ])
    t = s2_zombies(df).frames["s2_zombies.csv"].set_index("fy")
    r = t.loc[2018]
    assert (r.core_firms_present, r.zombies, r.core_firms_with_icr) == (3, 1, 2)
    assert r.share_of_present == round(1 / 3, 6) and r.share_of_with_icr == 0.5
    assert list(t.index) == list(range(2017, 2026))
    assert math.isnan(t.loc[2020, "share_of_present"])  # no firms: undefined, not 0


def test_classify_outcome_precedence() -> None:
    end = date(2019, 12, 31)
    bk, dl, acq = ("bankruptcy", date(2021, 5, 1)), ("delisting", date(2022, 5, 1)), ("acquisition_disposition", date(2021, 6, 1))
    assert classify_outcome(end, [bk, dl], 2024, 2.0, False) == "bankruptcy"  # wins even with a recovered ICR
    assert classify_outcome(end, [dl], 2024, 2.0, True) == "delisted_or_deregistered"
    assert classify_outcome(end, [("deregistration", date(2023, 1, 1))], 2021, None, False) == "delisted_or_deregistered"
    assert classify_outcome(end, [acq], 2021, None, False) == "stopped_filing"  # item 2.01 alone is not an exit
    assert classify_outcome(end, [], None, None, False) == "stopped_filing"
    assert classify_outcome(end, [], 2024, 1.0, True) == "recovered"
    assert classify_outcome(end, [], 2024, 0.99, True) == "still_zombie"
    assert classify_outcome(end, [], 2024, 0.5, False) == "other_alive"
    assert classify_outcome(end, [], 2024, None, False) == "other_alive"
    assert classify_outcome(end, [], 2025, NAN, False) == "other_alive"
    # events on or before the zombie year end, or after 2024-12-31, are outside the window
    assert classify_outcome(end, [("bankruptcy", end)], 2024, 2.0, False) == "recovered"
    assert classify_outcome(end, [("bankruptcy", date(2025, 1, 1))], 2024, 2.0, False) == "recovered"
    assert classify_outcome(end, [("bankruptcy", date(2024, 12, 31))], 2024, 2.0, False) == "bankruptcy"


def test_s3_outcomes_counts_lists_and_item_2_01_column() -> None:
    def zfirm(n: int, last_year: int = 2024, icr24: float = 0.5, z24: bool = False):
        spec = {2019: dict(Z), 2020: dict(Z)}
        for fy in range(2021, last_year + 1):
            spec[fy] = dict(revenue=1.0, icr=icr24 if fy == 2024 else 0.5, zombie_flag=(z24 if fy == 2024 else False))
        return (_firm(f"{n:010d}", f"Firm {n}", tickers=f"T{n}"), spec)

    specs = [zfirm(1), zfirm(2), zfirm(3, last_year=2022), zfirm(4, icr24=1.2), zfirm(5, z24=True), zfirm(6)]
    events = [_ev(f"{1:010d}", "bankruptcy", "2021-05-05"), _ev(f"{1:010d}", "acquisition_disposition", "2021-06-01"),
              _ev(f"{2:010d}", "delisting", "2023-02-02"),
              _ev(f"{6:010d}", "bankruptcy", "2019-06-01"),  # before the zombie year ends: ignored
              _ev(f"{4:010d}", "acquisition_disposition", "2022-01-01")]
    df, ev = _df(specs, events)
    sec = s3_outcomes(df, ev)
    counts = sec.frames["s3_outcomes.csv"]
    got = {(r.zombie_year, r.category): (r.firms, r.filed_item_2_01) for r in counts.itertuples()}
    for zy in (2019, 2020):
        assert got[(zy, "bankruptcy")] == (1, 1)
        assert got[(zy, "delisted_or_deregistered")] == (1, 0)
        assert got[(zy, "stopped_filing")] == (1, 0)
        assert got[(zy, "recovered")] == (1, 1)  # firm 4 filed an item 2.01 but still recovered
        assert got[(zy, "still_zombie")] == (1, 0)
        assert got[(zy, "other_alive")] == (1, 0)
    assert set(counts["category"]) == set(OUTCOME_CATEGORIES) and len(counts) == 12
    ids = sec.frames["s3_outcomes_cik.csv"]
    assert len(ids) == 12
    assert list(ids[(ids.zombie_year == 2019) & (ids.category == "bankruptcy")]["cik"]) == ["0000000001"]
    assert 'not an "acquired" count' in sec.md and "Zombies in FY2019: 6." in sec.md


def test_s4_reversals() -> None:
    df, _ = _df([
        (_firm("0000000001"), {2019: dict(revenue=1.0, icr=1.5), 2020: dict(revenue=1.0, icr=0.9)}),  # yes
        (_firm("0000000002"), {2019: dict(revenue=1.0, icr=1.49), 2020: dict(revenue=1.0, icr=0.5)}),  # no, 1.49
        (_firm("0000000003"), {2019: dict(revenue=1.0, icr=3.0), 2020: dict(revenue=1.0, icr=1.0)}),  # no, 1.0 is not below 1
        (_firm("0000000004"), {2019: dict(revenue=1.0, icr=3.0)}),  # no FY2020 value
        (_firm("0000000005", fin=True), {2019: dict(revenue=1.0, icr=3.0), 2020: dict(revenue=1.0, icr=0.1)}),  # not core
    ])
    t = s4_reversals(df).frames["s4_reversals.csv"]
    assert list(t["cik"]) == ["0000000001"] and t.iloc[0]["icr_fy2019"] == 1.5


def test_s5_zombie_then_bankrupt_window() -> None:
    specs = [(_firm(f"{n:010d}"), {2020: dict(Z)}) for n in (1, 2, 3, 4)]
    specs.append((_firm("0000000005"), {2022: dict(Z)}))  # zombie only in FY2022
    events = [_ev("0000000001", "bankruptcy", "2022-01-01"), _ev("0000000002", "bankruptcy", "2023-12-31"),
              _ev("0000000003", "bankruptcy", "2021-12-31"), _ev("0000000004", "bankruptcy", "2024-01-01"),
              _ev("0000000005", "bankruptcy", "2022-06-01")]
    df, ev = _df(specs, events)
    t = s5_zombie_then_bankrupt(df, ev).frames["s5_zombie_then_bankrupt.csv"]
    assert list(t["cik"]) == ["0000000001", "0000000002"]
    assert list(t["first_bankruptcy_date"]) == ["2022-01-01", "2023-12-31"]


def test_s5_with_no_match_gives_an_empty_table() -> None:
    df, ev = _df([(_firm("0000000001"), {2020: dict(Z)})], [])
    t = s5_zombie_then_bankrupt(df, ev).frames["s5_zombie_then_bankrupt.csv"]
    assert len(t) == 0 and list(t.columns) == ["cik", "name", "tickers", "first_zombie_year", "first_bankruptcy_date"]


def test_breaking_rate_and_its_left_out_cases() -> None:
    assert breaking_rate_pp(10.0, 5.0, 100.0) == 5.0
    assert breaking_rate_pp(-10.0, 5.0, 100.0) == -15.0
    assert breaking_rate_pp(10.0, 0.0, 100.0) is None
    assert breaking_rate_pp(10.0, -1.0, 100.0) is None
    assert breaking_rate_pp(10.0, 5.0, 0.0) is None
    assert breaking_rate_pp(None, 5.0, 100.0) is None and breaking_rate_pp(10.0, None, 100.0) is None
    assert breaking_rate_pp(10.0, 5.0, None) is None and breaking_rate_pp(NAN, 5.0, 100.0) is None


def test_histogram_edges() -> None:
    values = [-10.0001, -10.0, -9.5001, -9.5, 0.4999, 0.5, 0.0, 19.9999, 20.0, 35.0]
    h = histogram(values)
    by = {label: n for label, _lo, _hi, n in h}
    assert len(h) == 62 and sum(n for *_, n in h) == len(values)
    assert by["< -10"] == 1 and by[">= 20"] == 2
    assert by["-10 to -9.5"] == 2 and by["-9.5 to -9"] == 1
    assert by["0 to 0.5"] == 2 and by["0.5 to 1"] == 1 and by["19.5 to 20"] == 1
    assert bucket_index(-10.0) == 0 and bucket_index(19.999999) == 59 and bucket_index(20.0) == 60 and bucket_index(-11) == -1


def test_s6_thresholds_and_left_out() -> None:
    def firm(n: int, ebit: float, interest: float, debt: float, fy: int = 2024):
        return (_firm(f"{n:010d}"), {fy: dict(operating_income=ebit, interest_expense=interest, total_debt=debt, revenue=1.0)})

    df, _ = _df([
        firm(1, 10.0, 5.0, 100.0),            # +5.0 pp
        firm(2, 10.0, 8.0, 100.0),            # +2.0 pp
        firm(3, 1.0, 5.0, 100.0),             # -4.0 pp: already below interest
        firm(4, 10.0, 0.0, 100.0),            # interest 0: left out
        firm(5, 10.0, 5.0, 0.0),              # debt 0: left out
        firm(6, 10.0, 6.0, 100.0, fy=2022),   # +4.0 pp, only in FY2022: in latest_year, not in fy2024
    ])
    sec = s6_breaking_rate(df)
    th = sec.frames["s6_thresholds.csv"]
    latest = th[th["view"] == "latest_year"].set_index("plus_pp")
    assert latest["firms_total"].iloc[0] == 4 and latest["firms_left_out"].iloc[0] == 2
    assert [int(latest.loc[k, "firms_below"]) for k in (1, 2, 3, 4, 5)] == [1, 1, 2, 2, 3]  # values +5, +2, -4, +4: a value equal to k is not below k
    fy24 = th[th["view"] == "fy2024"].set_index("plus_pp")
    assert fy24["firms_total"].iloc[0] == 3 and [int(fy24.loc[k, "firms_below"]) for k in (1, 2, 3, 4, 5)] == [1, 1, 2, 2, 2]
    hist = sec.frames["s6_histogram.csv"]
    assert hist.groupby("view")["firms"].sum().to_dict() == {"fy2024": 3, "latest_year": 4}


def test_s7_data_quality_counts() -> None:
    df, _ = _df([
        (_firm("0000000001"), {2018: dict(revenue=1.0, operating_income=1.0, interest_expense=1.0, total_debt=1.0)}),
        (_firm("0000000002"), {2018: dict(revenue=1.0, fye=pd.Timestamp(2019, 1, 31))}),  # January year end
        (_firm("0000000003", fin=True), {2018: dict(revenue=1.0)}),
    ])
    df.loc[(df.cik == "0000000001") & (df.fy == 2019), "gap_has_balance_sheet"] = True
    t = s7_data_quality(df).frames["s7_data_quality.csv"]
    a = t[(t.fy == 2018) & (t.population == "all")].iloc[0]
    assert (a.rows_present, a.missing_operating_income, a.missing_interest_expense, a.missing_total_debt, a.fye_not_december) == (3, 2, 2, 2, 1)
    c = t[(t.fy == 2018) & (t.population == "core")].iloc[0]
    assert (c.rows_present, c.missing_operating_income, c.fye_not_december) == (2, 1, 1)
    g = t[(t.fy == 2019) & (t.population == "all")].iloc[0]
    assert g.gap_rows_with_balance_sheet == 1 and g.rows_present == 0
    assert len(t) == 22


def test_s8_largest_ranking_ties_and_zombie_history() -> None:
    specs = [(_firm(f"{n:010d}", f"Firm {n}"), {2017: dict(revenue=float(1000 + n % 3), zombie_flag=(n == 7)), 2018: dict(revenue=5.0)})
             for n in range(1, 206)]
    specs[0][1][2020] = dict(revenue=10_000.0, zombie_flag=True)
    specs.append((_firm("0000000999", "Big Bank", fin=True), {2019: dict(revenue=9_000.0)}))
    df, _ = _df(specs)
    t = s8_largest(df).frames["s8_largest_firms.csv"]
    assert len(t) == 200 and list(t["rank"]) == list(range(1, 201))
    assert t.iloc[0]["cik"] == "0000000001" and t.iloc[0]["max_revenue_fy"] == 2020
    assert t.iloc[1]["cik"] == "0000000999" and bool(t.iloc[1]["is_financial"])  # banks are listed, flagged
    assert t.iloc[0]["zombie_fy2017_2025"] == "000100000"  # FY2020 is the fourth character
    same = t[t["max_revenue_usd"] == 1002.0]["cik"].tolist()
    assert same == sorted(same)  # ties by CIK
    assert (t["max_revenue_usd"].diff().dropna() <= 0).all()


def _info() -> SourceInfo:
    rec = BulkRecord("u", "2026-11-20T12:00:00+00:00", 1234, "ab" * 32, "Sun, 15 Nov 2026 08:00:00 GMT")
    return SourceInfo("2026-11-20", rec, None)


def test_render_has_source_block_disclaimer_and_all_sections() -> None:
    panel, firms, ev = _tables([(_firm("0000000001"), {2019: dict(Z), 2020: dict(Z), 2024: dict(revenue=1.0, icr=2.0)})])
    text = render_markdown(build_sections(Tables(panel, firms, ev)), _info())
    assert "Data: SEC EDGAR. Not investment advice." in text
    assert "SHA-256 `" + "ab" * 32 + "`" in text and "1,234 bytes" in text
    assert "`submissions.zip`: unknown, no download record" in text
    assert "approximation of firm age" in text
    for n in range(1, 9):
        assert f"\n## {n}. " in text


def test_write_report_is_deterministic_and_independent_of_row_order(tmp_path) -> None:
    specs = [
        (_firm(f"{n:010d}", f"Firm {n}"),
         {fy: dict(revenue=float(n * 10), icr=0.5 + n, zombie_flag=(n % 2 == 0), operating_income=float(n), interest_expense=1.0, total_debt=50.0)
          for fy in range(2017, 2025)})
        for n in range(1, 7)
    ]
    panel, firms, ev = _tables(specs, [_ev("0000000002", "bankruptcy", "2021-01-01")])
    first = write_report(build_sections(Tables(panel, firms, ev)), _info(), tmp_path / "a")
    shuffled = Tables(panel.sample(frac=1, random_state=3), firms.sample(frac=1, random_state=4), ev)
    write_report(build_sections(shuffled), _info(), tmp_path / "b")
    assert "data_shape.md" in first and "s3_outcomes_cik.csv" in first
    for name in first:
        assert (tmp_path / "a" / name).read_bytes() == (tmp_path / "b" / name).read_bytes()
    assert not list((tmp_path / "a").glob(".*.tmp"))


# --- properties -------------------------------------------------------------------------
_icr = st.sampled_from([NAN, -1.0, 0.5, 0.99, 1.0, 1.5, 3.0])
_year = st.fixed_dictionaries({
    "present": st.booleans(), "icr": _icr, "zombie_flag": st.booleans(),
    "revenue": st.sampled_from([NAN, 5.0, 50.0]), "operating_income": st.sampled_from([NAN, -5.0, 5.0]),
    "interest_expense": st.sampled_from([NAN, 0.0, 2.0]), "total_debt": st.sampled_from([NAN, 0.0, 40.0]),
})
_firm_spec = st.tuples(st.booleans(), st.booleans(), st.dictionaries(st.sampled_from(list(PANEL_YEARS)), _year, max_size=11))
_events = st.lists(
    st.tuples(st.integers(1, 6), st.sampled_from(["bankruptcy", "acquisition_disposition", "delisting", "deregistration"]),
              st.dates(min_value=date(2015, 1, 1), max_value=date(2026, 6, 30))),
    max_size=12,
)


def _build(firm_specs, events):
    specs = []
    for i, (fin, util, years) in enumerate(firm_specs, start=1):
        spec = {}
        for fy, y in years.items():
            if not y["present"]:
                continue
            row = {k: v for k, v in y.items() if k != "present"}
            if all(np.isnan(row[k]) for k in ("revenue", "operating_income", "interest_expense", "total_debt")):
                row["revenue"] = 1.0  # a present row has at least one money value
            spec[fy] = row
        specs.append((_firm(f"{i:010d}", f"F{i}", fin=fin, util=util), spec))
    return _tables(specs, [_ev(f"{c:010d}", t, d.isoformat()) for c, t, d in events if c <= len(firm_specs)])


# Feature: data-pipeline, Property 34: Outcome categories partition the zombies
# Validates: Requirements 26.6
@given(firm_specs=st.lists(_firm_spec, min_size=1, max_size=6), events=_events)
def test_outcome_categories_partition_the_zombies(firm_specs, events) -> None:
    panel, firms, ev = _build(firm_specs, events)
    df = prepare(panel, firms)
    sec = s3_outcomes(df, ev)
    counts, ids = sec.frames["s3_outcomes.csv"], sec.frames["s3_outcomes_cik.csv"]
    for zy in (2019, 2020):
        z = df[(df.fy == zy) & df.core & df.zombie_flag & df.fye.notna()]
        in_year = ids[ids.zombie_year == zy]
        assert sorted(in_year["cik"]) == sorted(z["cik"])  # each zombie once, nobody else
        assert counts[counts.zombie_year == zy]["firms"].sum() == len(z)
        for r in z.itertuples():
            end = r.fye.date()
            window = [
                (t, d.date()) for c, t, d in ev[["cik", "event_type", "date"]].itertuples(index=False)
                if c == r.cik and end < d.date() <= date(2024, 12, 31)
            ]
            types = {t for t, _ in window}
            row24 = df[(df.cik == r.cik) & (df.fy == 2024)].iloc[0]
            last = df[(df.cik == r.cik) & df.fye.notna()].fy.max()
            if "bankruptcy" in types:
                want = "bankruptcy"
            elif types & {"delisting", "deregistration"}:
                want = "delisted_or_deregistered"
            elif last < 2024:
                want = "stopped_filing"
            elif row24.icr >= 1:
                want = "recovered"
            elif row24.zombie_flag:
                want = "still_zombie"
            else:
                want = "other_alive"
            assert in_year[in_year.cik == r.cik]["category"].tolist() == [want]


# Feature: data-pipeline, Property 35: Breaking-rate histogram and thresholds match a brute force
# Validates: Requirements 26.9
@given(values=st.lists(st.floats(min_value=-40, max_value=40, allow_nan=False), max_size=60))
def test_breaking_rate_histogram_and_thresholds_match_a_brute_force(values) -> None:
    h = histogram(values)
    assert sum(n for *_, n in h) == len(values)
    assert h[0][3] == sum(1 for x in values if x < -10) and h[-1][3] == sum(1 for x in values if x >= 20)
    below = [count_below(values, k) for k in (1, 2, 3, 4, 5)]
    assert below == sorted(below)
    for k, got in zip((1, 2, 3, 4, 5), below):
        assert got == sum(1 for x in values if x < k)
    for x in values:
        if -10 <= x < 20:
            lo = -10 + 0.5 * bucket_index(x)
            assert lo - 1e-6 <= x < lo + 0.5 + 1e-6


# Feature: data-pipeline, Property 37: Report output is deterministic
# Validates: Requirements 26.13
@given(firm_specs=st.lists(_firm_spec, min_size=1, max_size=5), events=_events, seed=st.integers(0, 1000))
def test_report_output_is_deterministic(firm_specs, events, seed) -> None:
    panel, firms, ev = _build(firm_specs, events)
    a = build_sections(Tables(panel, firms, ev))
    b = build_sections(Tables(panel.sample(frac=1, random_state=seed), firms.sample(frac=1, random_state=seed + 1),
                              ev.sample(frac=1, random_state=seed + 2) if len(ev) else ev))
    assert render_markdown(a, _info()) == render_markdown(b, _info())
    for sa, sb in zip(a, b):
        assert sa.frames.keys() == sb.frames.keys()
        for name in sa.frames:
            assert csv_bytes(sa.frames[name]) == csv_bytes(sb.frames[name])
