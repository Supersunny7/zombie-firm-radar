---
inclusion: always
---

# Rescue Rules

DEFINITION OF A RESCUE

- A firm is rescued if, after the treatment and under the current rate shock, its projected interest coverage ratio (ICR = EBIT / interest expense) is >= 1 in each of the next 3 fiscal years. This mirrors the zombie definition (ICR < 1 for 3 straight years) in zombie-definition.md and must reuse the same icr() function.

INPUTS (latest fiscal year from firms/{cik}.json): revenue R, EBIT E, interest expense I, total debt D, total assets A, equity Q; implied rate r = I / D; 10-year Treasury b from macro.json; rate shock delta from the graveyard slider (decimal, 0 to 0.05); rescue_inputs (margin_mean, margin_change_sd, revenue_growth_median). Money inputs (R, E, I, D, A, Q) must be 0 or at least 1 USD in absolute value; a sub-dollar amount makes the firm not rescuable.

TOOLS (the player picks up to 3; v1 ships the first four)

Tools are always applied in the fixed Canonical_Order (cut_costs, sell_assets, debt_for_equity, refinance), whatever order the player clicked.

1. cut_costs c in [0, 0.08]: E' = E + c * (R - E). Revenue growth each projected year is reduced by 0.5 * c. Workers pain += (c / 0.08) * 50.

2. sell_assets s in [0, 0.30]: sale price = s * A * recovery, recovery drawn per path uniformly in [0.6, 0.8]; proceeds repay debt (debt cannot go below 0). R and E are both multiplied by (1 - s). Workers pain += (s / 0.30) * 35.

3. debt_for_equity w in [0, 0.60]: converted = w * D (after asset sales); D decreases by converted. Old shareholders keep max(Q,0) / (max(Q,0) + converted); shareholders pain += (1 - keep) * 100; creditors pain += w * 60.

4. refinance (on/off): ALWAYS evaluated last, whatever order the player clicked. icr_pre = E' / (D' * (r + delta)). Credit spread: icr_pre < 1 -> 0.09; 1 to < 1.5 -> 0.06; 1.5 to < 3 -> 0.035; >= 3 -> 0.02. New rate = b + delta + spread. Applies only if 1.02 * new rate < r + delta, i.e. only when it lowers the annual interest cost after the 2% fee; then D' *= 1.02. The projected annual interest after refinance is computed as D'_preFee * (1.02 * new rate) (same value as D' * 1.02 at the new rate, written this way so the comparison and the interest use the same number); the UI shows debt D'_preFee * 1.02 and rate = new rate. Otherwise it has no effect and the UI explains why.

5. issue_equity k in [0, 0.25] (v2): only if Q > 0; raise = k * D; D decreases by raise; dilution = raise / (Q + raise); shareholders pain += dilution * 100.

6. chapter_11 (v2): only if current ICR < 0.5 or Q < 0; debt haircut h drawn per path uniformly in [0.30, 0.60]; rate resets to b + delta + spread(post); shareholders pain = 100; creditors pain += h * 100; if year-1 EBIT <= 0 the path fails.

7. liquidate: ends the game; creditor recovery = min(1, 0.5 * A / D); shown as cents on the dollar.

Pain meters are capped at 100 each.

PROJECTION (3 years, Monte Carlo)

- Start margin m0 = E' / R'. Each year t = 1..3: m_t = m_{t-1} + kappa * (margin_mean - m_{t-1}) + sigma * eps_t, eps_t ~ N(0, 1).

- kappa = 0.3 by default, clamped to [0.1, 0.6]; sigma = margin_change_sd clamped to [0.01, 0.08]; g = revenue_growth_median clamped to [-0.15, 0.15].

- R_t = R_{t-1} * (1 + g - 0.5 * c). EBIT_t = m_t * R_t. ICR_t = EBIT_t / interest, where interest = D' * (r + delta) without refinance, or D'_preFee * (1.02 * new rate) when refinance applied (see tool 4). Debt stays constant over the 3 years (simplification; the UI must say so).

- Run 1,000 paths with a seeded PRNG. Survival odds = share of paths where ICR_t >= 1 for t = 1, 2, 3. Also return the median ICR per year.

- Typed errors, not clamping: an invalid delta, tool parameter, path count or seed returns a typed error. Only sigma, g and the outputs are clamped.

- Each path uses a fixed Random_Block of 6 uniforms, drawn in this order: recovery, haircut, eps1, eps2, eps3. All 6 are drawn for every path, whatever the treatment.

- The real outcome: when the player pulls the switch, draw ONE path with seed = hash(cik, treatment, ISO date). Same firm + same treatment + same day = same outcome.

- `seedFrom` uses the UTC date in YYYY-MM-DD form. Same-day determinism holds within one JavaScript engine; one-ulp differences in Math.log, Math.cos and Math.sin across browsers are accepted for v1.

- Failure reason: first year with ICR < 1, as "Year {t}: operating margin {m}%, coverage {icr}. {name} stays undead." plus a hint: the smallest extra cost cut that would have kept that year >= 1, if one exists within the allowed range. Search: scan upward in steps of 0.1 percentage point from the chosen cut (or 0) while the total cut is <= 0.08, rerunning the full treatment pipeline (sell_assets with the path recovery, debt_for_equity, refinance re-evaluated) on the same random path, and stop at the first step where that year reaches ICR >= 1. No bisection: the year-t ICR is not monotone in the cut, because the cut also lowers revenue growth by 0.5 * c.

- Score = (rescued ? 1 : 0) * survival_odds * (1 - (workers + shareholders + creditors) / 300) * 100.

- Diagnosis (before any treatment): needed EBIT increase = D*(r+delta)/E - 1; needed debt cut = 1 - E/((r+delta)*D); needed rate = E/D.

PROPERTIES THAT MUST ALWAYS HOLD (property-based tests with fast-check)

1. On the same random path, a treatment that only reduces debt (debt_for_equity; not sell_assets, which also shrinks R and E) never lowers the projected ICR of any year with EBIT >= 0, and a covered year (ICR >= 1 or debt-free) never becomes uncovered. Years with negative EBIT are excluded from the first part: less interest makes a negative ICR more negative (-10/100 = -0.1 becomes -10/50 = -0.2).

2. With the same random numbers, on firms with a realistic operating margin (E/R in [-0.3, 0.3], margin_mean in [-0.2, 0.3]), a larger cost cut never gives a lower year-1 EBIT, nor a lower year-1 ICR when year-1 EBIT >= 0. Trade-off: at very high margins the 0.5 * c growth penalty can outweigh the cut (E/R = 0.9, margin_mean = 0.9, eps = 0, g = 0.01: year-1 EBIT 0.909 R at c = 0 vs 0.878432 R at c = 0.08); a named unit test documents this.

3. With no treatment and delta = 0, the year-0 ICR equals the firm's current ICR.

4. A higher rate shock never gives higher survival odds (same seed).

5. Liquidation recovery is always within [0, 1].

6. The same seed always gives the same outcome.

7. Refinance changes the rate only when 1.02 * new rate is lower than the old rate (r + delta), so it never raises annual interest cost.

8. Survival odds are always within [0, 1] and pain meters within [0, 100].
