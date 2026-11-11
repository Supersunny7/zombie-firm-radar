# Tech Stack

## Current state
The repo has no code, build system, or dependencies yet (only README.md and LICENSE). No stack has been chosen. Ask the user, or follow any stack they specify, before scaffolding. Once one is chosen, update this file.

## Likely needs
- Data ingestion from SEC EDGAR (e.g. the `data.sec.gov` XBRL APIs such as company facts and submissions)
- A data processing step to compute zombie-firm metrics
- A web front end for the graveyard visualization

## Conventions
- Pin dependency versions exactly.
- Keep secrets and API keys out of the repo; use environment variables.
- Cache raw EDGAR responses locally to avoid repeat requests, and keep cached data out of git.
- Run commands in PowerShell (Windows). Use `;` rather than `&&` to chain commands.

## Common commands
None yet. Add install, build, test, and dev commands here once tooling exists.
