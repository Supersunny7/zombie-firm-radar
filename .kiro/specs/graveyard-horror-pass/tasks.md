# Implementation Plan: Graveyard Horror Pass

## Overview

Four batches (1, 2, 2b, 3), each ending with a STOP task (Requirement 38). Batches 1 and 2 are delivered. Requirements 30 to 37 moved to a future control-room-experience spec and have no tasks here. The design is written in TypeScript (web) and Node ESM (tools), so no language question is needed. All commands are PowerShell, chained with `;`.

Rules that apply to every task:

- Before starting work, run `git pull` (shared repository).
- Before using an API of `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `three-custom-shader-material` or `@theatre/core`, look it up with the context7 MCP server (Requirement 22.8).
- Do not edit `/pipeline`, `/data` generation code, `data-contract.md`, or `web/src/engine`. Add no dependency (Requirement 22.10); if one becomes necessary, pin it exactly and name it in the Batch report.
- Create commits only when the user asks. Use the scope `graveyard-horror-pass`, for example `feat(graveyard-horror-pass): add torn mound`.
- After any change under `web/src/scenes/**` or `web/src/fx/**`, name the matching reference (`reference/graveyard/horror-direction.png`, `reference/graveyard/horror-direction-sequence.png`, and `reference/graveyard/graveyard-rate-shock-3pp.png` for unchanged parts) and offer a scene-critic review.
- Property tests use fast-check with at least 100 runs, one test per property, with the comment `// Feature: graveyard-horror-pass, Property N: <title>`.
- Confirmed by the user: (a) pipeline ceiling `LIMITS.graveyard` is 40,000,000 bytes on disk while the 25 MB visitor Group_Budget is the binding limit (tasks 1.9, 1.10); (b) the 3 to 7 percent fallen share is required for lists of 2,500 to 3,000 firms only (Requirement 8.6, task 2.4); (c) Requirement 9.3 is checked at the framed pose with the pointer centred and no sway (task 2.12); (d) scope cut 2026-11-13: this spec stops at Batch 3 (Standing_Zombies, Watcher, Footstep_Bed and Content_Notice are not built).

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

- [x] 2. Batch 2: Ground, grass, mounds, stones, picking and camera (Requirements 6 to 9)
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
  - [x] 2.30 STOP: wait for the user to review Batch 2 before continuing.

- [ ] 3. Batch 2b: prototype look (Requirements 23, 24, 25)
  - [ ] 3.1 Add the DEV-only trace of rate shock writes (Requirement 25 investigation, first task)
    - Run `git pull`. Create `web/src/scenes/graveyard/dev/rateShockTrace.ts`: a `useStore.subscribe` that calls `console.trace` with the old and new `machine.ctx.rateShock` whenever it changes. Mount it from `scenes/graveyard/dev/HorrorDebug.tsx` behind `import.meta.env.DEV` (existing `__zfr_horror_debug__` marker, so `check-bundle` still finds nothing in production).
    - This starts the analysis of design section 8 (hypotheses H1 click lands on the slider, H2 `HorrorDebug` re-applies `?shock=` after a remount, H3 synthetic `input` event from tooling). No fix is written before the cause is read from the trace.
    - _Requirements: 25.3_
  - [ ] 3.2 Write the Lights-toggle probe script
    - Create `web/scripts/lights-toggle-probe.mjs` (headed Playwright through `web/scripts/lib/browser.mjs`). For viewports 390x844, 900x800 and 1440x900 it: (a) records `document.elementFromPoint` at the centre of the Lights button (H1); (b) installs an `input` listener on `input[type=range]` and logs `event.isTrusted` (H1, H3); (c) clicks the button, then presses Enter and Space on it, and reads the slider value after 500 ms; (d) repeats with the slider at 0 and at one value in (0, 5] other than 0.25; (e) repeats without `shock` in the URL to separate H2; (f) collects the DEV `console.trace` lines of task 3.1.
    - _Requirements: 25.1, 25.3_
  - [ ] 3.3 Run the probe and record the root cause
    - Ask the user to start `Set-Location web; pnpm dev` (long-running; do not start it from a command), then run `Set-Location web; node scripts/lights-toggle-probe.mjs --url http://localhost:5173`. Write the finding (which of H1, H2, H3 or another cause, with the trace stack) as a dated entry in `DEVLOG.md`. If no hypothesis is confirmed, report that to the user and stop this task group instead of guessing.
    - _Requirements: 25.3_
  - [ ] 3.4 Fix the Lights-toggle bug at its root cause
    - Apply the fix that matches the recorded cause (reference the DEVLOG entry in the commit text and the Batch report): H1, change the layout of `ui/controls/LightsButton.tsx`, `ui/controls/ShockSlider.tsx` and `ui/graveyard/ShockPanel.tsx` so the button never overlaps the range input at any width and its label change does not reflow onto it; H2, apply `?shock=` in `scenes/graveyard/dev/HorrorDebug.tsx` once per page load with a module-level flag instead of a component ref; H3, fix the test or screenshot script that dispatches the event. Keep the slider keys and drag unchanged (Requirement 25.2).
    - _Requirements: 25.1, 25.2, 25.3_
  - [ ] 3.5 Write the test that discriminates the cause
    - Implement the test that fails on the code before the fix and passes after it for the confirmed cause: for H1 a Playwright assertion in `lights-toggle-probe.mjs` (`--assert`) that `elementFromPoint` at the button centre is the button and no `input` event fires on the range at the three viewports; for H2 a Vitest remount test `dev/HorrorDebug.test.tsx` (mount, unmount, mount with `?shock=0.25`, assert `setRateShock` is called once per page load, not once per mount); for H3 the script-level assertion. Run it against the unfixed code first (git stash of task 3.4 only) to show the failure, then against the fix. Design section 8 explains why jsdom tests alone cannot fail before the fix under H1 and H2; this test is the one that satisfies 25.4.
    - _Requirements: 25.1, 25.4_
  - [ ] 3.6 Write the HUD tests for the Lights control
    - File `ui/controls/LightsButton.test.tsx` (jsdom): for each of pointer, Enter and Space activation, with the slider at 0 pp and again at one value in (0, 5] pp other than 0.25, assert `rateShock` is bit-equal 500 ms (fake timers) after the activation, no Settled_Shock is produced, and Lights_Mode switches. Add one preservation test (drag and Arrow Left/Right/Up/Down, Home, End still change the value) that passes before and after the fix. These tests may pass before the fix; the discriminating test is task 3.5.
    - _Requirements: 25.1, 25.2, 25.4_
  - [ ] 3.7 Create the look constants module
    - Create `scenes/graveyard/look.ts` with every value of 23.1, 23.4, 23.5, 23.7 to 23.11, 23.14 and 23.15 (FOV 46, eye 1.2, look 0.6, Plot_Fog `#0a0d13` 0.075, background, hemisphere `#3a4a66` / `#0a0806` / 0.18, environment intensity 0, moon `#7f9cd6` 1.1 at (-4, 9, -22), Flashlight, Lantern_Light, CCTV_Grade numbers, stone factor 0.55, ACES exposure 1.0). Pure; no React or three imports. Read `reference/graveyard/horror-direction-params.md` first.
    - _Requirements: 23.17_
  - [ ] 3.8 Write the look-values example test
    - File `scenes/graveyard/look.test.ts`: parse `reference/graveyard/horror-direction-params.md` and compare each listed value with the constant in `look.ts`.
    - _Requirements: 23.17_
  - [ ] 3.9 Remove the lights-off glow and give soil materials black emissive
    - In `r3f/soil.tsx` remove the `glow` option of `useSoilTint` and export one material factory per soil, Closed_Mound, heap, Pit, Clod and Grass_Card material (emissive `#000000`, intensity 0, no `emissiveMap`). Remove every call site that passes `glow` in `r3f/Ground.tsx`, `r3f/Mounds.tsx` and `r3f/TornMounds.tsx`.
    - After this change name `reference/graveyard/horror-direction.png` as the matching reference and offer the scene-critic.
    - _Requirements: 24.1, 24.4_
  - [ ] 3.10 Fix the Torn_Mound heap, Clod and Pit materials
    - In `r3f/TornMounds.tsx` remove the `emissiveMap` on the heap and Clod materials; Clods get `flatShading`, colour `#3b2c1f`, roughness 1; the Pit becomes a `MeshStandardMaterial` with colour `#040302`, roughness 1 and black emissive, built by the factories of task 3.9. Look up `MeshStandardMaterial` `flatShading`, `emissive` with context7 before use.
    - Matching references: `reference/graveyard/horror-direction.png` and `horror-direction-sequence.png`. Offer scene-critic.
    - _Requirements: 24.1, 24.2, 24.3, 24.4_
  - [ ] 3.11 Remove the emissive map from Grass_Cards
    - In `r3f/Grass.tsx` remove the `emissiveMap` and use the Grass_Card factory of task 3.9.
    - _Requirements: 24.1, 24.4_
  - [ ] 3.12 Write the soil material example test
    - File `r3f/soilMaterials.test.tsx`: build the soil, Closed_Mound, heap, Pit, Clod and Grass_Card materials once with lights off and once with lights on; assert emissive `#000000`, intensity 0 and no `emissiveMap` for each, and the Clod (flat shading, `#3b2c1f`, roughness 1) and Pit (`#040302`) values. Update the superseded `r3f/TornMounds.test.ts`, `model/tornMound.test.ts` and `r3f/Grass.test.ts` in the same change.
    - _Requirements: 24.1, 24.2, 24.3, 24.5, 20.4_
  - [ ] 3.13 Move the camera to the prototype pose
    - In `layout/camera.ts` set `CAMERA_HEIGHT = 1.2`, `TARGET_Y = 0.6`, `CAMERA_BACK = 3.0`, `TARGET_AHEAD = 1.0` (values from `look.ts`) and remove the portrait target easing; in `r3f/CameraRig.tsx` set `CAMERA_FOV = 46`; update `GraveyardScene.tsx` and `model/placement.ts` `INITIAL_CAMERA`. Keep the 1.2 s move, smoothing, sway and pointer ranges. Update the superseded `layout/camera.test.ts` and `model/placement.test.ts` (FOV 46, eye 1.2, look 0.6, back 3.0; target easing cases removed).
    - Matching references: `reference/graveyard/horror-direction.png` and `horror-direction-sequence.png`. Offer scene-critic.
    - _Requirements: 23.1, 23.3, 9.2, 9.4, 9.6, 20.4_
  - [ ] 3.14 Write property test for the plot pose
    - Replace the eye-height numbers in `layout/cameraPose.property.test.ts` and `layout/cameraProjection.property.test.ts` with one `layout/camera.property.test.ts` for Property 46 (aspect ratios 1440/900 and 390/844, pointer centred, sway 0, margin 0.04 m; if the margin fails, drop `CAMERA_BACK` to 2.9 as in the design). Delete the two superseded files in the same change.
    - **Property 46: The plot pose matches the prototype camera**
    - **Validates: Requirements 23.1, 23.2, 23.3, 9.2, 9.4, 9.6**
  - [ ] 3.15 Blend the framed-plot lights and fog
    - In `model/sceneParams.ts` and `r3f/lightsBlend.ts` make `blendParams` interpolate Overview_Fog to Plot_Fog (`FogExp2` `#0a0d13`, 0.075), background = fog colour, hemisphere values, environment intensity 0 and moon values for lights-off framed plots, using the existing move progress; the overview keeps its Base_Spec values and lights on is unchanged. Update `model/sceneParams.test.ts` and `r3f/lightsBlend.test.ts`.
    - _Requirements: 23.4, 23.5, 23.6, 23.7, 23.8, 23.16, 23.18, 20.4_
  - [ ] 3.16 Apply the lights in SceneLights
    - In `r3f/SceneLights.tsx` use the blended hemisphere, set `scene.environmentIntensity` to 0 in framed lights-off plots (drei `Environment` stays mounted), and place the shadow moon at plot centre + (-4, 9, -22). Look up `HemisphereLight`, `FogExp2`, `Scene.environmentIntensity` and directional shadow settings with context7 before use.
    - Matching references: `reference/graveyard/horror-direction.png` and `horror-direction-sequence.png`. Offer scene-critic.
    - _Requirements: 23.4, 23.5, 23.7, 23.8_
  - [ ] 3.17 Update the Flashlight values
    - In `r3f/Flashlight.tsx` set colour `#ffe7c4`, intensity 55, distance 26, angle 0.36, penumbra 0.95, decay 2, shadow bias -0.0004, flicker x0.35 for one frame with chance 0.006 (Base_Spec cap until Batch 3 adds the Flash_Limiter). Update `r3f/flashlightState.test.ts`.
    - _Requirements: 23.9, 23.16, 20.4_
  - [ ] 3.18 Update the Lantern_Light
    - In `r3f/Props.tsx` add the point light `#ff9a4a`, intensity 1.2 x (0.85 + 0.15 x sin(13 t) x sin(7.3 t)), distance 4, decay 2, 0.28 m above the ground at the lantern prop; constant 1.2 in Reduced_Motion.
    - Matching reference: `reference/graveyard/horror-direction.png`. Offer scene-critic.
    - _Requirements: 23.10_
  - [ ] 3.19 Remove ground fog and the cone in framed lights-off plots
    - Locate the Ground_Fog layer and volumetric Flashlight cone components under `scenes/graveyard/r3f` (search for `GroundFog` and `cone`) and skip them when lights are off and a Plot is framed; keep them in lights on and in the overview. Add an example test that they are not mounted in a framed lights-off plot and are mounted in the other three cases.
    - _Requirements: 23.19, 23.18_
  - [ ] 3.20 Implement the grade colour mirror
    - Create `fx/gradeColour.ts` (pure TS, no three): steps (a) saturation 0.6 (mix 40 % luma 0.3/0.59/0.11), (b) x1.4 + 0.015, clamp, pow 0.9, (c) vignette 1 - 0.38 r^2.5 clamped, using `look.ts` values.
    - _Requirements: 23.11_
  - [ ] 3.21 Write property test for the grade steps
    - File `fx/cctvGrade.property.test.ts`.
    - **Property 47: Grade steps stay in range**
    - **Validates: Requirements 23.11**
  - [ ] 3.22 Implement the CctvGradeEffect
    - Look up the `Effect` base class, `EffectAttribute.CONVOLUTION`, `mainImage` and uniforms of `postprocessing` 6.39.6 and `@react-three/postprocessing` 3.2.2 with context7 before writing any code. Create `fx/CctvGradeEffect.ts` (`EffectAttribute.CONVOLUTION`) running steps (a) to (f) in order after `ToneMapping` (linear to sRGB at the start and back at the end, grain sigma 0.035 new every frame, every third row x0.88, red ghost 40 % from the pre-(a) input 2 px left; no bloom, no other chromatic aberration). In `fx/CctvPass.tsx` make the lights-off chain ToneMapping + grade; Low quality keeps all six steps; Reduced_Motion freezes the grain time. Lights on keeps the Base_Spec chain.
    - Matching references: `reference/graveyard/horror-direction.png` and `horror-direction-sequence.png`. Offer scene-critic.
    - _Requirements: 23.11, 23.12, 23.13, 23.16_
  - [ ] 3.23 Fold the tracking glitch into the grade
    - Apply the tracking-glitch band shift to the sample uv inside `CctvGradeEffect` and take the separate `TrackingGlitchEffect` out of the lights-off chain; update `fx/cctvParams.ts`, `fx/TrackingGlitchEffect.ts` (kept for lights on) and the superseded `fx/glitchScheduler` tests.
    - _Requirements: 23.11, 23.12, 20.4_
  - [ ] 3.24 Dim the stones and set ACES exposure
    - In `r3f/Stones.tsx` multiply the Headstone base colour by 0.55 in lights off; set ACES filmic tone mapping with exposure 1.0 in lights off (`look.ts`). Lights on is unchanged.
    - Matching references: `reference/graveyard/horror-direction.png` and `horror-direction-sequence.png`. Offer scene-critic.
    - _Requirements: 23.14, 23.15_
  - [ ] 3.25 Extend the purity test
    - Add `look.ts` and `fx/gradeColour.ts` to `horror.purity.test.ts` (no `react` or `three` imports, no `setTimeout`/`setInterval`).
    - _Requirements: 20.11_
  - [ ] 3.26 Add the Batch 2b screenshot script
    - Extend `web/scripts/horror-screenshots.mjs` with `--batch 2b` (headed Chrome, 1920 x 1080, `/?firms=3000`, lights off, Plot 1 pose) writing `reference/progress/horror-batch2b-look.png`.
    - _Requirements: 38.4, 38.6_
  - [ ] 3.27 Capture the Batch 2b screenshot and offer the scene review
    - Ask the user to start `Set-Location web; pnpm dev` (long-running; do not start it from a command), then run `Set-Location web; node scripts/horror-screenshots.mjs --batch 2b --url http://localhost:5173`. Name `reference/graveyard/horror-direction.png`, `horror-direction-sequence.png` and the Prototype (`reference/graveyard/prototype/demo/`) with `control-room-direction.md` as the matching references and offer the scene-critic.
    - _Requirements: 38.4, 38.7_
  - [ ] 3.28 Run the full check for Batch 2b
    - Run `Set-Location web; pnpm typecheck; pnpm lint; pnpm format; pnpm test; pnpm build`. All must exit 0.
    - _Requirements: 21.1, 21.2_
  - [ ] 3.29 Write the Batch 2b report
    - Report: what was done; the Requirement 25 root cause and fix; check results; `horror-batch2b-look.png` compared with `horror-direction.png`; superseded tests updated (`camera.test.ts`, `placement.test.ts`, `sceneParams.test.ts`, `lightsBlend.test.ts`, `TornMounds.test.ts`, `tornMound.test.ts`, `Grass.test.ts`, `flashlightState.test.ts`, `glitchScheduler` tests, `cameraPose` and `cameraProjection` property tests); open decisions (camera margin, 25.4 wording); no new dependencies.
    - _Requirements: 20.4, 22.3, 38.4_
  - [ ] 3.30 STOP: wait for the user to review Batch 2b before continuing.

- [ ] 4. Batch 3: zombies and unease (Requirements 26 to 29, plus the Risen_Zombie parts of 10, 11, 12, 15, 16, 19 and Requirement 21)
  - [ ] 4.1 Implement the rise timeline
    - Run `git pull`. Create `model/riseTimeline.ts` (pure): `riseClock(s, {reduced, lights})` returning `{phase, a, keysTime, cutNow, showCharacter, tornMound, dirtU}` with `STIR_S = 1.4`, `SOIL_BREAK_T = 0.55`, Rise_Cut at the first t > 0.8 (keys time jumps to 1.95, then t + 1.15, ends 3.2 at t = 2.05), `STARE_S = 2.8`, and the Reduced_Motion variant (cut at most 0.15 s, no glitch, final pose in one step).
    - _Requirements: 27.1, 27.3, 27.4, 27.5, 27.6, 27.7, 27.15_
  - [ ] 4.2 Write property test for the rise timeline
    - File `model/riseTimeline.property.test.ts`.
    - **Property 52: Rise timeline shape**
    - **Validates: Requirements 27.1, 27.3, 27.4, 27.5, 27.6, 27.7**
  - [ ] 4.3 Implement the Stir offsets and the Bone_Animator
    - Create `model/stir.ts` (`stirOffset(a, rand)`: at most 1.5 cm x a in x/z, 1 cm x a in y; camera shake at most 6 mm x a). Create `model/boneAnimator.ts` (pure): read the `KEYS` table, `jerk` and the rise frame from `reference/graveyard/prototype/demo/main.js` at task time; `frameAt(keysTime, model)` interpolates the five Rise_Keys (0.0, 0.7, 1.5, 2.3, 3.2 s, root -1.8 to -0.95 m, Crawler offset 0.05 m); `stare(t, headDir, headToCamera)` with smoothstep over 2.8 s to normalize(unit(head to camera) + (0, 0.15, 0)); finger curl + 0.15 sin(5t + pitX); twitches (first at 2 s, then every 1.2 to 3.5 s, 0.18 s, offsets x -0.6..0.6, y -0.3..0.2) from `mulberry32(fnv1a32(cik))`; no breathing; no IK and no clips. Create `model/boneMaps.ts` for the Hero, Walker and Crawler models using the Batch 1 skeleton report.
    - _Requirements: 27.1, 27.6, 27.8, 27.9, 27.12, 11.1, 11.10, 11.11, 11.12_
  - [ ] 4.4 Write property test for Bone_Animator purity and smoothness
    - File `model/boneSmooth.property.test.ts`.
    - **Property 53: Bone_Animator is pure and smooth**
    - **Validates: Requirements 27.12, 11.12**
  - [ ] 4.5 Write property test for Stare and idle
    - File `model/boneStare.property.test.ts`.
    - **Property 54: Stare and idle follow the specification**
    - **Validates: Requirements 27.8, 27.9, 11.10**
  - [ ] 4.6 Write property test for the Reduced_Motion rise
    - File `model/boneReduced.property.test.ts`, plus the example tests of 27.17 for the Rise_Cut jump (27.5), the Rise_Keys end pose (27.6) and the Stare blend (27.8).
    - **Property 55: Reduced_Motion rise ends in the final pose in one step**
    - **Validates: Requirements 27.15, 27.17**
  - [ ] 4.7 Implement the Clod arc
    - Create `model/dirtBurst.ts` (pure): `clodAt(u, rest, h)` outward 35 % to 100 % of the rest offset, height 0.03 + 4 h u (1 - u), hidden while u <= 0.02, u over 0.45 s, h seeded in [0.08, 0.30].
    - _Requirements: 27.4, 11.5_
  - [ ] 4.8 Write property test for the Clod arc
    - File `model/dirtBurst.property.test.ts`.
    - **Property 56: Clod arc**
    - **Validates: Requirements 27.4**
  - [ ] 4.9 Implement the Unease_Effects
    - Create `model/unease.ts` (pure): `uneaseAt(S, {lights, reduced}, stirA, rand)` with rumble gain 0.03 + 0.07 S (time constant 0.4 s) and 0.25 + 0.5 a during a Stir (max 0.75, time constant 0.1 s, a the largest running), Camera_Jitter amplitudes 0.0006 S and 0.0005 S, Random_Glitch chance 0.002 + 0.0025 S at strength 0.6, Flash_Dip chance 0.004 S; all but the rumble are 0 in lights on and in Reduced_Motion.
    - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.5, 28.8, 28.9, 28.10_
  - [ ] 4.10 Write property test for unease ranges and monotonicity
    - File `model/uneaseRange.property.test.ts`.
    - **Property 50: Unease values are non-negative, bounded and monotone in the shock**
    - **Validates: Requirements 28.2, 28.3, 28.4, 28.5, 28.10**
  - [ ] 4.11 Write property test for unease purity and switch-off
    - File `model/uneasePure.property.test.ts`.
    - **Property 51: Unease is pure and switches off where required**
    - **Validates: Requirements 28.1, 28.8, 28.10**
  - [ ] 4.12 Implement the Flash_Limiter and the static cut bus
    - Create `fx/flashLimiter.ts` (`createFlashLimiter()` with `offer({t, kind})`, kinds `static > glitch | dip | flicker`, at most 3 accepted flashes in (t - 1000 ms, t], same-frame Static_Cut priority, overlapping Static_Cuts merge, rejected candidates are dropped) and `fx/staticCutBus.ts` carrying `{staticS, glitchS}` requests.
    - _Requirements: 28.6, 28.7_
  - [ ] 4.13 Write property test for the flash budget
    - File `fx/flashLimiter.property.test.ts`.
    - **Property 48: Flash_Limiter never exceeds 3 flashes per second**
    - **Validates: Requirements 28.6, 28.7**
  - [ ] 4.14 Write property test for flash acceptance rules
    - File `fx/flashPriority.property.test.ts`.
    - **Property 49: Accepted flashes come from candidates, Static_Cut wins, overlaps merge**
    - **Validates: Requirements 28.6, 28.7**
  - [ ] 4.15 Implement the Growl parameters, limiter, choice and duck schedule
    - Create `audio/growl.ts` (`growlParams({d, ndcX, uRate})`: gain min(1, 2.2 / d), rate 0.85 + 0.2 uRate, pan clamp(ndcX, -1, 1), `lowpassHz` 2000 when d > 10 else null; `createGrowlLimiter`, `GROWL_MIN_GAP_MS`, `pickGrowl`) and `audio/duck.ts` (`duckAt(now, lastStirStart)`: wind 0.1 time constant 0.15 s from the Stir start, back to 0.35 time constant 0.8 s from +3.5 s, crows blocked until +5 s, the latest Stir replaces the reference).
    - _Requirements: 29.1, 29.2, 29.3, 29.6, 17.2, 17.10, 17.11_
  - [ ] 4.16 Write property test for the Growl limiter
    - File `audio/growlLimiter.property.test.ts`.
    - **Property 39: Growl limiter**
    - **Validates: Requirements 17.2, 17.10**
  - [ ] 4.17 Write property test for the Growl choice
    - File `audio/growlChoice.property.test.ts`.
    - **Property 40: Growl choice**
    - **Validates: Requirements 17.11**
  - [ ] 4.18 Write property test for the Growl parameters
    - File `audio/growlParams.property.test.ts`.
    - **Property 57: Growl parameters**
    - **Validates: Requirements 29.1, 29.6**
  - [ ] 4.19 Write property test for the duck schedule
    - File `audio/duck.property.test.ts`.
    - **Property 58: Duck schedule follows the latest Stir**
    - **Validates: Requirements 29.3**
  - [ ] 4.20 Implement the Settled_Shock tracker
    - Create `model/settle.ts` with `SETTLE_SECONDS = 0.25` and `stepSettle(state, value, now)` driven by the render clock (no timers).
    - _Requirements: 10.4, 11.14_
  - [ ] 4.21 Write property test for Settled_Shock timing
    - File `model/settle.property.test.ts`.
    - **Property 20: Settled_Shock timing**
    - **Validates: Requirements 10.4**
  - [ ] 4.22 Implement nearest assignment, selection pose and selection store
    - Create `model/selection.ts` (`assignNearest(candidates, 8)`, ties by lower `cik`, `candidatesFor` returning only Newly_Undead firms, `RISEN_BUDGET = 8`), add `selectionPose` to `layout/camera.ts` (destination pose, no pointer, sway or Flashlight input) and create `selectionStore.ts` (`{ risen, modelByCik, version }`, own zustand store).
    - _Requirements: 10.1, 10.2, 10.3, 10.8, 10.11, 26.1, 26.4, 20.5_
  - [ ] 4.23 Write property test for nearest assignment
    - File `model/selection.property.test.ts`.
    - **Property 19: Nearest assignment**
    - **Validates: Requirements 10.1, 10.2, 10.12**
  - [ ] 4.24 Write property test for already-undead exclusion
    - File `model/selectionCandidates.property.test.ts`.
    - **Property 59: Already-undead firms never get a character**
    - **Validates: Requirements 26.1, 26.4**
  - [ ] 4.25 Implement the Risen pool
    - Create `model/risenPool.ts` (`stepRisenPool`; phases `idle, waiting, stirring, rising, up, lowering`; 8 slots; times from `riseTimeline`; `LOWER_SECONDS = 1.2` with no Rise_Cut and the slot held while lowering; `started` at the Stir start, `finished` at keys time 3.2; waits for `ready`; Reduced_Motion goes straight to `up`).
    - _Requirements: 10.5, 10.6, 10.7, 10.9, 11.8, 11.15, 12.6, 15.3, 27.11, 27.16_
  - [ ] 4.26 Write property test for the Risen pool
    - File `model/risenPool.property.test.ts`.
    - **Property 21: The Risen pool respects the budget and the choreography**
    - **Validates: Requirements 10.5, 10.7, 10.9, 11.8, 11.15, 12.6, 15.3**
  - [ ] 4.27 Implement model assignment and requested models
    - Create `model/modelAssignment.ts`: `wantedModel` (rank 0 Hero in lights off, Walker in lights on; others by `fnv1a32(cik) & 1`), `resolveModel` fallback chain (Hero/Crawler to Walker, Walker failure to none) and `requestedModels(selection, lights, reduced, firstFrameDone)`; `CharacterId` has no `watcher`.
    - _Requirements: 5.1, 5.3, 5.11, 12.1, 12.2, 12.3, 12.5, 12.7, 16.3, 26.2_
  - [ ] 4.28 Write property test for model assignment
    - File `model/modelAssignment.property.test.ts`.
    - **Property 29: Model assignment follows rank, hash and lights**
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.5, 16.3, 19.6**
  - [ ] 4.29 Write property test for the fallback chain
    - File `model/modelFallback.property.test.ts`.
    - **Property 30: Model fallback chain**
    - **Validates: Requirements 5.11, 12.7**
  - [ ] 4.30 Write property test for requested models
    - File `model/requestedModels.property.test.ts`.
    - **Property 4: Requested character models follow lights, motion and need**
    - **Validates: Requirements 5.1, 5.3, 26.2**
  - [ ] 4.31 Implement horror quality settings
    - Create `model/horrorQuality.ts` (low quality: grass x0.5, no character shadows, Rise_Budget stays 8).
    - _Requirements: 19.1_
  - [ ] 4.32 Write property test for horror quality
    - File `model/horrorQuality.property.test.ts`.
    - **Property 44: Horror quality**
    - **Validates: Requirements 19.1**
  - [ ] 4.33 Implement the character loader and bone-map test
    - Look up `useGLTF`, `useGLTF.preload` and `SkeletonUtils.clone` with context7 before use. Create `r3f/characterLoader.ts` (`useGLTF(path, false, true)` per model id, loaded only when first needed after the first frame, Hero only in lights off, Watcher never requested, `reportAssetError`, shared geometry and materials via `SkeletonUtils.clone`). Add the Vitest test asserting every bone name of each bone map exists in the loaded model.
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.11, 11.11, 12.6, 12.7, 26.2_
  - [ ] 4.34 Implement SelectionController and the settled shock field
    - Add `settledShock: number` to the main store (`state/store.ts`, the only main-store change). Create `r3f/SelectionController.tsx` (`useFrame` priority -8): Selection_Event on Settled_Shock, Camera_Rig target change (destination pose at move start) or first Firm list load; writes `selectionStore`; Newly_Undead only.
    - Matching reference: `reference/graveyard/horror-direction-sequence.png`. Offer scene-critic.
    - _Requirements: 10.1, 10.3, 10.4, 10.8, 10.10, 12.5, 20.5, 26.1_
  - [ ] 4.35 Implement Characters
    - Look up `useFrame` priorities and `Object3D.raycast` with context7 before use. Create `r3f/Characters.tsx` (`useFrame` priority -4): one clone per slot, `frameAt` bone aim, Stare and twitches, Reduced_Motion final pose, scale to 1.80 to 1.85 m, base colour x0.9 / 0.85 / 0.75, roughness at least 0.75, `frustumCulled = false`, `raycast = () => null`, shadows by quality, model swap keeping phase, no blood. Generalise `riseEvents.ts` to `createEmitter<T>()`, emit the rise event at the Stir start and add `riseFinishedEvents` at keys time 3.2.
    - Matching references: `reference/graveyard/horror-direction-sequence.png` and `horror-direction.png`. Offer scene-critic.
    - _Requirements: 10.9, 11.1, 11.6, 11.8, 11.12, 12.4, 15.3, 16.1, 16.3, 16.4, 19.5, 19.6, 26.4, 27.8, 27.9, 27.11, 27.13, 27.14, 27.15_
  - [ ] 4.36 Add the Stir mound motion, the soil break and the Clod burst
    - In `r3f/Mounds.tsx` apply `stirOffset` to the Closed_Mound of the stirring firm and return it to rest at t = 0; in `r3f/TornMounds.tsx` (priority -3) swap to the Torn_Mound at t = 0.55 using `tornMoundSet(torn, activeCiks)` and move each Clod with `clodAt` over 0.45 s (no extra draw call; at rest in Reduced_Motion, no burst).
    - Matching references: `reference/graveyard/horror-direction-sequence.png` and `horror-direction.png`. Offer scene-critic.
    - _Requirements: 27.1, 27.3, 27.4, 27.15, 7.4, 7.5_
  - [ ] 4.37 Add the Rise_Cut to the CCTV pass through the Flash_Limiter
    - Create `fx/FlashBus.tsx` (priority -30) that drains `staticCutBus` into the Flash_Limiter; in `fx/CctvPass.tsx` (priority -2) set the grade shader `stat` and `glitch` uniforms from accepted flashes; offer the Rise_Cut (Static_Cut 0.32 s, glitch 0.2 s; at most 0.15 s and no glitch in Reduced_Motion; allowed in lights on) and the `uneaseAt` Random_Glitch candidates; replace the random `fx/glitchScheduler.ts` and remove the `trigger` path. Update the glitch scheduler tests.
    - Matching references: `reference/graveyard/horror-direction-sequence.png` and `horror-direction.png`. Offer scene-critic.
    - _Requirements: 27.5, 27.14, 27.15, 28.3, 28.6, 28.7, 20.10_
  - [ ] 4.38 Add Auto_Aim, Flash_Dip and flicker offers to the Flashlight
    - In `r3f/Flashlight.tsx` (priority -5) aim at the Pit + 0.5 m for 2.2 s from a Stir start or until the first pointer move (a new Stir replaces a running one); offer Flash_Dip (x0.3 for one frame, chance 0.004 S) and the base flicker to the Flash_Limiter. Update `r3f/flashlightState.test.ts`.
    - Matching reference: `reference/graveyard/horror-direction.png`. Offer scene-critic.
    - _Requirements: 27.10, 28.5, 28.6, 23.9, 20.4_
  - [ ] 4.39 Add Stir shake and Camera_Jitter to the Camera_Rig
    - In `r3f/CameraRig.tsx` (priority -20) add the Stir shake (at most 6 mm x a, lights off, motion allowed) and the Camera_Jitter (x 0.0006 S sin(23 t), y 0.0005 S sin(31 t)) from the live Shock_pp, both off in lights on and Reduced_Motion. The camera move, FOV and sway stay.
    - Matching reference: `reference/graveyard/horror-direction-sequence.png`. Offer scene-critic.
    - _Requirements: 27.2, 28.4, 28.8, 28.9_
  - [ ] 4.40 Wire the scene and retire the Craggle hand
    - In `GraveyardScene.tsx` mount `SelectionController`, `Characters` and `FlashBus`; remove `Hands`; delete `r3f/Hands.tsx`, `model/handPool.ts` and `model/handPool.test.ts` (cases already moved to tasks 4.23 and 4.26). Keep the Craggle_Hand file, Manifest entry and `CREDITS.md` row. No production import of the hand modules may remain.
    - Matching references: `reference/graveyard/horror-direction.png` and `horror-direction-sequence.png`. Offer scene-critic.
    - _Requirements: 15.1, 15.2, 15.4, 15.5, 15.6, 26.4, 20.2_
  - [ ] 4.41 Remove the Mutant, Watcher, Standing_Zombies and Footstep_Bed from the scene and the group
    - Remove the Mutant from `r3f/Props.tsx` (or the creature component) and from `groupAssets.json` and `assets.ts` `ASSET_KEYS` group lists, together with the Footstep_Bed; the files, Manifest entries and `CREDITS.md` rows stay. Update `assets.test.ts` (group equals the set derived from `ASSET_KEYS`), `check-bundle` tests, and the Mutant tests (assert absence). Assert in a scene test that no request is made for the Watcher_Model, Mutant or Footstep_Bed. No Watcher, Standing_Zombies, `standing.ts`, `farSpots.ts`, `Watcher.tsx` or Content_Notice is built.
    - _Requirements: 26.2, 26.3, 26.5, 26.7, 26.8, 26.9, 26.10, 26.11, 5.7, 20.4_
  - [ ] 4.42 Extend the Audio_Engine
    - Look up `StereoPanner`, `BiquadFilter` and `AudioParam.linearRampToValueAtTime`/`setTargetAtTime` on MDN or with context7 if a library wraps them. In `audio/audioEngine.ts` add the Rumble_Bed (`freesound-lennartgreen-low-rumble-loopable`, lazy after the Interaction_Gate, silent skip on failure; confirm its `.ogg` is in `groupAssets.json`, otherwise add it), rumble gain from `uneaseAt`, the wind duck and crow hold from `duckAt`, `playGrowl` with `growlParams` (playback rate, gain before master, `StereoPanner`, 2,000 Hz low-pass when d > 10, limiter, fallback to the other file) and remove the digging play and the Footstep_Bed (`footsteps.ts`, `setFootstepDistance`). Update the fake `AudioParam` in `audioEngine.test.ts`.
    - _Requirements: 29.1, 29.2, 29.3, 29.5, 29.6, 26.5, 26.6, 17.1, 17.4, 17.5, 17.6, 17.7, 17.8_
  - [ ] 4.43 Wire audio to the scene
    - In `audio/useGraveyardAudio.ts` subscribe `riseEvents` (duck, rumble swell), `riseFinishedEvents` (`playGrowl` with distance and NDC x from the camera and zombie root), and the live Shock_pp for the rumble gain; mirror `settings.lights`. Update `useGraveyardAudio.test.tsx` (no digging, no footsteps, Growl on rise-finished).
    - _Requirements: 29.1, 29.3, 29.4, 28.2, 20.4_
  - [ ] 4.44 Write the audio example tests
    - File `audio/audioEngine.horror.test.ts` with the recording fake `AudioContext`: Growl silent before the gate, when muted, in lights on and not replayed; rumble gain 0.03 at shock 0; Rumble_Bed load failure skipped without error; visual timings unchanged when audio is muted or blocked (29.4).
    - _Requirements: 17.4, 17.5, 17.7, 28.1, 29.4, 29.5_
  - [ ] 4.45 Write the Batch 3 scene tests
    - Extend `Horror.scene.test.tsx`: no `Hands`, `Watcher`, `Standing` or Mutant import; characters have null `raycast`; at most 8 characters; Walker failure gives no Risen_Zombie and the Torn_Mounds stay; lights on uses the Walker, no Stare, no shake, no blood; Reduced_Motion shows the final pose with one `finished` event.
    - _Requirements: 10.13, 12.7, 15.1, 26.4, 27.14, 27.15_
  - [ ] 4.46 Extend the purity test for the Batch 3 pure modules
    - Add `riseTimeline`, `stir`, `boneAnimator`, `dirtBurst`, `unease`, `flashLimiter`, `staticCutBus`, `settle`, `selection`, `risenPool`, `modelAssignment`, `horrorQuality`, `audio/growl` and `audio/duck` to `horror.purity.test.ts` (no `react`/`three` imports, no `setTimeout`/`setInterval`).
    - _Requirements: 20.11, 11.12, 11.14_
  - [ ] 4.47 Implement the fps measurement for the Horror_Pass
    - Create or finish `web/scripts/measure-fps.mjs --horror` (headed Playwright, `?firms=3000`, lights off, normal quality, 1920 x 1080, framed Plot): `findShockStep` finds the lowest 0.25 pp step with at least 8 Newly_Undead firms, waits 2 s after the Settled_Shock, records at least 10 s, and prints the DEVLOG fields of 38.5 (average and minimum 1-second fps, GPU name, browser version, viewport, quality, shock, Risen_Zombies shown at the start of the window, date). Only Risen_Zombies are counted.
    - _Requirements: 21.3, 21.4, 21.12, 38.5_
  - [ ] 4.48 Write property test for the shock step finder
    - File `web/scripts/measure-fps.test.mjs` (also the DEVLOG line formatter).
    - **Property 45: The measurement step finder**
    - **Validates: Requirements 21.4**
  - [ ] 4.49 Add the DEV helpers for screenshots and measurement
    - In `scenes/graveyard/dev/HorrorDebug.tsx` add `?horror=stir|risen` and a DEV-only `HorrorStats` (`data-risen-count`), behind `import.meta.env.DEV` and the existing marker so `check-bundle` still fails if either reaches a production bundle.
    - _Requirements: 38.5_
  - [ ] 4.50 Add the Batch 3 screenshot script
    - Extend `web/scripts/horror-screenshots.mjs` with `--batch 3` writing `reference/progress/horror-batch3-stir.png` (a Closed_Mound during the Stir) and `reference/progress/horror-batch3-risen.png` (a Risen_Zombie at the waist-high pose staring at the lens, with its Torn_Mound), lights off, 1920 x 1080.
    - _Requirements: 38.5, 38.6_
  - [ ] 4.51 Run the headed fps measurement and record the numbers
    - Ask the user to start `Set-Location web; pnpm dev` (long-running; do not start it from a command), then run `Set-Location web; node scripts/measure-fps.mjs --horror --url http://localhost:5173 --seconds 10`. Add the DEVLOG.md entry with every field of 38.5. Report average fps, minimum 1-second fps and the GPU name. If the average is below 50, report the number, the GPU and the cost of Character_Models, Grass_Cards, Torn_Mounds and post-processing, and do not mark the Horror_Pass complete. State if the machine is not an integrated-GPU laptop.
    - _Requirements: 21.3, 21.4, 21.6, 21.7, 21.8, 21.9, 21.12, 38.5_
  - [ ] 4.52 Capture the Batch 3 screenshots and offer the scene review
    - With the dev server running, run `Set-Location web; node scripts/horror-screenshots.mjs --batch 3 --url http://localhost:5173`. Name `reference/graveyard/horror-direction.png` and `horror-direction-sequence.png`, the Prototype and `control-room-direction.md` as the matching references and offer the scene-critic.
    - _Requirements: 38.5, 38.7_
  - [ ] 4.53 Verify the superseded tests are updated
    - Check the table of superseded tests in the design (`audioEngine.test.ts`, `useGraveyardAudio.test.tsx`, `glitchScheduler` tests, `flashlightState.test.ts`, `handPool.test.ts` deleted, Mutant tests, Standing/Watcher tests not added) against the repository and fix any remaining test that still asserts a superseded criterion.
    - _Requirements: 20.2, 20.4, 20.9_
  - [ ] 4.54 Run the full check for Batch 3
    - Run `Set-Location web; pnpm typecheck; pnpm lint; pnpm format; pnpm test; pnpm build` (`check-bundle` enforces the Group_Budget; if it fails apply the fallback order of Requirement 5.13). All must exit 0.
    - _Requirements: 21.1, 21.2, 5.13_
  - [ ] 4.55 Write the Batch 3 report
    - Report: what was done; check results; `horror-batch3-stir.png` and `horror-batch3-risen.png`; measured fps numbers and GPU name; superseded tests updated (task 4.53); open decisions (Requirement 10.13 raycast wording, prototype key values read at task time); no new dependencies; final acceptance only after the user signs off.
    - _Requirements: 20.4, 21.9, 22.3, 38.5_
  - [ ] 4.56 STOP: wait for the user to review Batch 3 before continuing.

## Notes

- All property tests are mandatory sub-tasks in this plan (no optional markers). Each references its design property number and requirement clauses; retired properties (22 to 28, 31 to 38, 41 to 43) have no tasks.
- Batches 1 and 2 are delivered; the Batch 2 STOP (2.30) is passed. Batches 2b (task 3) and 3 (task 4) each end with a STOP task, and task 4 has no sub-task before the Batch 2b STOP (3.30).
- Requirements 30 to 37 (OSD, camera switcher, rate console, hover tag, Opening, jump-scare assets, steering exceptions) belong to a future control-room-experience spec; no task here builds them. Standing_Zombies, the Watcher, the Footstep_Bed and the Content_Notice are not built.
- Tasks 3.3, 3.27, 4.51 and 4.52 need a running dev server; the user starts it with `Set-Location web; pnpm dev`.
- The root cause of the Lights-toggle jump is not proven by reading (design section 8); task 3.4 and 3.5 depend on the finding of task 3.3.
- Task 2.24 still mentions removing `Hands` in an old Batch 3a task; that removal is now task 4.40. Task ids of done tasks are unchanged.

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
    { "id": 18, "tasks": ["3.1", "3.7", "3.9", "3.13", "3.20"] },
    { "id": 19, "tasks": ["3.2", "3.8", "3.10", "3.14", "3.15", "3.21"] },
    { "id": 20, "tasks": ["3.3", "3.11", "3.16", "3.17", "3.18", "3.22"] },
    { "id": 21, "tasks": ["3.4", "3.12", "3.19", "3.23", "3.24"] },
    { "id": 22, "tasks": ["3.5", "3.6", "3.25", "3.26"] },
    { "id": 23, "tasks": ["3.27"] },
    { "id": 24, "tasks": ["3.28"] },
    { "id": 25, "tasks": ["3.29"] },
    { "id": 26, "tasks": ["3.30"] },
    { "id": 27, "tasks": ["4.1", "4.3", "4.7", "4.9", "4.12", "4.15", "4.20", "4.22", "4.27", "4.31"] },
    { "id": 28, "tasks": ["4.2", "4.4", "4.5", "4.6", "4.8", "4.10", "4.11", "4.13", "4.14", "4.16", "4.17", "4.18", "4.19", "4.21", "4.23", "4.24", "4.25", "4.28", "4.29", "4.30", "4.32"] },
    { "id": 29, "tasks": ["4.26", "4.33", "4.34", "4.37", "4.38", "4.39", "4.41", "4.42", "4.47"] },
    { "id": 30, "tasks": ["4.35", "4.36", "4.43", "4.44", "4.48", "4.49"] },
    { "id": 31, "tasks": ["4.40"] },
    { "id": 32, "tasks": ["4.45", "4.46", "4.50"] },
    { "id": 33, "tasks": ["4.51"] },
    { "id": 34, "tasks": ["4.52"] },
    { "id": 35, "tasks": ["4.53"] },
    { "id": 36, "tasks": ["4.54"] },
    { "id": 37, "tasks": ["4.55"] },
    { "id": 38, "tasks": ["4.56"] }
  ]
}
```
