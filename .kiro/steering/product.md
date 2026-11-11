# Product

Zombie Firm Radar is a Kiroween 2026 entry (category: Costume Contest). It finds "zombie firms" among US public companies in SEC EDGAR XBRL filings and shows them as a realistic night-time graveyard filmed by a security camera. Spooky elements must carry meaning: every visual maps to a financial fact.

Underneath the horror skin it is a reverse stress test: "what would it take to bring this company back?"

## Zombie definition
Interest coverage below 1 for 3 straight years. Exact rules and thresholds live in `zombie-definition.md`; follow that file, do not hardcode variants.

## Users
Retail investors, financial journalists, economics and finance students.

## Core loop
1. Graveyard: one tombstone per firm. An interest-rate slider makes new zombies claw out of their graves.
2. Capture: the player drags a zombie out of the ground.
3. Lab: the firm lies on an operating table. The player picks up to 3 real restructuring tools and sees the effect on the body and on the vital signs.
   - v1 tools: cut costs, sell assets, debt-for-equity swap, refinance.
   - Later: issue equity, Chapter 11.
4. Outcome: pull the switch. A Monte Carlo draw decides the result:
   - Revived: projected interest coverage >= 1 in each of the next 3 years.
   - Stays undead.
   - Liquidated.
5. The result is written back onto the firm's tombstone.

## Intensity modes
- Lights off: full horror, blood, one jump scare per outcome.
- Lights on: no blood, no jump scares, brighter. Doubles as the accessibility mode.

## Guidelines
- Financial figures must stay accurate and traceable to filings. Theming must never alter or obscure the data.
- The UI always shows: "Data: SEC EDGAR. Not investment advice."
- Phrase all rescue results as hypotheticals ("what it would take"), never as recommendations.
- Out of scope: live prices, trading advice, accounts.
- Respect SEC fair-access rules: descriptive User-Agent, max 10 requests per second.
