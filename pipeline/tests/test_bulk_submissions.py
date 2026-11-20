"""Submissions aggregate and events extractor (Requirements 22.3, 22.4, 23.3, 23.4, 24.7, 25.1 to 25.6)."""
from __future__ import annotations

import random
from datetime import date
from pathlib import Path

from hypothesis import given
from hypothesis import strategies as st

from pipeline.bulk.submissions import (
    EVENT_TYPES,
    SubAgg,
    aggregate,
    event_rows,
    filing_rows,
    filing_url,
    merge_member,
)
from pipeline.tests.builders import make_zip, submissions_main, submissions_older

CIK = "0000000005"
PAGE = f"CIK{CIK}-submissions-001.json"
MAIN = f"CIK{CIK}.json"


def _agg_from(members: dict[str, dict]) -> SubAgg:
    agg = SubAgg(cik=CIK)
    for name, obj in members.items():
        merge_member(agg, name, "main" if name == MAIN else "page", obj)
    return agg


def test_bankruptcy_8k_only_on_an_older_page_is_found(tmp_path: Path) -> None:
    """28.6: the event is not in the main file's recent filings."""
    main = submissions_main(5, [("0000000005-24-000001", "2024-03-01", "10-K", "")], older_pages=[PAGE], tickers=["ABC"])
    page = submissions_older([("0000000005-19-000009", "2019-08-14", "8-K", "1.03,9.01")])
    path = tmp_path / "submissions.zip"
    path.write_bytes(make_zip({MAIN: main, PAGE: page}))
    result = aggregate(path)
    agg = result.firms[CIK]
    events = list(agg.events.values())
    assert [(e.event_type, e.date, e.accession, e.source_member) for e in events] == [
        ("bankruptcy", date(2019, 8, 14), "0000000005-19-000009", PAGE)
    ]
    assert events[0].item == "1.03" and events[0].form == "8-K"
    assert agg.first_filing == date(2019, 8, 14) and agg.last_filing == date(2024, 3, 1)
    assert agg.tickers == ("ABC",) and result.orphan_pages == []


def test_items_1_03_and_2_01_in_one_8k_give_two_rows() -> None:
    filings = list(filing_rows(submissions_main(5, [("0000000005-20-000001", "2020-01-02", "8-K", "1.03, 2.01 ,9.01")]), "main"))
    rows = event_rows(CIK, filings, MAIN)
    assert sorted((r.event_type, r.item) for r in rows) == [("acquisition_disposition", "2.01"), ("bankruptcy", "1.03")]


def test_each_form_type_gives_the_right_event_and_near_misses_give_none() -> None:
    rows = [
        ("0000000005-20-000001", "2020-01-01", "25", ""),
        ("0000000005-20-000002", "2020-01-02", "25-NSE", ""),
        ("0000000005-20-000003", "2020-01-03", "15-12B", ""),
        ("0000000005-20-000004", "2020-01-04", "15-12G", ""),
        ("0000000005-20-000005", "2020-01-05", "15-15D", ""),
        ("0000000005-20-000006", "2020-01-06", "25-NSE/A", ""),
        ("0000000005-20-000007", "2020-01-07", "15F-12B", ""),
        ("0000000005-20-000008", "2020-01-08", "10-K", "1.03"),
        ("0000000005-20-000009", "2020-01-09", "8-K", "5.02"),
    ]
    got = {r.accession[-1]: r.event_type for r in event_rows(CIK, list(filing_rows(submissions_main(5, rows), "main")), MAIN)}
    assert got == {"1": "delisting", "2": "delisting", "3": "deregistration", "4": "deregistration", "5": "deregistration"}


def test_8k_amendment_is_included_with_its_form_recorded() -> None:
    rows = [("0000000005-20-000001", "2020-01-02", "8-K/A", "1.03")]
    (ev,) = event_rows(CIK, list(filing_rows(submissions_main(5, rows), "main")), MAIN)
    assert ev.form == "8-K/A" and ev.event_type == "bankruptcy"


def test_same_accession_on_a_page_and_in_the_main_file_gives_one_row() -> None:
    row = ("0000000005-20-000001", "2020-01-02", "8-K", "1.03")
    agg = _agg_from({MAIN: submissions_main(5, [row], older_pages=[PAGE]), PAGE: submissions_older([row])})
    assert len(agg.events) == 1
    assert next(iter(agg.events.values())).source_member == PAGE  # the smaller name wins ('-' sorts before '.'), in any order


def test_dates_take_min_and_max_over_all_pages_and_last_10k_only_counts_10k_forms() -> None:
    main = submissions_main(5, [
        ("a-1", "2022-05-01", "10-K", ""), ("a-2", "2023-06-01", "8-K", ""), ("a-3", "2023-02-01", "10-K/A", ""), ("a-4", "2024-01-01", "10-Q", ""),
    ], older_pages=[PAGE])
    page = submissions_older([("b-1", "1999-04-01", "10-K405", ""), ("b-2", "2010-09-09", "10-K", "")])
    agg = _agg_from({MAIN: main, PAGE: page})
    assert agg.first_filing == date(1999, 4, 1)
    assert agg.last_filing == date(2024, 1, 1)
    assert agg.last_10k == date(2023, 2, 1)  # the 10-K/A counts, the 10-Q and 10-K405 do not


def test_orphan_older_page_is_skipped_and_listed(tmp_path: Path) -> None:
    path = tmp_path / "s.zip"
    orphan = "CIK0000000007-submissions-001.json"
    path.write_bytes(make_zip({MAIN: submissions_main(5), orphan: submissions_older([("x-1", "2019-01-01", "8-K", "1.03")])}))
    result = aggregate(path)
    assert list(result.firms) == [CIK]
    assert result.orphan_pages == [orphan]
    assert "0000000007" not in result.firms


def test_member_that_fails_to_parse_sets_parse_error_and_the_run_goes_on(tmp_path: Path) -> None:
    path = tmp_path / "s.zip"
    path.write_bytes(make_zip({
        "CIK0000000001.json": b"{not json",
        "CIK0000000002.json": submissions_main(2, [("c-1", "2020-01-01", "10-K", "")]),
        "CIK0000000002-submissions-001.json": b"[1, 2]",
    }))
    result = aggregate(path)
    assert result.firms["0000000001"].parse_error is True and result.firms["0000000001"].has_main is False
    assert result.firms["0000000002"].parse_error is True and result.firms["0000000002"].has_main is True
    assert result.firms["0000000002"].last_10k == date(2020, 1, 1)
    assert sorted(f["member"] for f in result.stats.failed) == ["CIK0000000001.json", "CIK0000000002-submissions-001.json"]
    assert result.orphan_pages == []


def test_main_file_fields_and_missing_fields() -> None:
    agg = _agg_from({MAIN: {"name": "Acme", "sic": "2834", "tickers": ["A", "AA"], "filings": {"recent": {}}}})
    assert (agg.name, agg.sic, agg.tickers, agg.first_filing, agg.has_main) == ("Acme", "2834", ("A", "AA"), None, True)
    bare = _agg_from({MAIN: {}})
    assert (bare.name, bare.sic, bare.tickers) == (None, None, ())


def test_filing_url_format() -> None:
    assert filing_url("0000320193", "0000320193-23-000106") == (
        "https://www.sec.gov/Archives/edgar/data/320193/000032019323000106/0000320193-23-000106-index.htm"
    )


# --- properties -------------------------------------------------------------------------
_forms = st.sampled_from(["8-K", "8-K/A", "25", "25-NSE", "15-12B", "15-12G", "15-15D", "10-K", "10-Q", "25-NSE/A", "15F-12B"])
_items = st.lists(st.sampled_from(["1.03", "2.01", "5.02", "9.01", "3.01"]), max_size=4).map(",".join)
_dates = st.dates(min_value=date(2000, 1, 1), max_value=date(2025, 12, 31)).map(lambda d: d.isoformat())
_accessions = st.sampled_from([f"0000000005-20-{i:06d}" for i in range(1, 7)])
_filing = st.tuples(_accessions, _dates, _forms, _items)


def _oracle(rows: list[tuple[str, str, str, str]]) -> set[tuple[str, str]]:
    """Independent statement of Requirement 25.2."""
    out: set[tuple[str, str]] = set()
    for accn, _d, form, items in rows:
        parts = {p.strip() for p in items.split(",")}
        if form in ("8-K", "8-K/A") and "1.03" in parts:
            out.add((accn, "bankruptcy"))
        if form in ("8-K", "8-K/A") and "2.01" in parts:
            out.add((accn, "acquisition_disposition"))
        if form in ("25", "25-NSE"):
            out.add((accn, "delisting"))
        if form in ("15-12B", "15-12G", "15-15D"):
            out.add((accn, "deregistration"))
    return out


# Feature: data-pipeline, Property 32: Events are de-duplicated by accession and type
# Validates: Requirements 25.2, 25.4, 28.5
@given(rows=st.lists(_filing, max_size=25))
def test_events_are_deduplicated_by_accession_and_type(rows) -> None:
    agg = _agg_from({MAIN: submissions_main(5, rows, older_pages=[PAGE]), PAGE: submissions_older(rows)})
    assert set(agg.events) == _oracle(rows)
    assert all(t in EVENT_TYPES for _, t in agg.events)
    assert len(agg.events) == len(set(agg.events))
    for (accn, etype), ev in agg.events.items():
        assert (ev.accession, ev.event_type) == (accn, etype)


# Feature: data-pipeline, Property 33: Member order does not change the result
# Validates: Requirements 22.3, 25.1, 25.5, 28.6
@given(
    main_rows=st.lists(_filing, max_size=8),
    page_rows=st.lists(st.lists(_filing, max_size=8), min_size=0, max_size=3),
    seed=st.integers(min_value=0, max_value=10_000),
)
def test_member_order_does_not_change_the_result(main_rows, page_rows, seed) -> None:
    names = [f"CIK{CIK}-submissions-{i + 1:03d}.json" for i in range(len(page_rows))]
    members = [(MAIN, "main", submissions_main(5, main_rows, older_pages=names, name="N", tickers=["T"], sic="2000"))]
    members += [(n, "page", submissions_older(rows)) for n, rows in zip(names, page_rows)]

    def run(order: list) -> SubAgg:
        agg = SubAgg(cik=CIK)
        for name, kind, obj in order:
            merge_member(agg, name, kind, obj)
        agg.pages.sort()
        return agg

    shuffled = list(members)
    random.Random(seed).shuffle(shuffled)
    a, b = run(members), run(shuffled)
    assert a == b
    all_rows = main_rows + [r for rows in page_rows for r in rows]
    assert set(a.events) == _oracle(all_rows)
