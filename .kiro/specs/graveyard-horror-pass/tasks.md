# Implementation Plan: Graveyard Horror Pass

## Overview

Four batches (1, 2, 3a, 3b), each ending with a STOP task. The design is written in TypeScript (web) and Node ESM (tools), so no language question is needed. All commands are PowerShell, chained with `;`.

Rules that apply to every task:

- Before starting work, run `git pull` (shared repository).
- Before using an API of `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `three-custom-shader-material` or `@theatre/core`, look it up with the context7 MCP server (Requirement 22.8).
- Do not edit `/pipeline`, `/data` generation code, `data-contract.md`, or `web/src/engine`. Add no dependency (Requirement 22.10); if one becomes necessary, pin it exactly and name it in the Batch report.
- Create commits only when the user asks. Use the scope `graveyard-horror-pass`, for example `feat(graveyard-horror-pass): add torn mound`.
- After any change under `web/src/scenes/**` or `web/src/fx/**`, name the matching reference (`reference/graveyard/horror-direction.png`, `reference/graveyard/horror-direction-sequence.png`, and `reference/graveyard/graveyard-rate-shock-3pp.png` for unchanged parts) and offer a scene-critic review.
- Property tests use fast-check with at least 100 runs, one test per property, with the comment `// Feature: graveyard-horror-pass, Property N: <title>`.
- Confirmed by the user: (a) pipeline ceiling `LIMITS.graveyard` is 40,000,000 bytes on disk while the 25 MB visitor Group_Budget is the binding limit (tasks 1.9, 1.10); (b) the 3 to 7 percent fallen share is required for lists of 2,500 to 3,000 firms only (Requirement 8.6, task 2.4); (c) Requirement 9.3 is checked at the framed pose with the pointer centred and no sway (task 2.12); (d) the Footstep_Bed is silent in reduced motion (Requirement 17.19, tasks 3.36 to 3.38); (e) Batch 3 is split into 3a (rising zombies) and 3b (Standing_Zombies, Watcher, sound, notice, quality gates).

## Tasks

- [x] 1. Batch 1: Assets and licensing (Requirements 1 to 5)
  - [x] 1.1 Add the three edit operations and the pipeline guards
    - Run `git pull`. In `tools/asset-lib/edits/` add `keep-animations.mjs` (`keepAnimations { names }`, strict mode throws `EditTargetMissing` for an absent clip), `remove-animations.mjs` (dispose all clips, then `prune()`) and `spec-gloss.mjs` (`specGlossToMetalRough`, no-op when the extension is unused). All three are idempotent.
    - Register them in `edits/index.mjs` and in `EDIT_SPECS` in `picks.mjs`; add the optional pick key `forbidExtensions` (validated in `picks.mjs`) and the post-write `ForbiddenExtension` check in `convert-model.mjs`.
    - Widen the over-5 MB model warning in `convert-model.mjs` to name the three suggestions (texture size, triangle decimation, KTX2).
    - Add `tools/asset-lib/skeleton-report.mjs` exporting `skeletonReport(glbPath)` (skins, joint count and names, clips with durations, triangles, texture bytes), reusing `collectJointNames` from `bip01.mjs`.
    - Look up `@gltf-transform/functions` `metalRough`, `prune` with context7 before use.
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.9, 1.10_
  - [x] 1.2 Write property test for the animation edits
    - File `tools/asset-lib/edits/horror-edits.property.test.mjs` on synthetic gltf-transform documents.
    - **Property 1: Animation edits keep exactly what they are told to keep**
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.6**
  - [x] 1.3 Write property test and named example tests for the license check
    - Extend `tools/asset-lib/licenses.property.test.mjs` for Mixamo-host refusal and animation-free CC BY Sketchfab acceptance; add the two named example tests in `licenses.test.mjs` (`refuses a pick whose source host is mixamo.com (or a subdomain)`, `accepts a CC BY Sketchfab pick whose edits remove the animation clips`).
    - **Property 2: Mixamo hosts are refused, animation-free CC BY Sketchfab picks are accepted**
    - **Validates: Requirements 4.5, 4.6, 4.7**
  - [x] 1.4 Choose the Ground_Texture from Poly Haven
    - Use `tools/asset-lib/polyhaven.mjs` to search CC0 sets in the forest-floor and muddy-leaves categories with diffuse, `nor_gl` and rough at 1k; pick exactly one, check the three maps total at most 3,000,000 bytes, and add the `polyhaven-<slug>` pick (kind texture, group graveyard, resolution 1k, no `role`) to `tools/picks.json`.
    - Record slug, Poly Haven URL, reason and the two next-best candidates for the Batch report. If no set qualifies, stop the batch and ask the user.
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6_
  - [x] 1.5 Add the four model picks and two Growl picks
    - In `tools/picks.json` add `sketchfab-possessed-undead-giantswing` (`removeAnimations`, `specGlossToMetalRough` if needed, `decimate` to 30,000 triangles if larger), `sketchfab-zombie-pxltiger` (`keepAnimations` Idle, Walk1_InPlace, Attack, FallingForward), `sketchfab-zombie-walk-oscar` (`removeAnimations`), `sketchfab-hooded-horror-woman-purplepoint` (`removeAnimations`), each with `forbidExtensions: ["KHR_materials_pbrSpecularGlossiness"]`, license `CC BY 4.0`, and the exact titles, authors and URLs of Requirement 3.2.
    - Add `freesound-tonsil5-zombie-growl-5` (`.wav`) and `freesound-ezcah-zombie-growl-01` (`.flac`) as CC0 manual audio picks with the Freesound URLs of Requirement 3.11.
    - Fill the "changes" text required by 3.5, 3.6, 3.7 (including "no AI-generated tag on the Sketchfab model page, checked 2026-11-12"). Do not add a pick for the Footstep_Bed.
    - _Requirements: 1.1, 1.2, 3.1, 3.2, 3.3, 3.5, 3.6, 3.7, 3.9, 3.11, 3.14_
  - [x] 1.6 Run the pipeline and write Manifest and CREDITS.md rows
    - Run `Set-Location tools; node fetch-assets.mjs --strict` (then a second run to confirm no change). Check outputs: four glb files, three ground maps as WebP, both Growls converted to `.ogg` and `.mp3`, Manifest entries with all fields, and one `CREDITS.md` row per new Manifest file (only for files that exist; none for the Footstep_Bed).
    - Confirm the Credits_Dialog needs no code change. If a model exceeds 5,000,000 bytes, apply the reported compression step.
    - _Requirements: 1.1, 1.2, 1.3, 1.8, 1.9, 1.10, 3.1, 3.3, 3.4, 3.8, 3.12, 3.13, 3.14_
  - [x] 1.7 Update the manual-download README generator
    - In `tools/asset-lib/manual-readme.mjs` change the header to "wav, mp3, m4a or flac"; update `manual-readme.test.mjs` and extend fixtures of `manual-readme.property.test.mjs` and `credits.table.property.test.mjs` with the six new picks. Regenerate `tools/cache/manual/README.md` and check the checklist count equals the listed downloads.
    - _Requirements: 3.4, 3.10_
  - [x] 1.8 Write tests for the converted character models
    - File `tools/asset-lib/skeleton-report.test.mjs`: each of the four glb files loads with the Meshopt decoder, exposes a skinned mesh with at least 15 bones, contains no `KHR_materials_pbrSpecularGlossiness`, has the right clips (Walker has exactly the four; others none); `Walk1_InPlace` root translation is below 1 cm. Skip with a clear message when a glb is absent.
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 13.5_
  - [x] 1.9 Raise the pipeline ceiling (confirmed)
    - In `tools/asset-lib/budgets.mjs` set `LIMITS.graveyard` to 40,000,000 (Decision 6, confirmed, Requirement 5.12; the 25 MB visitor Group_Budget is the binding limit and is enforced separately by task 1.10). Update `budgets.test.mjs` and `budgets.property.test.mjs`. Confirm `LIMITS.total` still holds.
    - _Requirements: 5.6, 20.3_
  - [x] 1.10 Add the group budget list and the bundle check
    - Create `web/src/scenes/graveyard/groupAssets.json` (categories ground, characters, stones, props, sounds; separate `hdri`). Extend `assets.ts` with `GROUND_SLUG`, `ASSET_KEYS.forestFloor`, `characters`, `audio.growls`, `audio.footsteps`; update `assets.test.ts` so the JSON equals the set derived from `ASSET_KEYS` (excluding `craggleHand`, `ruella`, mp3 fallbacks and HDRI).
    - In `web/scripts/check-bundle.mjs` export `computeGroupBudget(files, groups)`; print bytes per category, HDRI separately, totals with and without HDRI; fail with the measured size and the 25,000,000 budget; fail on a missing key, non-finite bytes, or a group file above 5,000,000 bytes. Add the `__zfr_horror_debug__` marker to `FORBIDDEN_MARKERS`. Keep the existing 400 KB gzip and 25 MB initial-download checks. Document the fallback order of Requirement 5.13 in the script header and failure message: if the group is over 25,000,000 bytes, first stop loading and shipping unused assets (Craggle hand, already outside the group; the Mutant, which the Watcher replaces, once the user approves superseding Base_Spec Requirement 9 for it), then reduce texture quality, and always print the breakdown (5.14).
    - _Requirements: 3.13, 5.6, 5.7, 5.8, 5.9, 5.10, 5.12, 5.13, 5.14, 20.7_
  - [x] 1.11 Write property test for group budget accounting
    - File `web/scripts/check-bundle.test.mjs`.
    - **Property 3: Group budget accounting is exact**
    - **Validates: Requirements 3.13, 5.6, 5.7, 5.8, 5.10**
  - [x] 1.12 Update the asset licensing steering file
    - Edit `.kiro/steering/asset-licensing.md`: allow CC BY Sketchfab uploads without an AI-generated tag, name the four models (checked 2026-11-12); Mixamo clips and Mixamo-hosted files stay forbidden, a CC BY uploader's mesh and skeleton on a Mixamo-style rig are allowed; add the four uploads to "Current sources"; keep every other Forbidden entry unchanged.
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [x] 1.13 Preview scene and Batch 1 screenshot
    - Add a `--scene horror-assets` page to `tools/preview` showing the chosen Ground_Texture on a plane with the four Character_Models in the lights-off look. Save `reference/progress/horror-batch1-assets.png` at 1920 x 1080 with Playwright via `web/scripts/lib/browser.mjs`. Compare with `reference/graveyard/horror-direction.png`.
    - _Requirements: 2.4, 21.10, 21.11, 22.4_
  - [x] 1.14 Run the asset-auditor agent
    - Invoke the asset-auditor on `web/public/assets`; fix any missing `CREDITS.md` row, forbidden license, missing attribution, or file above 5 MB it reports until clean.
    - _Requirements: 4.8_
  - [x] 1.15 Run the full check for Batch 1
    - Run `Set-Location web; pnpm typecheck; pnpm lint; pnpm format; pnpm test; pnpm build` and `Set-Location ..\tools; pnpm test`. All must exit 0, with `check-bundle` enforcing the Group_Budget.
    - _Requirements: 21.1, 21.2_
  - [x] 1.16 Write the Batch 1 report
    - Report: what was done; check results; per-file and per-category byte breakdown with and without HDRI; chosen ground slug, URL, reason, two runners-up; skeleton report of each model (bones, clips, triangles); asset-auditor result; any AI-tag re-check finding; the confirmed 40,000,000 byte ceiling (task 1.9) and, if the fallback order of Requirement 5.13 was used, the before and after breakdown; no new dependencies.
    - _Requirements: 2.5, 3.8, 5.8, 22.3, 22.4, 22.10_
  - [x] 1.17 STOP: wait for the user to review Batch 1 before continuing.

- [ ] 2. Batch 2: Ground, grass, mounds, stones, picking and camera (Requirements 6 to 9)
  - [x] 2.1 Implement Stone_Jitter
    - Run `git pull`. Create `web/src/scenes/graveyard/layout/jitter.ts` with `stoneJitter(cik)` (12 uniforms from `mulberry32(fnv1a32(cik))`, offsets at most 0.30 m, yaw at most 20 degrees, height factor 0.90 to 1.10, fallen rate 0.05, fallen side yaw plus or minus 90 degrees, sink 0 to 0.08). Change `LEAN_ZOMBIE` to `[0.09, 0.13]` so total tilt stays at most 8 degrees. Pure: no React or three.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 20.8_
  - [x] 2.2 Write property test for jitter bounds and locality
    - File `layout/jitter.property.test.ts`; firm-list arbitrary of 1 to 400 firms, 1 to 12 sectors, all four statuses.
    - **Property 11: Jitter is bounded, local to the cik and deterministic**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.8, 8.10, 20.3**
  - [x] 2.3 Write property test for fallen stones
    - File `layout/fallen.property.test.ts`.
    - **Property 12: Fallen stones lie face up**
    - **Validates: Requirements 8.7**
  - [x] 2.4 Write property test for the fallen share
    - File `layout/fallenShare.property.test.ts`; lists of 2,500 to 3,000 distinct 10-digit ciks (Requirement 8.6 gives no hard guarantee below 2,500 firms; see the design risks).
    - **Property 13: Fallen share is about five percent**
    - **Validates: Requirements 8.6**
  - [x] 2.5 Implement extents and the band-packed layout
    - Create `layout/extents.ts` and rewrite the internals of `layout/layout.ts`: per-stone extent rectangles (oriented footprint plus the reserved mound zone), variable column and row sizes, `MIN_GAP = 0.15`, fallen stones lying backwards with face up, new `StoneLayout` fields (`fallen`, `standingYaw`, `baseY`, `pitCentre`) and `PlotLayout.rowAnchors`. Keep plot sorting, plot grid, `PLOT_GAP`, `FIRST_ROW_Z` and input-order `plot.stones`. Export `stoneBaseY` and `stoneCentreY` and switch `Stones.tsx`, `Flashlight.tsx`, `FocusMarker.tsx`, `Engravings.tsx` to them. Keep exactly 3 stone InstancedMesh objects.
    - Update superseded Base_Spec layout tests (`pointerPick.test.ts`, `placement.test.ts` call sites) and create the layout property test setup for the new algorithm.
    - After this change name `reference/graveyard/horror-direction.png` and `graveyard-rate-shock-3pp.png` as the matching references.
    - _Requirements: 8.2, 8.7, 8.9, 8.10, 8.11, 8.13, 8.14, 8.15, 20.2, 20.3_
  - [x] 2.6 Write property test for spacing and own-Pit clearance
    - File `layout/spacing.property.test.ts`.
    - **Property 14: Stones keep their distance and never cover their own Pit**
    - **Validates: Requirements 8.9, 8.10, 8.11**
  - [x] 2.7 Write property test for reading order and navigation
    - File `layout/readingOrder.property.test.ts`, plus the example test of 8.16 (a jitter change leaves keyboard order unchanged).
    - **Property 15: Reading order does not depend on jitter**
    - **Validates: Requirements 8.13, 8.14, 8.16**
  - [x] 2.8 Update picking and the spatial grid
    - In `layout/pick.ts` use the full rotation (yaw, pitch, roll) and an exact oriented-box slab test; in `layout/grid.ts` insert stones by `stoneReach` radius and use `stoneCentreY` in all queries.
    - _Requirements: 8.12, 8.14_
  - [x] 2.9 Write property test for picking
    - File `layout/pick.property.test.ts` against a brute-force oriented-box reference including tilted and fallen stones.
    - **Property 16: Picking equals the brute-force oriented box test**
    - **Validates: Requirements 8.12**
  - [x] 2.10 Move the camera inside the plot
    - In `layout/camera.ts` set `CAMERA_HEIGHT = 1.5`, `CAMERA_BACK = 2.6`, add pure `projectToNdc`. Update `GraveyardScene.tsx` initial camera and `model/placement.ts` `INITIAL_CAMERA` to `(0, 1.5, 5.6)`. Keep fov 52, sway, smoothing, flashlight offset, 1.2 s move, overview and fog rules.
    - Update superseded tests `camera.test.ts` (plot pose now `(0, 1.5, 5.6)`, target `(0, 0.2, -2)`) and `placement.test.ts`.
    - Matching references: `reference/graveyard/horror-direction.png` and `horror-direction-sequence.png`.
    - _Requirements: 9.1, 9.2, 9.4, 9.5, 9.6, 9.7, 9.9, 9.10, 20.3_
  - [x] 2.11 Write property test for the plot camera pose
    - File `layout/cameraPose.property.test.ts` over generated plot sizes, including the unchanged Base_Spec overview containment property.
    - **Property 17: Plot camera pose sits among the graves**
    - **Validates: Requirements 9.1, 9.2, 9.4, 9.6, 9.8**
  - [x] 2.12 Write property test for nearest-mound projection (pointer centred, no sway)
    - File `layout/cameraProjection.property.test.ts`; neutral pointer, sway 0, aspect ratios 1440/900 and 390/844.
    - **Property 18: Nearest-row mound bases project into the lower half**
    - **Validates: Requirements 9.3**
  - [x] 2.13 Add closed and torn mounds to the dressing plan
    - In `model/dressing.ts` add `torn`, `closed` (partition of all firms), `stains` (0 to 3 per torn mound, lights off only); `mounds` keeps equalling `undead`. Update superseded `dressing.test.ts`.
    - _Requirements: 7.1, 7.4, 7.6, 7.10, 7.11, 16.4, 20.3_
  - [x] 2.14 Write property test for the dressing plan
    - File `model/dressing.property.test.ts`.
    - **Property 7: Every headstone has exactly one mound, and the plan follows the shock and lights**
    - **Validates: Requirements 7.1, 7.4, 7.6, 7.10, 7.11, 10.6, 16.4**
  - [x] 2.15 Implement torn mound geometry and pit rules
    - Create `model/tornMound.ts` (pure): `tornMoundProfile`, Pit radius (width 0.5 to 0.9 m), clod count 6 to 14 and seeded positions from `PIT_R + 0.05` to 1.2 m, and `tornMoundSet(torn, activeCiks)`.
    - _Requirements: 7.2, 7.3, 7.5_
  - [x] 2.16 Write property test for the torn mound set
    - File `model/tornMoundSet.property.test.ts`.
    - **Property 8: A torn mound is never removed under a character**
    - **Validates: Requirements 7.5**
  - [x] 2.17 Write property test for pit and clod geometry
    - File `model/tornMound.property.test.ts`.
    - **Property 9: Pit and clod geometry**
    - **Validates: Requirements 7.2**
  - [x] 2.18 Write property test for mound placement
    - File `model/moundPlacement.property.test.ts`.
    - **Property 10: Mounds follow the jittered, standing headstone**
    - **Validates: Requirements 7.7, 7.8, 7.9**
  - [x] 2.19 Use the Ground_Texture
    - Update `r3f/Ground.tsx` to load `ASSET_KEYS.forestFloor` (1k, repeat at least 128 texels per metre, `TILE_M = 4`), start loading within 100 ms after the first frame, keep the soil material for mounds and the `#0b0806` fallback with the HUD notice.
    - Matching reference: `reference/graveyard/horror-direction.png`. Offer scene-critic.
    - _Requirements: 5.2, 6.1, 6.2, 6.3_
  - [x] 2.20 Implement grass placement and texture
    - Create `model/grassTexture.ts` (own-code RGBA 128 x 128 blade texture) and `model/grass.ts` (`placeGrass(layout, plotIndex, quality)`: seed from `fnv1a32(plot.sector)`, near-mound density, sparse background, at most 1,500 per plot, reject cards inside stone footprints and Pits, cards at most 0.35 m high, low quality halves).
    - _Requirements: 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_
  - [x] 2.21 Write property test for grass determinism and plot locality
    - File `model/grassDeterminism.property.test.ts`.
    - **Property 5: Grass placement is deterministic and local to its plot**
    - **Validates: Requirements 6.6**
  - [x] 2.22 Write property test for grass clearance, cap, density and quality
    - File `model/grass.property.test.ts`.
    - **Property 6: Grass respects clearance, cap, density and quality**
    - **Validates: Requirements 6.5, 6.7, 6.8, 6.9**
  - [x] 2.23 Implement the Grass component
    - Create `r3f/Grass.tsx`: one InstancedMesh (capacity 1,500), crossed-quad geometry, `DataTexture` with mipmaps and `SRGBColorSpace`, `alphaTest = 0.5`, `DoubleSide`; only the framed plot is written; same cards in lights on with lights-on lighting. Look up three `DataTexture` and `InstancedMesh` APIs with context7.
    - _Requirements: 6.4, 6.10, 6.11_
  - [x] 2.24 Implement closed and torn mounds and wire the Batch 2 scene
    - Update `r3f/Mounds.tsx` (closed, every non-torn stone, oriented by `standingYaw`); create `r3f/TornMounds.tsx` (torn heap, Pit discs, clods, lights-off stains) all instanced; replace `tornMoundSet` use for 1 s and 2 s timing; mount `Grass`, `Mounds`, `TornMounds` in `GraveyardScene.tsx`. Keep `Hands` for now (removed in Batch 3a, task 3.30).
    - Matching references: `reference/graveyard/horror-direction.png` and `horror-direction-sequence.png`. Offer scene-critic.
    - _Requirements: 6.11, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 8.15_
  - [x] 2.25 Write the scene tests for Batch 2
    - Create `Horror.scene.test.tsx` (jsdom, mocked Canvas): exactly 3 stone InstancedMesh with a fallen stone, no model request before the first frame. Create `horror.purity.test.ts` scanning the new pure modules for `react`/`three` imports and `setTimeout`/`setInterval`.
    - _Requirements: 5.1, 8.15, 11.14, 20.8_
  - [x] 2.26 Add the Batch 2 screenshot script
    - Create `web/scripts/horror-screenshots.mjs --batch 2` (headed Chrome, 1920 x 1080, `/?firms=3000`, lights off) writing `reference/progress/horror-batch2-ground-graves.png` (Plot 1 pose, nearest mounds in the lower half) and `reference/progress/horror-batch2-stones.png` (tilted, rotated, at least one fallen stone). Use the UI plus the DEV-only `?horror=` helper where needed.
    - _Requirements: 21.10, 21.11, 22.5_
  - [x] 2.27 Capture Batch 2 screenshots and offer the scene review
    - Ask the user to start `Set-Location web; pnpm dev` (long-running; do not start it from a command), then run `Set-Location web; node scripts/horror-screenshots.mjs --batch 2 --url http://localhost:5173`. Name the matching references and offer the scene-critic.
    - _Requirements: 21.10, 22.5, 22.7_
  - [x] 2.28 Run the full check for Batch 2
    - Run `Set-Location web; pnpm typecheck; pnpm lint; pnpm format; pnpm test; pnpm build`. All must exit 0.
    - _Requirements: 21.1, 21.2_
  - [x] 2.29 Write the Batch 2 report
    - Report: what was done; check results; screenshots; superseded tests updated (`camera.test.ts`, `placement.test.ts`, `dressing.test.ts`, layout call sites); open decisions (fallen-share and neutral-pointer defaults); no new dependencies.
    - _Requirements: 20.4, 22.3, 22.5, 22.10_
  - [~] 2.30 STOP: wait for the user to review Batch 2 before continuing.

- [ ] 3. Batch 3 in two parts. Batch 3a (rising zombies: tasks 3.1 to 3.23, 3.27 to 3.30, 3.61 to 3.64, then STOP 3.65). Batch 3b (Standing_Zombies, Watcher, sound, Content_Notice, fps and final checks: every task after 3.65 in this list, ending with STOP 3.60) (Requirements 10 to 19, 21)
  - [~] 3.1 Implement the Settled_Shock tracker
    - Run `git pull`. Create `model/settle.ts` with `SETTLE_SECONDS = 0.25` and `stepSettle` (pure; no timers).
    - _Requirements: 10.4, 11.14_
  - [~] 3.2 Write property test for Settled_Shock timing
    - File `model/settle.property.test.ts`.
    - **Property 20: Settled_Shock timing**
    - **Validates: Requirements 10.4**
  - [~] 3.3 Implement nearest assignment, selection pose and selection store
    - Create `model/selection.ts` (`assignNearest`, `candidatesFor`, `RISEN_BUDGET = 8`, `STANDING_BUDGET = 4`) from `assignHands`; add `selectionPose` to `layout/camera.ts`; create `selectionStore.ts` (own zustand store).
    - _Requirements: 10.1, 10.2, 10.3, 10.8, 10.11, 20.5_
  - [~] 3.4 Write property test for nearest assignment
    - File `model/selection.property.test.ts`, absorbing the `assignHands` cases of `handPool.test.ts`.
    - **Property 19: Nearest assignment**
    - **Validates: Requirements 10.1, 10.2, 10.12**
  - [~] 3.5 Implement the Risen pool
    - Create `model/risenPool.ts` (`stepRisenPool`, `RISE_SECONDS = 3.0`, `LOWER_SECONDS = 1.2`, waiting for `ready`, lowering holds the slot, Reduced_Motion jumps to `up`).
    - _Requirements: 10.5, 10.6, 10.7, 10.9, 11.8, 11.15, 12.6, 15.3_
  - [~] 3.6 Write property test for the Risen pool
    - File `model/risenPool.property.test.ts`, absorbing the pool cases of `handPool.test.ts`.
    - **Property 21: The Risen pool respects the budget and the choreography**
    - **Validates: Requirements 10.5, 10.7, 10.9, 11.8, 11.15, 12.6, 15.3**
  - [~] 3.7 Implement the Bone_Animator and bone maps
    - Create `model/boneAnimator.ts` (`frameAt`, `twitchTimes`, six key poses, `DIRT_BURST_AT = 0.35`, breathing and head twitches seeded by cik, pure) and `model/boneMaps.ts` for Hero, Walker, Crawler filled from the Batch 1 skeleton report.
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.9, 11.10, 11.11, 11.12, 11.13, 11.15, 20.8_
  - [~] 3.8 Write property test for Rise_Sequence shape
    - File `model/boneShape.property.test.ts`.
    - **Property 22: Rise_Sequence shape**
    - **Validates: Requirements 11.3, 11.4**
  - [~] 3.9 Write property test for Bone_Animator purity and smoothness
    - File `model/boneSmooth.property.test.ts`.
    - **Property 23: The Bone_Animator is pure and smooth**
    - **Validates: Requirements 11.12, 11.13**
  - [~] 3.10 Write property test for nothing below the waist
    - File `model/boneBelowWaist.property.test.ts`.
    - **Property 24: Nothing below the waist rises above the rim**
    - **Validates: Requirements 11.6**
  - [~] 3.11 Write property test for idle schedules
    - File `model/boneIdle.property.test.ts`.
    - **Property 25: Idle schedules stay in range and follow the cik**
    - **Validates: Requirements 11.9, 11.10**
  - [~] 3.12 Implement the two-bone IK solver
    - Create `model/twoBoneIk.ts` (`solveTwoBone`, pure vectors, pole keeps the elbow above the rim).
    - _Requirements: 11.6, 11.7_
  - [~] 3.13 Write property test for planted hands
    - File `model/twoBoneIk.property.test.ts`.
    - **Property 26: Planted hands stay planted**
    - **Validates: Requirements 11.7**
  - [~] 3.14 Implement character scaling
    - Create `model/characterScale.ts` (`scaleForHeight`, target 1.6 to 1.9 m).
    - _Requirements: 11.16_
  - [~] 3.15 Write property test for character scale
    - File `model/characterScale.property.test.ts`.
    - **Property 28: Characters are scaled into the height range**
    - **Validates: Requirements 11.16**
  - [~] 3.16 Implement the Dirt_Burst particle function
    - Create `model/dirtBurst.ts` (`dirtParticles`, ballistic, 40 particles or 20 in low quality, one burst per rise, 8 x 40 pooled).
    - _Requirements: 11.5, 19.1_
  - [~] 3.17 Write property test for Dirt_Burst budget
    - File `model/dirtBurst.property.test.ts`.
    - **Property 27: Dirt_Burst particle budget**
    - **Validates: Requirements 11.5, 19.1**
  - [~] 3.18 Implement model assignment and requested models
    - Create `model/modelAssignment.ts` (`wantedModel`, `resolveModel` fallback chain, `requestedModels(selection, lights, reduced, firstFrameDone)`).
    - _Requirements: 5.1, 5.3, 5.4, 5.11, 12.1, 12.2, 12.3, 12.5, 12.7, 14.13, 16.3_
  - [~] 3.19 Write property test for model assignment
    - File `model/modelAssignment.property.test.ts`.
    - **Property 29: Model assignment follows rank, hash and lights**
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.5, 16.3, 19.6**
  - [~] 3.20 Write property test for the fallback chain
    - File `model/modelFallback.property.test.ts`.
    - **Property 30: Model fallback chain**
    - **Validates: Requirements 5.11, 12.7**
  - [~] 3.21 Write property test for requested models
    - File `model/requestedModels.property.test.ts`.
    - **Property 4: Requested character models follow lights, motion and need**
    - **Validates: Requirements 5.1, 5.3, 5.4, 14.13**
  - [~] 3.22 Implement horror quality settings
    - Create `model/horrorQuality.ts` (grass scale, Dirt_Burst particles, no character shadows, budgets unchanged).
    - _Requirements: 19.1, 19.2_
  - [~] 3.23 Write property test for horror quality
    - File `model/horrorQuality.property.test.ts`.
    - **Property 44: Horror quality**
    - **Validates: Requirements 19.1, 19.2**
  - [~] 3.27 Implement the character loader and bone-map tests
    - Create `r3f/characterLoader.ts` (`useGLTF(url, false)` per model id, loaded only when first needed after the first frame, never hero/watcher in lights on, never watcher under Reduced_Motion, `reportAssetError`, `SkeletonUtils.clone` sharing geometry and materials). Look up `useGLTF` and `SkeletonUtils` with context7.
    - Add the Vitest test asserting every bone name in each bone map exists in the loaded model.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.11, 11.11, 12.6, 12.7_
  - [~] 3.28 Implement SelectionController and the settled shock store field
    - Add `settledShock` to the main store (`state/store.ts`); create `r3f/SelectionController.tsx` (`useFrame` priority -8; events: settled shock, camera target change, first load; computes risen and `modelByCik` into `selectionStore`; the Standing set is added in 3.66, Batch 3b).
    - Matching references: `reference/graveyard/horror-direction-sequence.png`. Offer scene-critic.
    - _Requirements: 10.1, 10.3, 10.4, 10.8, 10.10, 12.5, 13.2, 20.5_
  - [~] 3.29 Implement Characters and Dirt_Burst rendering
    - Create `r3f/Characters.tsx` (`useFrame` priority -4: Risen via `stepRisenPool`, Bone_Animator and IK, Reduced_Motion final pose, Hero swap to Walker in lights on, model swap keeping phase, `raycast = () => null`, no culling, no blood, shadows by quality) and `r3f/DirtBurst.tsx` (priority -3, 320 instances). Generalise `riseEvents.ts` to `createEmitter<T>()` and add `riseFinishedEvents`.
    - Matching references: `reference/graveyard/horror-direction-sequence.png` and `horror-direction.png`. Offer scene-critic.
    - _Requirements: 10.9, 10.13, 11.1, 11.5, 11.6, 11.7, 11.8, 11.15, 12.4, 12.8, 15.3, 16.1, 16.2, 19.5_
  - [~] 3.30 Wire the scene and retire the Craggle hand
    - In `GraveyardScene.tsx` mount `SelectionController` and `Characters`, remove `Hands`; delete `r3f/Hands.tsx`, `model/handPool.ts` and `handPool.test.ts` (superseded; cases moved in 3.4 and 3.6). Keep the Craggle_Hand file, Manifest entry and `CREDITS.md` row. Ensure no production import of hand modules remains.
    - Matching references: `reference/graveyard/horror-direction.png` and `horror-direction-sequence.png`. Offer scene-critic.
    - _Requirements: 15.1, 15.2, 15.4, 15.5, 15.6, 20.2, 20.3_
  - [~] 3.61 Add the Batch 3a screenshot script and scene tests
    - Run `git pull`. Create `web/scripts/horror-screenshots.mjs` support for `--batch 3a` writing `reference/progress/horror-batch3a-rise.png` (lights off, `/?firms=3000`, 1920 x 1080, a Risen_Zombie at the waist-high pose next to its Torn_Mound). Use the UI plus the DEV-only `?horror=rise` helper (add the helper and the `__zfr_horror_debug__` guard here if 3.53 has not run; 3.53 then only extends it).
    - Extend `Horror.scene.test.tsx` (no `Hands` import, characters have null `raycast`, Walker failure gives no risen zombies and torn mounds stay) and `horror.purity.test.ts` for the 3a pure modules (`settle`, `selection`, `risenPool`, `boneAnimator`, `twoBoneIk`, `characterScale`, `dirtBurst`, `modelAssignment`, `horrorQuality`).
    - _Requirements: 10.13, 12.7, 12.8, 15.1, 20.8, 21.10, 21.11, 22.6_
  - [~] 3.62 Capture the Batch 3a screenshot and offer the scene review
    - Ask the user to start `Set-Location web; pnpm dev` (long-running; do not start it from a command), then run `Set-Location web; node scripts/horror-screenshots.mjs --batch 3a --url http://localhost:5173`. Name `reference/graveyard/horror-direction-sequence.png` and `horror-direction.png` as the matching references and offer the scene-critic.
    - _Requirements: 21.10, 22.6, 22.7_
  - [~] 3.63 Run the full check for Batch 3a
    - Run `Set-Location web; pnpm typecheck; pnpm lint; pnpm format; pnpm test; pnpm build`. All must exit 0 (`check-bundle` enforces the Group_Budget; if it fails, apply the fallback order of Requirement 5 criterion 13).
    - _Requirements: 5.13, 21.1, 21.2_
  - [~] 3.64 Write the Batch 3a report
    - Report: what was done (Rise_Sequence, Bone_Animator, rise selection, Torn_Mound swap, Dirt_Burst, lowering, Hero swap in lights on, Craggle hand retired); check results; `horror-batch3a-rise.png`; superseded tests updated (`handPool.test.ts` removed); open decisions; no new dependencies. State that Standing_Zombies, Watcher, sound and Content_Notice are not started.
    - _Requirements: 20.4, 22.3, 22.6, 22.10_
  - [~] 3.65 STOP: wait for the user to review Batch 3a before continuing.
  - [~] 3.66 Add Standing_Zombies to the controller and Characters (Batch 3b starts here)
    - Run `git pull`. In `r3f/SelectionController.tsx` compute the Standing set (only on camera target change or first load) with `standingPlacement` and `assignNearest` and write it into `selectionStore`. In `r3f/Characters.tsx` add the Standing_Zombies: Idle or Walk1_InPlace clip by the hash bit, Reduced_Motion shows the first frame of the Idle clip, removal after the camera move and never inside the viewport, no blood decal, `raycast = () => null`.
    - Matching references: `reference/graveyard/horror-direction.png` and `horror-direction-sequence.png`. Offer scene-critic.
    - _Requirements: 13.2, 13.3, 13.5, 13.10, 13.11, 13.13_
  - [~] 3.24 Implement Standing_Zombie placement
    - Create `model/standing.ts` (`standingPlacement`, clearances of 13.7, facing, clip bit) using `assignNearest` for the at most 4 Already_Undead firms.
    - _Requirements: 13.1, 13.3, 13.4, 13.6, 13.7, 13.8, 13.9_
  - [~] 3.25 Write property test for Standing_Zombie placement
    - File `model/standing.property.test.ts`.
    - **Property 31: Standing_Zombies are the nearest already-undead firms, placed with clearance**
    - **Validates: Requirements 13.1, 13.6, 13.7, 13.8, 13.9, 13.12**
  - [~] 3.26 Write property test for the standing clip bit
    - File `model/standingClip.property.test.ts`.
    - **Property 32: Standing clip follows one hash bit**
    - **Validates: Requirements 13.4**
  - [~] 3.31 Implement the Growl limiter and choice
    - Create `audio/growl.ts` (`createGrowlLimiter`, `GROWL_MIN_GAP_MS`, `pickGrowl`).
    - _Requirements: 17.2, 17.10, 17.11_
  - [~] 3.32 Write property test for the Growl limiter
    - File `audio/growl.property.test.ts`.
    - **Property 39: Growl limiter**
    - **Validates: Requirements 17.2, 17.10**
  - [~] 3.33 Write property test for the Growl choice
    - File `audio/growlChoice.property.test.ts`.
    - **Property 40: Growl choice**
    - **Validates: Requirements 17.11**
  - [~] 3.34 Implement the Footstep_Bed gain and state
    - Create `audio/footsteps.ts` (`footstepGain`, `FOOTSTEP_MAX_GAIN`, `nextFootstep`).
    - _Requirements: 17.15, 17.21_
  - [~] 3.35 Write property test for the footstep gain
    - File `audio/footsteps.property.test.ts`.
    - **Property 42: Footstep gain**
    - **Validates: Requirements 17.15, 17.21**
  - [~] 3.36 Extend the Audio_Engine
    - In `audio/audioEngine.ts` add `linearRampToValueAtTime` to `AudioParamLike`, `setLights`, `setReducedMotion`, `playGrowl` (gain 0.4, fade, stop within 3 s, limiter, `growlSource` option, fallback to the other file), `setFootstepDistance` (lazy load, 1 s fade-in/out, smoothed gain, restart on unmute; never loaded or started while Reduced_Motion is true, fades out over 1 s when Reduced_Motion becomes true, restarts with a fade-in when it becomes false and a zombie is nearby; the Growl ignores Reduced_Motion). Update the fake `AudioParam` in `audioEngine.test.ts`.
    - _Requirements: 17.1, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8, 17.12, 17.13, 17.14, 17.15, 17.16, 17.17, 17.18, 17.19, 17.20, 16.5_
  - [~] 3.37 Write property test for gate, mute and lights behaviour
    - File `audio/audioEngine.horror.test.ts` with the recording fake `AudioContext`.
    - **Property 41: Growl and Footstep_Bed are silent before the gate, when muted, (Footstep_Bed) in reduced motion, and (Growl) in lights on**
    - **Validates: Requirements 17.4, 17.5, 17.18, 17.19**
  - [~] 3.38 Wire audio to the scene
    - In `audio/useGraveyardAudio.ts` keep `riseEvents` for digging, subscribe to `riseFinishedEvents` for `playGrowl`, mirror `settings.lights` into `setLights` and `settings.reducedMotion` into `setReducedMotion`; in `Characters.tsx` compute the nearest Nearby_Standing_Zombie distance each frame and call `setFootstepDistance` when it changes by 0.05 m or the nearby state flips. Update `useGraveyardAudio.test.tsx` (superseded: rise-finished subscription, lights mirror and reduced-motion mirror).
    - _Requirements: 17.1, 17.9, 17.12, 17.16, 17.17, 17.19, 20.3_
  - [~] 3.39 Implement Far_Spots
    - Create `model/farSpots.ts` (`farSpots`, farthest two rows or farthest plot in overview, clearances, sorted by distance).
    - _Requirements: 14.3, 14.7_
  - [~] 3.40 Write property test for Far_Spots
    - File `model/farSpots.property.test.ts`.
    - **Property 36: Far spots are valid**
    - **Validates: Requirements 14.3**
  - [~] 3.41 Implement the Watcher state machine
    - Create `model/watcher.ts` (`createWatcher`, tick, `onTargetChange`, injected clock and seeded rand, no audio).
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.9, 14.11, 14.12, 14.13, 14.14, 14.15, 14.16, 14.19, 14.20_
  - [~] 3.42 Write property test for Watcher enabling
    - File `model/watcherEnable.property.test.ts`.
    - **Property 33: The Watcher is only enabled in the right conditions**
    - **Validates: Requirements 14.1, 14.2, 14.8, 14.9, 14.11, 14.12, 14.13, 14.14, 16.6**
  - [~] 3.43 Write property test for Watcher appearances
    - File `model/watcherAppear.property.test.ts`.
    - **Property 34: Appearances shrink in distance, change spot and avoid the cone**
    - **Validates: Requirements 14.3, 14.5, 14.6, 14.7, 14.15**
  - [~] 3.44 Write property test for Watcher vanishing
    - File `model/watcherVanish.property.test.ts`.
    - **Property 35: Vanishing happens in the same tick as the cone cover**
    - **Validates: Requirements 14.4**
  - [~] 3.45 Implement Cone_Active and the touch Cone_Target
    - Create `r3f/coneInput.ts` (pure reducer: pointer types, tap, target); update `r3f/Flashlight.tsx` to use the touch target and publish `coneActive`.
    - Matching reference: `reference/graveyard/horror-direction.png`. Offer scene-critic.
    - _Requirements: 14.1, 14.9, 14.10_
  - [~] 3.46 Write property test for Cone_Active
    - File `r3f/coneInput.property.test.ts`.
    - **Property 37: Cone_Active and the touch target**
    - **Validates: Requirements 14.1, 14.10**
  - [~] 3.47 Add the Vanish_Glitch trigger
    - In `fx/glitchScheduler.ts` add `trigger(now)` (starts only when no glitch runs and the last ended at least 1 s ago; never extends a running glitch).
    - Matching reference: `reference/graveyard/horror-direction.png`. Offer scene-critic.
    - _Requirements: 14.17, 14.18, 19.3_
  - [~] 3.48 Write property test for the Vanish_Glitch limits
    - File `fx/glitchScheduler.property.test.ts`.
    - **Property 38: A vanish glitch never breaks the flash and change limits**
    - **Validates: Requirements 14.17, 14.18, 19.3**
  - [~] 3.49 Implement the Watcher scene component
    - Create `scenes/graveyard/watcherEvents.ts` and `r3f/Watcher.tsx` (one Watcher_Model clone, faces the Selection_Pose, visibility from the state machine in `useFrame`, lazy load lights off and motion allowed only, no blood or sound); subscribe `fx/CctvPass.tsx` to `watcherEvents.vanish` (early return in lights on or Reduced_Motion); mount `Watcher` in `GraveyardScene.tsx`.
    - Matching references: `reference/graveyard/horror-direction.png` and `horror-direction-sequence.png`. Offer scene-critic.
    - _Requirements: 14.1, 14.3, 14.4, 14.9, 14.11, 14.13, 14.14, 14.15, 14.16, 14.17, 14.18, 14.19, 16.6, 19.2_
  - [~] 3.50 Implement the Content_Notice state
    - Create `state/contentNotice.ts` (slice `contentNotice { open, dismissed }`, `dismissContentNotice`, `openContentNotice`, storage key `zfr.contentNotice.v1`, never throws).
    - _Requirements: 18.1, 18.2, 18.3, 20.5_
  - [~] 3.51 Write property test for notice dismissal
    - File `state/contentNotice.property.test.ts` with a stub storage.
    - **Property 43: Content notice dismissal round trip**
    - **Validates: Requirements 18.2, 18.3**
  - [~] 3.52 Implement the Content_Notice UI and footer link
    - Create `ui/ContentNotice.tsx` and `ui/NoticeLink.tsx`; mount in `ui/Hud.tsx` next to the footer text "Data: SEC EDGAR. Not investment advice."; docked outside the stage, focus moves to dismiss on reopen and back to the link on dismiss, 2 px focus ring, one line at 390 px with font at least 12 px. Write `ContentNotice.test.tsx` (jsdom + vitest-axe) and add two rows to `contrast.test.ts`.
    - _Requirements: 18.1, 18.2, 18.4, 18.5, 18.6, 18.7, 18.8, 18.9, 18.10, 18.11, 18.12_
  - [~] 3.53 Implement the fps measurement and dev helpers
    - Finish `web/scripts/measure-fps.mjs` if Base_Spec task 21.1 is still open (Decision 10), then add `--horror`: headed Playwright, `?firms=3000`, lights off, normal quality, 1920 x 1080, framed Plot; find the lowest 0.25 pp step with at least 8 Newly_Undead firms (`findShockStep`), wait 2 s after the Settled_Shock, record at least 10 s; emit the DEVLOG fields of 21.5 including GPU name and browser version. Add the DEV-only `HorrorStats` component (`data-risen-count`, `data-standing-count`, `data-watcher-count`) and the `?horror=rise|watcher|notice` helper behind `import.meta.env.DEV`.
    - _Requirements: 21.3, 21.4, 21.5, 21.8_
  - [~] 3.54 Write property test for the shock step finder
    - File `web/scripts/measure-fps.test.mjs` (also the DEVLOG formatter fields).
    - **Property 45: The measurement step finder**
    - **Validates: Requirements 21.4, 21.5**
  - [~] 3.55 Extend the screenshot script and the scene tests for Batch 3b
    - Add `--batch 3b` to `web/scripts/horror-screenshots.mjs` writing `horror-batch3b-standing.png`, `horror-batch3b-watcher.png`, `horror-batch3b-notice.png` under `reference/progress/` (the Batch 3a rise screenshot is task 3.61). Extend `Horror.scene.test.tsx` (Standing_Zombies have null `raycast`, at most 13 skinned characters) and `horror.purity.test.ts` (the 3b pure modules: standing, farSpots, watcher, growl, footsteps).
    - _Requirements: 10.13, 12.7, 12.8, 15.1, 19.5, 20.8, 21.10, 22.6_
  - [~] 3.56 Run the headed fps measurement and record the numbers
    - Ask the user to start `Set-Location web; pnpm dev` (long-running), then run `Set-Location web; node scripts/measure-fps.mjs --horror --url http://localhost:5173 --seconds 10`. Add the DEVLOG.md entry with every field of 21.5. Report average fps, minimum 1-second fps and the GPU name to the user. If the average is below 50, report the number, the GPU and the cost of Character_Models, Grass_Cards, Torn_Mounds and post-processing, and do not mark the Horror_Pass complete. State if the machine is not an integrated-GPU laptop.
    - _Requirements: 21.3, 21.4, 21.5, 21.6, 21.7, 21.8, 21.9_
  - [~] 3.57 Capture Batch 3b screenshots and offer the scene review
    - Run `Set-Location web; node scripts/horror-screenshots.mjs --batch 3b --url http://localhost:5173` against the running dev server. Name `reference/graveyard/horror-direction.png`, `horror-direction-sequence.png` and `graveyard-rate-shock-3pp.png` as matching references and offer the scene-critic.
    - _Requirements: 21.10, 21.11, 22.6, 22.7_
  - [~] 3.58 Run the final full check
    - Run `Set-Location web; pnpm typecheck; pnpm lint; pnpm format; pnpm test; pnpm build` (build includes `check-bundle` with the Group_Budget). All must exit 0. Also run `Set-Location ..\tools; pnpm test`.
    - _Requirements: 20.7, 21.1, 21.2_
  - [~] 3.59 Write the Batch 3b report
    - Report: what was done in Batch 3b (Standing_Zombies, Watcher, sound, notice); final check results; screenshots; measured fps numbers and GPU name; superseded tests updated (`useGraveyardAudio.test.tsx`, `audioEngine.test.ts`; `handPool.test.ts` was removed in Batch 3a); open decisions; note that final acceptance is recorded only after the user signs off.
    - _Requirements: 20.4, 21.9, 22.3, 22.6_
  - [~] 3.60 STOP: wait for the user to review Batch 3b before continuing.

## Notes

- All property tests are mandatory sub-tasks in this plan (no optional markers), per request. Each references the design property number and requirement clauses.
- The three earlier open decisions are confirmed: pipeline ceiling 40,000,000 bytes with the 25 MB visitor budget binding (1.9, 1.10); fallen share required for 2,500 to 3,000 firms (2.4); Requirement 9.3 at the framed pose, pointer centred, no sway (2.12).
- The three screenshot and measurement tasks (2.27, 3.56, 3.57) need a running dev server; the user starts it with `Set-Location web; pnpm dev`.
- Each batch (1, 2, 3a, 3b) ends with a STOP task; do not start the next batch without approval. Batch 3a ends at 3.65; every Batch 3b task (Standing_Zombies 3.24 to 3.26 and 3.66, Watcher, sound, notice, fps, final checks) comes after 3.65 and the batch ends at 3.60. Task ids were kept stable; new ids start at 3.61.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3", "1.4", "1.9", "1.12"] },
    { "id": 1, "tasks": ["1.2", "1.5", "1.7"] },
    { "id": 2, "tasks": ["1.6"] },
    { "id": 3, "tasks": ["1.8", "1.10", "1.13"] },
    { "id": 4, "tasks": ["1.11", "1.14"] },
    { "id": 5, "tasks": ["1.15"] },
    { "id": 6, "tasks": ["1.16"] },
    { "id": 7, "tasks": ["1.17"] },
    { "id": 8, "tasks": ["2.1", "2.13", "2.19"] },
    { "id": 9, "tasks": ["2.5", "2.14"] },
    { "id": 10, "tasks": ["2.2", "2.3", "2.4", "2.6", "2.7", "2.8", "2.10", "2.15", "2.18", "2.20"] },
    { "id": 11, "tasks": ["2.9", "2.11", "2.12", "2.16", "2.17", "2.21", "2.22", "2.23"] },
    { "id": 12, "tasks": ["2.24", "2.26"] },
    { "id": 13, "tasks": ["2.25"] },
    { "id": 14, "tasks": ["2.27"] },
    { "id": 15, "tasks": ["2.28"] },
    { "id": 16, "tasks": ["2.29"] },
    { "id": 17, "tasks": ["2.30"] },
    { "id": 18, "tasks": ["3.1", "3.3", "3.5", "3.7", "3.12", "3.14", "3.16", "3.18", "3.22"] },
    { "id": 19, "tasks": ["3.2", "3.4", "3.6", "3.8", "3.9", "3.10", "3.11", "3.13", "3.15", "3.17", "3.19", "3.20", "3.21", "3.23", "3.27"] },
    { "id": 20, "tasks": ["3.28"] },
    { "id": 21, "tasks": ["3.29"] },
    { "id": 22, "tasks": ["3.30"] },
    { "id": 23, "tasks": ["3.61"] },
    { "id": 24, "tasks": ["3.62"] },
    { "id": 25, "tasks": ["3.63"] },
    { "id": 26, "tasks": ["3.64"] },
    { "id": 27, "tasks": ["3.65"] },
    { "id": 28, "tasks": ["3.24", "3.31", "3.34", "3.39", "3.45", "3.47", "3.50"] },
    { "id": 29, "tasks": ["3.25", "3.26", "3.32", "3.33", "3.35", "3.36", "3.40", "3.41", "3.46", "3.48", "3.51", "3.52", "3.53"] },
    { "id": 30, "tasks": ["3.37", "3.42", "3.43", "3.44", "3.54", "3.66"] },
    { "id": 31, "tasks": ["3.38", "3.49"] },
    { "id": 32, "tasks": ["3.55"] },
    { "id": 33, "tasks": ["3.56"] },
    { "id": 34, "tasks": ["3.57"] },
    { "id": 35, "tasks": ["3.58"] },
    { "id": 36, "tasks": ["3.59"] },
    { "id": 37, "tasks": ["3.60"] }
  ]
}
```
