---
inclusion: always
---

# Rescue Rules

DEFINITION OF A RESCUE

- A firm is rescued if, after the treatment and under the current rate shock, its projected interest coverage ratio (ICR = EBIT / interest expense) is >= 1 in each of the next 3 fiscal years. This mirrors the zombie definition (ICR < 1 for 3 straight years) in zombie-definition.md and must reuse the same icr() function.

INPUTS (latest fiscal year from firms/{cik}.json): revenue R, EBIT E, interest expense I, total debt D, total assets A, equity Q; implied rate r = I / D; 10-year Treasury b from macro.json; rate shock delta from the graveyard slider (decimal, 0 to 0.05); rescue_inputs (margin_mean, margin_change_sd, revenue_growth_median).

TOOLS (the player picks up to 3; v1 ships the first four)

1. cut_costs c in [0, 0.08]: E' = E + c * (R - E). Revenue growth each projected year is reduced by 0.5 * c. Workers pain += (c / 0.08) * 50.

2. sell_assets s in [0, 0.30]: sale price = s * A * recovery, recovery drawn per path uniformly in [0.6, 0.8]; proceeds repay debt (debt cannot go below 0). R and E are both multiplied by (1 - s). Workers pain += (s / 0.30) * 35.

3. debt_for_equity w in [0, 0.60]: converted = w * D (after asset sales); D decreases by converted. Old shareholders keep max(Q,0) / (max(Q,0) + converted); shareholders pain += (1 - keep) * 100; creditors pain += w * 60.

4. refinance (on/off): ALWAYS evaluated last, whatever order the player clicked. icr_pre = E' / (D' * (r + delta)). Credit spread: icr_pre < 1 -> 0.09; 1 to < 1.5 -> 0.06; 1.5 to < 3 -> 0.035; >= 3 -> 0.02. New rate = b + delta + spread. Applies only if new rate < r + delta; then D' *= 1.02 (2% fee). Otherwise it has no effect and the UI explains why.

5. issue_equity k in [0, 0.25] (v2): only if Q > 0; raise = k * D; D decreases by raise; dilution = raise / (Q + raise); shareholders pain += dilution * 100.

6. chapter_11 (v2): only if current ICR < 0.5 or Q < 0; debt haircut h drawn per path uniformly in [0.30, 0.60]; rate resets to b + delta + spread(post); shareholders pain = 100; creditors pain += h * 100; if year-1 EBIT <= 0 the path fails.

7. liquidate: ends the game; creditor recovery = min(1, 0.5 * A / D); shown as cents on the dollar.

Pain meters are capped at 100 each.

PROJECTION (3 years, Monte Carlo)

- Start margin m0 = E' / R'. Each year t = 1..3: m_t = m_{t-1} + kappa * (margin_mean - m_{t-1}) + sigma * eps_t, eps_t ~ N(0, 1).

- kappa = 0.3 by default, clamped to [0.1, 0.6]; sigma = margin_change_sd clamped to [0.01, 0.08]; g = revenue_growth_median clamped to [-0.15, 0.15].

- R_t = R_{t-1} * (1 + g - 0.5 * c). EBIT_t = m_t * R_t. ICR_t = EBIT_t / (D' * r'), where r' is the rate after the shock and after refinance if it applied. Debt stays constant over the 3 years (simplification; the UI must say so).

- Run 1,000 paths with a seeded PRNG. Survival odds = share of paths where ICR_t >= 1 for t = 1, 2, 3. Also return the median ICR per year.

- The real outcome: when the player pulls the switch, draw ONE path with seed = hash(cik, treatment, ISO date). Same firm + same treatment + same day = same outcome.

- Failure reason: first year with ICR < 1, as "Year {t}: operating margin {m}%, coverage {icr}. {name} stays undead." plus a hint: the smallest extra cost cut that would have kept that year >= 1, if one exists within the allowed range.

- Score = (rescued ? 1 : 0) * survival_odds * (1 - (workers + shareholders + creditors) / 300) * 100.

- Diagnosis (before any treatment): needed EBIT increase = D*(r+delta)/E - 1; needed debt cut = 1 - E/((r+delta)*D); needed rate = E/D.

PROPERTIES THAT MUST ALWAYS HOLD (property-based tests with fast-check)

1. Any treatment that only reduces debt never lowers the projected ICR of any year on the same random path.

2. With the same random numbers, a larger cost cut never gives a lower year-1 ICR.

3. With no treatment and delta = 0, the year-0 ICR equals the firm's current ICR.

4. A higher rate shock never gives higher survival odds (same seed).

5. Liquidation recovery is always within [0, 1].

6. The same seed always gives the same outcome.

7. Refinance changes the rate only when the new rate is lower than the old one.

8. Survival odds are always within [0, 1] and pain meters within [0, 100].
