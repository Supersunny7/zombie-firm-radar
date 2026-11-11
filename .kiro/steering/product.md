# Product

Zombie Firm Radar is a Kiroween 2026 project: a "haunted graveyard" visualization of US zombie firms, built from SEC EDGAR data and developed with Kiro.

## Key concepts
- Zombie firm: a company that survives without healthy earnings, typically with weak interest coverage and persistent debt burden. Confirm the exact definition and thresholds with the user before hardcoding them.
- Data source: SEC EDGAR (public filings). Respect SEC fair-access rules: send a descriptive User-Agent and stay under the rate limit (10 requests/second).
- Presentation: Halloween/graveyard theme (tombstones, ghosts, spooky styling) layered over real financial data.

## Guidelines
- Financial figures must stay accurate and traceable to filings. Theming must never alter or obscure the data.
- Present results as analysis of public data, not investment advice.
- The project is early stage. Check the repo for what actually exists before assuming features.
