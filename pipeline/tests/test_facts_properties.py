"""Property test for annual fact selection.

Feature: data-pipeline, Property 4: Annual fact selection is filtered, unique and order-independent.
**Validates: Requirements 6.1, 6.7, 6.8, 7.12**
"""
from __future__ import annotations

import math
import random
from datetime import date, timedelta
from typing import Any

from hypothesis import given
from hypothesis import strategies as st

from pipeline.facts import Fact, annual_facts, dedupe, pick_instant
from pipeline.tests.builders import fact

TAG = "Revenues"
_BAD_FORMS = ["10-Q", "10-KT", "10-K405", "8-K", "10-Q/A"]
_BAD_FPS = ["Q1", "Q2", "Q3", "FYX", ""]
_dates = st.dates(min_value=date(2015, 1, 1), max_value=date(2024, 12, 31))
_finite = st.one_of(
    st.integers(min_value=-(10**15), max_value=10**15),
    st.floats(allow_nan=False, allow_infinity=False, width=64),
)
_value = st.one_of(_finite, st.sampled_from([math.nan, math.inf, -math.inf]))


@st.composite
def _row(draw: st.DrawFn, index: int) -> dict[str, Any]:
    end = draw(_dates)
    start = draw(st.one_of(st.none(), st.just(end - timedelta(days=364))))
    filed = end + timedelta(days=draw(st.integers(min_value=1, max_value=900)))
    return fact(
        draw(_value),
        end.isoformat(),
        start=start.isoformat() if start else None,
        # Few distinct periods so dedupe collisions are common.
        form=draw(st.sampled_from(["10-K", "10-K/A"] * 3 + _BAD_FORMS)),
        fp=draw(st.sampled_from(["FY"] * 4 + _BAD_FPS)),
        filed=filed.isoformat(),
        accn=f"{draw(st.integers(0, 3)):010d}-25-{index:06d}",  # unique per row
    )


@st.composite
def _documents(draw: st.DrawFn) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    n = draw(st.integers(min_value=0, max_value=25))
    rows = [draw(_row(i)) for i in range(n)]
    # Rows that must never be selected: other units, other taxonomies, other tags.
    other = [draw(_row(1000 + i)) for i in range(draw(st.integers(0, 5)))]
    doc = {
        "facts": {
            "us-gaap": {
                TAG: {"units": {"USD": rows, "EUR": other, "shares": other}},
                "Other": {"units": {"USD": other}},
            },
            "ifrs-full": {TAG: {"units": {"USD": other}}},
        }
    }
    return doc, rows


def _expected(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        r
        for r in rows
        if r["form"] in ("10-K", "10-K/A")
        and r["fp"] == "FY"
        and isinstance(r["val"], (int, float))
        and math.isfinite(r["val"])
    ]


def _with_rows(doc: dict[str, Any], rows: list[dict[str, Any]]) -> dict[str, Any]:
    gaap = dict(doc["facts"]["us-gaap"])
    entry = dict(gaap[TAG])
    entry["units"] = {**entry["units"], "USD": rows}
    gaap[TAG] = entry
    return {"facts": {**doc["facts"], "us-gaap": gaap}}


@given(_documents(), st.randoms(use_true_random=False))
def test_annual_fact_selection(
    case: tuple[dict[str, Any], list[dict[str, Any]]], rnd: random.Random
) -> None:
    doc, rows = case
    facts = annual_facts(doc, TAG)
    expected = _expected(rows)

    # (a) only us-gaap USD 10-K / 10-K/A, fp FY, finite values; nothing else dropped.
    assert all(f.form in ("10-K", "10-K/A") and f.tag == TAG for f in facts)
    assert all(math.isfinite(f.val) for f in facts)
    assert sorted(f.accn for f in facts) == sorted(r["accn"] for r in expected)

    # (d) values copied unchanged, same type (no scaling, rounding or int/float coercion).
    by_accn = {r["accn"]: r for r in expected}
    for f in facts:
        src = by_accn[f.accn]
        assert f.val == src["val"] and type(f.val) is type(src["val"])

    # (b) after dedupe each (start, end) appears once and the max (filed, accn) is kept.
    kept = dedupe(facts)
    keys = [(f.start, f.end) for f in kept]
    assert len(keys) == len(set(keys))
    assert set(keys) == {(f.start, f.end) for f in facts}
    for k in kept:
        group = [f for f in facts if (f.start, f.end) == (k.start, k.end)]
        assert (k.filed, k.accn) == max((f.filed, f.accn) for f in group)
        assert k in group  # value untouched

    # (c) independent of input order.
    shuffled = list(rows)
    rnd.shuffle(shuffled)
    assert dedupe(annual_facts(_with_rows(doc, shuffled), TAG)) == kept


# --- Property 5 ---------------------------------------------------------------
# Feature: data-pipeline, Property 5: Instant date choice matches a brute-force oracle
# **Validates: Requirements 6.5, 6.6, 6.14, 6.16**

_fye_dates = st.dates(min_value=date(2016, 1, 1), max_value=date(2024, 12, 31))


@st.composite
def _instant_cases(draw: st.DrawFn) -> tuple[date, list[Fact]]:
    fye = draw(_fye_dates)
    n = draw(st.integers(min_value=0, max_value=12))
    facts: list[Fact] = []
    for i in range(n):
        # Offsets cover the exact date, both sides of the +/-7 boundary, and equidistant ties.
        offset = draw(st.one_of(st.integers(-10, 10), st.sampled_from([-8, -7, -1, 0, 1, 7, 8])))
        end = fye + timedelta(days=offset)
        is_flow = draw(st.integers(0, 5)) == 0  # flow facts must never be picked
        filed = end + timedelta(days=draw(st.integers(1, 5)))  # few values: filed ties happen
        facts.append(
            Fact(
                tag="Assets",
                start=end - timedelta(days=364) if is_flow else None,
                end=end,
                val=draw(st.integers(-(10**9), 10**9)),
                accn=f"{draw(st.integers(0, 2)):010d}-25-{i:06d}",  # unique per fact
                filed=filed,
                form=draw(st.sampled_from(["10-K", "10-K/A"])),
            )
        )
    return fye, facts


def _oracle(facts: list[Fact], fye: date) -> Fact | None:
    window = [f for f in facts if f.start is None and abs((f.end - fye).days) <= 7]
    if not window:
        return None
    exact = [f for f in window if f.end == fye]
    if exact:
        pool = exact
    else:
        dist = min(abs((f.end - fye).days) for f in window)
        closest = [f for f in window if abs((f.end - fye).days) == dist]
        earliest = min(f.end for f in closest)  # tie: earlier date wins
        pool = [f for f in closest if f.end == earliest]
    # Same date: the latest filing wins, accession number breaks filed ties.
    return sorted(pool, key=lambda f: (f.filed, f.accn))[-1]


@given(_instant_cases(), st.randoms(use_true_random=False))
def test_pick_instant_matches_oracle(case: tuple[date, list[Fact]], rnd: random.Random) -> None:
    fye, facts = case
    expected = _oracle(facts, fye)
    assert pick_instant(facts, fye) == expected

    # Input order does not matter.
    shuffled = list(facts)
    rnd.shuffle(shuffled)
    assert pick_instant(shuffled, fye) == expected

    if expected is not None:
        assert expected.start is None and abs((expected.end - fye).days) <= 7
