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

- [x] 1. Preparation
  - [x] 1.1 Pull the repository and read project context
    - Run `git pull` as the very first command, before any read or write. If it exits non-zero or reports a conflict, stop, report the output, change nothing, and do not run reset, stash or checkout
    - Read the five steering files `asset-licensing.md`, `tech.md`, `structure.md`, `kiro-workflow.md` and `product.md` from `.kiro/steering/`; stop and name any that is missing
    - Read every image under `/reference` (including `graveyard/`, `lab/`, `progress/`) and `reference/README.md`. If there are no images or the README has no listed qualities, continue and report it
    - Write a short summary of the visual targets (near-black night, one warm flashlight pool, cold moon rim light, surgical lamp pool in a dark crypt) to use for Night_Read_Rating
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 10.4_

  - [x] 1.2 Set up git-ignore rules and candidate folders
    - Add these four entries to `.gitignore` in this order, plus one entry for local tool output, and nothing that ignores `.kiro`: `tools/cache/*`, `!tools/cache/manual/`, `tools/cache/manual/*`, `!tools/cache/manual/README.md`
    - Create the folders `reference/candidates/01-ground-stone`, `02-night-sky`, `03-graveyard-props`, `04-lab-props`, `05-avatars`, `06-zombie-hands`, `07-sound` and `reference/candidates/notes` (they fill up with screenshots and notes in later tasks)
    - Do not create any file under `tools/cache/manual` now; `tools/cache/manual/README.md` belongs to Phase 2
    - Verify with `git check-ignore -v`: `tools/cache/manual/README.md` is NOT ignored (exit code 1), `tools/cache/downloads/example/file.bin` is ignored, `tools/cache/manual/example/file.fbx` is ignored
    - Never use `git add -f` or `git add --force`
    - _Requirements: 15.2, 15.3, 15.4, 21.7_

- [x] 2. Scout the seven categories
  - [x] 2.1 Category 1: ground and stone textures
    - Fallbacks first: Poly Haven `lichen_rock`, `mossy_rock`, `brown_mud_leaves_01`, `excavated_soil_wall`
    - Find 2-3 Candidates for at least one ground Sub_Item and at least one stone Sub_Item, with at least 2 each overall; record whether PBR maps (color, normal, roughness) are provided
    - Verify license, author and size on each Candidate's page; estimate WebP size
    - Use the Playwright MCP server to save screenshots to `reference/candidates/01-ground-stone/<name>.png`
    - Record all columns plus Night_Read_Rating 1-3 with a one-line reason (roughness, albedo, surface detail) in `reference/candidates/notes/01-ground-stone.md`
    - _Requirements: 2.1, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 10.1, 10.2, 10.3, 10.5, 10.7, 10.10, 11.1, 11.2, 11.4, 11.5_

  - [x] 2.2 Category 2: night sky HDRIs
    - Fallbacks first: Poly Haven `kloppenheim_02_puresky`, `rogland_moonlit_night`
    - Find Candidates for a background sky and for environment lighting; record whether 1k and 2k versions exist and the role of each
    - Verify license and size; save screenshots to `reference/candidates/02-night-sky/<name>.png`
    - Record data and Night_Read_Rating with reason in `reference/candidates/notes/02-night-sky.md`
    - _Requirements: 2.1, 2.4, 2.5, 4.1, 4.2, 10.2, 10.7, 11.1, 11.2_

  - [x] 2.3 Category 3: graveyard props
    - Sub_Items: gate, statue, dead trees, stumps, lantern, fence, broken stones
    - Fallbacks first: Poly Haven `large_iron_gate`, `gothic_statue`, `dead_tree_trunk`, `tree_stump_01`, `Lantern_01`
    - Prefer packs that cover several Sub_Items in one style (count once); record the polygon count of each Candidate and exclude stylized or low-poly ones
    - Verify license and size; save screenshots to `reference/candidates/03-graveyard-props/<name>.png`
    - Record data and Night_Read_Rating with reason in `reference/candidates/notes/03-graveyard-props.md`
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 5.1, 5.2, 5.3, 10.1, 10.2, 10.5, 10.7, 11.1, 11.2_

  - [x] 2.4 Category 4: lab props
    - Sub_Items: operating table, surgical lamp, IV stand, medical cart, instruments. No Fallbacks
    - Present any single pack covering three or more Sub_Items in one consistent style as its own row
    - Verify license and size; save screenshots to `reference/candidates/04-lab-props/<name>.png`
    - Record data and Night_Read_Rating with reason (judge against the surgical-lamp pool in `reference/lab`) in `reference/candidates/notes/04-lab-props.md`
    - _Requirements: 2.1, 2.2, 2.5, 6.1, 6.2, 6.3, 10.1, 10.2, 10.7, 11.1, 11.2_

  - [x] 2.5 Category 5: patient avatars and animations
    - Fallbacks first: Microsoft Rocketbox `Business_Male_02` (`github.com/microsoft/microsoft-rocketbox`, `Assets/Avatars/Professions/Business_Male_02`) and animations `m_walk_neutral_01`, `m_walk_drunk`, `m_walk_bruised`
    - Search for further realistic rigged avatars licensed MIT, CC0 or CC BY; prefer those sharing the Rocketbox skeleton or easy to retarget
    - Record for each Candidate the skeleton type and a retargeting effort estimate (none, low, medium, high) with one sentence of justification
    - Verify license and size; save screenshots to `reference/candidates/05-avatars/<name>.png`
    - Record data and Night_Read_Rating with reason in `reference/candidates/notes/05-avatars.md`
    - _Requirements: 2.1, 2.4, 2.5, 7.1, 7.2, 7.3, 7.4, 7.5, 10.1, 10.2, 10.7, 10.10, 11.1, 11.2_

  - [x] 2.6 Category 6: zombie and grabbing-hand scans (find only)
    - Search Sketchfab for downloadable CC BY or CC0 zombie and grabbing-hand scans
    - Record author name, author profile link and model page link for each; mark every row "Manual pick"
    - Do not download any Sketchfab file and do not create files under `tools/cache`
    - Verify license on the model page; save screenshots to `reference/candidates/06-zombie-hands/<name>.png`
    - Record data and Night_Read_Rating with reason in `reference/candidates/notes/06-zombie-hands.md`
    - _Requirements: 2.1, 2.5, 8.1, 8.2, 8.3, 8.4, 10.7, 10.10, 10.11, 11.1, 11.2_

  - [x] 2.7 Category 7: sound effects
    - Sub_Items: ECG beep, ECG flatline, heartbeat, low drone, iron gate, electric zap, wind. No Fallbacks
    - Only Freesound or OpenGameArt Candidates licensed CC0; record duration and file format
    - Verify license on each sound page; save screenshots to `reference/candidates/07-sound/<name>.png`
    - Write `n/a` for Night_Read_Rating and its reason on every row; record data in `reference/candidates/notes/07-sound.md`
    - After this task count distinct Candidates across all categories; if above 35 trim lowest-ranked third Candidates (never below 2 per Sub_Item) until at most 38, and delete the screenshots and notes rows of trimmed Candidates
    - _Requirements: 2.1, 2.3, 2.5, 2.7, 9.1, 9.2, 9.3, 9.4, 10.7, 12.3_

- [x] 3. README, validation and commit
  - [x] 3.1 Write `reference/candidates/README.md`
    - Start with "Status: waiting for picks. Nothing has been downloaded." and a short legend (night-read scale, "Fallback", "Manual pick", size basis)
    - Add the comparison with `/reference`: one short paragraph per reference image (link it), then how the Candidates compare
    - One table per Category, grouped by Sub_Item, built from `reference/candidates/notes/*.md`; columns: name, preview link, source URL, author, license, file size, poly count, night-read rating, night-read reason, why it fits, plus the category extras from the design (PBR maps, 1k/2k and role, skeleton and retargeting effort, duration and format, author profile link and "Manual pick")
    - Fallback rows first and labelled "(Fallback)"; use `n/a` where a column does not apply (always for Category 7 ratings); preview links are relative paths to existing PNGs, or `preview unavailable: <reason>`
    - Add a "Sub_Items with no suitable candidate" table (with sources searched) and a Totals line (distinct Candidates, limit 35, hard max 38)
    - Delete `reference/candidates/notes` once its content is merged
    - _Requirements: 2.3, 2.6, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [x] 3.2 Validate the README and the candidate files
    - Check every preview link resolves to an existing PNG, each PNG is under 1 MB (1,048,576 bytes) and its name matches `^[a-z0-9-]+\.png$`
    - Check every Sub_Item table has 2-3 rows (or is listed as having no suitable candidate), every row has a non-empty license and source URL, CC BY rows have an author, Category 6 rows say "Manual pick", Category 7 ratings are `n/a`
    - Check no license is NonCommercial, SA/ND, Mixamo, paid marketplace or otherwise off the allow-list, and the distinct Candidate total is at most 38
    - Check `git status --short web/public/assets tools/fetch-assets.mjs CREDITS.md` shows no change, and that `web/src/engine`, `web/src/state` and `/pipeline` are untouched
    - Fix any finding in the README or screenshots and re-check
    - _Requirements: 2.3, 10.7, 10.8, 10.9, 10.11, 11.4, 11.5, 12.5, 13.2, 21.3, 21.8_

  - [x] 3.3 Commit the candidates (requested by the user)
    - Run `git status --short`; if staged files exist outside the Owned_Paths, unstage only those with `git restore --staged <path>` and report each path
    - Stage explicitly: `git add .gitignore`, `git add reference/candidates`, `git add .kiro/specs/asset-pipeline`; never `-A`, `.` or `-f`
    - Commit with a conventional message of at most 72 characters, for example `docs(asset-pipeline): add phase 1 asset candidates`
    - Do not push unless the user asks
    - _Requirements: 21.1, 21.2, 21.4, 21.5, 21.6_

- [x] 4. Stop gate - wait for the user's picks
  - Report the totals, the list of files created, and that `web/public/assets`, `manifest.json`, `CREDITS.md` and `tools/fetch-assets.mjs` are unchanged
  - Stop and wait. Do not start Phase 2. When the user sends picks and asks for Phase 2, add the Phase 2 tasks to this file first
  - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [x] 5. Record picks
  - [x] 5.1 Write the "Picks" and "Rejected" sections in `reference/candidates/README.md`
    - Run `git pull --no-edit` first; stop and report on non-zero exit or conflict
    - Use the exact picks the user passes to the executing agent: one line per pick (name, scene, role); only names that exist in a README table; report unknown names
    - Write "Rejected" with a reason per name (for example `sketchfab-broken-headstone: readable inscription of a real person's grave`); keep dropped Candidates in their tables
    - Verify that `m_idle_breathe_01` exists in the Rocketbox repo (`github.com/microsoft/microsoft-rocketbox`) and record the commit SHA to pin; if missing, report it and leave it out of Picks
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6, 23.7, 27.2_

- [x] 6. Provenance check
  - [x] 6.1 Check `sketchfab-zombie-corpse-greenall` and `sketchfab-zombie-hand-greenall`
    - Search the author's page, model description, comments and linked ArtStation or other posts for the original sculpt
    - If the original is the uploader's own work or licensed for this use: record evidence (URLs, quotes under 30 words) in a "Provenance" subsection of the README and add the model to Picks
    - If unconfirmed: keep it in Rejected as "provenance unconfirmed" and note the result in the README
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.7_

  - [x] 6.2 Find replacements for any unconfirmed model
    - Only for models left unconfirmed in 6.1: one realistic emaciated corpse or skeleton, one clawing hand
    - Apply Requirement 10 criteria (license on own page, author and link, size, Night_Read_Rating); mark as Manual_Pick; do not download; screenshots in `reference/candidates/06-zombie-hands/`
    - _Requirements: 24.4, 24.5, 24.6, 10.1, 10.2, 10.5, 10.7, 10.10, 11.1, 11.2_

- [x] 7. Category 8 scouting (horror dressing)
  - [x] 7.1 Skull and bones, body bag, morgue drawer
    - 2 Candidates each, no Fallbacks; skull and bones only replicas or sculpts, never real remains
    - Verify license, author, size on each page; screenshots to `reference/candidates/08-horror-dressing/<name>.png` (names `^[a-z0-9-]+\.png$`, under 1 MB)
    - Record data and Night_Read_Rating with reason in `reference/candidates/notes/08-horror-dressing.md`
    - _Requirements: 25.1, 25.2, 25.3, 25.5, 25.7, 25.8, 10.1, 10.2, 10.5, 10.7, 10.10, 11.1, 11.2, 11.4, 11.5_

  - [x] 7.2 Chains and hooks, restraint straps, rotten cloth, cobwebs
    - Same rules as 7.1; append rows to the same notes file
    - _Requirements: 25.1, 25.2, 25.5, 25.7, 25.8, 10.1, 10.2, 10.5, 10.7, 10.10, 11.1, 11.2_

  - [x] 7.3 Blood splatter, handprint and drag-mark decals
    - CC0 textures only, 2 Candidates; record whether alpha or mask maps are provided
    - _Requirements: 25.1, 25.2, 25.4, 25.5, 25.8, 10.5, 10.7, 11.1, 11.2_

  - [x] 7.4 Blank headstones in three states
    - Sub_Items intact, cracked, broken; 2 Candidates each; a set covering all three counts for each state
    - Blank face, dark weathered stone; record source triangle count and whether decimation to at most 20,000 triangles is needed; state readable from silhouette; prefer one author or scan set
    - Reject and list any stone with a readable inscription of a real person
    - _Requirements: 25.1, 25.2, 25.7, 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 26.7, 26.8_

- [x] 8. Merge, validate and commit
  - [x] 8.1 Merge results into `reference/candidates/README.md`
    - Add the Category 8 tables (headstone columns for triangles and decimation), the Provenance result, and update Totals (Category 8 listed separately, outside the 35/38 cap)
    - Delete `reference/candidates/notes` once merged
    - _Requirements: 25.5, 25.6, 24.7, 12.1, 12.2, 12.3, 12.5, 12.6_

  - [x] 8.2 Validate
    - Preview links resolve, PNGs under 1 MB with valid names, every row has license and source URL, CC BY rows have an author
    - Category 8: exactly 2 per Sub_Item (or listed as none), decals CC0, no real remains, headstone rows have triangle data and blank faces
    - Picks names all exist in tables; no NonCommercial, SA/ND, Mixamo or paid licenses
    - `git status --short web/public/assets tools/fetch-assets.mjs CREDITS.md` shows no change; `web/src/engine`, `web/src/state` and `/pipeline` untouched
    - _Requirements: 23.2, 25.2, 25.3, 25.4, 26.1, 26.3, 10.7, 10.8, 10.9, 10.11, 11.4, 11.5, 13.2, 21.3_

  - [x] 8.3 Commit only owned paths
    - Run `git pull --no-edit` first
    - Run `git status --short`; unstage only files outside Owned_Paths with `git restore --staged <path>` and report them
    - Stage explicitly: `git add reference/candidates`, `git add .kiro/specs/asset-pipeline`; never `-A`, `.` or `-f`
    - Conventional message of at most 72 characters, for example `docs(asset-pipeline): add picks, provenance and horror dressing`; do not push
    - _Requirements: 27.1, 27.2, 21.1, 21.2, 21.4, 21.5, 21.6_

- [x] 9. Stop gate - wait for picks
  - Report totals, files created, and that `web/public/assets`, `manifest.json`, `CREDITS.md` and `tools/fetch-assets.mjs` are unchanged
  - Stop and wait for the user's picks for Category 8 and the provenance outcome. Add no Phase 2 tasks and install nothing
  - _Requirements: 27.3, 27.4, 13.2, 13.4_

- [x] 10. Round 3 scouting (lab and finale, sounds, extra avatars)
  - [x] 10.1 Knife switch and heavy door
    - Run `git pull --no-edit` first; stop and report on non-zero exit or conflict
    - Category 9 Sub_Items: large knife switch or lever (Frankenstein-style) and old heavy door (wood or iron); 2 Candidates each, no Fallbacks
    - Verify license, author and size on each page; screenshots to `reference/candidates/09-round-3/<name>.png` (names `^[a-z0-9-]+\.png$`, under 1 MB)
    - Record data and Night_Read_Rating with reason in `reference/candidates/notes/09-round-3.md`
    - _Requirements: 28.1, 28.2, 28.4, 28.6, 31.1, 10.1, 10.2, 10.5, 10.7, 10.10, 11.1, 11.2, 11.4, 11.5_

  - [x] 10.2 Lab wall and floor textures
    - Sub_Items: old brick or stone crypt wall, wet stone or tile floor; 2 Candidates each; prefer Poly Haven or ambientCG CC0
    - Record whether PBR maps (color, normal, roughness) are provided; screenshots to `reference/candidates/09-round-3/`
    - Append rows to `reference/candidates/notes/09-round-3.md`
    - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.5, 28.6, 10.7, 11.1, 11.2_

  - [x] 10.3 Round 3 sounds
    - Category 10 Sub_Items: jump-scare sting, digging in dirt, shambling footsteps, cloth rustle, electrical hum before a zap, crows (optional)
    - Freesound CC0 only, 2 Candidates each, every row "Manual pick"; do not download any file; record duration and file format; `n/a` for Night_Read_Rating and reason
    - Verify the license on each sound page; screenshots to `reference/candidates/09-round-3/`
    - If no CC0 Candidate fits crows, record "no suitable candidate found" with sources searched and continue
    - Record rows in `reference/candidates/notes/10-sounds-round-3.md`
    - _Requirements: 29.1, 29.2, 29.3, 29.4, 29.5, 29.6, 29.7, 10.7, 10.10_

  - [x] 10.4 Six extra Rocketbox avatars
    - List 6 avatars on the same Bip01 skeleton as `Business_Male_02`, mixed ages and genders, everyday or work clothes
    - Verify each exact path in `github.com/microsoft/microsoft-rocketbox` at SHA `0943055db6ec570bcef9f2c8b41c9e5467c808f9`; leave out and report any that are missing and pick another
    - Record path, MIT license, clothing, apparent age group, gender, "no real person or brand", and a link to the repo preview image; no screenshots, no download
    - Write rows to `reference/candidates/notes/extra-avatars.md`
    - _Requirements: 30.1, 30.2, 30.3, 30.4, 30.5, 30.6_

- [ ] 11. Merge and validate
  - [x] 11.1 Merge round 3 into `reference/candidates/README.md`
    - Run `git pull --no-edit` first
    - Add Category 9, Category 10 and an "Extra Rocketbox avatars" table; update the Totals line (Categories 8, 9, 10 listed separately, outside the 35/38 cap)
    - Update the Status line and the "Decisions needed" list: picks for rounds 2 and 3 together, round-2 decisions still open
    - Delete `reference/candidates/notes` once merged
    - _Requirements: 28.1, 29.1, 29.7, 30.1, 31.2, 31.4, 12.1, 12.2, 12.3, 12.5, 12.6_

  - [x] 11.2 Validate
    - Preview links resolve, PNGs under 1 MB with valid names, every row has license and source URL, CC BY rows have an author
    - Category 9 and 10: exactly 2 per Sub_Item (or listed as none), sounds CC0 and "Manual pick" with duration and format and `n/a` ratings, wall and floor rows say whether PBR maps exist
    - Extra avatars: 6 rows (or reported shortfall), paths checked at the pinned SHA, MIT license
    - No NonCommercial, SA/ND, Mixamo or paid licenses
    - `git status --short web/public/assets tools/fetch-assets.mjs CREDITS.md` shows no change; `web/src/engine`, `web/src/state` and `/pipeline` untouched
    - _Requirements: 28.4, 28.6, 29.2, 29.3, 29.4, 30.2, 30.3, 31.5, 10.7, 10.8, 10.9, 10.11, 11.4, 11.5, 13.2, 21.3_

  - [-] 11.3 Report and ask about committing (no commit without a request)
    - The user has not asked for a commit this round. Report `git status --short` and the list of new and changed files, and ask whether to commit
    - Only if the user asks: run `git pull --no-edit`, unstage files outside Owned_Paths with `git restore --staged <path>` and report them, stage explicitly `git add reference/candidates` and `git add .kiro/specs/asset-pipeline` (never `-A`, `.` or `-f`), commit with a conventional message of at most 72 characters such as `docs(asset-pipeline): add round 3 candidates`, and do not push
    - _Requirements: 31.1, 31.3, 21.1, 21.2, 21.4, 21.5, 21.6_

- [~] 12. Combined stop gate - wait for picks for rounds 2 and 3
  - Report totals, files created, and that `web/public/assets`, `manifest.json`, `CREDITS.md` and `tools/fetch-assets.mjs` are unchanged
  - Stop and wait for the user's picks for rounds 2 and 3 together; round-2 decisions remain open. Add no Phase 2 tasks and install nothing
  - _Requirements: 31.4, 31.5, 13.2, 13.4_

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
    { "id": 11, "tasks": ["3.3"] },
    { "id": 12, "tasks": ["5.1"] },
    { "id": 13, "tasks": ["6.1"] },
    { "id": 14, "tasks": ["6.2"] },
    { "id": 15, "tasks": ["7.1"] },
    { "id": 16, "tasks": ["7.2"] },
    { "id": 17, "tasks": ["7.3"] },
    { "id": 18, "tasks": ["7.4"] },
    { "id": 19, "tasks": ["8.1"] },
    { "id": 20, "tasks": ["8.2"] },
    { "id": 21, "tasks": ["8.3"] },
    { "id": 22, "tasks": ["10.1"] },
    { "id": 23, "tasks": ["10.2"] },
    { "id": 24, "tasks": ["10.3"] },
    { "id": 25, "tasks": ["10.4"] },
    { "id": 26, "tasks": ["11.1"] },
    { "id": 27, "tasks": ["11.2"] },
    { "id": 28, "tasks": ["11.3"] }
  ]
}
```
