# Implementation Plan: Graveyard Scene

## Overview

Language: TypeScript (web app, React 19, R3F 9, drei 10), Vitest + fast-check. Scripts are Node `.mjs` with Playwright. Build order follows `design.md`: hand close-up check first, then pure engine and layout, then data wiring and HUD, then scene assets, then camera, effects and creatures, then audio and keyboard, then measurement scripts and the final check.

Rules for the executor:

- Work only on the current batch. At every line that reads **STOP: review batch N before continuing.**, stop, report what changed and which checks ran, and wait for the user.
- Commands are PowerShell, chained with `;`, run from the repo root unless a `Set-Location web` is shown. Never start long-running servers yourself; the user runs `pnpm dev` in a separate terminal.
- Tasks that touch `web/src/scenes/**` or `web/src/fx/**` must first look up every `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `three-custom-shader-material` API they use with the context7 MCP server (workflow rule). Do not rely on memory.
- Do not edit `/pipeline` or `/data`. Do not add files under `web/public/assets` or rows to `CREDITS.md` (Requirement 21.12). Do not change `data-contract.md`, schemas or `web/src/types/data.ts`.
- Pin dependencies exactly (no `^ ~ > < *`).
- Commits are made by the user, not by tasks. Use conventional commits with the spec scope, for example `feat(graveyard-scene): add shock model` or `test(graveyard-scene): add layout properties`.
- Property tests use fast-check with `numRuns` of at least 100 and a comment `// Feature: graveyard-scene, Property N: <title>`. Test files that share a topic use distinct file names so parallel tasks never write the same file.
- Run `git pull` before starting batch 1.

## Tasks

### Batch 1: Craggle hand close-up (alone)

- [x] 1. Craggle hand close-up for the wrist-end check
  - [x] 1.1 Install only the packages the close-up needs
    - From the repo root run: `Set-Location web; pnpm add --save-exact @react-three/drei@10.7.9; pnpm add --save-dev --save-exact playwright@1.65.0`
    - The remaining approved pins (postprocessing, `postprocessing`, three-custom-shader-material) are installed later in task 10.1.
    - Confirm `package.json` has no range prefixes on react, fiber and drei.
    - _Requirements: 21.13_
    - _Design: Research summary (package versions), Decision 3_

  - [x] 1.2 Add `HAND_WRIST_END` constants and the dev-only close-up page
    - Look up `useGLTF`, `Environment`/lights and `OrbitControls`-free camera setup with context7 before writing code.
    - Create `web/src/scenes/graveyard/model/handConstants.ts` exporting `HAND_WRIST_END: 1 | -1 = 1` and `HAND_PRINCIPAL_AXIS = [0.887, 0.065, 0.456]`.
    - Create `web/src/dev/handCloseup/HandCloseup.tsx` and `mount.tsx`: only the Craggle hand (`useGLTF(url, false)`, key from `manifest.json`), neutral grey background, fixed key light, ground grid, legend with a green sphere at the proposed wrist end and a red sphere at the opposite end, axis helper, label "wrist end = +axis" or "-axis". Camera angle comes from `?angle=top|side|front|three-quarter-left|three-quarter-right|rising-preview`; `rising-preview` shows the pose at progress 1 (wrist pivot at the ground, hand pointing up).
    - Mount it from `web/src/main.tsx` only through a literal `if (import.meta.env.DEV && new URLSearchParams(location.search).get('view') === 'hand-closeup') { await import('./dev/handCloseup/mount'); }`. Put the string `__zfr_hand_closeup__` in the page module (used by the bundle guard in task 4.6).
    - Never reference the Ruella hand model.
    - _Requirements: 14.2, 21.12_
    - _Design: Section 9 (Craggle hand close-up), Decision 2_

  - [x] 1.3 Write the shared Chrome launcher and `hand-closeup.mjs`
    - Create `web/scripts/lib/browser.mjs`: `chromium.launch({ channel: 'chrome', headless: false })` with no fallback to bundled Chromium; helper to check that a URL answers HTTP 200 within 10 s.
    - Create `web/scripts/hand-closeup.mjs` (`--url`, default `http://localhost:5173`): opens `/?view=hand-closeup&angle=<name>` for the six angles at 1280 x 960, saves `reference/progress/craggle-hand-{angle}.png`, prints the six paths, exits non-zero if the server is unreachable, Chrome cannot launch or a file was not written. It never starts a server.
    - After the code is written, the user starts `pnpm dev` in a separate terminal and the script is run once: `Set-Location web; node scripts/hand-closeup.mjs --url http://localhost:5173`. If the dev server is not running, say so and leave the run to the user.
    - _Requirements: 21.5, 21.10_
    - _Design: Section 9, Section 17 (shared launcher), Decision 8_

  - [x] 1.4 Write a unit test for the hand geometry
    - Node-environment Vitest test that loads the Craggle hand GLB with `GLTFLoader` and the Meshopt decoder (textures stripped): the principal axis matches `HAND_PRINCIPAL_AXIS` within 0.05, and the file has no skin and no animation clips. The wrist side is NOT asserted (judged visually).
    - _Requirements: 14.2_
    - _Design: Section 9, Testing Strategy (geometry test)_

**STOP: review batch 1 before continuing.**

What to check:

- The six images in `reference/progress/craggle-hand-*.png`: which end of the hand is the wrist (narrow forearm end) and does `rising-preview` point the fingers up?
- If the wrist is on the wrong side, tell me to flip `HAND_WRIST_END` in `web/src/scenes/graveyard/model/handConstants.ts` (the only place that depends on it).
- `package.json` shows exact pins for `@react-three/drei` and `playwright`.
- Nothing else changed: no scene, engine or HUD files.

### Batch 2: Pure engine, layout, dev fixtures, settings migration

- [x] 2. Shock model in the engine
  - [x] 2.1 Implement `web/src/engine/shock.ts` and exports
    - `shockFirm`, `shockBatch` and the private `evaluate()` exactly as the design pseudocode: typed `delta_out_of_range` error, ineligible rules (null fields, `shock_eligible` false, `total_debt_usd <= 0`, `implied_rate <= 0`), `icr()` from `./icr` as the only division, delta 0 returns `latest_icr`, min-guard for EBIT >= 0, Newly_Undead rule (Decision 1).
    - Add to `engine/index.ts`: `shockFirm`, `shockBatch`, `mulberry32`, and the types `ShockInput`, `ShockResult`, `ShockBatch`, `ShockStatus`. No React or three imports.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.13_
    - _Design: Section 2, Decision 1_

  - [x]* 2.2 Write property tests for the shock model
    - File `web/src/engine/shock.property.test.ts`. Arbitraries `arbShockInput` (ICR from [-3, 0.99], [1, 1.6], [1.6, 6]; ages 0 to 60 weighted around 9 to 11; debt including 0 and negative; `implied_rate` in [0, 0.2] or null) and `arbDelta` (slider steps `k / 400`, arbitrary doubles in [0, 0.05], and invalid values). Add the non-vacuity guard (at least 5% newly undead at +5 pp over 1,000 lists).
    - **Property 4: Invalid delta is a typed error**
    - **Property 5: Shocked ICR comes from the shared icr()**
    - **Property 6: Ineligible firms are unchanged**
    - **Property 7: Newly undead matches the rule**
    - **Property 8: Delta zero changes nothing**
    - **Property 9: A rate rise never raises ICR (non-negative EBIT)**
    - **Property 10: Status never improves and zombies stay undead**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 13.4, 13.6**

  - [x]* 2.3 Write unit tests for the shock model
    - File `web/src/engine/shock.unit.test.ts`: worked example (`latest_icr 1.2`, rate 0.05, debt 100M, age 18: not undead at +0.75 pp and +1.00 pp, undead at +1.25 pp), `latest_icr 0.9` never newly undead, zero-interest edge, 3,000-firm `shockBatch` under 100 ms, exports present in `engine/index.ts`. Confirm `purity.test.ts` still passes.
    - _Requirements: 2.1, 2.5, 2.6, 13.3_

- [x] 3. Layout, spatial grid, picking and keyboard navigation (pure)
  - [x] 3.1 Implement `web/src/scenes/graveyard/layout/layout.ts`
    - `computeLayout` with the exported constants (`PITCH_X`, `PITCH_Z`, `PLOT_GAP`, `PAD`, height/width/sink ranges), sector grouping by sorted sector names, per-firm `hash32(cik)` + `mulberry32` variation, lean by status, log10 height mapping, empty-list result. No React or three imports; input never mutated.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11_
    - _Design: Section 3_

  - [x] 3.2 Implement `layout/grid.ts` and `layout/pick.ts`
    - CSR grid `buildGrid`, `queryRadius`; `pickStone` (2D DDA + slab test) and `nearestToRay` (band doubling, ties by lower index).
    - _Requirements: 5.2, 5.3, 12.1_
    - _Design: Section 3 (spatial grid, picking)_

  - [x] 3.3 Implement `layout/nav.ts`
    - `nextFocus(layout, plot, current, dir)` with the 45 degree cone, ground-plane distance, tie-break by reading order, `null` when nothing qualifies.
    - _Requirements: 18.2, 18.3_
    - _Design: Section 13_

  - [ ]* 3.4 Write property test for plot grouping
    - File `layout.grouping.property.test.ts`; also the purity scan forbidding `react`/`three` imports under `layout/` and `model/`.
    - **Property 11: Every firm is in exactly one plot, grouped by sector**
    - **Validates: Requirements 3.1, 3.11**

  - [ ]* 3.5 Write property test for spacing
    - File `layout.spacing.property.test.ts`.
    - **Property 12: Spacing between stones and between plots**
    - **Validates: Requirements 3.2, 3.3**

  - [ ]* 3.6 Write property test for determinism and purity
    - File `layout.determinism.property.test.ts` (compare with `Object.is`, deep-frozen input).
    - **Property 13: Layout is deterministic and pure**
    - **Validates: Requirements 3.4, 3.11**

  - [ ]* 3.7 Write property test for stone dimensions
    - File `layout.dimensions.property.test.ts`.
    - **Property 14: Stone dimensions, sink and lean follow the rules**
    - **Validates: Requirements 3.5, 3.6, 3.7, 3.9, 3.10**

  - [ ]* 3.8 Write property test for grid picking
    - File `pick.property.test.ts` (grid result equals brute force).
    - **Property 16: Grid picking equals brute force**
    - **Validates: Requirements 5.2, 5.3, 12.1**

  - [ ]* 3.9 Write property test for keyboard focus
    - File `nav.property.test.ts`.
    - **Property 40: Keyboard focus moves inside the 45 degree cone**
    - **Validates: Requirements 18.2, 18.3**

- [x] 4. Dev-only sample data, loader changes and production bundle guard
  - [x] 4.1 Implement `web/src/dev/sample/generate.ts`
    - `generateSampleFirms(count, seed)` with `mulberry32` from the engine, fictional names (no real tickers), unique 10-digit CIKs from `9100000000`, status mix and ICR spread from the design, consistent `meta.counts`, lazy firm files. First statement uses `SAMPLE_GENERATOR_MARKER = '__zfr_sample_generator__'`. Must not collide with the existing `dev/fixtures` names.
    - _Requirements: 1.5, 1.9, 1.10_
    - _Design: Section 1 (sample generator)_

  - [ ]* 4.2 Write property test for the generator
    - File `web/src/dev/sample/generate.property.test.ts`; uses `guardFirmsIndex` and `guardFirm`; for counts >= 500 firms lie on both sides of ICR 1.
    - **Property 3: Sample generator is deterministic and schema-valid**
    - **Validates: Requirements 1.5, 1.9, 1.10**

  - [x] 4.3 Extend the loader, source and HUD labels
    - `source.ts`: `DataSource` adds `'sample'`, `SAMPLE_FIRM_COUNT`, `sampleCountFromSearch(search, dev)`. `loader.ts`: `search` dependency, literal `if (import.meta.env.DEV)` branches with dynamic `import('../dev/sample/generate')`, real -> mock -> (production) error screen / (development) fixture or sample. Firm order and single request preserved.
    - `Hud.tsx`: "Mock data" for `mock`, "Sample data" for `fixture` and `sample`. `TableView.tsx` caption gets a sample case.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.11_
    - _Design: Section 1_

  - [x] 4.6 Extend `web/scripts/check-bundle.mjs` with the production guard
    - Fail the build if `dist/` contains `__zfr_sample_generator__`, `dev/sample/generate`, `Larkspur` or `__zfr_hand_closeup__`. Keep the existing "Ashgrove Works" rule. Export the check function so it can be tested.
    - _Requirements: 1.8_
    - _Design: Section 1 (production bundle guard), Decision 4_

  - [ ]* 4.4 Write property test for the loader firm list
    - File `web/src/data/loader.firmlist.property.test.ts`.
    - **Property 1: Loader preserves the file's firm list**
    - **Validates: Requirements 1.1**

  - [ ]* 4.5 Write property test for the sample flag
    - File `web/src/data/source.sample.property.test.ts`.
    - **Property 2: Only `firms=3000` selects the sample set**
    - **Validates: Requirements 1.5, 1.6, 1.7**

  - [ ]* 4.7 Write unit tests for the bundle guard
    - File `web/scripts/check-bundle.test.mjs`: fake `dist` with each marker fails, clean `dist` passes.
    - _Requirements: 1.8_

  - [ ]* 4.8 Write loader example tests
    - File `web/src/data/loader.sample.test.ts`: real fails then mock with "Mock data" (1.2); mock fails with `dev = false` gives the error and never a fixture (1.3); mock fails in development gives "Sample data" (1.4); `?firms=3000` gives exactly 3,000 firms and no data request (1.5); ignored when `dev = false` or another value (1.6, 1.7); no write under `/data` (1.11).
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.11_

- [x] 5. Settings migration (sound defaults to on)
  - [x] 5.1 Update `web/src/state/settings.ts` and its existing tests
    - `DEFAULT_SETTINGS.sound = true`; `serializeSettings` writes `v: 2`; `parseSettings` keeps all fields for `v === 2`, and for legacy blobs keeps `lights`, `lowQuality`, `reducedMotion` but takes `sound` from the default; invalid input falls back per field. Update `settings.unit.test.ts` and `settings.parse.property.test.ts` (use `v: 2` where a stored `sound` is expected; add legacy cases).
    - _Requirements: 16.13, 16.14, 17.8_
    - _Design: Section 16 (sound default and migration), Decision 5_

  - [ ]* 5.2 Write property test for settings parsing
    - File `web/src/state/settings.migration.property.test.ts`.
    - **Property 43: Settings parsing keeps stored choices and defaults sound to on**
    - **Validates: Requirements 16.13, 16.14, 17.8**

**STOP: review batch 2 before continuing.**

What to check:

- `Set-Location web; pnpm typecheck; pnpm lint; pnpm format; pnpm test` pass.
- `engine/shock.ts` has no React or three imports and `icr()` is the only division.
- A production `pnpm build` output has no sample generator or hand close-up markers (the bundle guard passes).
- Existing users with a legacy settings blob get `sound: true`, v2 blobs keep an explicit mute.
- Nothing under `/data` or `/pipeline` changed.

### Batch 3: Store, HUD controls, File card, Table parity, Credits

- [x] 6. Store slice, shock view hook and shared formatters
  - [x] 6.1 Add the graveyard store slice
    - `web/src/state/graveyard.ts` with `GraveyardSlice` (`framedPlot`, `hoveredCik`, `focusedCik`, `cardCik`, `cardOpener`, `liveMessage`, `notices`, `audioBlocked` and setters) merged into `useStore` in `store.ts`. `rateShock` stays in `machine.ctx` via `setRateShock`.
    - _Requirements: 13.9, 12.4, 18.9_
    - _Design: Section 12 (store additions)_

  - [x] 6.2 Add `web/src/state/shockView.ts`
    - `useShockView()` memoises `shockBatch(index.firms, rateShock)` on `[firms, delta]` and returns `{ firms, batch, error }`.
    - _Requirements: 13.3, 13.9, 19.5_
    - _Design: Section 2 (hook)_

  - [x] 6.3 Centralise formatters in `web/src/ui/table/format.ts`
    - `formatIcr` (two decimals, "n/a" for null, no 0 placeholder), `formatDebt` (K/M/B suffix, "n/a"), status text and glyph helper, 4-digit year. Reuse in table, card and engravings.
    - _Requirements: 5.7, 12.5, 12.6, 12.7, 12.10, 19.2_
    - _Design: Sections 5, 12_

  - [ ]* 6.4 Write property test for display formatting
    - File `web/src/ui/table/format.property.test.ts`.
    - **Property 18: Display formatting never invents values**
    - **Validates: Requirements 5.1, 5.7, 12.5, 12.6, 12.7, 19.2**

- [x] 7. Shared HUD controls
  - [x] 7.1 Implement `ui/controls/ShockSlider.tsx`
    - Native range over integer `k` 0..20, stored value `k / 400`, name "Interest rate shock", `aria-valuetext` "+X.XX percentage points", label "IF INTEREST RATES RISE BY +X.XX pp", static lines "Approximation based on index data; simplified rate shock" and "Debt reprices at once; simplified model".
    - _Requirements: 2.14, 13.1, 13.2, 13.7, 13.8, 13.9_
    - _Design: Section 12 (shared controls)_

  - [x] 7.2 Implement `ui/graveyard/ShockPanel.tsx` and `GraveyardHud`
    - Counters "Risen from the grave: N" (polite live, throttled to 1 per second), "N already undead", and "N not shock-eligible" only when N > 0, all from `useShockView().batch.counts`. `GraveyardHud` docks the panel bottom-left and stacks under 900 px.
    - _Requirements: 13.3, 13.4, 13.5, 13.6, 13.8_
    - _Design: Section 12 (panels)_

  - [x] 7.3 Implement `LightsButton.tsx` and `SoundButton.tsx` and mount them in `Hud.tsx`
    - Lights label names the target mode, toggles are ignored within 350 ms of the last change; Sound shows "Sound on"/"Sound off" from `settings.sound && !audioBlocked`. Audio resume retry is added in task 18.3.
    - _Requirements: 16.6, 16.13, 17.1, 17.2, 17.6, 17.8_
    - _Design: Section 12 (shared controls)_

  - [ ]* 7.4 Write property test for the slider mapping
    - File `ShockSlider.property.test.ts`.
    - **Property 30: Slider value mapping**
    - **Validates: Requirements 13.1, 13.2, 13.7**

  - [ ]* 7.5 Write property test for the Lights button
    - File `LightsButton.property.test.ts`.
    - **Property 38: Lights button label and toggle rate**
    - **Validates: Requirements 17.1, 17.6**

  - [ ]* 7.6 Write unit tests for the shock panel and slider keys
    - Arrow, Home and End keys stay in bounds (13.7); counters equal the batch counts (13.4 to 13.6); accessible names with `vitest-axe`.
    - _Requirements: 13.3, 13.4, 13.5, 13.6, 13.7_

- [x] 8. File card, live region and Table_View parity
  - [x] 8.1 Implement `ui/graveyard/chooseDock.ts` and `FileCard.tsx`
    - Card content per 12.5 to 12.10 (name, sector, ICR, debt, status text, reasons, "not enough data", "undead under this rate shock" with shocked ICR), single instance, dock right or bottom with the smaller overlap, status colours at 4.5:1.
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10, 12.11, 12.12, 12.13_
    - _Design: Section 12 (FileCard)_

  - [x] 8.2 Implement `ui/graveyard/LiveRegion.tsx`
    - Polite region fed by `announce`, text "{name}, {status}".
    - _Requirements: 18.9_
    - _Design: Section 13_

  - [x] 8.3 Update `ui/table/TableView.tsx`
    - Rows from `useShockView()` with "Shocked ICR" and "Newly undead" text columns, "Excluded from the shock" for ineligible rows, shared counters, `ShockSlider`/`LightsButton`/`SoundButton`, sector `<select>` with the "No firms match this sector." message, row activation (click, Enter, Space) opens the same `FileCard`.
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8, 19.9_
    - _Design: Section 14_

  - [ ]* 8.4 Write property test for card docking
    - File `chooseDock.property.test.ts`.
    - **Property 29: Card dock does not cover the stone**
    - **Validates: Requirements 12.11**

  - [ ]* 8.5 Write property test for status shapes and labels
    - File `status.property.test.ts` (uses `modelFor` stub from task 10.3 only if present; otherwise status text and multiplier).
    - **Property 39: Each status has a distinct shape and label**
    - **Validates: Requirements 17.7, 12.10**

  - [ ]* 8.6 Write property test for the sector filter
    - File `sectorFilter.property.test.ts`.
    - **Property 41: Sector filter**
    - **Validates: Requirements 19.1, 19.8, 19.9**

  - [ ]* 8.7 Write property test for counters and table rows
    - File `shockView.property.test.ts`.
    - **Property 31: HUD counters and table rows share one source**
    - **Validates: Requirements 13.4, 13.5, 13.6, 19.3, 19.4, 19.5**

  - [ ]* 8.8 Write component tests for card and table
    - jsdom + testing-library + `vitest-axe`: card content and "n/a" cases, one card at a time, contrast of each status colour at 4.5:1, table controls reachable by Tab, card identical from table and from scene.
    - _Requirements: 12.4, 12.5, 12.8, 12.9, 12.12, 19.6, 19.7_

- [x] 9. Credits dialog and Vite config
  - [x] 9.1 Set `server.fs.allow` in `web/vite.config.ts`
    - Export `REPO_ROOT`; `allow: [REPO_ROOT, searchForWorkspaceRoot(process.cwd())]`.
    - _Requirements: 20.10_
    - _Design: Section 15, Decision 7_

  - [x] 9.2 Implement `ui/CreditsDialog.tsx` and the Settings button
    - Lazy `import('../../../CREDITS.md?raw')` on first open, scrollable text region (no new Markdown dependency), `role="dialog"`, `aria-label="Credits"`, close button named "Close" with initial focus, `useFocusTrap`, Esc, focus returns to the "Credits" button, "No credits are available." for empty text. Add the "Credits" button to `SettingsMenu.tsx`.
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8, 20.9_
    - _Design: Section 15_

  - [ ]* 9.3 Write tests for the Vite config and dialog
    - `web/src/vite.config.test.ts` (allow list contains the repo root, `CREDITS.md` inside it, `?raw` import non-empty and contains `| Path |`); dialog tests for focus trap, Esc, empty text (mocked module), contrast in both modes.
    - _Requirements: 20.3, 20.4, 20.5, 20.6, 20.8, 20.9, 20.10_

**STOP: review batch 3 before continuing.**

What to check:

- `Set-Location web; pnpm typecheck; pnpm lint; pnpm format; pnpm test` pass.
- Table view: slider moves counters and statuses, sector filter, row opens the same card, Lights and Sound buttons work.
- Settings menu opens Credits, Tab wraps, Esc returns focus; `pnpm dev` serves `CREDITS.md?raw` without a file-system error.
- Footer "Data: SEC EDGAR. Not investment advice." is still visible.

### Batch 4: Models, stones, picking, engravings, ground, fog, props

- [x] 10. Remaining packages, asset keys and stone model logic
  - [x] 10.1 Install the remaining approved pins
    - Run: `Set-Location web; pnpm add --save-exact @react-three/postprocessing@3.2.2 postprocessing@6.39.6 three-custom-shader-material@6.4.0`
    - Verify exact pins and that peer ranges are satisfied (three 0.187.0).
    - _Requirements: 21.13_
    - _Design: Research summary, Decision 3_

  - [x] 10.2 Implement `web/src/scenes/graveyard/assets.ts`
    - Typed `ASSET_KEYS` from the design table, `assetUrl(key)` (null when not in `manifest.json`), `pickAudioKey(base)` (ogg then mp3), critical key list for the bundle check. No Ruella key.
    - _Requirements: 4.8, 8.4, 14.2, 16.10, 21.12_
    - _Design: Section 8 (asset keys)_

  - [x] 10.3 Implement `model/stoneModels.ts`, `model/clipFlap.ts`, `model/modelFor.ts`
    - Measured origin/body/`flapClip` per model (Intact `{zMin 8, yMax 14}`, Cracked `{8, 18}`, Broken `null`), `clipFlap` returning a new index list, `modelFor(status, newlyUndead)`, `measureModel()`. Document the flap measurements in comments. No react/three in the pure parts.
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 4.6, 4.10_
    - _Design: Section 4_

  - [ ]* 10.4 Write property test for the model choice
    - File `modelFor.property.test.ts`.
    - **Property 15: Model choice by status and shock**
    - **Validates: Requirements 4.1, 4.5, 4.6**

  - [ ]* 10.5 Write the geometry test
    - File `stoneModels.geometry.test.ts` (node, real GLBs): measured bounds equal `STONE_MODELS`, `clipFlap` removes the flap triangles and keeps body triangles for Intact and Cracked, Broken `flapClip === null`, every `ASSET_KEYS` entry is in `manifest.json` and `CREDITS.md`, no key contains `ruella`.
    - _Requirements: 4.4, 4.8, 8.4, 14.2, 16.10_

  - [ ]* 10.6 Write property tests for `clipFlap` on synthetic meshes
    - Never drops a triangle fully outside the flap region, always drops one with a vertex inside.
    - _Requirements: 4.4_

- [x] 11. Scene shell, instanced stones and pointer picking
  - [x] 11.1 Create `web/src/scenes/graveyard/GraveyardScene.tsx` (default export)
    - Look up `Canvas` props, `useFrame`, `useGLTF`, `Suspense`, ACES tone mapping and `onCreated` with context7 first.
    - Canvas with `hasWebGL()` fallback, error boundary per model, `data-graveyard-ready="true"` after the first rendered frame, context-lost handling, `dpr` and shadow setup. Path and default export must satisfy `check-bundle.mjs`. Mount from `SceneHost` (unchanged) and `GraveyardHud`.
    - _Requirements: 7.9, 21.9_
    - _Design: Architecture, Error Handling (WebGL), Section 17_

  - [x] 11.2 Implement `fx/StoneMaterial.tsx` and `r3f/Stones.tsx`
    - Look up three-custom-shader-material and `InstancedMesh` APIs (`setMatrixAt`, `setColorAt`, `computeBoundingSphere`) with context7 first.
    - Three `instancedMesh` (one per model, `raycast` disabled), opaque single-sided materials, flap clip at load, instance compaction by `visibleStones`, 0.45 colour multiplier for `insufficient_data`, swap to Broken for Newly_Undead, `reportAssetError` and HUD notice on a failed model.
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 4.8, 4.9, 4.10_
    - _Design: Section 4_

  - [x] 11.3 Implement pointer input and hover/focus store updates
    - Ray from camera through pointer, `pickStone`, `setHovered` only on change, file card opens within 100 ms, engraving set trigger; stones are not DOM nodes.
    - _Requirements: 12.1, 12.2, 12.3, 12.4_
    - _Design: Sections 3, 12_

  - [ ]* 11.4 Write the scene smoke test
    - File `GraveyardScene.test.tsx` (jsdom, mocked Canvas/`useFrame`): exactly 3 stone `instancedMesh` for 3 and for 3,000 firms (4.3), "Mock data"/"Sample data" labels within 500 ms (1.2, 1.4), WebGL fallback text.
    - _Requirements: 1.2, 1.4, 4.3_

- [x] 12. Engraving pool
  - [x] 12.1 Implement `model/deriveFaceAnchor.ts` and `model/engravingText.ts`
    - Pure face-anchor finder (nearly vertical +z/-z face cluster) and engraving text layout (name, 4-digit year, `ICR x.xx`/`ICR n/a`) with `formatIcr`.
    - _Requirements: 5.1, 5.7_
    - _Design: Section 5_

  - [x] 12.2 Implement `r3f/Engravings.tsx`
    - Look up drei `Decal` and `CanvasTexture` usage with context7 first.
    - 13 slots (proxy mesh + `Decal` + canvas texture), rebuild on hover/focus change with `nearestToRay`, keep content when nothing is hovered, `document.fonts.load` with a 300 ms cap and generic serif/mono fallback, crack polyline for `endangered`.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.8, 5.9, 5.10_
    - _Design: Section 5_

  - [ ]* 12.3 Write property test for the engraving pool
    - File `engravings.property.test.ts` (pure pool-selection function).
    - **Property 17: Engraving pool never exceeds 13**
    - **Validates: Requirements 5.1, 5.3, 5.4, 5.5**

  - [ ]* 12.4 Write tests for `deriveFaceAnchor`
    - Property on synthetic boxes and an example on the real Intact geometry.
    - _Requirements: 5.1_

- [x] 13. Ground, sky, fog, lights and props
  - [x] 13.1 Implement `model/sceneParams.ts`
    - `plotFogWeight`, `CameraFogState`, `sceneParams(lights, delta, cam)` with all colours, intensities, fog densities (Overview 0.02/0.015, Plot 0.085/0.05), layer opacities `base * factor * (1 + 0.5 * delta / 0.05)`, and ground distance constants (480 m ground, nearest edge 240 m).
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.11, 7.12, 7.14, 7.15, 7.16, 7.17_
    - _Design: Section 7, Decision 6_

  - [ ]* 13.2 Write property test for scene parameters
    - File `sceneParams.property.test.ts`.
    - **Property 20: Scene parameters follow the lights mode and the shock**
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.11, 7.12**

  - [ ]* 13.3 Write property test for fog during camera moves
    - File `plotFogWeight.property.test.ts`.
    - **Property 42: Fog follows the camera move progress**
    - **Validates: Requirements 7.14, 7.15, 7.16, 7.17, 11.10**

  - [x] 13.4 Implement `r3f/SceneLights.tsx`, `Ground.tsx`, `Sky.tsx`, `GroundFog.tsx`
    - Look up drei `Environment` (`files`, `background`, `backgroundIntensity`, `environmentIntensity`), `FogExp2`, shadow camera and texture APIs with context7 first.
    - Eased lights blend (about 0.5 s), camera term not eased, moon and hemisphere lights, 480 m soil ground following the camera on a 4 m snap, 1k HDRI then 2k swap without a blank frame, three fog layers, failure fallback (flat `#0b0806` ground, HUD notice "An environment asset failed to load.").
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.11, 7.12, 7.13, 7.14, 7.18, 8.7, 8.8, 8.9, 17.2_
    - _Design: Section 7_

  - [x] 13.5 Add `props.json`, `props.ts` and `r3f/Props.tsx`
    - Gate (1), statue (1), trunk (1), stumps (2 to 8), rubble (10 to 60, procedural icosahedron with lichen textures, one InstancedMesh), cobweb cards (2 to 10 from the existing pack), lantern with `#ff9a4a` point light. Anchors `world`, `plot:n`, `behindLast`. Skip with `console.warn` when a key is not in the manifest or fails to load. Start loading from a `requestAnimationFrame` after the first frame.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.10_
    - _Design: Section 8, Lazy-loading plan_

  - [ ]* 13.6 Write property test and unit tests for props
    - File `props.property.test.ts`: positions identical on repeated calls, gate farther than every plot, counts per 8.2; unit test for lantern light parameters (8.3).
    - **Property 21: Props resolve deterministically**
    - **Validates: Requirements 8.1, 8.2**

**Scene note:** after batch 4 changes under `web/src/scenes/**` and `web/src/fx/**`, the matching reference screenshot is `reference/graveyard/graveyard-rate-shock-3pp.png`. Offer to verify with the scene-critic agent (the user starts `pnpm dev` first).

**STOP: review batch 4 before continuing.**

What to check:

- `Set-Location web; pnpm typecheck; pnpm lint; pnpm format; pnpm test` pass.
- With `pnpm dev`, the stones render as three models, no base flap shows, hover shows a file card and engravings on up to 13 stones.
- Ground, fog and sky match the lights-off and lights-on values; no horizon line.
- Compare with `reference/graveyard/graveyard-rate-shock-3pp.png`; say yes if you want the scene-critic agent run.
- No new files in `web/public/assets`, no new `CREDITS.md` rows.

### Batch 5: Camera, flashlight, CCTV, mounds, blood, creatures, hands

- [x] 14. Camera rig, flashlight and plot navigation
  - [x] 14.1 Implement `layout/camera.ts`
    - Pure: plot pose `(centerX, 2.15, frontZ + 6.4)`, `smooth` with lambda 4, `swayAmplitude`, `overviewPose(bounds, fov, aspect)`, `nextPlot` (clamped), `plotLabel`/`overviewLabel`, `flickerFactor(t)`.
    - _Requirements: 10.5, 10.7, 10.8, 10.9, 10.10, 11.3, 11.4, 11.5, 11.6, 11.7_
    - _Design: Sections 10, 11_

  - [x] 14.2 Implement `r3f/CameraRig.tsx`
    - Look up `useFrame` and camera APIs with context7 first. FOV 52, near 0.1, far 360, 1.2 s plot moves, instant cuts under Reduced_Motion, sway, `CameraFogState` and `atRest` published through a mutable ref, target state to the store only on change, focus pan.
    - _Requirements: 10.7, 10.8, 10.9, 10.10, 11.1, 11.8, 11.9, 11.10_
    - _Design: Section 10_

  - [x] 14.3 Implement `r3f/Flashlight.tsx`
    - Look up `SpotLight`, `ConeGeometry` shadow settings with context7 first. Parameters per 10.1, offset `(0.28, -0.32, 0.1)`, aim from ray hit with last-valid-target fallback `(0, 0.2, -2)`, flicker via `flickerFactor`, additive cone at opacity 0.11, same parameters in lights on.
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.11_
    - _Design: Section 10_

  - [x] 14.4 Implement `ui/graveyard/PlotNav.tsx` and the REC label
    - Sector chips, "← Overview", arrow keys when no stone has focus, label "PLOT {n} — {SECTOR} · {count} GRAVES" or "OVERVIEW · {plotCount} PLOTS" in `Hud.tsx` next to "REC · CAM 03" and the 1 s clock.
    - _Requirements: 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_
    - _Design: Section 12 (panels)_

  - [ ]* 14.5 Write property test for flicker
    - File `flicker.property.test.ts`.
    - **Property 24: Flicker stays within 6 percent and 3 events per second**
    - **Validates: Requirements 10.5**

  - [ ]* 14.6 Write property test for smoothing and sway
    - File `smooth.property.test.ts`.
    - **Property 25: Look smoothing is frame-rate independent**
    - **Validates: Requirements 10.8, 10.9, 10.10, 17.5**

  - [ ]* 14.7 Write property test for the overview pose
    - File `overviewPose.property.test.ts`.
    - **Property 26: Overview contains every plot**
    - **Validates: Requirements 11.3**

  - [ ]* 14.8 Write property test for plot navigation
    - File `nextPlot.property.test.ts`.
    - **Property 27: Plot navigation clamps**
    - **Validates: Requirements 11.4, 11.5**

  - [ ]* 14.9 Write property test for plot labels
    - File `plotLabel.property.test.ts`.
    - **Property 28: Plot labels**
    - **Validates: Requirements 11.6, 11.7**

- [x] 15. CCTV post-processing
  - [x] 15.1 Implement `fx/glitchScheduler.ts` and `fx/cctvParams.ts`
    - Scheduler per design (first glitch 20 to 60 s after enabling, at most 0.4 s, reset to 0 on disable); `cctvParams(lights, lowQuality)` with grain, desaturation, vignette, chromatic aberration 0.0022, bloom (0.55, 0.6, 0.82), scanline opacity at most 0.15.
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.9_
    - _Design: Section 11_

  - [x] 15.2 Implement `fx/TrackingGlitchEffect.ts` and `fx/CctvPass.tsx`
    - Look up `EffectComposer`, `Bloom`, `ChromaticAberration`, `HueSaturation`, `ToneMapping`, `Vignette`, `Noise`, `Scanline` and the custom `Effect` API (`postprocessing`) with context7 first. Effects in the design order, canvas-only (HUD text untouched), low quality drops bloom and aberration only.
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 15.9, 17.4_
    - _Design: Section 11_

  - [ ]* 15.3 Write property test for CCTV values and the glitch scheduler
    - File `fx/cctv.property.test.ts`.
    - **Property 35: CCTV values and glitch scheduling**
    - **Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.9**

- [x] 16. Dressing plan, mounds, blood decals, Mutant and corpse
  - [x] 16.1 Implement `model/dressing.ts`
    - `planDressing(firms, batch, lights)`: mounds equal the zombie or newly undead set, 1 to 5 blood quads per undead stone in lights off only, none otherwise.
    - _Requirements: 6.1, 6.2, 6.4, 7.10, 14.1_
    - _Design: Section 6_

  - [x] 16.2 Implement `r3f/Mounds.tsx` and `r3f/BloodDecals.tsx`
    - Look up `InstancedMesh`, instanced attributes and `polygonOffset` usage with context7 first. One mound InstancedMesh (half-ellipsoid, soil PBR), one blood quad InstancedMesh with a runtime atlas of the 7 existing decal images, 0.35 s fade on lights change, quads removed within 1 s on lights on or when a firm stops being undead.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.10, 14.1_
    - _Design: Sections 6, 9 (mounds)_

  - [x] 16.3 Implement `model/placement.ts` and `model/coneCovers.ts`
    - Mutant position (at least 20 units behind the last row), corpse anchor (nearest zombie stone to `(0, 2.15, 9.4)`, ties lower index, none when no zombie), `coneCovers(origin, dir, halfAngle, range, sphere)`.
    - _Requirements: 9.1, 9.3, 9.4, 9.6, 9.7_
    - _Design: Section 8 (Mutant and corpse)_

  - [x] 16.4 Implement `r3f/Creatures.tsx`
    - Look up `useGLTF` and visibility handling with context7 first. Mutant `visible` set each frame from `coneCovers` (both lights modes, no audio call), corpse half-buried at 50% plus or minus 10%, omitted without a zombie, no blood layer in lights on, omit on load failure.
    - _Requirements: 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_
    - _Design: Section 8_

  - [ ]* 16.5 Write property test for the dressing plan
    - File `dressing.property.test.ts`.
    - **Property 19: Dressing plan: mounds, blood and lights**
    - **Validates: Requirements 6.1, 6.2, 6.4, 6.5, 7.10, 14.1, 17.3, 17.4**

  - [ ]* 16.6 Write property test for mutant visibility
    - File `coneCovers.property.test.ts`.
    - **Property 22: Mutant visibility equals cone coverage**
    - **Validates: Requirements 9.2, 9.3, 9.4**

  - [ ]* 16.7 Write property test for the corpse placement
    - File `corpse.property.test.ts`.
    - **Property 23: Corpse goes to the nearest zombie stone**
    - **Validates: Requirements 9.6, 9.7**

- [x] 17. Craggle hands and the hand budget
  - [x] 17.1 Implement `model/handPool.ts` and `model/handPose.ts`
    - `HAND_BUDGET = 8`, `assignHands` (distance ascending then CIK string order), `stepHandPool` (8 slots, rising/up/lowering, `started` list, reduced motion enters `up` directly), `handPose(progress)`. Orientation derives from `HAND_WRIST_END` as confirmed in batch 1.
    - _Requirements: 14.3, 14.4, 14.5, 14.6, 14.7, 14.8_
    - _Design: Section 9 (hand budget, pose)_

  - [x] 17.2 Implement `scenes/graveyard/riseEvents.ts` and `r3f/Hands.tsx`
    - Typed emitter (no replay); one InstancedMesh with 8 slots, wrist pivot from the geometry, reassign on camera rest within 1 s, emit exactly one event per hand start, no hand and no events when the model fails to load (mounds and Broken stones remain).
    - _Requirements: 14.2, 14.3, 14.4, 14.6, 14.7, 14.8, 14.9, 14.10_
    - _Design: Section 9_

  - [ ]* 17.3 Write property test for hand assignment
    - File `assignHands.property.test.ts`.
    - **Property 32: Hand assignment is the nearest eight by distance, then CIK**
    - **Validates: Requirements 14.3, 14.4, 14.5**

  - [ ]* 17.4 Write property test for the hand pool
    - File `handPool.property.test.ts`.
    - **Property 33: Hand pool never exceeds eight and converges**
    - **Validates: Requirements 14.3, 14.6, 14.7**

  - [ ]* 17.5 Write property test for rise events (pool part)
    - File `riseEvents.property.test.ts`.
    - **Property 34: One rise event per hand start**
    - **Validates: Requirements 14.8, 14.9**

**Scene note:** after batch 5 changes under `web/src/scenes/**` and `web/src/fx/**`, the matching reference screenshot is `reference/graveyard/graveyard-rate-shock-3pp.png`. Offer to verify with the scene-critic agent (the user starts `pnpm dev` first).

**STOP: review batch 5 before continuing.**

What to check:

- `Set-Location web; pnpm typecheck; pnpm lint; pnpm format; pnpm test` pass.
- Slider at +3 pp: undead stones get mounds, hands rise (at most 8, nearest first), blood only in lights off.
- Camera: sector chips, Overview, arrow keys, sway, Reduced_Motion cuts; flashlight follows the pointer; Mutant appears only inside the cone.
- CCTV look (grain, vignette, scanlines, bloom) in both lights modes; rare tracking glitch only in lights off.
- Compare with `reference/graveyard/graveyard-rate-shock-3pp.png`; say yes if you want the scene-critic agent run.

### Batch 6: Audio, keyboard navigation, quality and bundle budget

- [ ] 18. Audio engine
  - [~] 18.1 Implement `web/src/audio/scheduler.ts`
    - `nextCrowDelay(rand) = 20 + 40 * rand()`.
    - _Requirements: 16.3_
    - _Design: Section 16_

  - [~] 18.2 Implement `web/src/audio/audioEngine.ts`
    - No `AudioContext` before the Interaction_Gate (first pointerdown, touchstart or keydown, capture phase; never pointer movement), decode with `Promise.allSettled`, wind loop within 500 ms, crow timer, dig on rise events (dropped while muted or before the gate, never queued), `playLeave()`, mute via `settings.sound` (gain 0 within 50 ms, wind stopped, timer cancelled), `dispose()` within 200 ms, blocked-playback flag and `resume()` retry. Only `manifest.json` audio keys; failures skipped silently. No reading of motion settings.
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 16.10, 16.11, 16.12_
    - _Design: Section 16_

  - [~] 18.3 Wire audio into the scene and Sound button
    - Subscribe to `riseEvents`, call `playLeave()` when leaving the graveyard, `dispose()` on unmount, `setAudioBlocked`, Sound button click retries `resume()` after a blocked start.
    - _Requirements: 14.9, 16.4, 16.5, 16.9, 16.12, 16.13_
    - _Design: Section 16_

  - [ ]* 18.4 Write property test for the crow timer
    - File `audio/scheduler.property.test.ts`.
    - **Property 36: Crow timer draws from 20 to 60 seconds**
    - **Validates: Requirements 16.3**

  - [ ]* 18.5 Write property test for the gate and muting
    - File `audio/audioEngine.gate.property.test.ts` (fake `AudioContext`, fake timers).
    - **Property 37: Muted audio is silent and nothing is queued**
    - **Validates: Requirements 16.1, 16.8**

  - [ ]* 18.6 Write property test for rise events (audio part)
    - File `audio/audioEngine.dig.property.test.ts`.
    - **Property 34: One rise event per hand start**
    - **Validates: Requirements 16.4, 16.8**

- [ ] 19. Keyboard navigation
  - [~] 19.1 Implement `ui/graveyard/StoneFocusProxy.tsx` and `r3f/FocusMarker.tsx`
    - Look up `RingGeometry` usage and `depthTest` options with context7 first. Single roving tab stop, first stone in reading order on Tab, ring marker (at least 3:1 contrast in both modes), 2 px focus outlines on controls.
    - _Requirements: 18.1, 18.7_
    - _Design: Section 13_

  - [~] 19.2 Wire keyboard behaviour
    - Arrows via `nextFocus`, Enter opens the card and focuses its first control, Esc closes and returns focus, flashlight aims at the focused stone within 300 ms, engravings rebuild around it, rig moves to the stone's plot within 1.5 s, live region announces within 500 ms.
    - _Requirements: 18.2, 18.3, 18.4, 18.5, 18.6, 18.8, 18.9_
    - _Design: Section 13_

  - [ ]* 19.3 Write component tests for keyboard navigation
    - jsdom: Tab enters the proxy, arrow moves or stays, Enter/Esc focus handling, live region text.
    - _Requirements: 18.1, 18.4, 18.5, 18.9_

- [ ] 20. Quality toggle and bundle budget
  - [~] 20.1 Implement low quality mode
    - Lower pixel ratio (0.75 x normal, floor 0.75), no flashlight shadow, moon shadow map 1024, exactly one fog layer, no bloom or chromatic aberration (other CCTV values unchanged).
    - _Requirements: 15.9, 21.9_
    - _Design: Section 17_

  - [~] 20.2 Add the 25 MB initial-download check to `web/scripts/check-bundle.mjs`
    - Sum manifest `bytes` of the critical key list plus gzip of the initial JS closure and graveyard chunk; fail with "Initial download X MB exceeds the 25 MB limit".
    - _Requirements: 8.10, 21.3, 21.4_
    - _Design: Section 17, Lazy-loading plan_

  - [ ]* 20.3 Extend `config.smoke.test.ts` for pins
    - Exact pins and no `^ ~ > < *` on react, fiber, drei, postprocessing, three-custom-shader-material.
    - _Requirements: 21.13_

  - [ ]* 20.4 Write tests for the 25 MB check
    - Extend `web/scripts/check-bundle.test.mjs`: over budget fails and reports sizes, under budget passes.
    - _Requirements: 21.4_

**Scene note:** after batch 6 changes under `web/src/scenes/**` and `web/src/fx/**`, the matching reference screenshot is `reference/graveyard/graveyard-rate-shock-3pp.png`. Offer to verify with the scene-critic agent.

**STOP: review batch 6 before continuing.**

What to check:

- `Set-Location web; pnpm typecheck; pnpm lint; pnpm format; pnpm test; pnpm build` pass (the build includes the 25 MB check).
- No sound before the first click or key; wind, crows, dig sound per rising hand; Sound button mutes everything and nothing replays on unmute.
- Keyboard only: Tab to stones, arrows, Enter opens the card, Esc closes; live region announces the firm.
- Low quality toggle: one fog layer, no flashlight shadow, no bloom.

### Batch 7: Measurement scripts, docs and final check

- [ ] 21. Frame-rate measurement script
  - [~] 21.1 Implement `web/scripts/measure-fps.mjs`
    - Uses `lib/browser.mjs` (headed Chrome, 1920 x 1080), checks the dev server, opens `/?firms=3000`, requires the "Sample data" label and `data-graveyard-ready="true"`, counts `requestAnimationFrame` frames over at least 10.0 s, reads the GPU via `WEBGL_debug_renderer_info`, appends one `DEVLOG.md` line (average fps to 1 decimal, GPU, browser name and version, resolution, quality, date YYYY-MM-DD, "dev server", and "Machine is not an integrated-GPU laptop." when the renderer does not match). Any failure exits non-zero with the cause on stderr and writes nothing. `--quality low` pre-seeds a v2 settings blob.
    - _Requirements: 4.7, 21.5, 21.6, 21.7, 21.8_
    - _Design: Section 17_

  - [ ]* 21.2 Write tests for the script helpers
    - File `web/scripts/measure-fps.test.mjs`: DEVLOG line formatter, integrated-GPU test, failure paths exit non-zero and write nothing.
    - _Requirements: 21.6, 21.7, 21.8_

- [ ] 22. Screenshots and docs
  - [~] 22.1 Implement `web/scripts/screenshots.mjs`
    - Same launcher at 1920 x 1080 against `/?firms=3000`; lights off then lights on (v2 settings blob), wait for the ready flag plus 2 s, save `reference/progress/graveyard-lights-off-1920x1080.png` and `graveyard-lights-on-1920x1080.png`, verify the image size, non-zero exit on failure.
    - _Requirements: 21.10_
    - _Design: Section 17_

  - [~] 22.2 Update `.kiro/steering/structure.md`
    - Add `web/src/audio` and `web/src/data` to the project structure (docs-only; no top-level folder changed). Do not edit `/pipeline`, `/data` or `data-contract.md`.
    - _Requirements: 21.12_
    - _Design: Requirement to Component Mapping (steering compliance)_

- [ ] 23. Final check
  - [~] 23.1 Run the full check and fix failures
    - Run: `Set-Location web; pnpm typecheck; pnpm lint; pnpm format; pnpm test; pnpm build`. Fix every failure; confirm the bundle guard and 25 MB check pass, no skipped Shock_Model or layout tests, and `git status` shows no changes under `/pipeline`, `/data`, `web/public/assets` or `CREDITS.md`.
    - Name `reference/graveyard/graveyard-rate-shock-3pp.png` as the matching reference and offer the scene-critic agent for a last review. The fps measurement and screenshots are run by the user with `pnpm dev` active.
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.11, 21.12, 21.13_

**STOP: review batch 7 before continuing.**

What to check:

- With `pnpm dev` running, `Set-Location web; node scripts/measure-fps.mjs --url http://localhost:5173` appends a sensible `DEVLOG.md` line (at least 50 fps target on an integrated GPU).
- The two 1920 x 1080 screenshots in `reference/progress/` look right in both modes.
- The full check passes and the working tree has no unintended changes.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP, but the property numbers in them are the design's correctness properties.
- Each task references requirements and design sections for traceability.
- Commit messages: conventional commits with the scope `graveyard-scene` (for example `feat(graveyard-scene): add layout engine`, `test(graveyard-scene): add Property 12`). The executor does not commit unless asked.
- Batches are strictly sequential; the dependency graph below orders tasks inside and across batches and keeps tasks that write the same file in different waves.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["1.4"] },
    { "id": 4, "tasks": ["2.1", "3.1", "5.1"] },
    { "id": 5, "tasks": ["2.2", "2.3", "3.2", "3.3", "4.1", "5.2"] },
    { "id": 6, "tasks": ["3.4", "3.5", "3.6", "3.7", "3.8", "3.9", "4.2", "4.3", "4.6"] },
    { "id": 7, "tasks": ["4.4", "4.5", "4.7"] },
    { "id": 8, "tasks": ["4.8"] },
    { "id": 9, "tasks": ["6.1", "6.3"] },
    { "id": 10, "tasks": ["6.2", "6.4"] },
    { "id": 11, "tasks": ["7.1", "8.1", "9.1"] },
    { "id": 12, "tasks": ["7.2", "7.4", "8.2", "9.2"] },
    { "id": 13, "tasks": ["7.3", "8.3", "8.4", "9.3"] },
    { "id": 14, "tasks": ["7.5", "7.6", "8.5", "8.6", "8.7", "8.8"] },
    { "id": 15, "tasks": ["10.1", "10.2"] },
    { "id": 16, "tasks": ["10.3", "11.1"] },
    { "id": 17, "tasks": ["10.4", "10.5", "10.6", "11.2", "12.1", "13.1"] },
    { "id": 18, "tasks": ["11.3", "12.4", "13.2", "13.3"] },
    { "id": 19, "tasks": ["11.4", "12.2"] },
    { "id": 20, "tasks": ["12.3", "13.4"] },
    { "id": 21, "tasks": ["13.5"] },
    { "id": 22, "tasks": ["13.6"] },
    { "id": 23, "tasks": ["14.1", "15.1", "16.1", "17.1"] },
    { "id": 24, "tasks": ["14.2", "14.5", "14.6", "14.7", "14.8", "14.9", "15.3", "16.3", "16.5", "17.3", "17.4", "17.5"] },
    { "id": 25, "tasks": ["14.3", "14.4", "16.6", "16.7"] },
    { "id": 26, "tasks": ["15.2"] },
    { "id": 27, "tasks": ["16.2"] },
    { "id": 28, "tasks": ["16.4"] },
    { "id": 29, "tasks": ["17.2"] },
    { "id": 30, "tasks": ["18.1", "19.1", "20.2", "20.3"] },
    { "id": 31, "tasks": ["18.2", "18.4", "20.4"] },
    { "id": 32, "tasks": ["18.3", "18.5", "18.6"] },
    { "id": 33, "tasks": ["19.2"] },
    { "id": 34, "tasks": ["19.3", "20.1"] },
    { "id": 35, "tasks": ["21.1", "22.1", "22.2"] },
    { "id": 36, "tasks": ["21.2"] },
    { "id": 37, "tasks": ["23.1"] }
  ]
}
```
