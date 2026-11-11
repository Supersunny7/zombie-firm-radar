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
