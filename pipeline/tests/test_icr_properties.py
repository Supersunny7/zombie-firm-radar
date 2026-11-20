"""Property test for icr() totality and exactness.

Feature: data-pipeline, Property 1: icr() is total and exact.

**Validates: Requirements 8.2, 8.5, 8.6, 8.7**
"""

from __future__ import annotations

import math
from decimal import Decimal
from fractions import Fraction

from hypothesis import given
from hypothesis import strategies as st

from pipeline.metrics import icr

_any_float = st.floats(allow_nan=True, allow_infinity=True)
_finite_float = st.floats(allow_nan=False, allow_infinity=False)
_finite_int = st.integers(min_value=-(10**30), max_value=10**30)
_finite_number = st.one_of(_finite_int, _finite_float)

_arbitrary = st.one_of(
    st.none(),
    st.booleans(),
    st.text(),
    st.binary(),
    _any_float,
    st.integers(),
    st.integers(min_value=-(10**400), max_value=10**400),
    st.decimals(allow_nan=True, allow_infinity=True),
    st.fractions(),
    st.lists(st.integers(), max_size=3),
    st.tuples(st.integers()),
    st.dictionaries(st.text(max_size=3), st.integers(), max_size=2),
    st.builds(object),
    st.just(Decimal("1")),
    st.just(Fraction(1, 2)),
    st.just(complex(1, 1)),
)


def _is_plain_finite_number(value: object) -> bool:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return False
    try:
        return math.isfinite(value)
    except OverflowError:
        return False


@given(ebit=_arbitrary, interest=_arbitrary)
def test_icr_is_total_and_none_for_invalid(ebit: object, interest: object) -> None:
    # (a) never raises; (b) None for any invalid input or interest <= 0.
    result = icr(ebit, interest)
    assert result is None or isinstance(result, float)
    if not _is_plain_finite_number(ebit) or not _is_plain_finite_number(interest):
        assert result is None
    elif interest <= 0:  # type: ignore[operator]
        assert result is None


@given(ebit=_finite_number, interest=_finite_number)
def test_icr_exact_for_finite_numbers(ebit: int | float, interest: int | float) -> None:
    result = icr(ebit, interest)
    if interest <= 0:
        assert result is None
        return
    try:
        expected = ebit / interest
    except OverflowError:
        assert result is None
        return
    if math.isfinite(expected):
        assert result == expected  # exact float equality
    else:
        assert result is None


# --- Property 2 ---------------------------------------------------------------
# Feature: data-pipeline, Property 2: Higher EBIT never lowers ICR
# (zombie-definition property 1).
#
# **Validates: Requirements 8.8**

_positive_interest = st.floats(
    min_value=0.0, allow_nan=False, allow_infinity=False, exclude_min=True
)


@given(
    ebit_a=_finite_float,
    ebit_b=_finite_float,
    interest=_positive_interest,
)
def test_higher_ebit_never_lowers_icr(ebit_a: float, ebit_b: float, interest: float) -> None:
    low, high = sorted((ebit_a, ebit_b))
    icr_low = icr(low, interest)
    icr_high = icr(high, interest)
    # icr() returns None only when the quotient overflows to +/-inf; such pairs
    # cannot be compared, so the ordering is asserted whenever both are defined.
    if icr_low is None or icr_high is None:
        return
    assert icr_low <= icr_high
