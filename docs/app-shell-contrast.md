# app-shell contrast check

Task 15.4. Measured with Playwright MCP against `pnpm dev` (http://localhost:5173, fixture data, viewport 1440x900). A script walked every visible text node, took its computed color, composited the nearest ancestor backgrounds over the canvas colour `#05070A`, and computed the WCAG 2.x ratio. Lights on was set through Settings > "Lights on" (`data-lights="on"`).

Screenshots: `app-shell-contrast-lights-off.png`, `app-shell-contrast-lights-on.png`, `app-shell-contrast-table-lights-off.png`, `app-shell-contrast-table-lights-on.png`.

## Results (minimum ratio per group, required >= 4.5:1)

| View | Lights | Min ratio | Pair |
| --- | --- | --- | --- |
| HUD (REC, clock, Settings, Table view, Mock data) | off | 15.5 | #E6E2D6 on #06080B |
| HUD footer "Data: SEC EDGAR..." | off | 9.53 | #A9B4BF on #06080B |
| Table (headers, cells, Select) | off | 15.5 | #E6E2D6 on #06080B |
| Table status labels | off | 6.19 Zombie, 10.94 Endangered, 9.92 Healthy | |
| Table secondary text | off | 9.53 | |
| HUD | on | 16.4 | #F4F1E8 on #0E141C |
| HUD footer | on | 12.2 | #C9D3DC on #0E141C |
| Table cells | on | 16.4 | |
| Table status labels | on | 5.71 Zombie, 10.09 Endangered, 9.15 Healthy | |

All HUD and Table pairs pass in both modes. The lowest passing pair is the Zombie label (5.71:1 in lights on).

## Notes

- Lab / Outcome / Graveyard buttons in the Debug bar measured 4.35 (lights off) and 4.82 (lights on). They are disabled in the graveyard state (reduced opacity); disabled controls are exempt from WCAG 1.4.3. The Debug bar is also a dev-only tool.
- "Graveyard scene placeholder" text sits on the canvas colour and measures 9.57 (off) and 13.29 (on).
- Console in dev: 404 for `/data/mock/firms_index.json` (expected: the loader probes for mock data, then falls back to the fixture), 404 for `/favicon.ico`, and a THREE.Clock deprecation warning from `@react-three/fiber`. None came from app code.
- The dev server was stopped afterwards.
