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
