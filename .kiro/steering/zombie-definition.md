---
inclusion: always
---

# Zombie Definition

## DEFINITION (OECD / BIS literature)

- Interest coverage ratio: ICR = EBIT / InterestExpense, per fiscal year.
- Zombie: firm age >= 10 years AND ICR < 1 in each of the 3 most recent consecutive fiscal years.
- Firm age proxy: years since the firm's first filing on SEC EDGAR. This is an approximation; the UI must say so.

- Yearly flag (phase 1 panel only, internal analysis, not a contract field): for a fiscal year Y, `zombie_flag(Y)` is true when the firm's age at Y is >= 10 (whole years from first filing date to the fiscal year end of Y) and icr() is non-null and < 1 in Y, Y-1 and Y-2. If any of the three icr() values is null, the flag is false.

## STATUS (exactly one per firm)

- "zombie": meets the definition above.
- "endangered": ICR < 1 in the most recent year, or in 2 of the last 3 years, but not a zombie.
- "healthy": ICR >= 1 in the most recent year and not endangered.
- "insufficient_data": fewer than 3 consecutive fiscal years with both EBIT and InterestExpense available.

## EDGE CASES

- EBIT source priority: us-gaap OperatingIncomeLoss; if missing, IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest + InterestExpense. Record which tag was used.
- InterestExpense missing, zero or negative in a year: ICR for that year is null; that year breaks the consecutive streak.
- Refinement (pipeline): interest expense reported as exactly 0 in the latest year gives status "healthy" with reason "No interest expense in FY{year}". Only missing interest in the latest year gives "insufficient_data". icr() still returns null for zero interest, so a zero-interest year still breaks the consecutive streak.
- Negative EBIT is allowed and gives a negative ICR (counts as < 1).
- Use annual 10-K values only (fp = FY). Ignore 10-Q values.
- Every status must come with human-readable reasons, e.g. "ICR below 1 in FY2022, FY2023, FY2024".
- One shared icr() function is used by the pipeline logic, the graveyard and the rescue-engine (see rescue-rules.md); never reimplement it.

## RATE SHOCK MODEL (simplified, must be disclosed in the UI)

- implied_rate = InterestExpense / TotalDebt (most recent year).
- Shocked interest = TotalDebt * (implied_rate + delta_r), where delta_r is the rate change in decimal (0.02 = +2 percentage points), delta_r >= 0.
- Assumes all debt reprices immediately. If TotalDebt is missing or implied_rate <= 0, the firm is excluded from the shock and flagged (shock_eligible = false).

## PROPERTIES THAT MUST ALWAYS HOLD (use these for property-based tests)

1. With positive InterestExpense, higher EBIT never lowers ICR.
2. For delta_r >= 0 and EBIT >= 0, no firm's shocked ICR is higher than its original ICR. For every firm, a rate rise never improves its status (healthy > endangered > zombie).
3. delta_r = 0 leaves every result unchanged.
4. The number of zombies never decreases as delta_r increases.
5. Every firm classified "zombie" has age >= 10 and three consecutive ICR values < 1.
