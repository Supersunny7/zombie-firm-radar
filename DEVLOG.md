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
