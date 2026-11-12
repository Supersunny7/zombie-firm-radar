# Implementation Plan: Asset Pipeline (Phase 1, Scouting)

## Overview

This plan lists Phase 1 (scouting) only. Phase 1 is an agent research workflow: no application code is written, and `web/public/assets`, `web/public/assets/manifest.json`, `CREDITS.md` and `tools/fetch-assets.mjs` stay untouched. Phase 2 tasks (download, convert, budgets, manifest, credits, auditor loop) will be added to this file after the user's picks, and not before (Requirement 13.3, 13.4).

Property-based tests do not apply to Phase 1 (the design scopes the 16 properties to the Phase 2 script), so there are no optional test tasks. Verification is by the review checks in task 3.2.

Working rules for every task:

- Shell commands are PowerShell, chained with `;`, never `&&`.
- Verify each license on the Candidate's own page and record the exact license name and the page URL. Reject forbidden, unverifiable or non-allow-listed licenses, CC BY without a findable author, and unknown file sizes (Requirements 10.6 to 10.11).
- Allowed sources only: Poly Haven, ambientCG, Kenney, Quaternius, Sketchfab (downloadable, CC BY or CC0), Freesound (CC0), OpenGameArt (CC0). Rocketbox only as the Category 5 Fallback.
- 2 to 3 Candidates per Sub_Item, Fallbacks first, packs count once, about 35 Candidates in total and never more than 38 (Requirement 2).
- Screenshots go to `reference/candidates/<category>/<name>.png`, names match `^[a-z0-9-]+\.png$`, each under 1 MB (retake at 1280x720, then 1024x576, if larger).
- Each category task writes its recorded data to `reference/candidates/notes/<category>.md` (one table of rows with the Requirement 12 columns). Task 3.1 merges these notes into the final README.
- Git safety: stage only files inside the Owned_Paths (`tools/`, `web/public/assets`, `reference/candidates`, `CREDITS.md`, `.gitignore`, `.kiro/specs/asset-pipeline`), naming each file or folder explicitly. Never run `git add -A`, `git add .`, `git add --all`, `git add -f`, `git stash`, `git reset`, `git checkout` or `git clean`. Leave `web/src/engine`, `web/src/state` and `/pipeline` untouched. Commit only when the user asks; the user has asked for one commit of `reference/candidates` after the README is written (task 3.3).

## Tasks

- [ ] 1. Preparation
  - [ ] 1.1 Pull the repository and read project context
    - Run `git pull` as the very first command, before any read or write. If it exits non-zero or reports a conflict, stop, report the output, change nothing, and do not run reset, stash or checkout
    - Read the five steering files `asset-licensing.md`, `tech.md`, `structure.md`, `kiro-workflow.md` and `product.md` from `.kiro/steering/`; stop and name any that is missing
    - Read every image under `/reference` (including `graveyard/`, `lab/`, `progress/`) and `reference/README.md`. If there are no images or the README has no listed qualities, continue and report it
    - Write a short summary of the visual targets (near-black night, one warm flashlight pool, cold moon rim light, surgical lamp pool in a dark crypt) to use for Night_Read_Rating
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 10.4_

  - [ ] 1.2 Set up git-ignore rules and candidate folders
    - Add these four entries to `.gitignore` in this order, plus one entry for local tool output, and nothing that ignores `.kiro`: `tools/cache/*`, `!tools/cache/manual/`, `tools/cache/manual/*`, `!tools/cache/manual/README.md`
    - Create the folders `reference/candidates/01-ground-stone`, `02-night-sky`, `03-graveyard-props`, `04-lab-props`, `05-avatars`, `06-zombie-hands`, `07-sound` and `reference/candidates/notes` (they fill up with screenshots and notes in later tasks)
    - Do not create any file under `tools/cache/manual` now; `tools/cache/manual/README.md` belongs to Phase 2
    - Verify with `git check-ignore -v`: `tools/cache/manual/README.md` is NOT ignored (exit code 1), `tools/cache/downloads/example/file.bin` is ignored, `tools/cache/manual/example/file.fbx` is ignored
    - Never use `git add -f` or `git add --force`
    - _Requirements: 15.2, 15.3, 15.4, 21.7_

- [ ] 2. Scout the seven categories
  - [ ] 2.1 Category 1: ground and stone textures
    - Fallbacks first: Poly Haven `lichen_rock`, `mossy_rock`, `brown_mud_leaves_01`, `excavated_soil_wall`
    - Find 2-3 Candidates for at least one ground Sub_Item and at least one stone Sub_Item, with at least 2 each overall; record whether PBR maps (color, normal, roughness) are provided
    - Verify license, author and size on each Candidate's page; estimate WebP size
    - Use the Playwright MCP server to save screenshots to `reference/candidates/01-ground-stone/<name>.png`
    - Record all columns plus Night_Read_Rating 1-3 with a one-line reason (roughness, albedo, surface detail) in `reference/candidates/notes/01-ground-stone.md`
    - _Requirements: 2.1, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 10.1, 10.2, 10.3, 10.5, 10.7, 10.10, 11.1, 11.2, 11.4, 11.5_

  - [ ] 2.2 Category 2: night sky HDRIs
    - Fallbacks first: Poly Haven `kloppenheim_02_puresky`, `rogland_moonlit_night`
    - Find Candidates for a background sky and for environment lighting; record whether 1k and 2k versions exist and the role of each
    - Verify license and size; save screenshots to `reference/candidates/02-night-sky/<name>.png`
    - Record data and Night_Read_Rating with reason in `reference/candidates/notes/02-night-sky.md`
    - _Requirements: 2.1, 2.4, 2.5, 4.1, 4.2, 10.2, 10.7, 11.1, 11.2_

  - [ ] 2.3 Category 3: graveyard props
    - Sub_Items: gate, statue, dead trees, stumps, lantern, fence, broken stones
    - Fallbacks first: Poly Haven `large_iron_gate`, `gothic_statue`, `dead_tree_trunk`, `tree_stump_01`, `Lantern_01`
    - Prefer packs that cover several Sub_Items in one style (count once); record the polygon count of each Candidate and exclude stylized or low-poly ones
    - Verify license and size; save screenshots to `reference/candidates/03-graveyard-props/<name>.png`
    - Record data and Night_Read_Rating with reason in `reference/candidates/notes/03-graveyard-props.md`
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 5.1, 5.2, 5.3, 10.1, 10.2, 10.5, 10.7, 11.1, 11.2_

  - [ ] 2.4 Category 4: lab props
    - Sub_Items: operating table, surgical lamp, IV stand, medical cart, instruments. No Fallbacks
    - Present any single pack covering three or more Sub_Items in one consistent style as its own row
    - Verify license and size; save screenshots to `reference/candidates/04-lab-props/<name>.png`
    - Record data and Night_Read_Rating with reason (judge against the surgical-lamp pool in `reference/lab`) in `reference/candidates/notes/04-lab-props.md`
    - _Requirements: 2.1, 2.2, 2.5, 6.1, 6.2, 6.3, 10.1, 10.2, 10.7, 11.1, 11.2_

  - [ ] 2.5 Category 5: patient avatars and animations
    - Fallbacks first: Microsoft Rocketbox `Business_Male_02` (`github.com/microsoft/microsoft-rocketbox`, `Assets/Avatars/Professions/Business_Male_02`) and animations `m_walk_neutral_01`, `m_walk_drunk`, `m_walk_bruised`
    - Search for further realistic rigged avatars licensed MIT, CC0 or CC BY; prefer those sharing the Rocketbox skeleton or easy to retarget
    - Record for each Candidate the skeleton type and a retargeting effort estimate (none, low, medium, high) with one sentence of justification
    - Verify license and size; save screenshots to `reference/candidates/05-avatars/<name>.png`
    - Record data and Night_Read_Rating with reason in `reference/candidates/notes/05-avatars.md`
    - _Requirements: 2.1, 2.4, 2.5, 7.1, 7.2, 7.3, 7.4, 7.5, 10.1, 10.2, 10.7, 10.10, 11.1, 11.2_

  - [ ] 2.6 Category 6: zombie and grabbing-hand scans (find only)
    - Search Sketchfab for downloadable CC BY or CC0 zombie and grabbing-hand scans
    - Record author name, author profile link and model page link for each; mark every row "Manual pick"
    - Do not download any Sketchfab file and do not create files under `tools/cache`
    - Verify license on the model page; save screenshots to `reference/candidates/06-zombie-hands/<name>.png`
    - Record data and Night_Read_Rating with reason in `reference/candidates/notes/06-zombie-hands.md`
    - _Requirements: 2.1, 2.5, 8.1, 8.2, 8.3, 8.4, 10.7, 10.10, 10.11, 11.1, 11.2_

  - [ ] 2.7 Category 7: sound effects
    - Sub_Items: ECG beep, ECG flatline, heartbeat, low drone, iron gate, electric zap, wind. No Fallbacks
    - Only Freesound or OpenGameArt Candidates licensed CC0; record duration and file format
    - Verify license on each sound page; save screenshots to `reference/candidates/07-sound/<name>.png`
    - Write `n/a` for Night_Read_Rating and its reason on every row; record data in `reference/candidates/notes/07-sound.md`
    - After this task count distinct Candidates across all categories; if above 35 trim lowest-ranked third Candidates (never below 2 per Sub_Item) until at most 38, and delete the screenshots and notes rows of trimmed Candidates
    - _Requirements: 2.1, 2.3, 2.5, 2.7, 9.1, 9.2, 9.3, 9.4, 10.7, 12.3_

- [ ] 3. README, validation and commit
  - [ ] 3.1 Write `reference/candidates/README.md`
    - Start with "Status: waiting for picks. Nothing has been downloaded." and a short legend (night-read scale, "Fallback", "Manual pick", size basis)
    - Add the comparison with `/reference`: one short paragraph per reference image (link it), then how the Candidates compare
    - One table per Category, grouped by Sub_Item, built from `reference/candidates/notes/*.md`; columns: name, preview link, source URL, author, license, file size, poly count, night-read rating, night-read reason, why it fits, plus the category extras from the design (PBR maps, 1k/2k and role, skeleton and retargeting effort, duration and format, author profile link and "Manual pick")
    - Fallback rows first and labelled "(Fallback)"; use `n/a` where a column does not apply (always for Category 7 ratings); preview links are relative paths to existing PNGs, or `preview unavailable: <reason>`
    - Add a "Sub_Items with no suitable candidate" table (with sources searched) and a Totals line (distinct Candidates, limit 35, hard max 38)
    - Delete `reference/candidates/notes` once its content is merged
    - _Requirements: 2.3, 2.6, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [ ] 3.2 Validate the README and the candidate files
    - Check every preview link resolves to an existing PNG, each PNG is under 1 MB (1,048,576 bytes) and its name matches `^[a-z0-9-]+\.png$`
    - Check every Sub_Item table has 2-3 rows (or is listed as having no suitable candidate), every row has a non-empty license and source URL, CC BY rows have an author, Category 6 rows say "Manual pick", Category 7 ratings are `n/a`
    - Check no license is NonCommercial, SA/ND, Mixamo, paid marketplace or otherwise off the allow-list, and the distinct Candidate total is at most 38
    - Check `git status --short web/public/assets tools/fetch-assets.mjs CREDITS.md` shows no change, and that `web/src/engine`, `web/src/state` and `/pipeline` are untouched
    - Fix any finding in the README or screenshots and re-check
    - _Requirements: 2.3, 10.7, 10.8, 10.9, 10.11, 11.4, 11.5, 12.5, 13.2, 21.3, 21.8_

  - [ ] 3.3 Commit the candidates (requested by the user)
    - Run `git status --short`; if staged files exist outside the Owned_Paths, unstage only those with `git restore --staged <path>` and report each path
    - Stage explicitly: `git add .gitignore`, `git add reference/candidates`, `git add .kiro/specs/asset-pipeline`; never `-A`, `.` or `-f`
    - Commit with a conventional message of at most 72 characters, for example `docs(asset-pipeline): add phase 1 asset candidates`
    - Do not push unless the user asks
    - _Requirements: 21.1, 21.2, 21.4, 21.5, 21.6_

- [ ] 4. Stop gate - wait for the user's picks
  - Report the totals, the list of files created, and that `web/public/assets`, `manifest.json`, `CREDITS.md` and `tools/fetch-assets.mjs` are unchanged
  - Stop and wait. Do not start Phase 2. When the user sends picks and asks for Phase 2, add the Phase 2 tasks to this file first
  - _Requirements: 13.1, 13.2, 13.3, 13.4_

## Notes

- Phase 2 tasks are added only after the user's picks.
- No optional (`*`) tasks: property-based and unit tests belong to Phase 2 helper modules.
- Category tasks run one after another because they share a single Playwright browser session.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["2.2"] },
    { "id": 4, "tasks": ["2.3"] },
    { "id": 5, "tasks": ["2.4"] },
    { "id": 6, "tasks": ["2.5"] },
    { "id": 7, "tasks": ["2.6"] },
    { "id": 8, "tasks": ["2.7"] },
    { "id": 9, "tasks": ["3.1"] },
    { "id": 10, "tasks": ["3.2"] },
    { "id": 11, "tasks": ["3.3"] }
  ]
}
```
