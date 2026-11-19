"""Property test for the Compustat fiscal-year mapping.

Feature: data-pipeline, Property 3: Compustat fiscal-year mapping
**Validates: Requirements 6.3**
"""
from __future__ import annotations

from datetime import date

import pytest
from hypothesis import given
from hypothesis import strategies as st

from pipeline.facts import compustat_fy


@given(st.dates(min_value=date(1900, 1, 1), max_value=date(2100, 12, 31)))
def test_compustat_fy_mapping(end: date) -> None:
    expected = end.year - 1 if end.month <= 5 else end.year
    assert compustat_fy(end) == expected


@pytest.mark.parametrize(
    ("end", "fy"),
    [
        (date(2025, 1, 31), 2024),
        (date(2024, 5, 31), 2023),
        (date(2024, 6, 1), 2024),
        (date(2024, 6, 30), 2024),
        (date(2024, 12, 31), 2024),
        (date(2024, 2, 29), 2023),
    ],
)
def test_compustat_fy_examples(end: date, fy: int) -> None:
    assert compustat_fy(end) == fy
