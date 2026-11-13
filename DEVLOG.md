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
2026-11-11 | rescue-engine | 2.1 | Added frozen tool registry with four v1 tools and three extension points | web/src/engine/tools.ts
2026-11-11 | rescue-engine | 11.1 | Added clamped score and liquidation recovery with cents on the dollar | web/src/engine/score.ts, liquidation.ts
2026-11-11 | rescue-engine | 2.2 | Added strict treatment parser with canonical order and serialisation | web/src/engine/treatment.ts
2026-11-11 | rescue-engine | 5.1 | Added prepare() input validation in design order without clamping delta | web/src/engine/inputs.ts
2026-11-11 | rescue-engine | 11.2 | Added liquidation recovery bound property test (RR-5), passing | web/src/engine/liquidation.property.test.ts
2026-11-11 | rescue-engine | 11.3 | Added score formula and bounds property test, passing | web/src/engine/score.property.test.ts
2026-11-11 | rescue-engine | 11.4 | Added score and liquidation unit tests including 0.285 rounding | web/src/engine/score.unit.test.ts
2026-11-11 | rescue-engine | 2.3 | Added valid and corrupted treatment generators for property tests | web/src/engine/test/engineArbitraries.ts
2026-11-11 | rescue-engine | 2.4 | Added 24 parser, registry and serialisation unit tests | web/src/engine/treatment.unit.test.ts
2026-11-11 | rescue-engine | 3.1 | State machine now uses engine Treatment type and delegates parsing | web/src/state/types.ts, machine.ts
2026-11-11 | rescue-engine | 5.3 | Added diagnose() with needed EBIT, debt cut and rate | web/src/engine/diagnose.ts
2026-11-11 | rescue-engine | 6.1 | Added refinance spread tiers, fee-aware apply rule and notes | web/src/engine/refinance.ts
2026-11-11 | rescue-engine | 7.1 | Added mulberry32, fixed six-uniform drawBlock and blocksFor | web/src/engine/rng.ts
2026-11-11 | rescue-engine | 7.2 | Added FNV-1a hash, ISO date check and seedFrom | web/src/engine/hash.ts
2026-11-11 | rescue-engine | 2.5 | Added treatment rejection property test with independent classifier, passing | web/src/engine/treatment.reject.property.test.ts
2026-11-11 | rescue-engine | 2.6 | Added treatment serialisation round-trip property test, passing | web/src/engine/treatment.roundtrip.property.test.ts
2026-11-11 | rescue-engine | 3.2 | State test arbitraries now generate engine-valid treatments; junk tools kept as arbRawTool | web/src/test/arbitraries.ts
2026-11-11 | rescue-engine | 6.2 | Added applyCore and applyTreatment in canonical tool order | web/src/engine/apply.ts
2026-11-11 | rescue-engine | 7.4 | Added mulberry32 vectors cross-checked with BigInt reference and drawBlock tests | web/src/engine/rng.unit.test.ts
2026-11-11 | rescue-engine | 5.2 | Added valid and labelled-bad firm, macro and delta generators | web/src/engine/test/engineArbitraries.ts
2026-11-11 | rescue-engine | 7.5 | Added FNV-1a vectors, pinned seedFrom cross-check and date/cik order tests | web/src/engine/hash.unit.test.ts
2026-11-11 | rescue-engine | 3.3 | Added machine delegation property test, passing | web/src/state/machine.delegation.property.test.ts
2026-11-11 | rescue-engine | 5.4 | Added diagnosis formulas property test at relative 1e-12, passing | web/src/engine/diagnose.formulas.property.test.ts
2026-11-11 | rescue-engine | 5.5 | Added 34 prepare and diagnose unit tests | web/src/engine/inputs.unit.test.ts, diagnose.unit.test.ts
2026-11-11 | rescue-engine | 6.3 | Added refinance never-raises-interest property test (RR-7), passing | web/src/engine/refinance.cost.property.test.ts
2026-11-11 | rescue-engine | 6.4 | Added RR-3 property test, passing | web/src/engine/apply.rr3.property.test.ts
2026-11-11 | rescue-engine | 6.5 | Added Ashgrove worked example tests incl. refinance variant and boundary | web/src/engine/ashgrove.unit.test.ts
2026-11-11 | rescue-engine | 6.6 | Added apply and refinance edge-case unit tests | web/src/engine/apply.unit.test.ts
2026-11-11 | rescue-engine | 7.3 | Added random block, seed, date, cik and bad-option generators | web/src/engine/test/engineArbitraries.ts
2026-11-11 | rescue-engine | 8.1 | Added projectPath three-year margin and coverage projection | web/src/engine/project.ts
2026-11-11 | rescue-engine | 4 | Checkpoint passed: typecheck, lint, format clean; 428 tests pass, 3 skipped | none
2026-11-11 | rescue-engine | 7.6 | Added seedFrom output and validation-order property test, passing | web/src/engine/hash.seedFrom.property.test.ts
2026-11-11 | rescue-engine | 8.2 | Added simulate with validation order, reuse optimisation and Infinity-safe medians | web/src/engine/simulate.ts
2026-11-11 | rescue-engine | 8.3 | Added RR-2 domain generator; precondition held on 20,000 cases | web/src/engine/test/engineArbitraries.ts
2026-11-11 | rescue-engine | 8.4 | Added RR-1 property test with refinance in 75% of cases, passing | web/src/engine/rr1.property.test.ts
2026-11-11 | rescue-engine | 8.5 | Added RR-2 property test with asserted precondition, passing | web/src/engine/rr2.property.test.ts
2026-11-11 | rescue-engine | 8.6 | Added RR-4 exact delta-monotone survival odds property test, passing | web/src/engine/rr4.property.test.ts
2026-11-11 | rescue-engine | 8.7 | Added fixed six-uniform random block property test, passing | web/src/engine/rng.block.property.test.ts
2026-11-11 | rescue-engine | 8.8 | Added simulate unit tests and named RR-1/RR-2 counterexample tests | web/src/engine/simulate.unit.test.ts, rr.counterexamples.unit.test.ts
2026-11-11 | rescue-engine | 9 | Checkpoint passed: typecheck, lint, format clean; 453 tests pass, 3 skipped | none
2026-11-11 | rescue-engine | 10.1 | Added drawOutcome, failure message and upward 0.1 pp hint scan | web/src/engine/outcome.ts, apply.ts, simulate.ts
2026-11-11 | rescue-engine | 10.2 | Added 19 outcome unit tests incl. hint, no-hint and 3-tool cases | web/src/engine/outcome.unit.test.ts
2026-11-11 | rescue-engine | 10.3 | Added outcome consistency and wording property test, passing | web/src/engine/outcome.wording.property.test.ts
2026-11-11 | rescue-engine | 10.4 | Added hint smallest-grid-cut property test, passing | web/src/engine/outcome.hint.property.test.ts
2026-11-11 | rescue-engine | 10.5 | Added core composition property test, passing | web/src/engine/core.composition.property.test.ts
2026-11-11 | rescue-engine | 10.6 | Extended Property 3 to applyTreatment, simulate and drawOutcome, passing | web/src/engine/treatment.reject.property.test.ts
2026-11-11 | rescue-engine | 13.1 | Added worker protocol types and simulate worker entry | web/src/engine/worker/protocol.ts, simulate.worker.ts
2026-11-11 | rescue-engine | 12.1 | Added click-order independence property test, passing | web/src/engine/clickOrder.property.test.ts
2026-11-11 | rescue-engine | 12.2 | Added validation-order property test with no-path check, passing | web/src/engine/validation.property.test.ts
2026-11-11 | rescue-engine | 12.3 | Added latest-year and unused-input property test, passing | web/src/engine/latestYear.property.test.ts
2026-11-11 | rescue-engine | 12.4 | Added determinism property test (RR-6), passing | web/src/engine/determinism.property.test.ts
2026-11-11 | rescue-engine | 12.5 | Added odds, pain and post-state range property test (RR-8), passing | web/src/engine/ranges.property.test.ts
2026-11-11 | rescue-engine | 13.2 | Added latest-wins worker client with channels, abort and dispose | web/src/engine/worker/client.ts
2026-11-11 | rescue-engine | 12.6 | Added display-safety property test; sub-dollar money inputs now not_rescuable (Req 4.15) | web/src/engine/displaySafety.property.test.ts, inputs.ts, spec
2026-11-11 | rescue-engine | 13.3 | Added fake worker, latest-wins reference model and worker op generator | web/src/engine/test/fakeWorker.ts, workerModel.ts, engineArbitraries.ts
2026-11-11 | rescue-engine | 14.1 | Added public engine entry; state now imports from engine index | web/src/engine/index.ts, web/src/state/types.ts, machine.ts
2026-11-11 | rescue-engine | 13.4 | Added 12 worker client unit tests: supersede, abort, channels, dispose | web/src/engine/worker/client.unit.test.ts
2026-11-11 | rescue-engine | 13.5 | Added worker id-matching property test, passing | web/src/engine/worker/client.ids.property.test.ts
2026-11-11 | rescue-engine | 13.6 | Added worker-equals-direct simulate property test, passing | web/src/engine/worker/client.equivalence.property.test.ts
2026-11-11 | rescue-engine | 13.7 | Added latest-wins versus reference model property test, passing | web/src/engine/worker/client.latestWins.property.test.ts
2026-11-11 | rescue-engine | 13.8 | Added channel independence property test, passing | web/src/engine/worker/client.channels.property.test.ts
2026-11-11 | rescue-engine | 14.2 | Added exact public export list unit test | web/src/engine/index.exports.unit.test.ts
2026-11-11 | rescue-engine | 14.4 | Added one unit test per EngineError code, exhaustive over all 14 | web/src/engine/errors.unit.test.ts
2026-11-11 | rescue-engine | 14.3 | Added engine purity scan with self-test and worker import check | web/src/engine/purity.test.ts
2026-11-11 | rescue-engine | 14.5 | Benchmarked simulate 1000 paths: 0.68 to 1.73 ms median across 15 combinations | web/src/engine/simulate.bench.ts, tasks.md
2026-11-11 | rescue-engine | 15 | Checkpoint passed twice: 536 tests pass, 3 skipped; formatted one property test | web/src/engine/displaySafety.property.test.ts
2026-11-11 | rescue-engine | 16.1 | Recorded canonical order, random block, typed errors, UTC seed date and sub-dollar rule in steering | .kiro/steering/rescue-rules.md
2026-11-11 | rescue-engine | 17 | Final checkpoint passed: typecheck, lint, format, 536 tests, build and bundle check | none
2026-11-11 | rescue-engine | 18.1 | Finance review passed with issues; validated rescue_inputs (Req 4.16), added literal Ashgrove checks, clarified notes | web/src/engine, spec, steering
2026-11-11 | rescue-engine | 18.2 | Committed engine by explicit path; pipeline and data unchanged | web/src/engine, web/src/state, spec, steering
2026-11-12 | asset-pipeline | 9 | Round-2 picks deferred; user requested a third scouting round first | none
2026-11-12 | asset-pipeline | 10.1 | Scouted two knife switches and two heavy doors | reference/candidates/09-round-3, notes
2026-11-12 | asset-pipeline | 10.2 | Scouted four CC0 Poly Haven lab wall and floor textures | reference/candidates/09-round-3, notes
2026-11-12 | asset-pipeline | 10.3 | Scouted 12 CC0 Freesound round-3 sound candidates incl. crows | reference/candidates/09-round-3, notes
2026-11-12 | asset-pipeline | 10.4 | Listed six extra MIT Rocketbox avatars verified at the pinned SHA | reference/candidates/notes
2026-11-12 | asset-pipeline | 11.1 | Merged round-3 categories 9, 10 and extra avatars into README | reference/candidates/README.md
2026-11-12 | asset-pipeline | 11.2 | Validated round 3: 91 previews, licenses, counts and protected paths pass | none
2026-11-12 | asset-pipeline | 11.3 | Committed round-3 candidates and spec updates as 6bb5c1e | reference/candidates, .kiro/specs/asset-pipeline
2026-11-12 | asset-pipeline | 12 | Received final picks for rounds 2 and 3; combined stop gate passed | none
2026-11-12 | asset-pipeline | 13.1 | Recorded final picks; dropped Proop hook (Rodin-tagged uploads); six Rocketbox avatars logo-clean | reference/candidates/README.md
2026-11-12 | asset-pipeline | 13.2 | Wrote manual-download README with 31 Sketchfab and Freesound entries | tools/cache/manual/README.md
2026-11-12 | asset-pipeline | 13.3 | Committed final picks, manual list and Phase 2 tasks as 8c689c3 | reference/candidates, tools/cache/manual/README.md, .kiro/specs/asset-pipeline
2026-11-12 | asset-pipeline | 14.1 | Created tools/package.json with ten exactly pinned packages | tools/package.json
2026-11-12 | asset-pipeline | 14.2 | Installed approved tools packages via pnpm; committed d9cd11c | tools/pnpm-lock.yaml, tools/pnpm-workspace.yaml
2026-11-12 | asset-pipeline | 15.1 | Implemented picks v2 loader and validator with 12 passing tests | tools/asset-lib/picks.mjs, picks.test.mjs
2026-11-12 | asset-pipeline | 15.2 | Implemented license allow-list and safe output paths with 12 passing tests | tools/asset-lib/licenses.mjs, paths.mjs
2026-11-12 | asset-pipeline | 15.3 | Wrote tools/picks.json with 61 validated picks; all 31 manual files present | tools/picks.json
2026-11-12 | asset-pipeline | 15.4 | Property 7 license allow-list test passes | tools/asset-lib/licenses.property.test.mjs
2026-11-12 | asset-pipeline | 15.5 | Property 9 output path test passes | tools/asset-lib/paths.property.test.mjs
2026-11-12 | asset-pipeline | 16.1 | Implemented http and Poly Haven modules; confirmed /files shape; 18 tests pass | tools/asset-lib/http.mjs, polyhaven.mjs
2026-11-12 | asset-pipeline | 16.2 | Implemented cache, zip archive and manual-cache reader; 8 tests pass | tools/asset-lib/cache.mjs, archive.mjs
2026-11-12 | asset-pipeline | 17.1 | Implemented deterministic WebP texture converter; 12 tests pass | tools/asset-lib/convert-texture.mjs
2026-11-12 | asset-pipeline | 17.2 | Implemented HDRI copy with Radiance width check; 9 tests pass | tools/asset-lib/convert-hdri.mjs
2026-11-12 | asset-pipeline | 17.4 | Implemented ogg and mp3 audio converter, byte-identical reruns; 7 tests pass | tools/asset-lib/convert-audio.mjs
2026-11-12 | asset-pipeline | 18.4 | Implemented Bip01 skeleton check with 7 passing tests | tools/asset-lib/bip01.mjs, bip01.test.mjs
2026-11-12 | asset-pipeline | 18.1 | Edit framework with decimate, removeNode, selectVariant; 13 tests pass | tools/asset-lib/edits/
2026-11-12 | asset-pipeline | 17.3 | Implemented Meshopt+WebP model converter with fbx2gltf and Bip01 check; 5 tests pass | tools/asset-lib/convert-model.mjs
2026-11-12 | asset-pipeline | 17.5 | Property 13 HDRI copy and width test passes | tools/asset-lib/convert-hdri.property.test.mjs
2026-11-12 | asset-pipeline | 17.6 | Property 14 passes after fixing thin-texture resize bug | tools/asset-lib/convert-texture.mjs, property test
2026-11-12 | asset-pipeline | 18.2 | Added desaturate, darken and seeded grime texture edits; 19 tests pass | tools/asset-lib/edits/texture-edits.mjs
2026-11-12 | asset-pipeline | 18.7 | Property 23 Bip01 check test passes | tools/asset-lib/bip01.property.test.mjs
2026-11-12 | asset-pipeline | 20.1 | Implemented budget accounting and report formatter; 5 tests pass | tools/asset-lib/budgets.mjs
2026-11-12 | asset-pipeline | 20.2 | Implemented deterministic manifest merge and atomic writer; 10 tests pass | tools/asset-lib/manifest.mjs
2026-11-12 | asset-pipeline | 20.3 | Implemented CREDITS upsert with Visible-in-app note; 13 tests pass | tools/asset-lib/credits.mjs
2026-11-12 | asset-pipeline | 20.4 | Implemented manual README render and check; 8 tests pass | tools/asset-lib/manual-readme.mjs
2026-11-12 | asset-pipeline | 19.1 | Implemented seeded procedural handprint and drag-mark decal generator; 4 tests pass | tools/gen-decals.mjs, gen-decals.test.mjs
2026-11-12 | asset-pipeline | 18.3 | Implemented index-based splitMesh; knife switch has 160 components; 27 edit tests pass | tools/asset-lib/edits/split-mesh.mjs
2026-11-12 | asset-pipeline | 19.2 | Property 17 decal determinism test passes | tools/gen-decals.determinism.property.test.mjs
2026-11-12 | asset-pipeline | 19.3 | Property 18 decal content test passes | tools/gen-decals.content.property.test.mjs
2026-11-12 | asset-pipeline | 19.4 | Implemented seeded cracked-headstone script; real scan gives 378 triangles; 9 tests pass | tools/make-cracked-headstone.mjs
2026-11-12 | asset-pipeline | 20.5 | Property 2 budget accounting test passes | tools/asset-lib/budgets.property.test.mjs
2026-11-12 | asset-pipeline | 20.6 | Property 3 budget report and exit code test passes | tools/asset-lib/budgets.report.property.test.mjs
2026-11-12 | asset-pipeline | 20.7 | Property 4 manifest test passes | tools/asset-lib/manifest.property.test.mjs
2026-11-12 | asset-pipeline | 20.8 | Property 5 credits table test passes | tools/asset-lib/credits.table.property.test.mjs
2026-11-12 | asset-pipeline | 20.9 | Property 6 CMU credit line test passes | tools/asset-lib/credits.cmu.property.test.mjs
2026-11-12 | asset-pipeline | 20.10 | Property 16 Visible-in-app note test passes | tools/asset-lib/credits.note.property.test.mjs
2026-11-12 | asset-pipeline | 20.11 | Property 15 manual README test passes | tools/asset-lib/manual-readme.property.test.mjs
2026-11-12 | asset-pipeline | 18.5 | Property 21 edit idempotence test passes | tools/asset-lib/edits/idempotence.property.test.mjs
2026-11-12 | asset-pipeline | 18.6 | Property 22 split and decimate test passes | tools/asset-lib/edits/split-decimate.property.test.mjs
2026-11-12 | asset-pipeline | 19.5 | Property 19 cracked-headstone limits test passes | tools/make-cracked-headstone.limits.property.test.mjs
2026-11-12 | asset-pipeline | 19.6 | Property 20 cracked-headstone determinism test passes | tools/make-cracked-headstone.determinism.property.test.mjs
2026-11-12 | asset-pipeline | 21.1 | Implemented runFetch orchestrator, run report, downloader and fetch-assets CLI; 12 tests pass | tools/fetch-assets.mjs, tools/asset-lib/run-fetch.mjs
2026-11-12 | asset-pipeline | 21.2 | Wired decal generator, cracked-headstone derivation and edit error messages into runFetch; 23 tests pass | tools/asset-lib/generators.mjs, run-fetch.mjs
2026-11-12 | asset-pipeline | 21.3 | Property 1 re-run idempotence test passes | tools/asset-lib/run-fetch.idempotence.property.test.mjs
2026-11-12 | asset-pipeline | 21.4 | Property 8 passes after fixing empty-field refusal in runFetch | tools/asset-lib/run-fetch.mjs, refused property test
2026-11-12 | asset-pipeline | 21.5 | Property 10 bounded retries and failure isolation test passes | tools/asset-lib/run-fetch.retries.property.test.mjs
2026-11-12 | asset-pipeline | 21.6 | Property 11 conversion failure test passes | tools/asset-lib/run-fetch.conversion.property.test.mjs
2026-11-12 | asset-pipeline | 21.7 | Property 12 network discipline test passes | tools/asset-lib/network.property.test.mjs
2026-11-12 | asset-pipeline | 22 | Full tools suite 254/254 pass after raising vitest timeouts; dry run writes nothing | tools/vitest.config.mjs
2026-11-12 | asset-pipeline | 23.1 | Real fetch run: 61/61 picks, single-GLB fix, morgue at 39K, idempotent rerun | tools/, web/public/assets, CREDITS.md
2026-11-12 | asset-pipeline | 23.2 | Size report: graveyard 22.35 MB, lab 16.94 MB, total 39.36 MB; committed 3df64fa | tools/asset-lib/run-fetch.test.mjs
2026-11-12 | asset-pipeline | 24.1 | Asset-auditor clean after fixing LICENSE rows, decal links and recording 2k HDRI size exception | tools/, web/public/assets, CREDITS.md
2026-11-12 | asset-pipeline | 25.1 | Final report written; Phase 2 complete and committed through a6cc8ae | none
2026-11-12 | avatar-textures-missing-fix | 1 | Added failing-first avatar texture regression test confirming the bug. | tools/asset-lib/avatar-textures.test.mjs
2026-11-12 | avatar-textures-missing-fix | 2 | Added preservation property tests passing on unfixed code. | tools/asset-lib/avatar-textures.preservation.property.test.mjs
2026-11-12 | avatar-textures-missing-fix | 3.1 | Added TGA decoder with PNG output capped at 1024 px. | tools/asset-lib/tga.mjs, tga tests
2026-11-12 | avatar-textures-missing-fix | 3.2 | Added FBX texture staging converting TGAs to PNG and rewriting references. | tools/asset-lib/fbx-textures.mjs, tests
2026-11-12 | avatar-textures-missing-fix | 3.3 | resolveModelInput now stages FBX textures via stageFbxTextures. | tools/asset-lib/run-fetch.mjs
2026-11-12 | avatar-textures-missing-fix | 3.4 | convertModel guards and normalises avatar materials with keepSolidTextures prune. | tools/asset-lib/convert-model.mjs, avatar-materials.mjs
2026-11-12 | avatar-textures-missing-fix | 3.5 | Bumped model recipe with avatar-textures/v2 marker so avatars re-convert. | tools/fetch-assets.mjs
2026-11-12 | avatar-textures-missing-fix | 3.6 | Bug condition test now passes at source level using staged PNG textures. | tools/asset-lib/avatar-textures.test.mjs
2026-11-12 | avatar-textures-missing-fix | 3.7 | Re-converted all 8 avatars with textures; total 1,004,052 to 4,949,828 bytes, within budget. | web/public/assets/avatars, manifest.json
2026-11-12 | avatar-textures-missing-fix | 3.8 | Preservation tests pass; textureless synthetic case declares an exception. | tools/asset-lib/avatar-textures.preservation.property.test.mjs
2026-11-12 | avatar-textures-missing-fix | 4 | Added avatar material checklist step to asset-auditor. | .kiro/agents/asset-auditor.md
2026-11-12 | avatar-textures-missing-fix | 5 | Rendered textured avatar with Playwright and saved screenshot. | reference/progress/avatar-textures-fixed.png
2026-11-12 | avatar-textures-missing-fix | 6 | Checkpoint passed: 317 tools tests green. | none
2026-11-12 | avatar-textures-missing-fix | 7 | Committed avatar texture fix as 70e7d3d. | tools, avatars, asset-auditor, spec, reference/progress
2026-11-12 | asset-pipeline | 26.1 | Built local preview page and server; captured seven before renders | tools/preview/, reference/progress/
2026-11-12 | asset-pipeline | 26.2 | Cracked headstone now plane-fractured with chipped corner and 2.8 cm offset; silhouette XOR 10.7% | tools/make-cracked-headstone.mjs, asset-lib/fracture.mjs
2026-11-12 | asset-pipeline | 26.3 | Ruella hand: forearm removed by vertex colour, ragged capped wrist cut, grey-green tint at mean value 0.50 | tools/asset-lib/edits/, picks.json
2026-11-12 | asset-pipeline | 26.4 | Rendered after images; fixed hand pinholes via joinMeshes, torn wrist, olive-green tint; textured headstone caps | tools/asset-lib/edits/, fracture.mjs
2026-11-12 | asset-pipeline | 26.5 | Committed headstone and Ruella hand visual fixes | tools/, web/public/assets, CREDITS.md
2026-11-12 | asset-pipeline | 27.1 | Dropped rocketbox-female-adult-06 and added safe manifest-driven prune | tools/asset-lib/prune.mjs, picks.json, CREDITS.md
2026-11-12 | asset-pipeline | 27.2 | Construction male face box is a separate wire face-shield primitive; removed via removeNode material target | tools/asset-lib/edits/remove-node.mjs, picks.json
2026-11-12 | asset-pipeline | 27.3 | Rendered construction male head after face-shield removal; face clear, helmet intact | reference/progress/
2026-11-12 | asset-pipeline | 27.4 | 352 tests pass, idempotent rerun, auditor clean; committed avatar fixes as 8368a1e | tools/, web/public/assets, CREDITS.md
2026-11-12 | graveyard-scene | 1.1 | Installed exact-pinned drei and playwright. | web/package.json, web/pnpm-lock.yaml
2026-11-12 | graveyard-scene | 1.2 | Added hand wrist constants and dev-only Craggle hand close-up page. | handConstants.ts, HandCloseup.tsx, mount.tsx, main.tsx
2026-11-12 | graveyard-scene | 1.3 | Added Chrome launcher and hand-closeup screenshot script. | web/scripts/lib/browser.mjs, web/scripts/hand-closeup.mjs
2026-11-12 | graveyard-scene | 1.4 | Added Craggle hand geometry unit test (principal axis, no skin, no clips). | web/src/scenes/graveyard/model/handGeometry.test.ts
2026-11-12 | graveyard-scene | 2.1 | Added shockFirm/shockBatch engine shock model and exports; fixed hand-closeup waitForSelector. | web/src/engine/shock.ts, engine/index.ts, scripts/hand-closeup.mjs
2026-11-12 | graveyard-scene | 3.1 | Added pure computeLayout with plot grouping, sizing and lean rules. | web/src/scenes/graveyard/layout/layout.ts
2026-11-12 | graveyard-scene | 5.1 | Settings v2 migration: sound defaults on, legacy blobs take default sound. | web/src/state/settings.ts, settings tests, SettingsMenu.test.tsx
2026-11-12 | graveyard-scene | 3.3 | Added nextFocus keyboard navigation with 45 degree cone. | web/src/scenes/graveyard/layout/nav.ts
2026-11-12 | graveyard-scene | 4.1 | Added deterministic dev-only sample firm generator with marker constant. | web/src/dev/sample/generate.ts
2026-11-12 | graveyard-scene | 3.2 | Added CSR spatial grid, DDA stone picking and nearestToRay. | layout/grid.ts, layout/pick.ts
2026-11-12 | graveyard-scene | 4.3 | Loader, source and HUD labels support dev sample set and mock fallback. | data/source.ts, loader.ts, App.tsx, Hud.tsx, TableView.tsx, tests
2026-11-12 | graveyard-scene | 4.6 | Bundle guard fails build on dev-only markers; checkForbidden exported. | web/scripts/check-bundle.mjs
2026-11-12 | graveyard-scene | 2.2 | Added fast-check property tests 4-10 for shock model with non-vacuity guard. | web/src/engine/shock.property.test.ts
2026-11-12 | graveyard-scene | 2.3 | Added shock unit tests; snapped ICR within 1e-9 of 1 so +1.00 pp example holds. | shock.unit.test.ts, shock.ts, shock.property.test.ts
2026-11-12 | graveyard-scene | 6.1 | Added graveyard zustand slice merged into useStore. | state/graveyard.ts, graveyard.unit.test.ts, store.ts
2026-11-12 | graveyard-scene | 6.3 | Added statusLabel and formatYear helpers; StatusLabel reuses them. | ui/table/format.ts, ui/table/StatusLabel.tsx
2026-11-12 | graveyard-scene | 6.2 | Added useShockView hook memoising shockBatch on firms and delta. | state/shockView.ts, shockView.unit.test.ts
2026-11-12 | graveyard-scene | 7.1 | Added ShockSlider native range with k/400 mapping, labels and disclosures. | ui/controls/ShockSlider.tsx, ShockSlider.test.tsx
2026-11-12 | graveyard-scene | 9.1 | Exported REPO_ROOT and set Vite server.fs.allow for CREDITS.md?raw. | web/vite.config.ts
2026-11-12 | graveyard-scene | 8.1 | Added chooseDock and single-instance FileCard with docking and focus return. | ui/graveyard/chooseDock.ts, FileCard.tsx, chooseDock.test.ts
2026-11-12 | graveyard-scene | 9.2 | Added lazy CreditsDialog with focus trap and Credits button in Settings menu. | ui/CreditsDialog.tsx, loadCredits.ts, SettingsMenu.tsx, tests
2026-11-12 | graveyard-scene | 7.2 | Added ShockPanel with throttled counters and GraveyardHud. | ui/graveyard/ShockPanel.tsx, GraveyardHud.tsx, ShockPanel.test.tsx
2026-11-12 | graveyard-scene | 8.2 | Added polite visually hidden LiveRegion and announce helper. | ui/graveyard/LiveRegion.tsx, LiveRegion.test.tsx
2026-11-12 | graveyard-scene | 7.3 | Added LightsButton (350 ms guard) and SoundButton, mounted in Hud. | ui/controls/LightsButton.tsx, SoundButton.tsx, Hud.tsx, HudToggles.test.tsx
2026-11-12 | graveyard-scene | 8.3 | TableView uses shock view, sector filter, shocked columns and opens shared FileCard. | ui/table/TableView.tsx, TableView.test.tsx
2026-11-12 | graveyard-scene | 10.1 | Pinned postprocessing, @react-three/postprocessing, CSM exactly; stabilised formatIcr property tolerance. | web/package.json, pnpm-lock.yaml, formatIcr.property.test.ts
2026-11-12 | graveyard-scene | 10.2 | Added typed ASSET_KEYS/assetUrl/pickAudioKey; Credits dialog renders parsed entries. | scenes/graveyard/assets.ts, ui/parseCredits.ts, ui/CreditsDialog.tsx
2026-11-12 | graveyard-scene | 10.3 | Added STONE_MODELS, clipFlap, modelFor and measureModel with unit tests. | scenes/graveyard/model/stoneModels.ts, clipFlap.ts, modelFor.ts, measureModel.ts
2026-11-12 | graveyard-scene | 11.1 | Replaced placeholder with Canvas scene shell: WebGL fallback, ready flag, context-lost handling, HUD. | scenes/graveyard/GraveyardScene.tsx
2026-11-12 | graveyard-scene | 13.1 | Added pure sceneParams with fog, light and ground values per lights mode and shock. | model/sceneParams.ts, sceneParams.test.ts
2026-11-12 | graveyard-scene | 11.2 | Added StoneMaterial and instanced Stones (3 meshes), visibleStones, stoneGeometry, reportAssetError. | fx/StoneMaterial.tsx, r3f/Stones.tsx, layout/visible.ts, GraveyardScene.tsx
2026-11-12 | graveyard-scene | 12.1 | Added pure deriveFaceAnchor and engravingText with unit tests. | model/deriveFaceAnchor.ts, engravingText.ts, engraving.test.ts
2026-11-12 | graveyard-scene | 11.3 | Added canvas pointer picking: hover, click opens card, announce, hover-change subscription. | r3f/PointerInput.tsx, pointerPick.ts, GraveyardScene.tsx
2026-11-12 | graveyard-scene | 12.2 | Added 13-slot Decal engraving pool with canvas textures, pure pool selection and crack polyline. | r3f/Engravings.tsx, engravingPool.ts, engravingCanvas.ts, GraveyardScene.tsx
2026-11-12 | graveyard-scene | 13.4 | Added SceneLights, Sky (1k to 2k HDRI), Ground, GroundFog and HUD notices region. | scenes/graveyard/r3f/*, GraveyardScene.tsx, GraveyardHud.tsx
2026-11-12 | graveyard-scene | 13.5 | Added props.json, pure resolveProps and lazy Props (gate, statue, rubble, cobwebs, lantern). | graveyard/props.json, props.ts, r3f/Props.tsx, GraveyardScene.tsx
2026-11-12 | graveyard-scene | 14.1 | Added pure camera math (plot pose, smoothing, overview, labels, flicker); sky gradient dome replaces HDRI background. | layout/camera.ts, r3f/Sky.tsx
2026-11-12 | graveyard-scene | 15.1 | Added glitch scheduler and cctvParams; moved Debug bar to top centre. | fx/glitchScheduler.ts, fx/cctvParams.ts, ui/DebugBar.tsx
2026-11-12 | graveyard-scene | 16.1 | Added pure planDressing for mounds and lights-off blood quads. | model/dressing.ts, dressing.test.ts
2026-11-12 | graveyard-scene | 17.1 | Added hand budget pool (8 slots, one start per hand) and handPose. | model/handPool.ts, handPose.ts, handPool.test.ts
2026-11-12 | graveyard-scene | 14.2 | Added CameraRig: 1.2 s plot moves, sway, reduced-motion cuts, fog state and pose refs. | r3f/CameraRig.tsx, r3f/cameraState.ts, GraveyardScene.tsx
2026-11-12 | graveyard-scene | 16.3 | Added Mutant placement, corpse anchor and exact coneCovers test. | model/placement.ts, coneCovers.ts, placement.test.ts
2026-11-12 | graveyard-scene | 14.3 | Added Flashlight spot light with flicker, pointer aim, additive cone and shared cone state. | r3f/Flashlight.tsx, flashlightState.ts, GraveyardScene.tsx
2026-11-12 | graveyard-scene | 14.4 | Added PlotNav chips, Overview button, arrow keys and plot label in the REC line. | ui/graveyard/PlotNav.tsx, state/useLayout.ts, ui/Hud.tsx
2026-11-12 | graveyard-scene | 15.2 | Added CctvPass post-processing chain and custom tracking glitch effect. | fx/TrackingGlitchEffect.ts, fx/CctvPass.tsx, GraveyardScene.tsx
2026-11-12 | graveyard-scene | 16.2 | Added instanced Mounds and BloodDecals with runtime atlas and 0.35 s lights fade. | r3f/Mounds.tsx, BloodDecals.tsx, useVisibleStones.ts, GraveyardScene.tsx
2026-11-12 | graveyard-scene | 16.4 | Added Creatures: Mutant visible only inside flashlight cone, half-buried corpse at nearest zombie stone. | r3f/Creatures.tsx, GraveyardScene.tsx
2026-11-12 | graveyard-scene | 17.2 | Added riseEvents emitter and instanced Craggle Hands driven by the hand pool. | scenes/graveyard/riseEvents.ts, r3f/Hands.tsx, GraveyardScene.tsx
2026-11-12 | graveyard-scene | 14.3 | Tuned flashlight (intensity 70, penumbra 0.85, angle 0.27, range 28); off in overview. | r3f/Flashlight.tsx, flashlightState.ts, Creatures.tsx
2026-11-12 | graveyard-scene | 14.4 | HUD pass: debug bar via ?debug=1, chip row under REC, wide bottom-centre shock panel, favicon 404 fixed. | ui/*, index.html, GraveyardScene.tsx
2026-11-12 | graveyard-scene | 13.5 | Props load fixed; gate as fog-exempt silhouette; overview light lift and sky haze. | r3f/Props.tsx, Sky.tsx, StoneMaterial.tsx, sceneParams.ts
2026-11-12 | graveyard-scene | 13.4 | Sky shader fixed, moonlight 0.22 behind stones, overview fog scaled to distance. | r3f/Sky.tsx, sceneParams.ts, lightsBlend.ts, SceneLights.tsx
