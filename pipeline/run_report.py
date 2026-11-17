"""Run report: what a pipeline run attempted, skipped, excluded and why it ended."""

from __future__ import annotations

import json
import os
import re
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from pipeline.config import REDACTED

EXCLUSION_REASONS = (
    "financial",
    "utility",
    "no_sic",
    "age_under_10",
    "not_recent",
    "no_annual_facts",
)
SKIP_KINDS = ("ticker_not_found", "invalid_cik")

_API_KEY_RE = re.compile(r"(api_key=)[^&\s\"']*", re.IGNORECASE)


def _empty_exclusions() -> dict[str, dict[str, Any]]:
    return {r: {"count": 0, "ciks": []} for r in EXCLUSION_REASONS}


@dataclass
class RunReport:
    started_at: str = ""
    ended_at: str | None = None
    argv: list[str] = field(default_factory=list)
    exit_code: int | None = None
    failure: dict | None = None  # {"requirement": "4.12", "message": ...}
    attempted_firms: int = 0
    failed_firms: list[dict] = field(default_factory=list)  # {"cik", "url", "reason"}
    output_firms: int = 0
    outputs_replaced: bool = False
    skipped_inputs: list[dict] = field(default_factory=list)  # {"reason", "text"}
    exclusions: dict[str, dict] = field(default_factory=_empty_exclusions)
    no_firm_window: list[str] = field(default_factory=list)
    selected_by: dict[str, list[str]] = field(default_factory=dict)
    interest_tags: dict[str, dict[str, str | None]] = field(default_factory=dict)
    sample: dict | None = None
    sample_minimums_unmet: list[dict] = field(default_factory=list)
    requests: dict[str, dict[str, int]] = field(
        default_factory=lambda: {
            "sec": {"sent": 0, "cache_hits": 0, "retried": 0},
            "fred": {"sent": 0, "cache_hits": 0, "retried": 0},
        }
    )

    # --- mutators ---

    def add_failed(self, cik: str, url: str, reason: str) -> None:
        self.failed_firms.append({"cik": cik, "url": url, "reason": reason})

    def add_skipped(self, kind: str, text: str) -> None:
        if kind not in SKIP_KINDS:
            raise ValueError(f"unknown skipped-input kind: {kind!r}")
        self.skipped_inputs.append({"reason": kind, "text": text})

    def add_excluded(self, reason: str, cik: str) -> None:
        if reason not in EXCLUSION_REASONS:
            raise ValueError(f"unknown exclusion reason: {reason!r}")
        entry = self.exclusions.setdefault(reason, {"count": 0, "ciks": []})
        if cik not in entry["ciks"]:
            entry["ciks"].append(cik)
        entry["count"] = len(entry["ciks"])

    # --- derived ---

    @property
    def failure_pct(self) -> float:
        if self.attempted_firms <= 0:
            return 0.0
        return len({f["cik"] for f in self.failed_firms}) / self.attempted_firms * 100

    # --- serialisation ---

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["failure_pct"] = self.failure_pct
        d["failed_firms"] = sorted(
            d["failed_firms"], key=lambda f: (f["cik"], f["url"], f["reason"])
        )
        d["skipped_inputs"] = sorted(d["skipped_inputs"], key=lambda s: (s["reason"], s["text"]))
        excl: dict[str, dict] = {}
        for reason in EXCLUSION_REASONS:
            ciks = sorted(set(d["exclusions"].get(reason, {}).get("ciks", [])))
            excl[reason] = {"count": len(ciks), "ciks": ciks}
        d["exclusions"] = excl
        d["no_firm_window"] = sorted(set(d["no_firm_window"]))
        d["selected_by"] = {k: sorted(v) for k, v in sorted(d["selected_by"].items())}
        d["interest_tags"] = {k: dict(sorted(v.items())) for k, v in sorted(d["interest_tags"].items())}
        return d

    def to_json(self, secrets: list[str]) -> str:
        data = _redact_obj(self.to_dict(), secrets)
        return json.dumps(data, indent=2, ensure_ascii=False, sort_keys=False, allow_nan=False) + "\n"


def _redact_str(text: str, secrets: list[str]) -> str:
    for s in sorted({s for s in secrets if s}, key=len, reverse=True):
        text = text.replace(s, REDACTED)
    return _API_KEY_RE.sub(lambda m: m.group(1) + REDACTED, text)


def _redact_obj(obj: Any, secrets: list[str]) -> Any:
    if isinstance(obj, str):
        return _redact_str(obj, secrets)
    if isinstance(obj, list):
        return [_redact_obj(x, secrets) for x in obj]
    if isinstance(obj, dict):
        return {_redact_str(str(k), secrets): _redact_obj(v, secrets) for k, v in obj.items()}
    return obj


def write_run_report(report: RunReport, path: Path, secrets: list[str]) -> bool:
    """Write atomically (temp file + os.replace). Return False and warn on stderr on failure."""
    path = Path(path)
    tmp = path.with_name(path.name + ".tmp")
    try:
        text = report.to_json(secrets)
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp.write_text(text, encoding="utf-8")
        os.replace(tmp, path)
        return True
    except OSError:
        print(f"run report could not be written: {path}", file=sys.stderr)
        try:
            tmp.unlink(missing_ok=True)
        except OSError:
            pass
        return False
