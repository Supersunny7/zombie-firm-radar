# Implementation Plan: Asset Pipeline (Phase 1 scouting, Phase 2 download and convert)

## Overview

Tasks 1 to 12 are Phase 1 (scouting) and are complete. Phase 1 is an agent research workflow: no application code was written. Task 13 wraps up Phase 1 with the user's final picks for rounds 2 and 3. Tasks 14 to 25 are Phase 2 (tools package, recipe, download and cache, converters, edit operations, own-work generators, budgets, manifest, credits, orchestrator, full run, audit, final report). The user has now given the picks, so Phase 2 tasks are listed (Requirement 13.4).

Every task is required. There are no optional (`*`) tasks, and each of the 23 correctness properties of the design is its own required property-test sub-task in Phase 2.

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

- [x] 11. Merge and validate
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

  - [x] 11.3 Report and ask about committing (no commit without a request)
    - The user has not asked for a commit this round. Report `git status --short` and the list of new and changed files, and ask whether to commit
    - Only if the user asks: run `git pull --no-edit`, unstage files outside Owned_Paths with `git restore --staged <path>` and report them, stage explicitly `git add reference/candidates` and `git add .kiro/specs/asset-pipeline` (never `-A`, `.` or `-f`), commit with a conventional message of at most 72 characters such as `docs(asset-pipeline): add round 3 candidates`, and do not push
    - _Requirements: 31.1, 31.3, 21.1, 21.2, 21.4, 21.5, 21.6_

- [x] 12. Combined stop gate - wait for picks for rounds 2 and 3
  - Report totals, files created, and that `web/public/assets`, `manifest.json`, `CREDITS.md` and `tools/fetch-assets.mjs` are unchanged
  - Stop and wait for the user's picks for rounds 2 and 3 together; round-2 decisions remain open. Add no Phase 2 tasks and install nothing
  - _Requirements: 31.4, 31.5, 13.2, 13.4_

- [x] 13. Final picks (Phase 1 wrap-up)
  - [x] 13.1 Pull, run the Proop and Rocketbox checks, write the final picks into the README
    - Run `git pull --no-edit` first; stop and report on non-zero exit or conflict. Install nothing
    - Proop / ALTEREGO AI-account check (Playwright, read-only: navigate, snapshot, screenshot only; no login, no download, no form input): open the account page of the uploader of `sketchfab-butchers-hook-chain-proop`, open every public upload, read title, tags, description and badges for the `createdwithai` tag and the words "AI generated", "AI-generated", "text-to-3D", "image-to-3D", "Meshy", "Tripo", "Luma", "Rodin". If any hit: drop the hook (Rejected: "uploader publishes AI-generated models"), leave it out of the Manual README and `tools/picks.json`, and tell the user which upload triggered it. If clean: keep it and record the number of uploads inspected and the date in the README. If a page does not load: do not list the hook and ask the user
    - Rocketbox preview logo check: open the repository preview image (pinned SHA `0943055db6ec570bcef9f2c8b41c9e5467c808f9`, `github.com/microsoft/microsoft-rocketbox`) of Medical_Female_01, Construction_Male_01, Construction_Female_01, Business_Female_01, Gardener_Male_01 and Female_Adult_06 and look at each PNG for logos, brand marks or readable brand text. Drop any avatar that has one (Not picked: "logo or brand mark visible in the preview") and tell the user which ones. Do not save the previews in the repository. Bip01 bone names are confirmed at conversion (task 18.4), not here
    - Write the final round 2 and round 3 picks into "Picks" and the "Not picked" list into `reference/candidates/README.md`, applying the outcome of both checks; keep the round-1 picks already there; every name must exist in a README table (report unknown names); keep all non-picked Candidates in their tables
    - FINAL PICKS round 2: `sketchfab-zombie-corpse-greenall` (added; note "provenance accepted on the author's statement"); `sketchfab-zombie-mutant` (kept); `sketchfab-zombie-hand-craggle` (hands clawing out of graves; desaturate the green slightly); `sketchfab-zombie-hand-ruella` (hands reaching in from the screen edges); `sketchfab-zombie-hand-greenall` stays Rejected; skull `sketchfab-human-skull-danieledefilippis` (darken, add grime; bones: none); `sketchfab-smartinius-body-bag`; `sketchfab-morgue-refrigerator-porteous` (decimate to about 30K triangles); `sketchfab-rusty-chains-amanda98`; `sketchfab-butchers-hook-chain-proop` (only if the check is clean); `sketchfab-strap-buckles-kit-dmigul` (black webbing); `oga-blood-splatter-exilegl`; handprint and drag-mark decals: own procedural generator (512 px alpha PNG, dark wet red, a few variants each, recorded as own work); `sketchfab-cobwebs-asset-pack-emarshall`; `polyhaven-hessian-230` (stained in the decay shader); headstones `sketchfab-small-gravestone-drydoctoregg` (intact) and `sketchfab-damaged-tombstone-drydoctoregg` (broken), the cracked state made by our script from the intact scan (displaced crack normal map and chipped edge, recorded as a modified CC BY work), procedural headstones remain the fallback
    - FINAL PICKS round 3: knife switch `sketchfab-knife-switch-type-d` (grey variant; split handle and blade from the base so the pull can be animated); door `polyhaven-large-castle-door`; lab wall `polyhaven-dark-brick-wall`; lab floor `polyhaven-slate-floor`; sounds (Freesound, CC0): jump-scare qubodup, digging guyburns, shambling indieground, cloth zazz, electrical hum smice-6, crows giddster (use the sound Candidate names in the README); avatars: the six extra Rocketbox (Medical_Female_01, Construction_Male_01, Construction_Female_01, Business_Female_01, Gardener_Male_01, Female_Adult_06) minus any dropped by the logo check
    - NOT PICKED: leather belt, plastic skull, rough linen, both Mr.Nein sets, RBG crosses, both ambientCG leaking decals, second body bag, second morgue unit, `sketchfab-knife-switch-type-c`, olkaad iron door, castle-brick-07, slate-floor-02, and the second Candidate in each round-3 sound pair
    - Update the Status line and the "Decisions needed" section to say that picks for rounds 1 to 3 are recorded and Phase 2 is next
    - _Requirements: 32.1, 32.2, 32.3, 32.4, 32.6, 32.7, 33.1, 33.2, 33.3, 33.4, 33.5, 33.6, 34.1, 34.2_

  - [x] 13.2 Write `tools/cache/manual/README.md`
    - Run `git pull --no-edit` first
    - One block per Manual_Pick in the Picks section (round 1 Sketchfab picks, round 2 and 3 Sketchfab picks, and the six Freesound sounds), sorted by id, in the format of the design section "Manual README format": candidate name, source page URL, exact download option to choose on the site (Sketchfab "Download 3D Model" with the "glTF" autoconverted zip, or the original format when the pick needs it; Freesound "Download" of the original file, not the preview MP3), the exact expected file name, the exact target path `tools/cache/manual/<id>/<expectedFile>`, the credit line (title, author, license, URL; Freesound user name for sounds), and notes (for example "grey variant" for the knife switch, "provenance accepted on the author's statement" for the Greenall corpse)
    - Expected file names are chosen by us and the user renames the download: `<id>.zip` for Sketchfab, `<id>.<ext>` for Freesound with the extension from the format column of the README; say so in the README header
    - Read each page's license, author and download formats from the Candidates_README rows; use Playwright read-only to confirm the download option names where the page shows them; do not log in and do not download
    - Include the hook only if the Proop check passed; include the cracked-headstone note under the intact headstone entry (the cracked state is derived by our script, nothing to download)
    - Verify with `git check-ignore -v`: `tools/cache/manual/README.md` is NOT ignored (exit code 1) and `tools/cache/manual/sketchfab-knife-switch-type-d/knife-switch-type-d.zip` IS ignored; never use `git add -f`
    - _Requirements: 15.1, 15.3, 15.4, 40.1, 40.2, 40.3, 40.4, 40.6, 33.4, 33.6_

  - [x] 13.3 Commit only owned paths, report the binary-fetching packages, and stop
    - Run `git pull --no-edit` first, then `git status --short`; unstage only files outside the Owned_Paths with `git restore --staged <path>` and report each
    - Stage explicitly: `git add reference/candidates`, `git add tools/cache/manual/README.md`, `git add .kiro/specs/asset-pipeline`; never `-A`, `.`, `-f`, and do not stage `DEVLOG.md`
    - Commit (requested by the user) with a conventional message of at most 72 characters, for example `docs(asset-pipeline): record final picks and manual download guide`; do not push
    - Report to the user the packages Phase 2 will install and that nothing has been installed: `sharp` (prebuilt libvips via optional dependency), `ffmpeg-static` (downloads an ffmpeg binary at install), `fbx2gltf` (FBX2glTF executables inside the tarball), `meshoptimizer` (WebAssembly only), plus pure JavaScript packages (gltf-transform, fflate, vitest, fast-check); then stop
    - _Requirements: 32.8, 32.9, 21.1, 21.2, 21.4, 21.6, 19.3, 41.2_

- [x] 14. Tools package (no install before approval)
  - [x] 14.1 Create `tools/package.json` with exact pins
    - Run `git pull --no-edit` first
    - Look up current versions with `npm view <pkg> version` and the current docs (context7 or web) for gltf-transform, sharp, fbx2gltf and ffmpeg-static before writing code (Requirement 19.7)
    - Write `tools/package.json`: `private: true`, `type: module`, `engines.node >= 22`, `repository.url` (used for the User-Agent), scripts `fetch-assets`, `test` (`vitest run`), `pnpm.onlyBuiltDependencies` allowing only `sharp` and `ffmpeg-static`; dependencies pinned exactly (no `^`, `~`, `>`, `*`): `sharp`, `ffmpeg-static`, `fbx2gltf`, `meshoptimizer`, `@gltf-transform/core`, `@gltf-transform/extensions`, `@gltf-transform/functions`, `fflate`; dev dependencies `vitest` and `fast-check` at the versions in `web/package.json`
    - Do not run any install command. Do not touch `web/package.json` or the `web/` lockfile
    - _Requirements: 19.1, 19.2, 19.7, 19.8, 14.1_

  - [x] 14.2 Stop gate: list the binary-fetching packages and wait for approval, then install
    - Tell the user, in the reply, the exact list with pinned versions: `sharp` (prebuilt libvips from `@img/sharp-win32-x64`), `ffmpeg-static` (install script downloads ffmpeg from GitHub releases; needs build-script approval in pnpm), `fbx2gltf` (FBX2glTF executables inside the npm package), `meshoptimizer` (WebAssembly, no native binary). Then stop and wait for the user's approval. Run no install command and no script needing these packages until the user approves
    - After approval: run `pnpm install` with `--dir tools` (PowerShell, `;` chaining) to create `tools/pnpm-lock.yaml`; check that every version in `tools/package.json` is exact, that `git status --short web` shows no change, and that `.gitignore` ignores `tools/node_modules`
    - If `fbx2gltf` cannot be installed or run, ask the user for another approach (for example `@cocos/fbx2gltf`) and do not fetch a binary from outside npm
    - _Requirements: 19.3, 19.4, 19.5, 19.8, 41.2, 41.3_

- [x] 15. Recipe and validation modules
  - [x] 15.1 Implement `tools/asset-lib/picks.mjs` (picks version 2)
    - Run `git pull --no-edit` first
    - `loadPicks(path)` and `validatePick(p)` for the recipe fields `id`, `kind`, `category`, `group`, `source` (polyhaven, url, manual, generated, derived), `manual`, `expectedFile`, `targetFolder`, `edits`, `credits`, `role`; reject unknown keys, a `manual` flag that disagrees with `source.type`, a duplicate `id`, a `derived.from` that is not an `id` in the file, and any edit not defined in the edit table; return typed errors by `id`
    - Order derived picks after the picks they derive from
    - _Requirements: 35.1, 35.2, 35.3, 35.5, 35.6, 14.1_

  - [x] 15.2 Implement `licenses.mjs` and `paths.mjs`
    - `checkLicense(pick)` with the alias table, NC / non-commercial token rejection and forbidden hosts; empty `sourceUrl`, `author` or `license` refused with the field name
    - `planOutputs(pick, produced)` and `safeJoin(root, ...parts)` as in the design; output folders per `kind`
    - _Requirements: 18.7, 18.8, 14.4, 21.1, 21.9_

  - [x] 15.3 Write `tools/picks.json` from the README Picks
    - Run `git pull --no-edit` first
    - One entry per Pick in `reference/candidates/README.md` that is not rejected or dropped, with `credits` copied from the README rows (exact license text mapped to the allowed alias, author, source URL), `group` graveyard or lab, `source` per kind (Poly Haven id and resolution, Rocketbox GitHub raw URL at the pinned SHA, manual page URL and download option, generated and derived entries for the decals and the cracked headstone), and `expectedFile` and `targetFolder` equal to the Manual README
    - Edits per pick: craggle hand `desaturate`; skull `darken` and `grime`; morgue refrigerator `decimate` 30000; strap kit `darken` (black webbing); knife switch `selectVariant` (grey) and `splitMesh` (handle, blade, rest); `sketchfab-crutch-and-iv-drip` `removeNode` (crutch); any blue-sleeve removal recorded in the Picks; headstones `decimate` 20000; Greenall corpse credits `changes` includes "provenance accepted on the author's statement"
    - HDRI and texture picks get `role` (`ground-main`, `background`, `environment`) from the README roles
    - Validate with `loadPicks` and fix findings; no download yet
    - _Requirements: 35.1, 35.2, 35.3, 35.5, 35.7, 32.5, 38.9, 39.6_

  - [x] 15.4 Write property test for the license allow-list
    - **Property 7: License allow-list is exact**
    - **Validates: Requirements 18.7**

  - [x] 15.5 Write property test for output paths
    - **Property 9: Output paths follow kind and name and never escape**
    - **Validates: Requirements 14.4, 21.1, 21.9**

- [x] 16. Download and cache
  - [x] 16.1 Implement `http.mjs` and `polyhaven.mjs`
    - Look up the Poly Haven API docs again (context7 or web) and record one live `GET /files/{id}` response each for an HDRI, a texture and a model as fixtures; confirm the JSON shape the design assumes, and fix the design note if it differs
    - `http.mjs`: User-Agent from `package.json` `repository.url`, 60 s timeout, 2 retries with 1 s and 2 s back-off, streaming to a `.part` file; `polyhaven.mjs`: `/files/{id}` client, resolution and format selection, `include` map handling, `size` and `md5` checks; only documented endpoints
    - Download sources: Poly Haven API, GitHub raw at the pinned SHA, OpenGameArt direct URLs
    - Unit tests with the recorded fixtures
    - _Requirements: 14.2, 14.5, 14.6, 19.7_

  - [x] 16.2 Implement `cache.mjs`, `archive.mjs` and the manual-cache reader
    - `isCached` with `.download.json` records (sizes and SHA-256); zero requests for cached picks
    - `archive.mjs`: zip extraction with fflate and `safeJoin` for every entry (zip-slip guard)
    - Manual-cache reader: read `targetFolder/expectedFile` (zip or single file) without any network request; if missing, report the expected file name and the source page URL, skip the pick and mark the run failed
    - _Requirements: 14.3, 14.7, 14.8, 14.9_

- [x] 17. Converters
  - [x] 17.1 Implement `convert-texture.mjs`
    - `fitInside(w, h, L)`; sharp resize with `fit: inside`, `withoutEnlargement`, WebP quality 82 (normal maps 90); L is 2048 for `ground-main`, otherwise 1024; keep the alpha channel; no KTX2, no toktx; fixture test with a tiny PNG
    - _Requirements: 16.2, 16.6, 38.8_

  - [x] 17.2 Implement `convert-hdri.mjs`
    - Copy `.hdr` byte for byte, read the Radiance header width, accept only 2048 for `background` and 1024 for `environment`, fail the pick otherwise
    - _Requirements: 16.3, 16.7_

  - [x] 17.3 Implement `convert-model.mjs`
    - Look up the gltf-transform and fbx2gltf docs again first
    - NodeIO with `ALL_EXTENSIONS` and the Meshopt encoder; FBX through `fbx2gltf`; run the pick's Edit_List (task 18) after the FBX step and before `dedup`, `prune`, `resample` (avatars and animations only), `textureCompress` (WebP, 1024) and `meshopt`; write one self-contained GLB; copy the Rocketbox `LICENSE` beside Rocketbox avatars with its own manifest and credits entries; call `checkBip01` for Rocketbox avatars; report files over 5 MB with a suggestion and keep them; fixture test reading the GLB back and finding `EXT_meshopt_compression`
    - _Requirements: 16.1, 16.5, 16.8, 18.5, 34.3, 34.4, 34.5, 36.2_

  - [x] 17.4 Implement `convert-audio.mjs`
    - `ffmpeg-static` path, `spawn` with an argument array (no shell), both `.ogg` (libvorbis) and `.mp3` (libmp3lame), bit-exact flags and no metadata; clear failure message if a codec is missing and no system ffmpeg fallback; fixture test with a 0.1 s WAV
    - _Requirements: 16.4, 19.4_

  - [x] 17.5 Write property test for HDRI copy and width
    - **Property 13: HDRI is copied unchanged and width is enforced**
    - **Validates: Requirements 16.3, 16.7**

  - [x] 17.6 Write property test for the texture size limit
    - **Property 14: Texture size limit preserves aspect ratio**
    - **Validates: Requirements 16.6**

- [ ] 18. Edit operations and the Bip01 check
  - [x] 18.1 Implement the edit framework with `decimate`, `removeNode` and `selectVariant`
    - `asset-lib/edits/index.mjs`: `applyEdits(doc, edits, { seed, strict })` in list order, typed `EditTargetMissing` error in strict mode, tolerant mode for tests; `decimate` with `MeshoptSimplifier` and a fixed 5-step error search stopping at the first result at or below the target; `removeNode` with `prune()`; `selectVariant` keeping only the named material, texture or variant
    - Geometry edits use gltf-transform and meshoptimizer only; no Blender, no other executable
    - _Requirements: 36.1, 36.2, 36.3, 36.4, 36.6, 36.8, 36.9, 37.1, 37.2_

  - [x] 18.2 Implement the texture edits `desaturate`, `darken` and `grime`
    - `desaturate` caps HSV saturation; `darken` scales RGB so the 99.5th percentile of the per-pixel maximum channel is at most `maxValue`; `grime` caps each pixel's maximum channel by a seeded value-noise field; sharp decode and encode, the only random source is `mulberry32(seed)`; register the ops in `edits/index.mjs`
    - _Requirements: 36.1, 36.5, 36.8_

  - [x] 18.3 Implement `splitMesh`
    - `by: node` and `by: components` (union-find over shared vertex indices, components numbered by first triangle index, listed components to named parts, `rest: true` for the remainder); every triangle in exactly one part; each part a named node; typed `SplitImpossible` error when the model cannot be split this way, which stops that pick, writes no output and tells the user the options (never Blender); inspect the real knife-switch model once the user has placed it and write the real component indices into the pick
    - _Requirements: 36.1, 36.7, 37.3, 37.4_

  - [x] 18.4 Implement `bip01.mjs`
    - `checkBip01(joints)` accepting a non-empty list where every name matches `^Bip01([ _]|$)`, returning the first offending name and the expected pattern otherwise; a scene root that is not a skin joint is ignored; the failure message names the avatar, the offending joint and the pattern
    - _Requirements: 34.3, 34.4_

  - [~] 18.5 Write property test for edit idempotence
    - **Property 21: Edit operations are idempotent and deterministic**
    - **Validates: Requirements 36.3, 36.4, 36.5, 36.6, 36.9**

  - [~] 18.6 Write property test for split and decimate
    - **Property 22: Split and decimate preserve what they promise**
    - **Validates: Requirements 36.3, 36.4, 36.7**

  - [x] 18.7 Write property test for the Bip01 check
    - **Property 23: Bip01 skeleton check accepts exactly the Bip01-named skeletons**
    - **Validates: Requirements 34.3, 34.4**

- [ ] 19. Own-work generators
  - [x] 19.1 Implement `tools/gen-decals.mjs`
    - Seeded (`fnv1a32("<type>:<index>")` and `mulberry32`, no clock, no `Math.random`), 512 by 512 RGBA PNG with a transparent margin, handprint and drag-mark shapes from signed-distance primitives, HSV colour inside the inner ranges hue +-8 degrees, saturation 0.50 to 0.70, value 0.15 to 0.40; at least 3 variants per type written to `tools/cache/generated/decals/`
    - Wire the `generated` source so `convert-texture.mjs` writes WebP with alpha; credits author "Zombie Firm Radar team", license "Own work"
    - _Requirements: 38.1, 38.2, 38.3, 38.5, 38.6, 38.7, 38.8, 38.9_

  - [x] 19.2 Write property test for decal determinism
    - **Property 17: Decal generator is deterministic and seed-driven**
    - **Validates: Requirements 38.3, 38.4, 38.7**

  - [x] 19.3 Write property test for decal image content
    - **Property 18: Decal images have the required size, alpha and colour range**
    - **Validates: Requirements 38.5, 38.6, 38.8**

  - [x] 19.4 Implement `tools/make-cracked-headstone.mjs`
    - `makeCrackedHeadstone(doc, { seed })` and a CLI: seeded crack height map, Sobel normal map blended (whiteout) onto the existing normal map, chipped edge by seeded position-quantised noise so UV-seam vertices move together, decimate to at most 20,000 triangles if needed, blank face; the `derived` source runs it on the decimated intact scan; skip with the intact scan's expected file name when it is missing; fall back to the procedural headstones with a clear message when derivation is impossible
    - Credits row: author drydoctoregg, license CC BY, changes naming the derivation
    - _Requirements: 39.1, 39.2, 39.3, 39.4, 39.5, 39.6, 39.7, 39.8_

  - [~] 19.5 Write property test for the cracked-headstone limits
    - **Property 19: Cracked headstone stays within the triangle limit**
    - **Validates: Requirements 39.2, 39.4**

  - [~] 19.6 Write property test for cracked-headstone determinism
    - **Property 20: Cracked headstone derivation is deterministic**
    - **Validates: Requirements 39.2, 39.3**

- [x] 20. Budgets, manifest, credits and manual README
  - [x] 20.1 Implement `budgets.mjs`
    - `accountBudgets` with limits 26,214,400 / 26,214,400 / 62,914,560 bytes, unassigned files counted in total only with a warning, top-3 largest files per exceeded budget, files over 5,242,880 bytes listed with MB to 2 decimals and a suggestion, unreadable file sizes reported
    - _Requirements: 16.8, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7_

  - [x] 20.2 Implement `manifest.mjs`
    - `mergeManifest` and `serializeManifest` (sorted keys, 2-space indent, LF, trailing newline, no timestamps), one entry per file with non-empty `sourceUrl`, `author`, `license`, `changes`, plus `group`, `bytes`, `sha256`, `inputsSha256`, `recipe` and `bip01` where applicable; atomic write
    - _Requirements: 18.1, 14.3_

  - [x] 20.3 Implement `credits.mjs`
    - `upsertCreditRows`, `ensureCmuLine`, `ensureVisibleNote` (single "## Visible in app" section first), the Poly Haven services line; one row per Path with six non-empty columns; text outside the table byte-for-byte; atomic write; own-work and modified-CC-BY rows come from the pick `credits`
    - _Requirements: 18.2, 18.3, 18.4, 18.6, 22.1, 22.2, 22.3, 22.4, 22.5, 38.9, 39.6_

  - [x] 20.4 Implement `manual-readme.mjs`
    - Generate `tools/cache/manual/README.md` from the picks in the format of the design (header, then one block per manual pick sorted by id with name, page URL, download option, expected file, target path, credit line, notes); omit the hook unless its check flag is `passed`; compare the first generated output with the hand-written file from task 13.2 and fix differences
    - _Requirements: 15.1, 40.1, 40.2, 40.3, 40.5, 40.6_

  - [x] 20.5 Write property test for budget accounting
    - **Property 2: Budget accounting invariants**
    - **Validates: Requirements 17.1, 17.2, 17.3, 17.6**

  - [x] 20.6 Write property test for the budget report and exit code
    - **Property 3: Budget report content and exit code**
    - **Validates: Requirements 16.8, 17.4, 17.5, 17.7**

  - [x] 20.7 Write property test for the manifest
    - **Property 4: Manifest has one complete entry per written file**
    - **Validates: Requirements 18.1**

  - [x] 20.8 Write property test for the credits table
    - **Property 5: Credits table has exactly one row per file and is stable**
    - **Validates: Requirements 18.2, 18.3, 18.4**

  - [x] 20.9 Write property test for the CMU credit line
    - **Property 6: CMU credit line appears exactly once**
    - **Validates: Requirements 18.6**

  - [x] 20.10 Write property test for the Visible-in-app note
    - **Property 16: Visible-in-app note is first, unique and preserved**
    - **Validates: Requirements 22.1, 22.2, 22.3, 22.4, 22.5**

  - [x] 20.11 Write property test for the manual README
    - **Property 15: Manual README lists every manual pick**
    - **Validates: Requirements 15.1, 40.1, 40.2, 40.3, 40.5, 40.6**

- [ ] 21. Orchestrator and CLI
  - [~] 21.1 Implement `runFetch`, `report.mjs` and `tools/fetch-assets.mjs`
    - Run `git pull --no-edit` first
    - Pipeline per pick: validate and license check, download or read manual cache or run generator or derivation, convert (with edits) into `tools/cache/work/<id>-<pid>`, atomic rename into `web/public/assets/<typeDir>/<id>/`, then budgets, manifest, credits, manual README; fail-soft per pick; exit code 1 on any failed, refused or missing-manual pick, exceeded budget or unreadable size; inputs hash and recipe hash skip a pick whose outputs are unchanged; `--only` and `--dry-run`; injected `Env` (fs, http, converters) and shared fakes in `tools/asset-lib/test-helpers/fakes.mjs`
    - Only write inside `web/public/assets`, `tools/cache`, `CREDITS.md` and `tools/cache/manual/README.md` (path guard)
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.9, 16.9, 17.4, 17.5, 18.9, 35.4, 35.5, 40.5_

  - [~] 21.2 Wire edits, generators and the derived headstone into the pipeline
    - Apply each pick's Edit_List in `convert-model.mjs` and texture conversion, run `gen-decals` and `make-cracked-headstone` for `generated` and `derived` picks (derived after its source pick), stop a pick on `SplitImpossible` and report it without blocking the others, and set the group of each output from the pick
    - _Requirements: 35.5, 36.2, 36.8, 37.3, 37.4, 38.8, 39.1, 39.7_

  - [~] 21.3 Write property test for re-run idempotence
    - **Property 1: Re-run idempotence**
    - **Validates: Requirements 14.3, 18.4**

  - [~] 21.4 Write property test for refused picks
    - **Property 8: Refused picks leave no trace and fail the run**
    - **Validates: Requirements 18.7, 18.8, 18.9**

  - [~] 21.5 Write property test for bounded retries and failure isolation
    - **Property 10: Retries are bounded and failures are isolated**
    - **Validates: Requirements 14.5**

  - [~] 21.6 Write property test for conversion failures
    - **Property 11: Conversion failure leaves no partial output**
    - **Validates: Requirements 16.9**

  - [~] 21.7 Write property test for network discipline
    - **Property 12: Network discipline**
    - **Validates: Requirements 14.6, 14.8, 14.9**

- [~] 22. Checkpoint - Ensure all tests pass
  - Run `pnpm --dir tools test`; ensure all tests pass, ask the user if questions arise.

- [ ] 23. Full run and size report
  - [~] 23.1 Run the Fetch_Script
    - Run `git pull --no-edit` first; run `node tools/fetch-assets.mjs --dry-run`, then the real run; check `$LASTEXITCODE`
    - List the Manual_Picks whose files are missing from `tools/cache/manual/` (expected file names and page URLs) and ask the user to place them; do not create or fake any manual file; re-run after the user answers. A split that cannot be done without Blender is reported the same way
    - Check one converted skinned avatar for Meshopt quantization artefacts (inspect with `gltf-transform inspect`; if skinning looks wrong lower avatar quantization) and check the Bip01 result in the manifest
    - _Requirements: 14.9, 35.4, 37.3, 34.5, 41.1_

  - [~] 23.2 Print the size report
    - Print the size of every output file and the used size and limit of the Graveyard_Budget, Lab_Budget and Total_Budget, list files over 5 MB, and fix budget findings (lower texture limit, higher Meshopt level, lighter decimation target) in the picks, then re-run
    - _Requirements: 16.8, 17.1, 17.2, 17.3, 17.4, 17.5, 41.4_

- [ ] 24. Asset audit loop
  - [~] 24.1 Invoke the asset-auditor and fix findings until clean
    - Invoke the `asset-auditor` agent; fix every missing row, forbidden license, missing attribution or file over 5 MB in the Owned_Paths only (by correcting picks and re-running the script, not by hand-editing outputs); invoke it again until it reports no findings; if the same finding survives two fixes, stop and ask the user
    - _Requirements: 20.1, 20.2, 20.3, 41.5, 41.6_

- [ ] 25. Final report and stop gate
  - [~] 25.1 Write the final report and stop
    - Report converted assets, Manual_Picks still missing, picks dropped or stopped (hook, avatars, split), which headstone states are real and which fall back to procedural, the three budgets, the packages installed, and the files changed in the Owned_Paths
    - Do not commit and do not push; commit only if the user asks in a later request, staging by explicit path inside the Owned_Paths (`tools`, `web/public/assets`, `CREDITS.md`, `.gitignore`, `reference/candidates`, `.kiro/specs/asset-pipeline`), never `-A`, `.` or `-f`, with a message such as `feat(asset-pipeline): add fetch script and converted assets`
    - Leave `web/src`, `/pipeline`, `/data` and `DEVLOG.md` unchanged and unstaged; then stop
    - _Requirements: 41.7, 41.8, 41.9, 21.1, 21.2, 21.3, 21.4, 21.5_

## Notes

- Tasks 1 to 12 are complete and unchanged. Tasks 13 to 25 are all required: there are no optional (`*`) tasks, including every property-test task.
- Property-based tests (fast-check with Vitest, at least 100 runs each) are written for Properties 1 to 23 of the design, one sub-task per property.
- Every task that changes files starts with `git pull --no-edit` and stages only Owned_Paths by explicit path.
- No package is installed before the user approves the binary-fetching list in task 14.2.
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
    { "id": 28, "tasks": ["11.3"] },
    { "id": 29, "tasks": ["13.1"] },
    { "id": 30, "tasks": ["13.2"] },
    { "id": 31, "tasks": ["13.3"] },
    { "id": 32, "tasks": ["14.1"] },
    { "id": 33, "tasks": ["14.2"] },
    { "id": 34, "tasks": ["15.1", "15.2"] },
    { "id": 35, "tasks": ["15.3", "15.4", "15.5"] },
    { "id": 36, "tasks": ["16.1", "16.2", "17.1", "17.2", "17.4", "18.1", "18.4"] },
    { "id": 37, "tasks": ["17.3", "17.5", "17.6", "18.2", "18.7", "19.1", "20.1", "20.2", "20.3", "20.4"] },
    { "id": 38, "tasks": ["18.3", "19.2", "19.3", "19.4", "20.5", "20.6", "20.7", "20.8", "20.9", "20.10", "20.11"] },
    { "id": 39, "tasks": ["18.5", "18.6", "19.5", "19.6"] },
    { "id": 40, "tasks": ["21.1"] },
    { "id": 41, "tasks": ["21.2"] },
    { "id": 42, "tasks": ["21.3", "21.4", "21.5", "21.6", "21.7"] },
    { "id": 43, "tasks": ["23.1"] },
    { "id": 44, "tasks": ["23.2"] },
    { "id": 45, "tasks": ["24.1"] },
    { "id": 46, "tasks": ["25.1"] }
  ]
}
```
