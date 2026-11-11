# zombie-firm-radar
Kiroween 2026: a haunted graveyard of US zombie firms from SEC EDGAR data. Built with Kiro.

## Kiro hooks

- engine-tests (File Save, `web/src/engine/**`): runs the rescue-engine Vitest suite; skips if `web/` is not set up.
- data-schema-check (File Save, `data/**/*.json`): validates the saved file against its schema in `data/schema` with ajv (`tools/validate-data.mjs`); skips if ajv is missing.
- asset-credits-check (File Create, `web/public/assets/**`): asks the asset-auditor agent to check the new file and propose the missing `CREDITS.md` row.
- scene-check (Manual, steering file `#scene-check`): asks the scene-critic agent to screenshot a named scene and list the top 5 differences from `/reference`.
- devlog (Post Task Execution): appends a one-line entry (date, spec, task id, summary, files) to `DEVLOG.md`.
- guard-ownership (Pre Tool Use, write and shell tools): asks first before touching `pipeline/`, adding `.kiro` to `.gitignore`, or writing a `.env` file.
