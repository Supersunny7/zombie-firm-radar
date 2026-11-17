"""Pipeline configuration: constants, paths, environment and typed exit-code errors."""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

REPO_ROOT: Path = Path(__file__).resolve().parents[1]
SCHEMA_DIR: Path = REPO_ROOT / "data" / "schema"
PROTECTED_DIRS: tuple[Path, ...] = (
    (REPO_ROOT / "data" / "mock").resolve(),
    (REPO_ROOT / "data" / "schema").resolve(),
    (REPO_ROOT / "data" / "fixtures").resolve(),
)

DEFAULT_RATE = 5.0
MAX_RATE = 10.0
SAMPLE_SCAN_FACTOR = 10  # scan limit = max(SAMPLE_SCAN_FACTOR * N, SAMPLE_SCAN_FLOOR)
SAMPLE_SCAN_FLOOR = 200
MIN_PER_DIVISION = 5
MINIMUM_DIVISIONS = (
    "Retail Trade",
    "Transportation, Communications, Electric, Gas and Sanitary Services",
)
REDACTED = "[REDACTED]"


# --- typed exceptions -------------------------------------------------------


class PipelineError(Exception):
    """Base class: carries an exit code and an optional requirement number."""

    exit_code: int = 1

    def __init__(self, message: str, requirement: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.requirement = requirement


class PreflightError(PipelineError):
    exit_code = 2


class CorruptPreviousError(PipelineError):
    exit_code = 3


class TickerMapError(PipelineError):
    exit_code = 4


class EmptySelectionError(PipelineError):
    exit_code = 5


class FailureRateError(PipelineError):
    exit_code = 6


class MacroError(PipelineError):
    exit_code = 7


class NoSectorMedianError(PipelineError):
    exit_code = 8


class OutputInvalidError(PipelineError):
    exit_code = 9


class SwapError(PipelineError):
    exit_code = 10


class ReportStepError(PipelineError):
    exit_code = 11


# --- config -----------------------------------------------------------------


@dataclass(frozen=True)
class Config:
    out_dir: Path
    cache_dir: Path
    reports_dir: Path
    schema_dir: Path
    rate: float
    contact_email: str
    fred_api_key: str | None
    run_start: datetime  # UTC, taken once

    @property
    def run_year(self) -> int:
        return self.run_start.year

    @property
    def run_report_path(self) -> Path:
        return self.cache_dir / "run_report.json"


def resolve_out_dir(raw: str) -> Path:
    """Resolve relative to REPO_ROOT, following symlinks."""
    p = Path(raw).expanduser()
    if not p.is_absolute():
        p = REPO_ROOT / p
    return p.resolve()


def is_protected(path: Path) -> bool:
    """True if path equals or lies inside a Protected_Dir."""
    p = Path(path).resolve()
    return any(p == d or d in p.parents for d in PROTECTED_DIRS)


def read_env() -> tuple[str, str | None]:
    """Return (SEC_CONTACT_EMAIL, FRED_API_KEY or None)."""
    email = os.environ.get("SEC_CONTACT_EMAIL", "").strip()
    if not email:
        raise PreflightError("SEC_CONTACT_EMAIL is not set or empty", "4.2")
    key = os.environ.get("FRED_API_KEY", "")
    return email, (key if key.strip() else None)


def secrets(cfg: Config) -> list[str]:
    """Non-empty secret values, for redaction."""
    return [s for s in (cfg.contact_email, cfg.fred_api_key) if s]
