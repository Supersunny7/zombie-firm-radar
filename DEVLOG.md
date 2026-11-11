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
