---
inclusion: always
---

# Kiro Workflow

- Every feature larger than one file starts as a spec in `.kiro/specs/`. Small fixes use the Bug Fix workflow. Never implement outside the current spec's tasks without asking.
- Before using any API of `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `three-custom-shader-material` or `@theatre/core`, look it up with the context7 MCP server. Do not rely on memory for these libraries.
- After any change under `web/src/scenes/**` or `web/src/fx/**`, say which reference screenshot in `/reference` it should match and offer to verify with the scene-critic agent.
- Never edit `/pipeline` or `/data` generation code; those belong to the partner.
- Never change `data-contract.md` without updating the JSON Schemas and TypeScript types in the same change.
- Never add an asset without a `CREDITS.md` row (see `asset-licensing.md`).
- Commit messages use conventional commits (`feat`, `fix`, `test`, `chore`, `docs`) with the spec name in the scope, e.g. `feat(rescue-engine): add refinance spread table`.
- Never put secrets, tokens or keys in the repository.
- Before starting work, run `git pull`. The repository is shared with the partner and a documentation assistant that adds files under `docs/` and `reference/`.
