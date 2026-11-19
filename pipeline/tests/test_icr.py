"""Fixture test for icr() (Requirements 8.3, 8.4, 17.5).

One test per case in data/fixtures/icr_cases.json. A missing, unparseable or empty
fixture file fails the suite; it is never skipped.
"""

from __future__ import annotations

import json
from typing import Any

import pytest

from pipeline.config import REPO_ROOT
from pipeline.metrics import icr

FIXTURE_PATH = REPO_ROOT / "data" / "fixtures" / "icr_cases.json"


def _load_cases() -> tuple[list[dict[str, Any]], str | None]:
    """Return (cases, error). error is None when the file loaded with at least one case."""
    try:
        doc = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        return [], f"cannot load {FIXTURE_PATH}: {exc!r}"
    cases = doc.get("cases") if isinstance(doc, dict) else None
    if not isinstance(cases, list) or not cases:
        return [], f"{FIXTURE_PATH} has no cases"
    for i, case in enumerate(cases):
        if not isinstance(case, dict) or not {"ebit", "interest", "expected"} <= case.keys():
            return [], f"{FIXTURE_PATH} case {i} lacks ebit, interest or expected"
    return cases, None


CASES, LOAD_ERROR = _load_cases()


def test_fixture_file_loads_with_cases() -> None:
    assert LOAD_ERROR is None, LOAD_ERROR
    assert len(CASES) > 0


@pytest.mark.parametrize(
    "case",
    CASES,
    ids=[f"{i}-{c.get('note', 'case')}" for i, c in enumerate(CASES)],
)
def test_icr_fixture_case(case: dict[str, Any]) -> None:
    result = icr(case["ebit"], case["interest"])
    expected = case["expected"]
    if expected is None:
        assert result is None
    else:
        assert result is not None
        assert result == expected  # exact float equality
