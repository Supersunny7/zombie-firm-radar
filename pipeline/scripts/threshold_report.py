#!/usr/bin/env python3
"""Rate-shock threshold report for a firms_index.json (data contract v2).

For every shock-eligible firm, the critical point is the rate rise (in percentage points)
at which its interest coverage falls to 1:

    critical point = (EBIT - interest) / total debt * 100 = (latest_icr - 1) * implied_rate * 100

A firm with ICR < 1 already has a negative critical point. The report counts firms below 0,
in each 0.5-point bin from 0 to 5, and above 5, plus firms that are not shock eligible, in
total and per sector. It prints the report and writes pipeline/reports/threshold_<name>.md.

Run from anywhere:
    .venv/bin/python pipeline/scripts/threshold_report.py [path/to/firms_index.json] [--name NAME]

<name> defaults to the folder holding the index (data/mock/firms_index.json -> "mock"), or to
the file name without extension when the file is not called firms_index.json.

Standard library only. Reads only the fields the data contract guarantees and tolerates nulls,
so it works unchanged on real data.
"""
from __future__ import annotations

import argparse
import json
import math
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DEFAULT_INDEX = REPO / "data" / "mock" / "firms_index.json"
REPORT_DIR = REPO / "pipeline" / "reports"

BIN_WIDTH = 0.5
BIN_MAX = 5.0
N_BINS = int(round(BIN_MAX / BIN_WIDTH))

# Row labels, in report order.
BIN_LABELS = (
    ["below 0 (already under 1x)"]
    + [f"{i * BIN_WIDTH:.1f} to {(i + 1) * BIN_WIDTH:.1f}" for i in range(N_BINS)]
    + ["above 5.0"]
)


class ReportError(Exception):
    pass


def critical_point_pp(row):
    """Critical point in percentage points, or None if it cannot be computed."""
    icr, rate = row.get("latest_icr"), row.get("implied_rate")
    for v in (icr, rate):
        if not isinstance(v, (int, float)) or isinstance(v, bool) or not math.isfinite(v):
            return None
    return (icr - 1) * rate * 100


def bin_index(crit):
    """0 = below 0; 1..N_BINS = [0, 0.5) ... [4.5, 5.0] (5.0 belongs to the last bin); N_BINS + 1 = above 5."""
    if crit < 0:
        return 0
    if crit > BIN_MAX:
        return N_BINS + 1
    return min(int(crit // BIN_WIDTH), N_BINS - 1) + 1


def tally(rows):
    """Counts for one group of firms."""
    bins = [0] * (N_BINS + 2)
    not_eligible = 0
    no_icr = 0
    for row in rows:
        if row.get("shock_eligible") is not True:
            not_eligible += 1
            continue
        crit = critical_point_pp(row)
        if crit is None:
            no_icr += 1  # shock eligible, but no usable ICR (EBIT missing): no critical point
            continue
        bins[bin_index(crit)] += 1
    return dict(bins=bins, not_eligible=not_eligible, no_icr=no_icr, total=len(rows))


def table(t):
    n_eligible = sum(t["bins"])
    lines = ["| Critical point (percentage points) | Firms |", "| --- | ---: |"]
    for label, count in zip(BIN_LABELS, t["bins"]):
        lines.append(f"| {label} | {count} |")
    lines.append(f"| **Shock eligible, critical point computed** | **{n_eligible}** |")
    lines.append(f"| Shock eligible, no ICR (EBIT missing) | {t['no_icr']} |")
    lines.append(f"| Not shock eligible | {t['not_eligible']} |")
    lines.append(f"| **All firms** | **{t['total']}** |")
    return "\n".join(lines)


def build_report(index, source_label):
    rows = index["firms"]
    meta = index.get("meta") or {}
    lines = [
        f"# Rate-shock threshold report: {source_label}",
        "",
        f"Source: `{source_label}`. Generated at (from the index): {meta.get('generated_at', 'unknown')}.",
        "",
        "Critical point = (EBIT - interest) / total debt * 100 = (latest ICR - 1) * implied rate * 100.",
        "It is the rate rise, in percentage points, at which the firm's ICR reaches 1. Negative means the firm",
        "is already below 1. Bins are [low, high); the last bin (4.5 to 5.0) includes 5.0. Firms that are not",
        "shock eligible (no total debt, or implied rate not above 0) have no critical point.",
        "",
        "## All sectors",
        "",
        table(tally(rows)),
    ]
    sectors = sorted({r.get("sector") or "(no sector)" for r in rows})
    for sector in sectors:
        group = [r for r in rows if (r.get("sector") or "(no sector)") == sector]
        lines += ["", f"## {sector}", "", table(tally(group))]
    return "\n".join(lines) + "\n"


def load_index(path):
    try:
        index = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise ReportError(f"{path} does not exist")
    except json.JSONDecodeError as exc:
        raise ReportError(f"{path} is not valid JSON: {exc}")
    if not isinstance(index, dict) or not isinstance(index.get("firms"), list):
        raise ReportError(f'{path} must have the shape {{"meta": ..., "firms": [...]}}')
    for i, row in enumerate(index["firms"]):
        if not isinstance(row, dict):
            raise ReportError(f"{path}: firms[{i}] is not an object")
    return index


def default_name(path):
    stem = path.parent.name if path.name == "firms_index.json" else path.stem
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", stem) or "index"


def main(argv=None):
    ap = argparse.ArgumentParser(description="Rate-shock threshold report for a firms_index.json")
    ap.add_argument("index", nargs="?", default=str(DEFAULT_INDEX),
                    help="path to firms_index.json (default: data/mock/firms_index.json)")
    ap.add_argument("--name", help="report name: written to pipeline/reports/threshold_<name>.md")
    args = ap.parse_args(argv)

    path = Path(args.index).expanduser()
    if not path.is_absolute():
        path = Path.cwd() / path
    path = path.resolve()
    index = load_index(path)

    name = args.name or default_name(path)
    if not re.fullmatch(r"[A-Za-z0-9_.-]+", name):
        raise ReportError(f"report name {name!r} may only contain letters, digits, '_', '.' and '-'")
    try:
        label = str(path.relative_to(REPO))
    except ValueError:
        label = str(path)

    report = build_report(index, label)
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    out = REPORT_DIR / f"threshold_{name}.md"
    out.write_text(report, encoding="utf-8")
    print(report, end="")
    print(f"\nWrote {out}")


if __name__ == "__main__":
    try:
        main()
    except ReportError as exc:
        print(f"threshold_report: {exc}", file=sys.stderr)
        sys.exit(1)
