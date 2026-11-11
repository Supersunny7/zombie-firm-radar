# Implementation Plan: app-shell

## Overview

Build the deployable skeleton in `/web` in TypeScript: tooling, tokens, pure core (machine, settings, guards, loader, sort and format helpers, data plugin), the zustand store, React UI (HUD, Settings menu, Table view, Error screen, Debug bar), lazy empty scenes, App wiring, the bundle check, `vercel.json` and docs. Pure modules come first so they can be tested early, and UI is wired last.

Rules for every task:

- Commit messages use conventional commits with the spec scope, for example `feat(app-shell): add game-flow machine`.
- Shell is PowerShell. Chain commands with `;`, not `&&`. Use `pnpm test` (runs `vitest run`), never watch mode. Run `git pull` before starting work.
- Before using any API of `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `three-custom-shader-material` or `@theatre/core`, look it up with the context7 MCP server. This spec uses only `Canvas` from `@react-three/fiber`.
- Do not edit `/pipeline`, data generation code, `data-contract.md`, `/data/schema` or `web/src/types/data.ts`.
- Do not add any asset under `web/public/assets`. Fonts come from @fontsource npm packages, so no `CREDITS.md` row is needed. If an asset is ever added, add its `CREDITS.md` row in the same commit.
- Pin every dependency exactly (`pnpm add --save-exact`, `.npmrc` with `save-exact=true`).
- After any change under `web/src/scenes/**` or `web/src/fx/**`, state which `/reference` screenshot it should match (none exist for these empty placeholder canvases) and offer a scene-critic check.

## Tasks

- [x] 1. Scaffold the `/web` project
  - [x] 1.1 Create the Vite + React 19 + TypeScript project and tooling
    - Create `web/package.json` (scripts `dev`, `build`, `preview`, `test`, `lint`, `format`, `typecheck`; `packageManager: "pnpm@12.18.0"`; `engines.node: ">=22"`), `.npmrc` (`save-exact=true`), `tsconfig.json`, `tsconfig.node.json` (strict, `noUncheckedIndexedAccess`, bundler resolution, `react-jsx`), `vite.config.ts` (react, `@tailwindcss/vite`, `build.manifest: true`), `vitest.config.ts` (jsdom, `setupFiles`, `globals: false`, `css: false`), `eslint.config.js` (flat config, react-hooks, restricted imports for `src/engine/**`, `src/state/machine.ts`, `src/state/types.ts`, `src/data/**`, `src/state/settingsStorage.ts`), `.prettierrc.json`, `index.html`
    - Install pinned dependencies: react 19, react-dom 19, @react-three/fiber 9, matching `three`, zustand, three @fontsource packages; dev: vite, @vitejs/plugin-react, typescript, tailwindcss, @tailwindcss/vite, vitest, jsdom, Testing Library, vitest-axe, fast-check, ajv, ajv-formats, eslint, typescript-eslint, eslint-plugin-react-hooks, prettier, @types/*. Do not install drei, fiber 8, drei 9 or @theatre/studio
    - Create `src/test/setup.ts` (jest-dom, vitest-axe matchers, `matchMedia` and `localStorage` stubs) and `src/engine/.gitkeep`
    - Run `pnpm install` in `web` and commit `pnpm-lock.yaml`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.8, 1.9, 1.10, 17.1, 17.7_

  - [x] 1.2 Add the `web/dist` entry to `.gitignore`
    - Append `web/dist` to the root `.gitignore` if missing; keep `node_modules` and local tool output ignored; never ignore `/.kiro`, `/data` or `/data/mock`
    - Verify with `git check-ignore web/dist` in PowerShell
    - _Requirements: 1.11_

- [x] 2. Design tokens, fonts and theme attributes
  - [x] 2.1 Implement `src/index.css`, `src/main.tsx` font imports and theme sync helpers
    - Tailwind v4 `@import "tailwindcss"`, `@custom-variant lights-on`, `@theme` tokens (colors, panel, radius, three font families), `:root[data-lights="on"]` brighter set, `:root[data-reduced-motion="true"]` rule that disables transitions and animations except `.clock-text`
    - Import latin per-weight @fontsource CSS (Inter 400/500/600, Cormorant Garamond 500/600, JetBrains Mono 400/500) in `main.tsx` with a minimal render so the project builds
    - Export a `ThemeSync` component (`useLayoutEffect` sets `data-lights` and `data-reduced-motion` on `document.documentElement`) from `src/ui/ThemeSync.tsx`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 9.12_

  - [x] 2.2 Write contrast and theme tests
    - `src/ui/contrast.test.ts`: WCAG luminance function over token hex values, assert at least 4.5:1 for each HUD and Table pair in both lights modes
    - Test that `ThemeSync` sets and updates `data-lights` and `data-reduced-motion`
    - _Requirements: 2.6, 2.7, 2.9, 9.12_

- [x] 3. Game-flow machine
  - [x] 3.1 Implement `src/state/types.ts` and `src/state/machine.ts`
    - Branded `Cik` and `RateShock`, `Treatment`, `ToolChoice`, `Result`, `GameContext`, `GameState`, `GameEvent`, `Machine` (with `history` map), `TransitionOutcome`
    - `parseCik`, `parseRateShock` (finite check before range), `parseTreatment` (0 to 3 tools), `parseResult` run inside `transition`
    - Implement `initialMachine` and `transition` for `selectFirm`, `captureDone`, `pullSwitch`, `continue`, `cancel`, `setRateShock`, `setTreatment`, `setResult`; invalid events return `ok: false` with the same machine reference and a reason
    - Typed `Allowed` table and exhaustive `switch` so an unlisted transition fails to compile; no React or three imports
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 3.14, 3.15_

  - [x] 3.2 Write property test for machine invariants
    - **Property 1: Machine invariants hold for any event sequence**
    - 0 to 100 events from `arbEvent`/`arbBadEvent`, 200 runs; header comment `// Feature: app-shell, Property 1: ...`
    - **Validates: Requirements 3.1, 3.11, 3.12, 3.17**

  - [x] 3.3 Write property test for rejected events
    - **Property 2: Invalid events and invalid values leave the machine unchanged**
    - Assert `ok: false`, same reference, deep-equal, reject info with non-empty reason
    - **Validates: Requirements 3.9, 3.14**

  - [x] 3.4 Write unit and type tests for the machine
    - Table-driven test for each valid transition, every invalid state and event pair, `history` update on `continue`, and `expectTypeOf` test that `captureDone` from `graveyard` is `never`
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.16_

- [x] 4. Settings and persistence
  - [x] 4.1 Implement `src/state/settings.ts` and `src/state/settingsStorage.ts`
    - `Settings`, `DEFAULT_SETTINGS`, `serializeSettings`, `parseSettings` (per-field fallback, never throws), `readSettings`, `writeSettings` (try/catch, returns false on failure), storage key `zfr.settings.v1`
    - `sound` is a flag only; create no `AudioContext`
    - _Requirements: 9.1, 9.2, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10_

  - [x] 4.2 Write property test for the settings round trip
    - **Property 5: Settings round trip**
    - **Validates: Requirements 9.5, 9.6, 9.11**

  - [x] 4.3 Write property test for tolerant settings parsing
    - **Property 6: Settings parsing never throws and falls back per field**
    - **Validates: Requirements 9.2, 9.8**

  - [x] 4.4 Write unit tests for settings
    - Defaults, throwing `localStorage` on read and write, no `AudioContext` created, media-query follow versus explicit override (store level once 8.1 exists is covered in 8.3)
    - _Requirements: 9.2, 9.7, 9.9_

- [x] 5. Data guards and dev fixture
  - [x] 5.1 Implement `src/data/guards.ts`
    - Combinators (`obj`, `str`, `num`, `nullable`, `arrayOf`, `oneOf`, `cik`, `ascending`), `GuardResult<T>` with JSON path, expected and actual
    - Public `guardFirmsIndex`, `guardFirm`, `guardMacro`; missing key is invalid, `null` is valid for nullable fields; `Number.isFinite` for numbers; follow the schemas on `additionalProperties`
    - No React or three imports; do not change `src/types/data.ts`
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 5.2 Implement the dev fixture in `src/dev/fixtures/`
    - `firms.ts`, `macro.ts`, `index.ts`, `indexEntryFrom(firm, meta)` helper; three fictional firms (zombie "Ashgrove Works", endangered, healthy) with fictional CIKs `9000000001` to `9000000003`, all `rescue_eligible`
    - Ashgrove values: revenue 1.20e9, EBIT 38e6, interest 61e6, debt 1.05e9, assets 1.60e9, equity 140e6, five ascending years with ICR below 1 in 2022 to 2024, age at least 10; rescue_inputs 0.035 / 0.018 / 0.01; `dgs10.value` 0.042
    - Check chosen names against listed company names during implementation
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 5.3 Create shared arbitraries in `src/test/arbitraries.ts`
    - `arbCik`, `arbStatus`, `arbFirmIndexEntry`, `arbFirmsIndex`, `arbFirm` (ascending `fy`, nullable fields), `arbMacro`, `arbSettings`, `arbEvent`, `arbBadEvent`, `arbCorruption(value)`
    - Build from types in `web/src/types/data.ts`
    - _Requirements: 3.17, 7.9, 9.11, 12.26_

  - [x] 5.4 Write property test for guard round trip
    - **Property 3: Data guards accept every JSON round trip of a valid value**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.9**

  - [x] 5.5 Write property test for single-field corruption
    - **Property 4: Data guards reject any single-field corruption and name its path**
    - **Validates: Requirements 7.2, 7.3, 7.4**

  - [x] 5.6 Write ajv agreement and fixture tests
    - Load `/data/schema/*.json` with ajv and ajv-formats (test-only); fixture and every file in `/data/mock` (when present) pass ajv and guards; invalid samples fail both
    - Assert Ashgrove numbers, macro 0.042, three statuses, index and firm consistency, fictional names
    - _Requirements: 7.10, 7.11, 7.12, 8.7, 17.2_

- [x] 6. Data loader
  - [x] 6.1 Implement `src/data/errors.ts`, `src/data/source.ts` and `src/data/loader.ts`
    - `createLoader({ fetch, isDev, loadFixture })` with `loadStartup`, `loadFirm`, `retry`; `formatLoadError`
    - DEV: probe `/data/mock/firms_index.json`, else fixture via `import.meta.env.DEV`-gated dynamic import; PROD: `/data/` then `/data/mock/` then error; reuse the probe response; parse text with try/catch for invalid JSON; cache only validated values; reject bad or unlisted CIK before any fetch; never fetch `keeper_log.json`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 6.12_

  - [x] 6.2 Write property test for unknown CIKs
    - **Property 11: Unknown or malformed CIKs never reach the network**
    - **Validates: Requirements 6.2, 6.12**

  - [x] 6.3 Write loader unit tests with mocked `fetch`
    - Sources `mock`, `fixture`, `real`; production missing index with mock fallback (Data_Source `mock`); production with neither; non-2xx; network error; invalid JSON; cache hit makes one request; failure not cached; no `/data/mock/` request in `real`; `keeper_log.json` never requested; retry
    - _Requirements: 6.3, 6.4, 6.5, 6.6, 6.8, 6.9, 6.10, 6.11, 6.14, 6.15, 7.8_

- [x] 7. Vite data plugin
  - [x] 7.1 Implement `web/plugins/dataPlugin.ts` and wire it in `vite.config.ts`
    - `resolveInsideData`, `planCopy`, dev middleware for `/data/` (404 outside the folder), `closeBundle` copy (real: all except `schema` and `mock`; else `mock` only; neither: warn), log file count, `Cache-Control: no-cache`
    - Read `../data` in place; write nothing under `/web` except `dist`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 7.2 Write property test for path containment
    - **Property 10: Data path resolution never escapes the data folder**
    - **Validates: Requirements 5.1, 5.5**

  - [x] 7.3 Write plugin copy tests
    - Temporary-directory runs for real, mock-only and neither; `schema` always excluded; log message with count
    - _Requirements: 5.2, 5.3, 5.6, 17.11_

- [x] 8. Zustand store
  - [x] 8.1 Implement `src/state/store.ts`
    - State: `machine`, `settings`, `overlay`, `debugBar`, `data`, `firm`, `skipHandler`, `lastRejection`, `systemReducedMotion`
    - Actions: `send` (only way to change machine), `selectFirm`, `setRateShock`, `setTreatment`, `setResult`, `setSetting`, `toggleOverlay`, `closeOverlay`, `toggleDebugBar`, `setData`, `setFirm`, `registerSkip`
    - Pure `initialDebugBar(isDev, search)`; `effectiveReducedMotion` selector; persist settings on change through `writeSettings`; `console.warn` rejections in DEV only
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.3, 9.4, 14.1, 14.2, 14.3, 14.4_

  - [x] 8.2 Write property test for debug bar visibility
    - **Property 12: Debug bar default visibility**
    - **Validates: Requirements 14.1, 14.2, 14.3**

  - [x] 8.3 Write store unit tests
    - Overlay toggle keeps the `machine` reference; actions route through `transition`; reduced-motion follows the media query until set explicitly; settings persist
    - _Requirements: 4.2, 4.4, 4.5, 9.3, 9.4, 9.5_

- [ ] 9. Table helpers
  - [ ] 9.1 Implement `src/ui/table/sort.ts`, `format.ts` and `StatusLabel.tsx`
    - `nextSort`, `sortRows` (nulls last in both directions, stable, tie-break by name ascending case-insensitive, new array), `formatIcr` (no `-0.00`), `formatDebt` (unit chosen after rounding, negatives), `statusLabel` with glyphs and text
    - _Requirements: 12.5, 12.6, 12.7, 12.9, 12.10, 12.12, 12.13, 12.14_

  - [ ] 9.2 Write property test for sorting
    - **Property 7: Table sorting is a correctly ordered permutation**
    - **Validates: Requirements 12.9, 12.12, 12.13, 12.14, 12.15, 12.26**

  - [ ] 9.3 Write property test for ICR formatting
    - **Property 8: ICR formatting**
    - **Validates: Requirements 12.6**

  - [ ] 9.4 Write property test for debt formatting
    - **Property 9: Debt formatting picks the unit by magnitude**
    - **Validates: Requirements 12.7**

- [ ] 10. Checkpoint - Ensure all tests pass
  - Run `pnpm test`, `pnpm lint`, `pnpm typecheck` in `web`. Ensure all tests pass, ask the user if questions arise.

- [ ] 11. HUD, Settings menu, Table view and Error screen
  - [ ] 11.1 Implement the HUD frame
    - `src/ui/useFocusTrap.ts`, `Hud.tsx`, `Clock.tsx` (with pure `formatTimestamp`, `clock-text` class, 1 s interval), `SkipSlot.tsx` (hidden or `aria-disabled` without handler, Esc calls handler once), `SkipLink.tsx` (first focusable, "Skip to table view"), Mock data label (hidden until Data_Source known), "Table view" button
    - Footer "Data: SEC EDGAR. Not investment advice." rendered outside any conditional; panels on right and bottom, stacked below 900px; red dot `aria-hidden`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10, 10.11, 10.12, 10.13, 10.14, 12.1, 13.15_

  - [ ] 11.2 Implement `src/ui/ErrorScreen.tsx`
    - Title, file path, reason in `role="alert"`, Retry button focused on mount that calls `loader.retry()` and reruns startup; footer stays visible
    - _Requirements: 7.5, 7.6, 7.7, 7.8_

  - [ ]* 11.3 Write property test for the timestamp format
    - **Property 13: HUD timestamp format**
    - **Validates: Requirements 10.2**

  - [ ] 11.4 Implement `src/ui/SettingsMenu.tsx`
    - Button "Settings" with `aria-expanded`, `aria-controls`, `role="dialog"` panel, four checkboxes labelled "Lights on", "Sound", "Low quality", "Reduced motion", On/Off text, "Follow system" note, focus trap, Esc closes and restores focus, visible focus outline
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9_

  - [ ] 11.5 Implement `src/ui/table/TableView.tsx`
    - Modal dialog with native `<table>`, caption, column header buttons in `th scope="col"`, `aria-sort`, Status_Label, ICR and debt formatting, "Select" button only when `rescue_eligible` with accessible name including the firm name, graveyard-only selection with `role="status"` message otherwise, empty-state row, focus on open, trap, Esc and Close restore focus to the "Table view" button, sort state local and reset on open, no machine change from open, sort or close
    - _Requirements: 12.2, 12.3, 12.4, 12.5, 12.8, 12.9, 12.10, 12.11, 12.15, 12.16, 12.17, 12.18, 12.19, 12.20, 12.21, 12.22, 12.23_

  - [ ]* 11.6 Write component and axe tests for HUD, Settings menu, Table view and Error screen
    - HUD: REC text, footer in every game state and with Table open, Mock data label for `mock` and `fixture` only, Skip slot states, Esc handler once; Settings menu: labels, state text, focus behaviour, persistence, vitest-axe with menu open; Table view: columns, rows, Tab reachability, Enter and Space sorting, `aria-sort`, Select gating, empty state, vitest-axe with the fixture; Error screen: `role="alert"`, Retry, shown for invalid file and for production with no index
    - _Requirements: 10.4, 10.9, 10.10, 11.x, 12.24, 12.25, 17.2, 17.3, 17.4, 17.5_

- [ ] 12. Lazy scenes
  - [ ] 12.1 Implement `src/scenes/*`
    - Look up the R3F 9 `Canvas` API with context7 first
    - `webgl.ts` (`hasWebGL`), `ScenePlaceholder.tsx`, `graveyard/GraveyardScene.tsx`, `lab/LabScene.tsx` (empty `<Canvas frameloop="demand">`, background `#05070A`, HTML label outside the canvas, "Low quality" suffix, "3D view unavailable. Use Table view." when no WebGL, data from the store only)
    - `SceneHost.tsx` with `lazyWithRetry`, `Suspense` fallback "Loading feed…", error boundary with Retry, keyed remount per scene, `preloadLab()` on first `capture` and never at start
    - Report that no `/reference` screenshot applies to these empty canvases and offer a scene-critic check
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9, 13.10, 13.11, 13.12, 13.13, 13.14_

  - [ ]* 12.2 Write scene tests
    - Mock `@react-three/fiber` `Canvas`; scene selected per state, exactly one canvas, fallback text, lab preload only after first `capture`, chunk failure with Retry, WebGL-unavailable message, Low quality label
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.11, 13.12, 13.13_

- [ ] 13. Debug bar
  - [ ] 13.1 Implement `src/ui/DebugBar.tsx`
    - Lazy-loaded; firm `<select>`, buttons Capture / Lab / Outcome / Graveyard with pure `debugButtonStates(state)`, Rate_Shock number input 0 to 0.05, Result select; docked at the bottom above the footer; native labelled controls; DEV-only helpers imported behind `import.meta.env.DEV`
    - _Requirements: 14.5, 14.6, 14.7, 14.8, 14.9, 14.10_

  - [ ]* 13.2 Write debug bar tests
    - Button enablement per state, shock input range, result picker, vitest-axe clean, hidden in production mode without `debug=1`
    - _Requirements: 14.3, 14.6, 14.7, 14.8, 14.9_

- [ ] 14. Wire the App
  - [ ] 14.1 Implement `src/App.tsx` and finish `src/main.tsx`
    - Startup load with "Loading feed…", `setData`, Error screen on failure, `ThemeSync`, `matchMedia` subscription for `systemReducedMotion`, firm load on entering `lab`, HUD, SceneHost, TableView overlay, lazy DebugBar when `debugBar` is true
    - _Requirements: 4.1, 6.1, 6.2, 6.13, 7.5, 9.3, 10.9, 13.15_

  - [ ]* 14.2 Write App integration tests
    - Mocked `fetch`: loading text, successful render with each source, Error screen instead of any Scene, walk the flow through the Debug bar, footer always present
    - _Requirements: 6.13, 7.5, 10.4, 17.3, 17.4_

- [ ] 15. Bundle check, deploy config, docs and report
  - [ ] 15.1 Implement `web/scripts/check-bundle.mjs` and update the `build` script
    - Read `dist/.vite/manifest.json`, compute the initial closure excluding dynamic imports, gzip with `node:zlib`, print "Initial JS: X KB gzipped" and the total after the graveyard scene; exit 1 above 400 KB; fail on `Ashgrove Works`, `@theatre/studio` or ajv strings in built JS; verify the lab chunk is outside the initial closure
    - `build` = `tsc -b && vite build && node scripts/check-bundle.mjs`
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

  - [ ] 15.2 Create `vercel.json` at the repo root
    - `installCommand` `corepack enable && pnpm --dir web install --frozen-lockfile`, `buildCommand` `pnpm --dir web build`, `outputDirectory` `web/dist`, immutable cache for `/assets/(.*)`, `no-cache` for `/data/(.*)`; no functions or rewrites; no secrets
    - _Requirements: 16.1, 16.2, 16.5, 16.6, 16.7_

  - [ ] 15.3 Write docs and update `tech.md`
    - Create `web/README.md` with pnpm commands, `?debug=1`, data-source rules, and the Vercel note that the project root must stay at the repository root
    - Replace "Common commands" in `.kiro/steering/tech.md` with install, dev, build, test, lint, format, typecheck in PowerShell syntax; update `structure.md` only if top-level folders changed (they do not)
    - _Requirements: 17.9, 17.10_

  - [ ] 15.4 Run the full build and write the report
    - Run `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm format`, `pnpm typecheck` in `web`; fix failures
    - Run the Playwright MCP contrast check in both lights modes against the running app (the user starts `pnpm dev`) and save notes under `/docs`
    - Write `.kiro/specs/app-shell/report.md` with the measured Initial JS and total gzipped numbers
    - _Requirements: 1.6, 1.7, 1.8, 15.7, 17.6_

  - [ ]* 15.5 Write config smoke tests
    - Read `web/package.json`: exact pins (no `^`, `~`, `*`, ranges), scripts, `packageManager`, `engines`, react 19, fiber 9, no drei 9 or fiber 8; read `vercel.json`: fields, no functions or rewrites; ESLint fixture test that `src/engine` importing `react` is an error
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.10, 16.1, 16.2, 16.5_

- [ ] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate the 13 correctness properties in `design.md`; each runs at least 100 iterations with a `// Feature: app-shell, Property N` header
- Unit and component tests validate examples and edge cases
- Edits outside `.kiro/specs/app-shell` (`.gitignore`, `vercel.json`, `web/**`, `tech.md`, `/docs`) happen only when their tasks run

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "3.1", "4.1", "5.1", "9.1", "15.2"] },
    { "id": 2, "tasks": ["2.2", "3.4", "4.4", "5.2", "5.3", "7.1", "8.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "4.2", "4.3", "5.4", "5.5", "5.6", "6.1", "7.2", "7.3", "8.2", "8.3", "9.2", "9.3", "9.4"] },
    { "id": 4, "tasks": ["6.2", "6.3", "11.1", "11.2", "12.1", "13.1"] },
    { "id": 5, "tasks": ["11.3", "11.4", "11.5", "12.2", "13.2"] },
    { "id": 6, "tasks": ["11.6", "14.1"] },
    { "id": 7, "tasks": ["14.2", "15.1"] },
    { "id": 8, "tasks": ["15.3", "15.4", "15.5"] }
  ]
}
```
