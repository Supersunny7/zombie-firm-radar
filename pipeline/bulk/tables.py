"""Column lists, deterministic gzip CSV writing and the Firm_Table row (Requirements 23.2 to 23.6,
24.9, 24.10)."""
from __future__ import annotations

import csv
import gzip
import io
import os
import uuid
from datetime import date
from pathlib import Path
from typing import Any, Iterable, Mapping

import pandas as pd

from pipeline.bulk.panel import FIELD_SUFFIXES, FIELDS, FirmFacts
from pipeline.bulk.submissions import SubAgg
from pipeline.config import BulkWriteError
from pipeline.universe import FINANCIAL_RANGE, MIN_AGE_YEARS, UTILITY_RANGE, parse_sic, sic_division

FIRM_COLUMNS = (
    "cik", "name", "tickers", "sic", "sic_division", "first_filing_date", "last_10k_date",
    "last_filing_date", "is_financial", "is_utility", "no_sic", "age_under_10", "parse_error",
)
PANEL_COLUMNS = (
    ("cik", "fy", "fye", "age_at_fy")
    + tuple(f + s for f in FIELDS for s in FIELD_SUFFIXES)
    + ("icr", "zombie_flag", "gap_has_balance_sheet")
)
EVENT_COLUMNS = ("cik", "date", "form", "item", "event_type", "accession", "url", "source_member")


def cell(value: object) -> str:
    """CSV text of a value. None is empty, 0 is "0" (so missing and zero differ), booleans are
    ``true`` / ``false``, floats use repr, dates are ISO (24.9)."""
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, float):
        return repr(value)
    if isinstance(value, date):
        return value.isoformat()
    return str(value)


class GzipCsvWriter:
    """Writes rows to ``<path>.tmp`` and renames to ``path`` on a clean close. The gzip header
    has no file name and no time, so equal rows give equal bytes (26.13)."""

    def __init__(self, path: Path, columns: tuple[str, ...]) -> None:
        self.path = Path(path)
        self.columns = columns
        self.rows = 0
        self._tmp = self.path.with_name(f".{self.path.name}.{uuid.uuid4().hex}.tmp")
        self._raw: Any = None
        self._gz: Any = None
        self._text: Any = None
        self._csv: Any = None

    def __enter__(self) -> "GzipCsvWriter":
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            self._raw = open(self._tmp, "wb")
            self._gz = gzip.GzipFile(filename="", mode="wb", fileobj=self._raw, mtime=0)
            self._text = io.TextIOWrapper(self._gz, encoding="utf-8", newline="")
            self._csv = csv.writer(self._text, lineterminator="\n")
            self._csv.writerow(self.columns)
        except OSError as exc:
            self._discard()
            raise BulkWriteError(f"cannot write {self.path.name}: {exc}", "20.5") from exc
        return self

    def write_row(self, row: Mapping[str, object]) -> None:
        extra = set(row) - set(self.columns)
        if extra:
            raise KeyError(f"unknown columns for {self.path.name}: {sorted(extra)}")
        self._csv.writerow([cell(row.get(c)) for c in self.columns])
        self.rows += 1

    def write_rows(self, rows: Iterable[Mapping[str, object]]) -> None:
        for row in rows:
            self.write_row(row)

    def _discard(self) -> None:
        for f in (self._text, self._gz, self._raw):
            try:
                if f is not None:
                    f.close()
            except (OSError, ValueError):
                pass
        self._tmp.unlink(missing_ok=True)

    def __exit__(self, exc_type, exc, tb) -> None:
        if exc_type is not None:
            self._discard()
            return
        try:
            self._text.close()  # closes the gzip stream; no sync flush, so the bytes are deterministic
            self._raw.close()
            os.replace(self._tmp, self.path)
        except OSError as err:
            self._discard()
            raise BulkWriteError(f"cannot write {self.path.name}: {err}", "20.5") from err


def read_table(path: Path, columns: list[str] | None = None) -> pd.DataFrame:
    """Read a table written by GzipCsvWriter. Every column is text; empty cells are NaN."""
    return pd.read_csv(
        path, dtype=str, usecols=columns, keep_default_na=False, na_values=[""], compression="gzip"
    )


def build_firm_row(cik: str, agg: SubAgg | None, facts: FirmFacts, run_year: int) -> dict[str, object]:
    """One Firm_Table row. A firm without a submissions record is kept with ``no_sic`` true and
    the entity name from companyfacts (23.2). No flag removes a firm (23.6)."""
    has_sub = agg is not None and agg.has_main
    sic_int = parse_sic(agg.sic) if has_sub else None
    first = agg.first_filing if has_sub else None
    return {
        "cik": cik,
        "name": (agg.name if has_sub and agg.name else None) or facts.entity_name or "",
        "tickers": ";".join(agg.tickers) if has_sub else "",
        "sic": str(agg.sic).strip() if sic_int is not None else None,
        "sic_division": sic_division(sic_int) if sic_int is not None else None,
        "first_filing_date": first,
        "last_10k_date": agg.last_10k if has_sub else None,
        "last_filing_date": agg.last_filing if has_sub else None,
        "is_financial": sic_int is not None and FINANCIAL_RANGE[0] <= sic_int <= FINANCIAL_RANGE[1],
        "is_utility": sic_int is not None and UTILITY_RANGE[0] <= sic_int <= UTILITY_RANGE[1],
        "no_sic": sic_int is None,
        "age_under_10": first is None or run_year - first.year < MIN_AGE_YEARS,
        "parse_error": facts.parse_error or bool(agg is not None and agg.parse_error),
    }
