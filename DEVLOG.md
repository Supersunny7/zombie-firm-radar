# Devlog
2026-11-11 | app-shell | 1.1 | Scaffolded Vite React 19 TypeScript project with pinned tooling and gitignore entry | web/*, .gitignore
2026-11-11 | app-shell | 1.2 | Added web/dist and tsbuildinfo entries to root gitignore and verified with git check-ignore | .gitignore
2026-11-11 | app-shell | 2.1 | Added Tailwind v4 theme tokens, fonts and ThemeSync component | web/src/index.css, web/src/main.tsx, web/src/ui/ThemeSync.tsx
2026-11-11 | app-shell | 2.2 | Added WCAG contrast and ThemeSync tests; darkened lights-on ink token for REC contrast | web/src/ui/contrast.test.ts, web/src/index.css
2026-11-11 | app-shell | 3.1 | Implemented game-flow machine with branded types, parsers and exhaustive transitions | web/src/state/types.ts, web/src/state/machine.ts
2026-11-11 | app-shell | 3.2 | Added machine invariants property test and machine arbitraries | web/src/state/machine.property.test.ts, web/src/test/arbitraries.ts
2026-11-11 | app-shell | 3.3 | Added rejected-event property test for the machine | web/src/state/machine.rejection.property.test.ts
2026-11-11 | app-shell | 3.4 | Added table-driven unit and type tests for the machine | web/src/state/machine.unit.test.ts
2026-11-11 | app-shell | 4.1 | Implemented settings model, tolerant parsing and localStorage persistence | web/src/state/settings.ts, web/src/state/settingsStorage.ts
2026-11-11 | app-shell | 4.2 | Added settings round-trip property test and arbSettings arbitrary | web/src/state/settings.roundtrip.property.test.ts, web/src/test/arbitraries.ts
2026-11-11 | app-shell | 4.3 | Added tolerant settings parsing property test | web/src/state/settings.parse.property.test.ts
2026-11-11 | app-shell | 4.4 | Added settings unit tests for defaults, throwing storage and no AudioContext | web/src/state/settings.unit.test.ts
2026-11-11 | app-shell | 5.1 | Implemented data guards with JSON-path errors for firms index, firm and macro | web/src/data/guards.ts, web/src/data/guards.test.ts
2026-11-11 | app-shell | 5.2 | Added dev fixture with three fictional firms including Ashgrove Works, macro and index helper | web/src/dev/fixtures/*
2026-11-11 | app-shell | 5.3 | Added shared data arbitraries and single-field corruption generator with sanity test | web/src/test/arbitraries.ts, web/src/test/arbitraries.test.ts
2026-11-11 | app-shell | 5.4 | Added guard JSON round-trip property test | web/src/data/guards.roundtrip.property.test.ts
2026-11-11 | app-shell | 5.5 | Added single-field corruption property test for guards | web/src/data/guards.corruption.property.test.ts
2026-11-11 | app-shell | 5.6 | Added ajv agreement and fixture tests against data schemas | web/src/data/ajv.agreement.test.ts
2026-11-11 | app-shell | 6.1 | Implemented data loader with source detection, validation, caching and error formatting | web/src/data/errors.ts, source.ts, loader.ts
2026-11-11 | app-shell | 6.2 | Added unknown-CIK property test for the loader | web/src/data/loader.cik.property.test.ts
2026-11-11 | app-shell | 6.3 | Added loader unit tests with mocked fetch | web/src/data/loader.test.ts
2026-11-11 | app-shell | 7.1 | Implemented Vite data plugin with safe path resolution, dev middleware and build copy | web/plugins/dataPlugin.ts, web/vite.config.ts
2026-11-11 | app-shell | 7.2 | Added data path containment property test | web/plugins/dataPlugin.path.property.test.ts
2026-11-11 | app-shell | 7.3 | Added data plugin copy tests and testable copyDataAndLog | web/plugins/dataPlugin.copy.test.ts, web/plugins/dataPlugin.ts
2026-11-11 | app-shell | 8.1 | Implemented zustand store routing machine events, settings persistence and debug bar defaults | web/src/state/store.ts
2026-11-11 | app-shell | 8.2 | Added debug bar default visibility property test | web/src/state/debugBar.property.test.ts
2026-11-11 | app-shell | 8.3 | Added store unit tests for overlay, routing, reduced motion and persistence | web/src/state/store.unit.test.ts
2026-11-11 | app-shell | 9.1 | Implemented table sort, ICR and debt formatting and status label helpers | web/src/ui/table/sort.ts, format.ts, StatusLabel.tsx
2026-11-11 | app-shell | 9.2 | Added table sorting property test | web/src/ui/table/sort.property.test.ts
2026-11-11 | app-shell | 9.3 | Added ICR formatting property test and fixed exponent output for huge values | web/src/ui/table/formatIcr.property.test.ts, format.ts
2026-11-11 | app-shell | 9.4 | Added debt formatting property test | web/src/ui/table/formatDebt.property.test.ts
2026-11-11 | app-shell | 10 | Checkpoint passed: 202 tests, lint, typecheck and format clean | none
2026-11-11 | app-shell | 11.1 | Implemented HUD frame with clock, skip slot, skip link, mock label and footer | web/src/ui/Hud.tsx, Clock.tsx, SkipSlot.tsx, SkipLink.tsx, useFocusTrap.ts
2026-11-11 | app-shell | 11.2 | Implemented Error screen with alert, focused Retry and tests | web/src/ui/ErrorScreen.tsx, ErrorScreen.test.tsx
2026-11-11 | app-shell | 11.3 | Added HUD timestamp format property test | web/src/ui/clock.property.test.ts
2026-11-11 | app-shell | 11.4 | Implemented accessible Settings menu with four toggles and focus handling | web/src/ui/SettingsMenu.tsx, Hud.tsx
2026-11-11 | app-shell | 11.5 | Implemented accessible Table view modal with sorting and gated Select | web/src/ui/table/TableView.tsx
2026-11-11 | app-shell | 11.6 | Added component and axe tests for HUD, Settings menu, Table view and Error screen | web/src/ui/*.test.tsx, web/src/ui/table/TableView.test.tsx
2026-11-11 | app-shell | 12.1 | Implemented lazy empty graveyard and lab scenes with host, WebGL fallback and lab preload | web/src/scenes/*
2026-11-11 | app-shell | 12.2 | Added scene selection, preload, chunk failure and WebGL fallback tests | web/src/scenes/scenes.test.tsx
2026-11-11 | app-shell | 13.1 | Implemented lazy Debug bar with firm select, state buttons, rate shock and result controls | web/src/ui/DebugBar.tsx
2026-11-11 | app-shell | 13.2 | Added Debug bar tests for button states, rate shock input, result picker and axe | web/src/ui/DebugBar.test.tsx
2026-11-11 | app-shell | 14.1 | Wired App with startup loader, error screen, theme sync, scenes, table overlay and lazy debug bar | web/src/App.tsx, main.tsx, ui/Hud.tsx
2026-11-11 | app-shell | 14.2 | Added App integration tests and fixed corrupted loading string | web/src/App.test.tsx, web/src/App.tsx
2026-11-11 | app-shell | 15.1 | Added bundle size and leak check script; initial JS 76.0 KB gzipped | web/scripts/check-bundle.mjs
2026-11-11 | app-shell | 15.2 | Added vercel.json with install, build, output and cache headers | vercel.json
2026-11-11 | app-shell | 15.3 | Wrote web README and replaced tech.md common commands with PowerShell commands | web/README.md, .kiro/steering/tech.md
2026-11-11 | app-shell | 15.4 | Ran full build and checks, Playwright contrast audit in both lights modes, wrote report | .kiro/specs/app-shell/report.md, docs/app-shell-contrast*
2026-11-11 | app-shell | 15.5 | Added config smoke tests for package pins, vercel.json and engine import lint rule | web/src/config.smoke.test.ts
2026-11-11 | app-shell | 16 | Final checkpoint passed: 291 tests, lint, typecheck and build clean; initial JS 76.0 KB gzipped | none
2026-11-11 | table-caption-data-source-fix | 1 | Draft caption test fails on HEAD for mock, confirming the bug. | none
2026-11-11 | table-caption-data-source-fix | 2 | Real-data caption and 13 existing tests pass on HEAD baseline. | none
2026-11-11 | vercel-pnpm-version-fix | 1 | Added smoke tests requiring pinned pnpm version in vercel.json; they fail on current config. | web/src/config.smoke.test.ts
2026-11-11 | vercel-pnpm-version-fix | 2 | Recorded vercel.json baseline; existing smoke assertions pass, only the two pin tests fail. | none
2026-11-11 | vercel-pnpm-version-fix | 3.1 | Pinned pnpm 12.18.0 via npx in vercel.json install and build commands; smoke tests pass. | vercel.json
2026-11-11 | vercel-pnpm-version-fix | 3.2 | Updated app-shell requirements 16.1 and 16.7 to the pinned npx pnpm commands. | .kiro/specs/app-shell/requirements.md
2026-11-11 | vercel-pnpm-version-fix | 3.3 | Updated app-shell design JSON block and corepack paragraph for pinned pnpm. | .kiro/specs/app-shell/design.md
2026-11-11 | vercel-pnpm-version-fix | 3.4 | Updated app-shell task 15.2 text to the pinned npx pnpm commands. | .kiro/specs/app-shell/tasks.md
2026-11-11 | vercel-pnpm-version-fix | 3.5 | Rewrote web README Deploy section for pinned npx pnpm commands. | web/README.md
2026-11-11 | vercel-pnpm-version-fix | 3.6 | Searched for leftover old deploy commands; none found outside history and the bug spec. | none
2026-11-11 | vercel-pnpm-version-fix | 3.7 | Pin tests pass on fixed config; temporary version mismatch fails naming both versions. | none
2026-11-11 | vercel-pnpm-version-fix | 3.8 | Preservation verified: other vercel.json keys identical to HEAD, no root package.json, web/package.json unchanged. | none
2026-11-11 | vercel-pnpm-version-fix | 3.9 | Full check passes (298 tests); pinned npx commands install and build locally. | web/src/config.smoke.test.ts
2026-11-11 | vercel-pnpm-version-fix | 4 | Checkpoint passed: typecheck, lint, format and 298 tests green. | none
2026-11-11 | table-caption-data-source-fix | 3.1 | Reviewed draft caption fix against design; no deviations found. | none
2026-11-11 | table-caption-data-source-fix | 3.2 | Caption property test passes for mock and fixture on the fix. | none
2026-11-11 | table-caption-data-source-fix | 3.3 | Real-data caption and 13 existing TableView tests pass; 15 of 15. | none
2026-11-11 | table-caption-data-source-fix | 4.1 | Added caption tests for mock, fixture and real in lights off and on. | web/src/ui/table/TableView.test.tsx
2026-11-11 | table-caption-data-source-fix | 4.2 | Added property over real, mock and fixture checking caption text and shared sort hint. | web/src/ui/table/TableView.test.tsx
2026-11-11 | table-caption-data-source-fix | 5 | Full check passes: typecheck, lint, format, 305 tests, build. | none
2026-11-11 | table-caption-data-source-fix | 6 | Checkpoint passed: typecheck, lint, format and 305 tests green. | none
2026-11-11 | asset-pipeline | 1.1 | Pulled repo and read steering files and reference images | none
2026-11-11 | asset-pipeline | 1.2 | Added tools/cache ignore rules and created candidate folders | .gitignore
2026-11-11 | asset-pipeline | 2.1 | Scouted five CC0 ground and stone texture candidates | reference/candidates/01-ground-stone, notes
2026-11-11 | asset-pipeline | 2.2 | Scouted three CC0 Poly Haven night sky HDRIs | reference/candidates/02-night-sky, notes
2026-11-11 | asset-pipeline | 2.3 | Scouted 14 graveyard prop candidates, two per sub-item | reference/candidates/03-graveyard-props, notes
2026-11-11 | asset-pipeline | 2.4 | Scouted five CC BY Sketchfab lab prop candidates incl. two packs | reference/candidates/04-lab-props, notes
2026-11-11 | asset-pipeline | 2.5 | Scouted three rigged avatar candidates, two Rocketbox MIT | reference/candidates/05-avatars, notes
2026-11-11 | asset-pipeline | 2.6 | Found four CC BY Sketchfab zombie and hand manual picks | reference/candidates/06-zombie-hands, notes
2026-11-11 | asset-pipeline | 2.7 | Scouted 12 CC0 Freesound sound candidates under the raised cap | reference/candidates/07-sound, notes
2026-11-11 | asset-pipeline | 3.1 | Wrote candidates README with 46 candidates in seven category tables | reference/candidates/README.md
2026-11-11 | asset-pipeline | 3.2 | Validated 46 candidate rows, previews and protected paths; all checks pass | none
2026-11-11 | asset-pipeline | 3.3 | Committed phase 1 candidates as 73373e2 | .gitignore, reference/candidates, .kiro/specs/asset-pipeline
2026-11-11 | asset-pipeline | 4 | Received user picks; stop gate passed, scouting follow-ups requested | none
2026-11-11 | asset-pipeline | 5.1 | Recorded user picks, rejections and Rocketbox SHA in candidates README | reference/candidates/README.md
2026-11-11 | asset-pipeline | 6.1 | Provenance check: Greenall corpse confirmed own sculpt, Greenall hand unconfirmed | reference/candidates/README.md
2026-11-11 | asset-pipeline | 6.2 | Found CC BY craggle photogrammetry hand as replacement candidate | reference/candidates/README.md, 06-zombie-hands
2026-11-11 | asset-pipeline | 7.1 | Scouted six CC BY skull, body bag and morgue cooler candidates | reference/candidates/08-horror-dressing, notes
2026-11-11 | asset-pipeline | 7.2 | Scouted eight chains, straps, cloth texture and cobweb candidates | reference/candidates/08-horror-dressing, notes
2026-11-11 | asset-pipeline | 7.3 | Scouted CC0 blood splatter and smear decals; no CC0 handprint found | reference/candidates/08-horror-dressing, notes
2026-11-11 | asset-pipeline | 7.4 | Scouted blank headstone candidates; cracked state has one weak option | reference/candidates/08-horror-dressing, notes
2026-11-11 | asset-pipeline | 8.1 | Merged Category 8 and provenance results into candidates README | reference/candidates/README.md
2026-11-11 | asset-pipeline | 8.2 | Validated round-2 README: 71 previews, licenses, picks and counts pass | none
2026-11-11 | asset-pipeline | 8.3 | Committed round-2 candidates and spec updates as 7b925de | reference/candidates, .kiro/specs/asset-pipeline
2026-11-11 | rescue-engine | 1.1 | Added engine error codes, result types, data model types and geq helper | web/src/engine/errors.ts, types.ts, test/geq.ts
2026-11-11 | rescue-engine | 1.2 | Added shared icr() returning null for missing or non-positive interest | web/src/engine/icr.ts
2026-11-11 | rescue-engine | 1.4 | Added icr monotone-in-EBIT property test, 200 runs, passing | web/src/engine/icr.monotone.property.test.ts
2026-11-11 | rescue-engine | 1.5 | Added golden-cases parser and icr runner that skips when the fixture is absent | web/src/engine/icr.golden.test.ts, test/goldenCases*.ts
2026-11-11 | rescue-engine | 1.3 | Added icr contract property test; amended Req 1.4 to allow -0 on underflow | web/src/engine/icr.contract.property.test.ts, spec
