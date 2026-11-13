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

## Scene: horror-assets

`horror-assets.html?shot=assets|ground|possessed-undead|zombie-pxltiger|zombie-walk-oscar|hooded-woman` shows the Ground_Texture (`polyhaven-brown-mud-leaves-01`) and the four Character_Models in the lights-off look (fog, moon, hemisphere, flashlight from `scene-reference.md`). Walker plays `Idle` at t = 0.5 s; the others stay in bind pose. Models are shown at native scale. `window.__stats` lists clips, texture slots and size per model.

Write the six 1920x1080 screenshots to `reference/progress/` (starts the server itself, no dev server needed):

```powershell
node tools/preview/screenshot.mjs --scene horror-assets
```

## Scene: horror-stones

`horror-stones.html?material=app|metalmap|gltf` shows close-ups of `sketchfab-small-gravestone-drydoctoregg`, `sketchfab-damaged-tombstone-drydoctoregg` and `own-headstone-cracked`, one 640x1080 panel each. Lights use the lights-off values of `web/src/scenes/graveyard/look.ts`: fog, hemisphere, moon, a camera-mounted flashlight, ACES at exposure 1 and environment 0. There is no CCTV grade. `app` copies the `StoneMaterial` setup after task 3.31: opaque, FrontSide, map, normalMap, roughnessMap and metalnessMap (the same glb metal/roughness texture), metalness from the glb factor, and colour × (0.62, 0.68, 0.78) × 0.55. `prefix` is the setup before task 3.31 (no metalnessMap) and makes the before shot. `metalmap` is the first attempt's diagnostic (`prefix` plus the metalnessMap, the same as `app`). `gltf` uses the loader material unchanged. The camera and lights are fixed in `SETUP`.

```powershell
node tools/preview/screenshot.mjs --scene horror-stones-before   # horror-batch2b-stone-before.png + diagnostic
node tools/preview/screenshot.mjs --scene horror-stones-after    # horror-batch2b-stone-after.png
```
