# app-shell report

Task 15.4. Run in `web` on Windows / PowerShell.

## Checks

| Command | Result |
| --- | --- |
| `pnpm build` | OK (tsc -b, vite build, check-bundle) |
| `pnpm test` | 30 files passed; 284 tests passed, 2 skipped (286 total) |
| `pnpm lint` | exit 0, no findings |
| `pnpm typecheck` | exit 0 |
| `pnpm format` | OK after `prettier --write web/README.md` (the only failure) |

jsdom prints "Not implemented: HTMLCanvasElement getContext" noise during tests; it does not fail anything.

## Bundle (from check-bundle)

- Initial JS: 76.0 KB gzipped (limit 400 KB)
- Total JS after graveyard scene: 311.2 KB gzipped
- Lab chunk is outside the initial JS closure; no `Ashgrove Works`, `@theatre/studio` or ajv strings in built JS.
- Chunks: index 249.98 KB (78.63 KB gz), ScenePlaceholder 918.44 KB (242.70 KB gz, holds three / R3F, lazy), DebugBar 2.72 KB, scene stubs 0.18 KB each. Vite warns about the 918 KB chunk (>500 KB); it is lazy and expected.
- CSS 3.92 KB gzipped. Fonts are woff2/woff files from @fontsource (Inter, Cormorant Garamond, JetBrains Mono).

## Contrast (Playwright MCP, both lights modes)

All HUD and Table text pairs are at or above 4.5:1 in lights off and lights on. Lowest passing: Zombie status label 6.19:1 (off), 5.71:1 (on). Details and screenshots: `docs/app-shell-contrast.md`.

## Known gaps

- No `/data/mock` or `/data/firms_index.json` exists yet, so a production build shows the Error screen (the fixture only loads in dev). The data plugin logs "nothing copied".
- Lights-on ink was adjusted earlier to pass REC contrast (per task notes; not re-derived here). Measured lights-on HUD: `#F4F1E8` on `#0E141C`, 16.4:1.
- Lights-on screenshots are of an empty placeholder canvas; no `/reference` screenshot applies yet.
- Disabled Debug bar buttons measure 4.35:1 (lights off); exempt as disabled controls, dev-only.
- Dev console shows a THREE.Clock deprecation warning from @react-three/fiber and expected 404s (mock probe, favicon).
- Optional tasks 15.5 (config smoke tests) and 16 are not done. Nothing was committed.
