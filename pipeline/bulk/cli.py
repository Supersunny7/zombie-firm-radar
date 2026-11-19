"""``python -m pipeline.bulk``: download, panel, report, all (Requirements 20, 21, 22.4, 23, 25, 27).

Exit codes (Phase 1 table in design.md): 0 ok, 1 bug, 2 argument or environment error,
3 download failed, 4 a needed file is missing, 5 an output file could not be written.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import zipfile
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Callable, Mapping, Sequence

import requests

from pipeline.bulk.download import (
    COMPANYFACTS_URL,
    SUBMISSIONS_URL,
    BulkFile,
    fetch_bulk,
    read_record,
    zip_path,
)
from pipeline.bulk.panel import FirmFacts, extract_panel, gap_panel
from pipeline.bulk.reader import MemberStats, iter_members
from pipeline.bulk.submissions import EVENT_TYPES, Aggregates, aggregate
from pipeline.bulk.tables import (
    EVENT_COLUMNS,
    FIRM_COLUMNS,
    PANEL_COLUMNS,
    GzipCsvWriter,
    build_firm_row,
)
from pipeline.config import (
    BULK_CACHE_DIR,
    DEFAULT_RATE,
    MAX_RATE,
    PHASE1_OUT_DIR,
    PHASE1_REPORTS_DIR,
    REPO_ROOT,
    MissingBulkFileError,
    PipelineError,
    PreflightError,
    is_protected,
)
from pipeline.facts import has_any_annual_fact
from pipeline.http import RateLimiter, RequestStats, redact
from pipeline.run_report import RunReport, write_run_report

COMMANDS = ("download", "panel", "report", "all")
PROGRESS_EVERY = 1000
PANEL_FILE, FIRMS_FILE, EVENTS_FILE = "panel.csv.gz", "firms.csv.gz", "events.csv.gz"
_FORBIDDEN_ROOTS = (REPO_ROOT / "data", REPO_ROOT / "web")


@dataclass(frozen=True)
class BulkPaths:
    """Where Phase 1 reads and writes. Tests pass temporary folders."""

    zip_dir: Path = BULK_CACHE_DIR
    out_dir: Path = PHASE1_OUT_DIR
    reports_dir: Path = PHASE1_REPORTS_DIR
    run_report: Path = REPO_ROOT / "pipeline" / ".cache" / "run_report.json"


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="python -m pipeline.bulk", description="SEC bulk data shape report (Phase 1).")
    p.add_argument("command", choices=COMMANDS)
    p.add_argument("--use-cached", action="store_true", help="use cached zips whatever their age")
    p.add_argument("--rate", type=float, default=DEFAULT_RATE, help="SEC requests per second (default 5, max 10)")
    return p


def _check_rate(rate: float) -> None:
    if not (0 < rate <= MAX_RATE) or rate != rate:
        raise PreflightError(f"invalid --rate {rate!r}: must be above 0 and at most {MAX_RATE:g}", "4.5")


def _check_output_path(path: Path) -> None:
    resolved = path.resolve()
    if is_protected(resolved) or any(resolved == r or r in resolved.parents for r in _FORBIDDEN_ROOTS):
        raise PreflightError(f"refusing to write under {resolved}: Phase 1 never writes to data or web", "20.5")


def _read_email(env: Mapping[str, str]) -> str:
    email = env.get("SEC_CONTACT_EMAIL", "").strip()
    if not email:
        raise PreflightError("SEC_CONTACT_EMAIL is not set or empty", "4.2")
    return email


def _utc(now: datetime) -> str:
    return now.astimezone(UTC).isoformat()


def _zip_section(f: BulkFile) -> dict[str, Any]:
    r = f.record
    return {
        "url": r.url, "downloaded_at": r.downloaded_at, "size_bytes": r.size_bytes,
        "sha256": r.sha256, "last_modified": r.last_modified, "from_cache": f.from_cache,
    }


def _member_total(path: Path) -> int:
    with zipfile.ZipFile(path) as zf:
        return len(zf.namelist())


def _progress(label: str, total: int) -> Callable[[int], None]:
    def tick(n: int) -> None:
        if n % PROGRESS_EVERY == 0 or n == total:
            print(f"{label}: {n}/{total} members", file=sys.stderr, flush=True)

    return tick


def _need(path: Path) -> Path:
    if not path.is_file():
        raise MissingBulkFileError(f"{path.name} is not cached under {path.parent}; run `download` first", "20.4")
    return path


def run_download(
    paths: BulkPaths, *, email: str, rate: float, use_cached: bool, session: Any, now: datetime,
    sleep: Callable[[float], None], stats: RequestStats, bulk: dict[str, Any],
) -> None:
    limiter = RateLimiter(rate)
    zips: dict[str, Any] = {}
    for url in (COMPANYFACTS_URL, SUBMISSIONS_URL):
        got = fetch_bulk(
            url=url, cache_dir=paths.zip_dir, session=session, limiter=limiter, email=email,
            stats=stats, use_cached=use_cached, now=now, sleep=sleep,
        )
        zips[got.name] = _zip_section(got)
    bulk["zips"] = zips


def _record_zips_from_cache(paths: BulkPaths, bulk: dict[str, Any]) -> None:
    """When `panel` runs on its own, describe the zips from their records."""
    zips = bulk.setdefault("zips", {})
    for url in (COMPANYFACTS_URL, SUBMISSIONS_URL):
        p = zip_path(paths.zip_dir, url)
        rec = read_record(p) if p.is_file() else None
        if p.name not in zips:
            zips[p.name] = (
                {"url": rec.url, "downloaded_at": rec.downloaded_at, "size_bytes": rec.size_bytes,
                 "sha256": rec.sha256, "last_modified": rec.last_modified, "from_cache": True}
                if rec else {"url": url, "from_cache": True, "record": None}
            )


def run_panel(paths: BulkPaths, now: datetime, bulk: dict[str, Any]) -> None:
    """Submissions pass first, then the companyfacts pass in sorted order (design, run sequence)."""
    cf_zip = _need(zip_path(paths.zip_dir, COMPANYFACTS_URL))
    sub_zip = _need(zip_path(paths.zip_dir, SUBMISSIONS_URL))
    _record_zips_from_cache(paths, bulk)

    sub_stats = MemberStats()
    aggs: Aggregates = aggregate(sub_zip, sub_stats, _progress("submissions", _member_total(sub_zip)))

    cf_stats = MemberStats()
    universe: list[FirmFacts] = []
    seen_in_companyfacts: set[str] = set()
    no_annual = gap_rows = panel_rows = 0
    tick = _progress("companyfacts", _member_total(cf_zip))
    paths.out_dir.mkdir(parents=True, exist_ok=True)
    count = 0
    with GzipCsvWriter(paths.out_dir / PANEL_FILE, PANEL_COLUMNS) as panel:
        for member in iter_members(cf_zip, cf_stats):
            count += 1
            tick(count)
            if member.kind != "main":
                continue
            seen_in_companyfacts.add(member.cik)
            doc: Any = None
            if member.error is None:
                try:
                    doc = json.loads(member.data or b"")
                    if not isinstance(doc, dict):
                        raise ValueError("top level is not an object")
                except ValueError as exc:
                    cf_stats.read -= 1
                    cf_stats.failed.append({"member": member.name, "error": f"{type(exc).__name__}: {exc}"})
                    doc = None
            if doc is None:  # 22.4: keep the firm, with 11 Gap_Rows and parse_error
                universe.append(FirmFacts(member.cik, None, False, True))
                rows = gap_panel(member.cik)
            else:
                if not has_any_annual_fact(doc):
                    no_annual += 1
                    continue
                name = doc.get("entityName")
                universe.append(FirmFacts(member.cik, name if isinstance(name, str) else None, True, False))
                agg = aggs.firms.get(member.cik)
                rows = extract_panel(member.cik, doc, agg.first_filing if agg and agg.has_main else None)
            panel.write_rows(rows)
            panel_rows += len(rows)
            gap_rows += sum(1 for r in rows if r["fye"] is None)
            del doc, member

    with GzipCsvWriter(paths.out_dir / FIRMS_FILE, FIRM_COLUMNS) as firms:
        for ff in universe:
            agg = aggs.firms.get(ff.cik)
            firms.write_row(build_firm_row(ff.cik, agg, ff, now.year))

    events = sorted(
        (ev for ff in universe if (agg := aggs.firms.get(ff.cik)) is not None for ev in agg.events.values()),
        key=lambda e: (e.cik, e.date, e.accession, e.event_type),
    )
    with GzipCsvWriter(paths.out_dir / EVENTS_FILE, EVENT_COLUMNS) as out:
        for ev in events:
            out.write_row({
                "cik": ev.cik, "date": ev.date, "form": ev.form, "item": ev.item, "event_type": ev.event_type,
                "accession": ev.accession, "url": ev.url, "source_member": ev.source_member,
            })

    universe_ciks = {f.cik for f in universe}
    bulk["members"] = {
        "companyfacts": {"read": cf_stats.read, "ignored": cf_stats.ignored, "parse_failed": cf_stats.failed},
        "submissions": {"read": sub_stats.read, "ignored": sub_stats.ignored, "parse_failed": sub_stats.failed},
    }
    bulk.update({
        "universe_p1": len(universe),
        "companyfacts_without_annual_facts": no_annual,
        "submissions_only_ciks": len(set(aggs.firms) - seen_in_companyfacts),
        "orphan_pages": aggs.orphan_pages,
        "panel_rows": panel_rows,
        "gap_rows": gap_rows,
        "events": {t: sum(1 for e in events if e.event_type == t) for t in EVENT_TYPES},
        "events_outside_universe_dropped": sum(
            len(a.events) for c, a in aggs.firms.items() if c not in universe_ciks
        ),
    })


def run_report_step(paths: BulkPaths, bulk: dict[str, Any]) -> None:
    """Filled in by task 30."""
    try:
        from pipeline.bulk import report as report_mod
    except ImportError as exc:
        raise PipelineError("the report step is not available yet", None) from exc
    report_mod.run(paths, bulk)  # pragma: no cover - added with the report module


def main(
    argv: Sequence[str] | None = None,
    *,
    paths: BulkPaths | None = None,
    session: Any = None,
    env: Mapping[str, str] | None = None,
    now: datetime | None = None,
    sleep: Callable[[float], None] = time.sleep,
) -> int:
    try:
        ns = build_parser().parse_args(argv)
    except SystemExit as exc:  # argparse prints its own usage message
        return int(exc.code) if isinstance(exc.code, int) else 2
    paths = paths or BulkPaths()
    env = os.environ if env is None else env
    now = now or datetime.now(UTC)
    report = RunReport(started_at=_utc(now), argv=list(argv if argv is not None else sys.argv[1:]))
    bulk: dict[str, Any] = {"command": ns.command, "use_cached": bool(ns.use_cached)}
    report.bulk = bulk
    stats = RequestStats()
    secrets: list[str] = []
    code = 0

    # Preflight: nothing here touches the network or a file.
    try:
        _check_rate(ns.rate)
        _check_output_path(paths.out_dir)
        _check_output_path(paths.reports_dir)
        email = _read_email(env) if ns.command in ("download", "all") else ""
        secrets = [email] if email else []
    except PreflightError as exc:
        print(f"error: {exc.message}", file=sys.stderr)
        return exc.exit_code

    try:
        if ns.command in ("download", "all"):
            run_download(paths, email=email, rate=ns.rate, use_cached=ns.use_cached,
                         session=session or requests.Session(), now=now, sleep=sleep, stats=stats, bulk=bulk)
        if ns.command in ("panel", "all"):
            run_panel(paths, now, bulk)
        if ns.command in ("report", "all"):
            run_report_step(paths, bulk)
    except PipelineError as exc:
        code = exc.exit_code
        report.failure = {"requirement": exc.requirement, "message": redact(exc.message, secrets)}
        print(f"error: {redact(exc.message, secrets)}", file=sys.stderr)
    except Exception as exc:  # noqa: BLE001 - a bug: exit 1 with a redacted summary
        code = 1
        report.failure = {"requirement": None, "message": redact(f"{type(exc).__name__}: {exc}", secrets)}
        print(f"unexpected error: {redact(f'{type(exc).__name__}: {exc}', secrets)}", file=sys.stderr)
    finally:
        cache_hits = sum(1 for z in bulk.get("zips", {}).values() if z.get("from_cache"))
        report.requests["sec"] = {"sent": stats.sent, "cache_hits": cache_hits, "retried": stats.retried}
        report.exit_code = code
        report.ended_at = _utc(datetime.now(UTC) if now is None else now)
        if not write_run_report(report, paths.run_report, secrets) and code == 0:
            code = 12
    return code
