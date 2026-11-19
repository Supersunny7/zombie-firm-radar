"""Per-CIK aggregate of the bulk submissions files, and the events table (Requirements 23.3,
23.4, 24.7, 25.1 to 25.6).

For one CIK the main file and every older page are merged. Every merge step is a minimum,
a maximum or a set union, so the result does not depend on the order of the members (25.5).
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Any, Callable, Iterable, Iterator

from pipeline.bulk.reader import MemberStats, iter_members

ANNUAL_10K_FORMS = frozenset({"10-K", "10-K/A"})
EVENT_8K_FORMS = frozenset({"8-K", "8-K/A"})

# (event type, forms, item). Forms are matched exactly (25.2). item None: the form alone decides.
EVENT_RULES: tuple[tuple[str, frozenset[str], str | None], ...] = (
    ("bankruptcy", EVENT_8K_FORMS, "1.03"),
    ("acquisition_disposition", EVENT_8K_FORMS, "2.01"),
    ("delisting", frozenset({"25", "25-NSE"}), None),
    ("deregistration", frozenset({"15-12B", "15-12G", "15-15D"}), None),
)
EVENT_TYPES = tuple(rule[0] for rule in EVENT_RULES)


@dataclass(frozen=True)
class Filing:
    accession: str
    filed: date | None
    form: str
    items: tuple[str, ...]


@dataclass(frozen=True)
class EventRow:
    cik: str
    date: date
    form: str
    item: str | None
    event_type: str
    accession: str
    url: str
    source_member: str


@dataclass
class SubAgg:
    cik: str
    main_present: bool = False  # a main file exists in the archive (even if it failed to parse)
    has_main: bool = False  # the main file was parsed
    name: str | None = None
    tickers: tuple[str, ...] = ()
    sic: object = None
    first_filing: date | None = None
    last_filing: date | None = None
    last_10k: date | None = None
    events: dict[tuple[str, str], EventRow] = field(default_factory=dict)  # (accession, event type)
    pages: list[str] = field(default_factory=list)
    parse_error: bool = False


@dataclass
class Aggregates:
    firms: dict[str, SubAgg]  # CIKs with a main file in the archive
    orphan_pages: list[str]  # older pages whose CIK has no main file
    stats: MemberStats


def filing_url(cik: str, accession: str) -> str:
    """Filing index URL (24.7)."""
    return (
        f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/"
        f"{accession.replace('-', '')}/{accession}-index.htm"
    )


def _date(raw: object) -> date | None:
    if not isinstance(raw, str):
        return None
    try:
        return date.fromisoformat(raw[:10])
    except ValueError:
        return None


def _at(values: object, i: int) -> object:
    return values[i] if isinstance(values, list) and i < len(values) else None


def filing_rows(obj: dict[str, Any], kind: str) -> Iterator[Filing]:
    """Rows of the parallel arrays. A main file keeps them under ``filings.recent``; an older
    page has them at the top level (25.1)."""
    if kind == "main":
        filings = obj.get("filings")
        arrays = filings.get("recent") if isinstance(filings, dict) else None
    else:
        arrays = obj
    if not isinstance(arrays, dict):
        return
    forms = arrays.get("form")
    n = len(forms) if isinstance(forms, list) else 0
    for i in range(n):
        accession = _at(arrays.get("accessionNumber"), i)
        form = _at(forms, i)
        raw_items = _at(arrays.get("items"), i)
        items = tuple(p.strip() for p in raw_items.split(",") if p.strip()) if isinstance(raw_items, str) else ()
        yield Filing(
            accession=accession if isinstance(accession, str) else "",
            filed=_date(_at(arrays.get("filingDate"), i)),
            form=form if isinstance(form, str) else "",
            items=items,
        )


def event_rows(cik: str, filings: Iterable[Filing], source_member: str) -> list[EventRow]:
    """Events of the given filings (pure). One filing can give several events (25.2, 25.4).
    A filing without an accession number or a filing date gives none."""
    out: list[EventRow] = []
    for f in filings:
        if not f.accession or f.filed is None:
            continue
        for event_type, forms, item in EVENT_RULES:
            if f.form not in forms or (item is not None and item not in f.items):
                continue
            out.append(
                EventRow(
                    cik=cik, date=f.filed, form=f.form, item=item, event_type=event_type,
                    accession=f.accession, url=filing_url(cik, f.accession), source_member=source_member,
                )
            )
    return out


def _min(a: date | None, b: date | None) -> date | None:
    return b if a is None else a if b is None else min(a, b)


def _max(a: date | None, b: date | None) -> date | None:
    return b if a is None else a if b is None else max(a, b)


def merge_member(agg: SubAgg, name: str, kind: str, obj: dict[str, Any]) -> None:
    """Merge one parsed member into the aggregate. Order-independent (25.5)."""
    filings = list(filing_rows(obj, kind))
    for f in filings:
        agg.first_filing = _min(agg.first_filing, f.filed)
        agg.last_filing = _max(agg.last_filing, f.filed)
        if f.form in ANNUAL_10K_FORMS:
            agg.last_10k = _max(agg.last_10k, f.filed)
    for ev in event_rows(agg.cik, filings, name):
        key = (ev.accession, ev.event_type)
        old = agg.events.get(key)
        # Same filing on a page and in the main file: keep the lexicographically smaller member.
        if old is None or ev.source_member < old.source_member:
            agg.events[key] = ev
    if kind == "main":
        agg.has_main = True
        raw_name = obj.get("name")
        agg.name = raw_name if isinstance(raw_name, str) and raw_name else None
        tickers = obj.get("tickers")
        agg.tickers = tuple(t for t in tickers if isinstance(t, str) and t) if isinstance(tickers, list) else ()
        agg.sic = obj.get("sic")
    agg.pages.append(name)


def aggregate(
    zip_path: Path,
    stats: MemberStats | None = None,
    on_member: Callable[[int], None] | None = None,
) -> Aggregates:
    """Read every member of ``submissions.zip`` and merge them per CIK.

    A member that cannot be read or parsed sets ``parse_error`` for its CIK and is listed in
    ``stats.failed``; the run goes on (22.4). Older pages whose CIK has no main file are
    returned as ``orphan_pages`` and skipped (25.6).
    """
    stats = stats if stats is not None else MemberStats()
    aggs: dict[str, SubAgg] = {}
    count = 0
    for member in iter_members(zip_path, stats):
        count += 1
        if on_member is not None:
            on_member(count)
        agg = aggs.setdefault(member.cik, SubAgg(cik=member.cik))
        if member.kind == "main":
            agg.main_present = True
        obj: Any = None
        if member.error is None:
            try:
                obj = json.loads(member.data or b"")
                if not isinstance(obj, dict):
                    raise ValueError("top level is not an object")
            except ValueError as exc:
                stats.read -= 1
                stats.failed.append({"member": member.name, "error": f"{type(exc).__name__}: {exc}"})
                obj = None
        if obj is None:
            agg.parse_error = True
            agg.pages.append(member.name)
            continue
        merge_member(agg, member.name, member.kind, obj)
    firms = {cik: a for cik, a in sorted(aggs.items()) if a.main_present}
    orphans = sorted(name for cik, a in aggs.items() if not a.main_present for name in a.pages)
    orphans = sorted(set(orphans))
    return Aggregates(firms=firms, orphan_pages=orphans, stats=stats)
