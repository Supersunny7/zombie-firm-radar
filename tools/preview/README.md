# Asset preview

Static page that renders one `.glb` with a fixed camera and fixed lights. Uses `three` from `web/node_modules/three` (no extra dependency). Read-only, `127.0.0.1` only, no outbound requests.

## Start the server (background, never blocking)

```powershell
node tools/preview/serve.mjs --port 4173 --timeout 600
```

Omit `--port` to get a free port; the URL is printed to stdout. The server exits on SIGINT or after `--timeout` seconds.

It serves `tools/preview/` at `/`, `web/public/assets/` at `/assets/` and `web/node_modules/three/` at `/vendor/three/`. Anything else, and any path traversal, is refused.

## URL parameters

| Param | Values | Default |
| --- | --- | --- |
| `model` | path under `/assets`, e.g. `models/own-headstone-cracked/own-headstone-cracked.glb` | required |
| `view` | `front`, `three-quarter`, `top`, `head` (top 15% of the bbox, for avatars) | `three-quarter` |
| `size` | width in px (lit: 1024x640 aspect; silhouette: square) | 1024 (lit), 200 (silhouette) |
| `zoom` | divides the framing radius (2 = twice as close) | 1 |
| `silhouette` | `0` or `1` (flat black on white, orthographic) | `0` |
| `light` | `neutral` = white key light instead of the warm one, to judge albedo | warm |

Examples:

```text
http://127.0.0.1:4173/?model=models/own-headstone-cracked/own-headstone-cracked.glb&view=three-quarter
http://127.0.0.1:4173/?model=models/own-headstone-cracked/own-headstone-cracked.glb&view=front&silhouette=1&size=200
http://127.0.0.1:4173/?model=avatars/rocketbox-construction-male-01/rocketbox-construction-male-01.glb&view=head
```

## Playwright

Navigate, then wait until `window.__ready === true` (set after the first render; `window.__error` is set if loading fails), then screenshot. `window.__stats` holds `{ triangles, bbox, meshes }`.

```js
await page.goto(url);
await page.waitForFunction(() => window.__ready === true || window.__error);
await page.screenshot({ path: "reference/progress/name.png" });
```

## Test

```powershell
pnpm --dir tools exec vitest run preview/serve.test.mjs
```
