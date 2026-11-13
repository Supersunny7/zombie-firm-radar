# Design Document

## Overview

The Horror_Pass turns the working graveyard of `graveyard-scene` into the found-footage frames of `reference/graveyard/horror-direction.png` and `horror-direction-sequence.png`, and into the look and behaviour of the interactive prototype (`reference/graveyard/prototype/demo/`; reference only, never imported, values and logic are ported). It extends the Base_Spec (`.kiro/specs/graveyard-scene`) without replacing its architecture. Every spooky element keeps a financial meaning: a Risen_Zombie is a Newly_Undead firm, a Torn_Mound marks a `zombie` or Newly_Undead firm, and the unease effects grow with the rate shock the viewer sets. Grass and stone jitter are atmosphere only.

**Scope (user decision 2026-11-13).** This spec delivers **Batches 1, 2, 2b and 3** (Requirements 1 to 29 and 38). Batches 1 and 2 are delivered. Batch 2b is the prototype look, the soil fix and the Lights-toggle bug (23 to 25). Batch 3 is the zombies, the unease effects and the sound (26 to 29, plus the Risen_Zombie parts of 10, 11, 12, 15, 16, 19). Requirements 30 to 37 (OSD, camera switcher, rate console, hover tag, Opening, plot-fall jump scare [cancelled], their assets and steering exceptions) are **moved to a future control-room-experience spec**; they are not designed here. The HUD, File_Card, Plot navigation and the 1.2 s Camera_Rig move of the Base_Spec stay as they are.

Key decisions:

| Decision | Choice | Why |
| --- | --- | --- |
| Layout | Band packing from per-stone extents (Batch 2) | Jitter, yaw, fallen stones and the mound zone cannot fit a fixed pitch. |
| Fallen stones | Fall backwards; base stays at the standing anchor | Mound stays at the standing position; body never covers the Pit. |
| Selection | `settle.ts` driven by the render clock; separate `selectionStore` | 11.14 forbids timers; 20.5 limits main-store changes. |
| Camera | Keep the Base_Spec 1.2 s move; Batch 2b changes only FOV 46, eye 1.2 m, look point 0.6 m, back distance (23.1) | The cut-based switch belongs to the future spec. |
| Look values | One constants module `look.ts`, checked against `horror-direction-params.md` | Requirement 23.17. |
| CCTV grade | One custom `CctvGradeEffect` after `ToneMapping`; tracking glitch folded into it | Red ghost samples the tone-mapped image (23.11 f); convolution effects cannot merge with `mainUv` effects. |
| Rise animation | Pure port of the prototype `KEYS`, `jerk`, rise frame; no IK, no clips | Prototype is the approved motion; fixed root keeps hands from sliding. Supersedes the former key-pose table, breathing and two-bone IK. |
| Choreography clock | Pure timelines advanced by the render-loop clock | 11.14; no `setTimeout`. |
| Flash budget | One pure `Flash_Limiter` behind a per-frame bus | 28.6, 28.7: one place enforces 3 flashes per second. |
| Budget | `groupAssets.json` is the single list for `assets.ts` and `check-bundle.mjs` | No third hand-copied list. |

### Research summary

Looked up with the context7 MCP server (rule `kiro-workflow`) and used by Batches 2b and 3:

- **three 0.187.0**: `SpotLight(color, intensity, distance, angle, penumbra, decay)` (candela), shadows via `castShadow` and `shadow.mapSize` / `shadow.bias`; `HemisphereLight`; `FogExp2(color, density)`; `Scene.environmentIntensity` scales only `scene.environment` (0 removes HDRI light while drei `Environment` stays mounted); `MeshStandardMaterial.emissive` (default black), `emissiveIntensity`, `emissiveMap`, `flatShading`; `SkeletonUtils.clone` shares geometry and materials and rebinds bones; `InstancedMesh.setMatrixAt` needs `instanceMatrix.needsUpdate`.
- **@react-three/fiber 9.8.2**: negative `useFrame` priorities only order callbacks. Order: CameraRig -20, SceneLights -10, SelectionController -8, Flashlight -5, Characters -4, TornMounds / Dirt_Burst -3, CctvPass -2.
- **postprocessing 6.39.6 / @react-three/postprocessing 3.2.2**: an effect that samples `inputBuffer` at other texels declares `EffectAttribute.CONVOLUTION` and gets its own pass; it cannot share a pass with an effect that implements `mainUv`; built-in uniforms `resolution`, `texelSize`, `time`; the composer works in linear space and encodes to sRGB only at the last pass, so the grade converts linear to sRGB at its start and back at its end (the prototype grades after `OutputPass`).
- **@react-three/drei 10.7.9**: `useGLTF(path, false, true)` (Meshopt only).
- **Not used:** `@theatre/core`, `CameraControls`, KTX2, `Raycaster` on skinned meshes.

Any API not listed here must be looked up with context7 before use at task time (`kiro-workflow`). The Rise_Keys table values are read from `reference/graveyard/prototype/demo/main.js` at task time, not copied into this document.

## Architecture

### Files that Batches 2b and 3 change or add

| Area | Files |
| --- | --- |
| Look (2b) | `scenes/graveyard/look.ts` (new), `layout/camera.ts`, `r3f/CameraRig.tsx` (`CAMERA_FOV`), `model/sceneParams.ts`, `r3f/lightsBlend.ts`, `r3f/SceneLights.tsx`, `r3f/Flashlight.tsx`, `r3f/Props.tsx` (Lantern_Light), `r3f/Stones.tsx`, `fx/CctvGradeEffect.ts` (new), `fx/CctvPass.tsx`, `fx/cctvParams.ts`, `fx/TrackingGlitchEffect.ts` |
| Soil (2b) | `r3f/soil.tsx`, `r3f/TornMounds.tsx`, `r3f/Mounds.tsx`, `r3f/Grass.tsx`, `r3f/Ground.tsx` |
| Lights bug (2b) | `ui/controls/LightsButton.tsx`, `ui/controls/ShockSlider.tsx`, `ui/graveyard/ShockPanel.tsx`, `scenes/graveyard/dev/HorrorDebug.tsx` (analysis in section 8) |
| Riser (3) | `model/riseTimeline.ts`, `model/boneAnimator.ts`, `model/stir.ts`, `model/dirtBurst.ts`, `model/risenPool.ts`, `model/selection.ts`, `model/settle.ts`, `model/modelAssignment.ts`, `r3f/SelectionController.tsx`, `r3f/Characters.tsx`, `r3f/characterLoader.ts`, `selectionStore.ts` (all new; `r3f/Hands.tsx` and `model/handPool.ts` deleted) |
| Unease and flash (3) | `model/unease.ts`, `fx/flashLimiter.ts`, `fx/staticCutBus.ts`, `fx/FlashBus.tsx` (new), `fx/glitchScheduler.ts`, `r3f/CameraRig.tsx`, `r3f/Flashlight.tsx` |
| Audio (3) | `audio/audioEngine.ts`, `audio/useGraveyardAudio.ts`, `audio/growl.ts`, `audio/duck.ts` (new), `audio/scheduler.ts` |
| Evidence (3) | `web/scripts/horror-screenshots.mjs` (`--batch 2b|3`), `web/scripts/measure-fps.mjs` (`--horror`) |

Pure modules import neither React nor three.js (20.11); `horror.purity.test.ts` scans them.

### Selection to rise (Batch 3)

```mermaid
sequenceDiagram
  participant S as Shock_Slider
  participant SC as SelectionController (-8)
  participant P as risenPool + riseTimeline
  participant C as Characters
  participant F as Flashlight / CctvPass / Audio
  S->>SC: live shock (unease grows at once)
  SC->>SC: Settled_Shock after 250 ms (render clock)
  SC->>P: desired = nearest 8 Newly_Undead
  P-->>F: Stir start: Auto_Aim, duck wind, rumble 0.25+0.5a
  P-->>C: t=0 character at keys 0; t=0.55 torn mound + Dirt_Burst
  P-->>F: t>0.8 Rise_Cut (Static_Cut 0.32 s, glitch 0.2 s)
  P-->>C: keys time t+1.15; t=2.05 rise finished
  C-->>F: positional Growl; Stare 2.8 s
```

### Draw-call impact

Closed mounds, torn mounds, pits, clods, stains: 5 instanced calls; grass 1; Dirt_Burst replaced by Clod motion (no extra call); at most 8 skinned characters (1 to 3 calls each); Mutant, Watcher and Standing_Zombies removed. Lights-off CCTV chain is two passes (ToneMapping, CctvGradeEffect). Base_Spec targets (under 100 calls, 1.5M triangles) hold; Requirement 21.12 measures them.

## Components and Interfaces

### 1. Asset pipeline (Requirements 1 to 4)

All code is under `tools/` and is owned by the user (structure.md: `/tools`).

**Picks** (`tools/picks.json`, `version: 2`, validated by `picks.mjs`). Six picks are added; the two Growl sources and the four zips already exist in `tools/cache/manual/<pick>/`.

| id | kind | group | source | expectedFile | edits |
| --- | --- | --- | --- | --- | --- |
| `sketchfab-possessed-undead-giantswing` | model | graveyard | manual zip, `entry: scene.gltf` | `.zip` | `removeAnimations`, `specGlossToMetalRough` (only if needed, see below), `decimate` if above 30,000 triangles |
| `sketchfab-zombie-pxltiger` | model | graveyard | manual zip | `.zip` | `keepAnimations` with `["Idle","Walk1_InPlace","Attack","FallingForward"]` |
| `sketchfab-zombie-walk-oscar` | model | graveyard | manual zip | `.zip` | `removeAnimations` |
| `sketchfab-hooded-horror-woman-purplepoint` | model | graveyard | manual zip | `.zip` | `removeAnimations` |
| `polyhaven-<slug>` (slug chosen in Batch 1) | texture | graveyard | `polyhaven`, `resolution: "1k"` | none | none (no `role`, so `textureLimit` is 1024) |
| `freesound-tonsil5-zombie-growl-5` | audio | graveyard | manual, `.wav` | `.wav` | none |
| `freesound-ezcah-zombie-growl-01` | audio | graveyard | manual, `.flac` | `.flac` | none |

Credits use the exact titles, authors, URLs and `CC BY 4.0` / `CC0` of requirement 3. The "changes" cells carry the text required by 3.5 to 3.7 (Mixamo-named rig kept, clip removed; embedded animation removed; four clips kept; "no AI-generated tag on the Sketchfab model page, checked 2026-11-12"). `category` is the number already used by the nearest existing pick of the same kind (6 for zombie models, 1 for textures, 10 for audio).

**New edit operations** (added to `OPS` in `edits/index.mjs` and to `EDIT_SPECS` in `picks.mjs`, each in its own file next to `remove-node.mjs`):

```js
// keep-animations.mjs : keepAnimations { names: string[] }
// Disposes every animation whose name is not in `names`; order of kept clips is preserved.
// Strict mode throws EditTargetMissing when a requested name is absent (1.5).
// remove-animations.mjs : removeAnimations {}
// Disposes every animation, then prune() removes orphan samplers and accessors (1.4, 1.6).
// spec-gloss.mjs : specGlossToMetalRough {}
// Runs metalRough() when KHR_materials_pbrSpecularGlossiness is used, otherwise a no-op (1.3).
```

`EDIT_SPECS` entries: `keepAnimations: { required: { names: arrayOfStrings }, optional: {} }`, `removeAnimations: { required: {}, optional: {} }`, `specGlossToMetalRough: { required: {}, optional: {} }`. All three are idempotent (second run changes nothing), which the existing `idempotence.property.test.mjs` pattern checks.

**Pipeline stage order for Character_Models** in `convert-model.mjs` stays `Edit_List, dedup, prune, textureCompress (WebP, 1024), meshopt`. Because `specGlossToMetalRough` is an Edit_List entry it runs before `textureCompress`, so the textures it generates are resized and encoded like the rest. The recipe hash already includes `edits`, so a changed edit list changes the output key.

**Post-write checks.** `convertModel` gains one opt-in guard: when `pick.forbidExtensions` is a non-empty array (new optional pick key, validated in `picks.mjs`), it reads `extensionsUsed` of the written glb with the existing `readExtensionsUsed` helper and throws `ForbiddenExtension` naming the extension. The four Character_Models set `forbidExtensions: ["KHR_materials_pbrSpecularGlossiness"]` (1.3). The existing models do not set it, so no existing output can start failing.

**Skeleton report.** `tools/asset-lib/skeleton-report.mjs` exports `skeletonReport(glbPath)` returning `{ skins, jointCount, jointNames, clips: [{name, duration}], triangles, textureBytes }`. The Batch 1 report prints it for each Character_Model; the Vitest test of 1.7 (skinned mesh with at least 15 bones) and the bone-map test of 11.11 read the same data. It reuses `collectJointNames` from `bip01.mjs`.

**Size guard (1.10).** `modelSizeWarning` in `convert-model.mjs` already prints the file name and a suggestion when a model is over 5 MB. The suggestion text for the Character_Models names the three steps of 1.10 (texture size, triangle decimation, KTX2).

**Idempotence (1.8).** `writeBinary` output is deterministic for equal input and the `fetch-assets` idempotence property test already covers "second run changes nothing"; the new picks are added to its fixture list.

**Missing zip or failed step (1.9).** Unchanged behaviour of `run-fetch.mjs`: the pick is skipped, listed with its cause, and the process exits non-zero under `--strict`. The new picks only add entries.

**Manual README.** `render(picks)` already lists every manual pick, so the four zips and two Growl files appear without code change (3.10). The fixed `HEADER` text says "wav, mp3 or m4a"; it becomes "wav, mp3, m4a or flac", and `manual-readme.test.mjs` is updated. The checklist count is derived from the list, so it equals the number of downloads.

**Growl conversion (3.13).** `convertAudio` writes `.ogg` and `.mp3` for every sound. Both are manifest entries (as for the four existing sounds). The Audio_Engine requests `.ogg` first (`pickAudioKey`), so the `.ogg` is the file counted in the Graveyard_Asset_Group.

**License check (4.5, 4.6).** `checkLicense` already refuses `mixamo.com` hosts and accepts CC BY from an http(s) source. No logic changes. `licenses.property.test.mjs` gains two named example tests: `refuses a pick whose source host is mixamo.com (or a subdomain)` and `accepts a CC BY Sketchfab pick whose edits remove the animation clips`. `.kiro/steering/asset-licensing.md` is edited as in 4.1 to 4.4 (allowed: CC BY Sketchfab uploads without an AI-generated tag, the four models listed, checked 2026-11-12; Mixamo clips and hosted files stay forbidden; a CC BY uploader's mesh and skeleton on a Mixamo-style rig are allowed; every other Forbidden entry untouched).

**Ground_Texture selection (2.1 to 2.6).** `tools/asset-lib/polyhaven.mjs` already talks to the Poly Haven API. Batch 1 runs a search for CC0 texture sets in the forest-floor and muddy-leaves categories, filters to sets that list `diffuse`, `nor_gl` and `rough` at `1k`, picks one, and records the slug, URL, reason and two runners-up in the Batch report. If no set qualifies the batch stops and asks (2.6). The bytes limit of 3,000,000 for the three maps is checked from the downloaded sizes before the pick is committed.

**Preview screenshot (2.4).** `tools/preview` gets a `--scene horror-assets` page that shows the chosen ground on a plane with the four models in the lights-off look; `reference/progress/horror-batch1-assets.png` is saved at 1920 x 1080 by a Playwright script using `web/scripts/lib/browser.mjs`.

### 2. Budget accounting and the bundle check (Requirement 5)

**Single list.** `web/src/scenes/graveyard/groupAssets.json`:

```json
{
  "categories": {
    "ground": ["textures/polyhaven-<slug>/polyhaven-<slug>_diffuse.webp", "...nor-gl.webp", "...rough.webp"],
    "characters": ["models/sketchfab-possessed-undead-giantswing/...glb", "...", "...", "..."],
    "stones": ["<three stone glbs>"],
    "props": ["<soil set, lichen set, mutant, corpse, gate, statue, trunk, stumps, lantern, cobwebs, blood and decal textures>"],
    "sounds": ["audio/<name>/<name>.ogg x 7"]
  },
  "hdri": ["<1k hdr>", "<2k hdr>"]
}
```

- `assets.ts` keeps `ASSET_KEYS` and gains `GROUND_SLUG` and `ASSET_KEYS.forestFloor`, `ASSET_KEYS.characters`, `ASSET_KEYS.audio.growls`. `assets.test.ts` asserts that `groupAssets.json` equals the set derived from `ASSET_KEYS` (all keys except `craggleHand`, `ruella`, the mp3 fallbacks and the HDRI) so the two cannot drift. Since Batch 3 the Mutant, the Watcher_Model and the Footstep_Bed leave the list (26.7, 26.11); their files, Manifest entries and credits stay.
- `check-bundle.mjs` reads the same JSON with `readFileSync` (no TypeScript import) and exports `computeGroupBudget(files, groups)`: bytes per category, HDRI bytes separately, total, `over` and a message `Graveyard asset group <mb> MB exceeds the 25 MB Group_Budget` (5.7). Any key missing from the manifest, any file above 5,000,000 bytes in the group (5.10) and any non-finite `bytes` also fail. The result prints `ground`, `characters`, `stones`, `props`, `sounds`, `hdri`, and the total with and without HDRI, which is the breakdown of 5.8.
- `pnpm build` already runs `check-bundle`, so 21.1 enforces the budget.
- **Pipeline ceiling.** `budgets.mjs` `LIMITS.graveyard` is 26,214,400 and counts every file in the manifest group (both HDRIs, both audio formats, unused sources). It is 23.48 MB today, so the new files would exceed it. See Decision 5: it becomes 40,000,000 bytes on disk (confirmed, 5.12), while the real session budget is the 25 MB Group_Budget above.
- **Fallback order when the group exceeds 25 MB (5.13, 5.14).** Apply in this order and stop at the first step that brings the total to at most 25,000,000 bytes: (1) stop loading and shipping what the graveyard no longer uses: the Craggle_Hand (already outside `groupAssets.json`) and the Mutant (570,220 bytes; approved by the user 2026-11-13); (2) reduce texture quality: re-encode the largest texture files in the group at a lower resolution or stronger compression (for example the stump, statue or soil sets), never below the texel density of 6.1 for the Ground_Texture. After each step `computeGroupBudget` is rerun and the report prints the per-file and per-category breakdown before and after, naming each removed or recompressed file.

**Estimated Graveyard_Asset_Group** (sizes from the manifest; ground and characters are bounds):

| Category | Bytes | Source |
| --- | --- | --- |
| Soil set (mounds) | 2,268,174 | manifest |
| Lichen set | 908,850 | manifest |
| Stones | 1,061,476 | manifest |
| Props (mutant 570,220; corpse 503,480; gate 656,884; statue 1,037,824; trunk 701,424; stumps 2,201,480; lantern 604,068; cobwebs 934,404) | 7,209,784 | manifest |
| Blood and decal textures | 715,700 | manifest |
| Sounds, `.ogg` (wind 241,168; crows 503,992; digging 251,325; gate 167,231; footsteps 324,704) | 1,488,420 | manifest |
| Growls, `.ogg` | at most 600,000 | estimate, measured in Batch 1 |
| Ground_Texture, 3 maps | at most 3,000,000 | requirement 2.3 |
| **Subtotal without characters** | **at most 17,252,404** | |
| Character_Models | headroom 7,747,596 | about 1.9 MB per model on average |

The Batch 1 report replaces the two estimates with measured values. The sky HDRI files (1,725,527 + 6,981,963) are reported on a separate line. Since Batch 3 the Mutant, digging and Footstep_Bed sounds and the Watcher_Model are not requested and are not counted (26.11).

### 3. Stone_Jitter and the band-packed layout (Requirement 8)

**`layout/jitter.ts`** (pure). All draws come from `mulberry32(fnv1a32(cik))` in a fixed order, 12 uniforms per firm regardless of outcome, so one firm's jitter never depends on any other firm (8.1) and equal input is bit-equal (8.8).

```ts
export const OFFSET_MAX = 0.30;             // metres per axis (8.2)
export const YAW_MAX = (20 * Math.PI) / 180; // 8.3
export const HEIGHT_FACTOR: readonly [number, number] = [0.90, 1.10]; // 8.5
export const FALLEN_RATE = 0.05;            // 8.6
export const FALLEN_SINK_MAX = 0.08;        // 8.7
export interface StoneJitter {
  readonly dx: number; readonly dz: number;     // [-0.30, 0.30]
  readonly yaw: number;                          // [-20deg, 20deg], standing yaw
  readonly heightFactor: number;                 // [0.90, 1.10]
  readonly fallen: boolean;                      // u < 0.05
  readonly fallenSideYaw: number;                // +PI/2 or -PI/2 (8.7)
  readonly fallenSink: number;                   // [0, 0.08]
  readonly widthU: number; readonly sinkU: number; // Base_Spec width and sink draws
  readonly leanMagU: number; readonly leanSplitU: number;
  readonly signP: number; readonly signR: number;
}
export function stoneJitter(cik: string): StoneJitter;
```

The tilt is the Base_Spec status lean (`leanFor`), unchanged except `LEAN_ZOMBIE` becomes `[0.09, 0.13]` (7.4 degrees) so that the total tilt never exceeds 8 degrees = 0.1396 rad (8.4). The ordering rule of Base_Spec 3.9 still holds: minimum endangered lean 0.05 is above maximum healthy lean 0.02. A fallen stone has no lean (it lies flat) and `lean` is 0.

**Final height** is `heightBase * heightFactor` with `heightBase` in `[0.85, 1.6]`, so the range is 0.765 m to 1.76 m (the figure in requirement 20.3).

**Fallen stone geometry** (8.7). A fallen stone keeps its base at the standing anchor, falls backwards (its top points away from the camera, −z in plot space) and lies face up:

- Euler order `YXZ` as in `Stones.tsx`: `pitch = −π/2`, `roll = 0`, `yaw = yawJitter + fallenSideYaw`. `Rx(−π/2)` turns the +z face normal into +y, so the engraved face is up (0 degrees from up, inside the 15 degree limit).
- Lying footprint is `width x height`. Because the model origin is the base centre, the body is centred on the ground plane after rotation; the instance y is `depth/2 − fallenSink` so the lower face sinks by 0 to 0.08 m.
- `StoneLayout` gains `fallen: boolean`, `standingYaw` (the jitter yaw without the ±90 degrees, used by the mound), `baseY` (instance y: `−sink` upright, `depth/2 − fallenSink` fallen) and `pitCentre: {x, z}`. Consumers that used `−s.sink` (`Stones.tsx`, `Flashlight.tsx` for keyboard focus, `FocusMarker.tsx`, `Engravings.tsx`) call `stoneBaseY(s)` and `stoneCentreY(s)` from `layout.ts` instead.
- The engraving decal needs no change: it is projected from the proxy mesh, which uses the same matrix.

**Extents and band packing** (`layout/extents.ts`, `layout.ts`).

Each stone gets a local axis-aligned **extent rectangle** relative to its anchor (the cell centre before jitter): `{ left, right, front, back }` in metres, +z is front (toward the camera). It is the union of:

1. the oriented body footprint after the final yaw (for a standing stone `width x depth`, for a fallen stone `width x height` with its top toward −z), shifted by the stone's own `(dx, dz)`;
2. the **mound zone**: the Pit disc around `pitCentre` (radius `PIT_R_MAX = 0.45`) plus the heap, i.e. `front >= depth/2 + PIT_FRONT + PIT_R_MAX` with `PIT_FRONT = 0.45`. Every stone reserves the torn-mound zone, so the layout does not change when the shock slider moves a firm from closed to torn.

A plot is a table: `cols` columns and `rows` rows as in the Base_Spec (`cols = max(1, ceil(sqrt(n * PITCH_Z / PITCH_X)))`), but column `c` has **left** and **right** extents `L_c = max left`, `R_c = max right` over its members, and row `r` has **front** and **back** extents `F_r`, `B_r` likewise. Column anchors are `cx_0 = 0` and `cx_{c+1} = cx_c + R_c + MIN_GAP + L_{c+1}`; row anchors go from the front row back (−z) the same way with `B_r + MIN_GAP + F_{r+1}`. `MIN_GAP = 0.15`. Because every stone's extent rectangle lies inside its cell box, rectangles of different cells are at least 0.15 m apart, so the oriented footprints are too (8.9). The Base_Spec constants `PITCH_X`, `PITCH_Z` remain only as the `cols` formula inputs. Typical row depth is about 1.9 m for upright rows and about 3.4 m for a row that contains a fallen stone, so a plot with 5 percent fallen stones is about 25 percent deeper than before. This is accepted.

The remaining Base_Spec layout rules are kept: plots sorted by sector name (UTF-16 order), plot grid of `ceil(sqrt(plotCount))` columns, `PLOT_GAP = 1.6`, `PAD = 0.4`, plot 0 centred on x = 0 with its first row anchor at `FIRST_ROW_Z = 3`, stone array indexed by `firmIndex`, `plot.stones` in input order (reading order, 8.13), empty list returns the zero layout. `PlotLayout` gains `rowAnchors: number[]` (anchor z of each row, front first) for the grass.

**Keyboard order and navigation.** `plot.stones` is built from the input order, so reading order does not change with jitter (8.13). `nextFocus` already uses `s.x, s.z`, which are the jittered centres (8.14); it is unchanged.

**Picking** (`layout/pick.ts`, 8.12). `rayStoneT` transforms the ray into the stone's local frame with the full rotation `R = Ry(yaw) · Rx(pitch) · Rz(roll)` (inverse is the transpose) and slab-tests the local box `[−w/2, w/2] x [0, h] x [−d/2, d/2]` (the scaled body, which is also what the instance matrix draws). For a fallen stone the same code works because `pitch = −π/2` is part of `R`; its box is taken above `baseY`. The grid inserts each stone into every cell its **reach circle** touches: `stoneReach(s) = hypot(width, depth)/2 + h * sin(lean)` for upright stones and `hypot(width, height)/2` for fallen ones. `forEachCentreInRect`, `queryRadius`, `nearestToRay`, `perpToRay` use `stoneCentreY` so the 13-slot engraving set still ranks fallen stones correctly.

### 4. Camera inside the plot (Requirement 9)

> **Superseded in part by Batch 2b (section 6).** The constants and the derivation below describe the delivered Batch 2 camera (eye height 1.5 m, FOV 52). Batch 2b changes FOV to 46, eye height to 1.2 m, look point to 0.6 m and the back distance; the 1.2 s move, smoothing, sway and the pointer ranges stay.

New constants in `layout/camera.ts`: `CAMERA_HEIGHT = 1.5`, `CAMERA_BACK = 2.6`, `TARGET_Y = 0.2`, `TARGET_AHEAD = 5` (unchanged). `plotPose` keeps its signature: position `(centerX, 1.5, frontZ + 2.6)`, target `(centerX, 0.2, frontZ − 5)`.

Derivation (all lengths in metres, front row anchor at `frontZ`):

- **Distance (9.2):** nearest stone base centre is at horizontal distance `2.6 ± 0.3 <= 2.9 <= 4.0`.
- **Inside the extended boundary (9.4):** the plot rectangle's front edge is `frontZ + F_0 + PAD` with `F_0 >= depth/2 + 0.45 + 0.45 >= 1.04` (mound zone; the narrowest stone has `depth = 0.28`) so the edge is at least `frontZ + 1.44`; extended by `PLOT_GAP = 1.6` it is at least `frontZ + 3.04 > frontZ + 2.6`. Laterally the camera is at the plot's `centerX`.
- **Eye height (9.1):** 1.5.
- **Lower half (9.3):** the camera pitches down by `θ = atan((1.5 − 0.2) / 5) = 14.6°`. The nearest mound base point is at ground distance `2.0 m`, depression angle `atan(1.5 / 2.0) = 36.9°`. With a vertical field of view of 52 degrees (half 26°) the point sits `22.3°` below the view centre, inside the frame and in its lower half. The same value holds at 390 x 844 because three's `fov` is vertical. *Measured with the pointer at the neutral position and sway 0* (Decision 7).
- **Look target offset (9.7):** unchanged formula, `target = base + (pointer.x * 3.2, 0.2 + pointer.y * 1.3 relative to the plot look point)`.
- **Overview (9.6):** `overviewPose` is untouched and ignores the eye-height rule. `OVERVIEW_Y = 25` in `Stones.tsx` still separates it.
- **Start (9.9):** the initial camera frames Plot 1.

`selectionPose(target, layout, aspect)` returns `plotPose(plot).position` or `overviewPose(...).position`, i.e. the destination pose (Selection_Pose definition). It takes no pointer, sway or flashlight input, which is how 10.3 holds by construction.

### 5. Ground, grass, torn mounds, pits, clods (Requirements 6 and 7)

**Ground (6.1 to 6.3).** `Ground.tsx` loads `ASSET_KEYS.forestFloor` (diffuse, normal, roughness at 1k). `TILE_M = 4` stays: 1024 texels per 4 m is 256 texels per metre, above the 128 required. The failure fallback (`#0b0806` flat ground and the HUD notice) is unchanged.

**Closed mounds (7.1, 7.7).** `Mounds.tsx` draws one instance for every visible stone that is not in the torn set, with the Base_Spec half-ellipsoid (`MOUND_HEIGHT 0.24`, `MOUND_FRONT 0.45`, `MOUND_SIDE 0.2`), centred on the stone base and oriented with `standingYaw` (7.8, 7.9).

**Torn mounds** (`r3f/TornMounds.tsx`, geometry in `model/tornMound.ts`):

- `tornMoundProfile(r)` (pure) gives the heap height for a radial coordinate: crater floor below ground inside `PIT_R`, a broken rim crest of 0.30 m at `PIT_R * 1.15`, falling to 0 at the heap radius. The geometry is a lathe-style disc with 24 x 10 segments and seeded radial noise, built once from a fixed seed; per-instance variation comes from scale and yaw.
- **Pit (7.2, 7.3):** one InstancedMesh of `CircleGeometry` discs (radius `PIT_R = 0.25 + 0.2 * u`, so width 0.5 to 0.9 m) at `y = 0.015` with `polygonOffset`, centred on `pitCentre`. Nothing covers the opening. A character emerging through the disc is hidden below `y = 0` by the opaque ground plane, and the rim hides the rest. (Batch 2b: colour `#040302`, see section 7.)
- **Clods (7.2):** one InstancedMesh of `IcosahedronGeometry(1, 0)`; 6 to 14 per torn mound (`6 + hash % 9`), positions seeded by `cik`, between `PIT_R + 0.05` and 1.2 m from the Pit centre, scale 0.04 to 0.12.
- **Stains (7.11):** lights off only, `stainCount = hash(cik) % 4` (0 to 3) flat quads on the heap top. Lights on draws none (7.10).
- **Which mound (7.4 to 7.6):** `tornSet = live undead ∪ activeCiks(pool)`. `planDressing` produces `torn` (live undead) and `closed` (all other firms), and `tornMoundSet(torn, activeCiks)` adds the firms whose Risen_Zombie has not finished lowering, so a Torn_Mound never reverts under a character. A firm that stops being Newly_Undead gets its Closed_Mound back within 2 s.
- **Already_Undead (7.6):** zombies at shock 0 are in `torn` at every delta.

**Grass** (`model/grass.ts`, `model/grassTexture.ts`, `r3f/Grass.tsx`):

- `grassTexture(seed)` returns an RGBA `Uint8Array` 128 x 128 drawn by our own code; `Grass.tsx` wraps it in a `DataTexture` with `generateMipmaps = true`, `minFilter = LinearMipmapLinearFilter`, `magFilter = LinearFilter`, `colorSpace = SRGBColorSpace`. The material is `MeshStandardMaterial` with `alphaTest = 0.5`, `side = DoubleSide`. The texture is own work, so no `CREDITS.md` row (6.4).
- Geometry: two crossed 0.5 x 0.35 m quads merged into one `BufferGeometry` (card height at most 0.35, 6.5). One `InstancedMesh`, capacity 1,500 (6.11).
- `placeGrass(layout, plotIndex, quality)` (pure) per Plot: seed `fnv1a32(plot.sector)` (so a plot's cards do not depend on other plots, 6.6). `perMound = max(1, min(5, floor(1200 / n)))`; when `n > 1200`, only stones with `hash(cik) % ceil(n / 1200) == 0` get cards. Each mound gets `perMound` cards within 1.0 m of the mound centre; a sparse background adds at most 300 cards over the plot rectangle at a density at least ten times lower than the near density. Candidates inside any stone's oriented footprint or inside a Pit disc are rejected (6.8). Total per Plot is at most 1,500 (6.7). Low quality keeps every other card (6.9). Lights on draws the same cards with lights-on lighting (6.10).
- Only the framed Plot's cards are written to the instance buffer; a plot change rewrites it like the stone buffers.

### 6. Batch 2b: prototype look (Requirement 23)

| Item | Change | Req |
| --- | --- | --- |
| `look.ts` | Single constants module; every value of 23.1, 23.4, 23.5, 23.7 to 23.11, 23.14, 23.15 listed in `horror-direction-params.md`. Example test parses that file and compares each listed value. | 23.17 |
| Camera | `CAMERA_FOV` 46, `CAMERA_HEIGHT` 1.2, `TARGET_Y` 0.6, `CAMERA_BACK` 3.0, `TARGET_AHEAD` 1.0. The portrait target easing (`TARGET_Y_PORTRAIT`) is removed. The 1.2 s move, smoothing and sway stay. Check: nearest mound base is 2.4 m ahead, depression 26.6°, look-centre pitch 8.5°, so the base sits 18.1° below the centre (half FOV 23°). | 23.1 to 23.3 |
| Fog | Plot_Fog `FogExp2` `#0a0d13`, 0.075, background = fog colour, in lights-off framed plots. `sceneParams.blendParams` interpolates Overview_Fog to Plot_Fog with the existing move progress, so the framed values are exact when the move ends. Overview values unchanged. | 23.4 to 23.6, 23.18 |
| Lights | Hemisphere `#3a4a66` / `#0a0806` / 0.18; `scene.environmentIntensity = 0` in framed plots; shadow moon `#7f9cd6` 1.1 at plot centre + (-4, 9, -22). Lights-on values unchanged (23.16). | 23.7, 23.8 |
| Flashlight | Colour `#ffe7c4`, intensity 55, distance 26, angle 0.36, penumbra 0.95, decay 2, shadow bias -0.0004. Flicker x0.35 for one frame, chance 0.006 (offered to the Flash_Limiter from Batch 3; 2b keeps the Base_Spec cap). | 23.9 |
| Lantern_Light | Point light `#ff9a4a`, 1.2 x (0.85 + 0.15 sin(13t) sin(7.3t)), distance 4, decay 2, 0.28 m above ground; constant 1.2 in Reduced_Motion. | 23.10 |
| Stones | Base colour x0.55 in lights off. ACES, exposure 1.0 (lights off). | 23.14, 23.15 |
| Ground fog, cone | No ground-fog layer and no volumetric cone in lights-off framed plots; unchanged in lights on and in the overview. | 23.19 |
| `CctvGradeEffect` | `EffectAttribute.CONVOLUTION`, after `ToneMapping`. Order: (a) saturation 0.6 (mix 40 % luma 0.3/0.59/0.11), (b) x1.4 + 0.015, clamp, pow 0.9, (c) vignette 1 - 0.38 r^2.5 clamped, (d) grain sigma 0.035 new each frame, (e) every third row x0.88, (f) red 40 % mixed with red sampled 2 px left from the **pre-(a)** input. Linear to sRGB at the start and back at the end. Tracking-glitch band shift is applied to the sample uv inside this shader (the separate `mainUv` effect leaves the lights-off chain). No bloom, no chromatic aberration. Low quality keeps all six steps; Reduced_Motion freezes the grain time. | 23.11 to 23.13 |
| `gradeColour` | Pure TS mirror of steps (a) to (c) used by the property test. | 23.11 |

### 7. Batch 2b: no glowing soil (Requirement 24)

Causes to remove (24.4):

| File | Remove |
| --- | --- |
| `r3f/TornMounds.tsx` | `emissiveMap` on heap and Clod materials |
| `r3f/soil.tsx` | the lights-off `glow` option of `useSoilTint` and every call site that passes it (`Ground.tsx`, `Mounds.tsx`, `TornMounds.tsx`) |
| `r3f/Grass.tsx` | `emissiveMap` on the Grass_Card material |

Result: every soil, Closed_Mound, Torn_Mound heap, Pit, Clod and Grass_Card material has `emissive #000000`, `emissiveIntensity 0`, no `emissiveMap`, in both Lights_Mode values. Clods: `flatShading`, colour `#3b2c1f`, roughness 1. Pit: colour `#040302`; it becomes a `MeshStandardMaterial` (roughness 1, black emissive) instead of `MeshBasicMaterial`, so 24.1 applies to it. Each material is built by an exported factory in `soil.tsx` so one example test (`soilMaterials.test.tsx`) can check all six for both modes (24.5).

#### Stone metalness map (24.6, 24.7)

- Finding (2026-11-13): 0% of texels have alpha < 255 in the three stone textures (source and published). The stone glbs have metallicFactor 1 and a metal/roughness texture with near-zero metallic, but `web/src/fx/StoneMaterial.tsx` passed `metalness` without `metalnessMap`, so stones rendered fully metallic and went black with environment intensity 0.
- Fix: `StoneMaterial.tsx` passes `metalnessMap={source.metalnessMap ?? undefined}` next to `roughnessMap` (glTF uses one texture for both). No pipeline edit, no `CREDITS.md` or Manifest change.
- Test: an example test checks, for each stone model, that the stone material's `metalnessMap` is the same texture as its `roughnessMap`.
- Evidence: before/after close-ups made with `tools/preview` scene `horror-stones-*`, saved to `reference/progress/horror-batch2b-stone-before.png` and `-after.png`.

### 8. Batch 2b bug analysis: Lights toggle and the +0.25 pp jump (Requirement 25)

Note (2026-11-13): the user reduced 25.3 and 25.4 to the H2 fix and jsdom tests, because the HUD Lights button and slider are replaced in the control-room-ui spec; H1 and H3 are not investigated.

**Observation:** after the Lights button is activated, the Shock_Slider reads +0.25 pp (step k = 1, stored 0.0025).

**What the code does** (read for this design):

- `LightsButton.onClick` only calls `setSetting('lights', ...)`; `setSetting` writes `settings` only. `ThemeSync`, `Hud` and `ShockPanel` read `lights` or `rateShock` but never write `rateShock`.
- The only writers of `machine.ctx.rateShock` are: `ShockSlider` `onChange` (`shockValue(k) = k / 400`), the dev-only `DebugBar` number input, and the dev-only `HorrorDebug`, which calls `setRateShock(shockPp / 100)` from `?shock=<pp>` once per mount (`done` ref). `?shock=0.25` yields exactly 0.0025.
- Global key handlers (`PlotNav` arrows, `SkipSlot` Escape, `StoneFocusProxy`) never touch the slider; the audio gate only listens.

**Root cause: not proven by reading.** No code path writes a rate shock on a lights change. Ranked hypotheses:

| # | Hypothesis | Mechanism | Discriminating test |
| --- | --- | --- | --- |
| H1 | The click lands on the slider | Below 900 px (and with the `aside` wrapping) the Lights button and `ShockPanel` share the same stacked layout; the label change ("Lights off" / "Lights on") reflows the row. A pointer click or Playwright centre click that hits the range input sets the nearest step, which is k = 1 near the left end. | Playwright at 390x844, 900x800, 1440x900: `document.elementFromPoint` at the button centre must be the button; record `input` events on `input[type=range]` during the click. |
| H2 | `HorrorDebug` re-applies the URL | A remount of the scene tree (`canvasKey` increments on `webglcontextrestored`, which a lights change can provoke through shadow or environment changes) resets the `done` ref; the effect parses `?shock=0.25` again and calls `setRateShock(0.0025)`. | Reload without `shock` in the URL; if the jump is gone, H2. Unit test: mount `HorrorDebug`, unmount, mount, assert `setRateShock` is called once per mount only because of the param. |
| H3 | A synthetic `input` event from the toolchain | Screenshot or test scripts that press Tab/Space or dispatch events on the focused range. | Same `input` listener from H1 plus `event.isTrusted`. |

**Task order (first task of the fix):** add a DEV-only `useStore.subscribe` that logs `console.trace` when `machine.ctx.rateShock` changes, reproduce, and read the stack. Fix by cause: H1 non-overlapping layout and hit-test; H2 apply `?shock=` only once per page load (module-level flag, not a component ref); H3 test-script fix.

**Tests (25.4).** HUD jsdom tests (pointer, Enter, Space on `LightsButton`; shock 0 and one value in (0, 5] other than 0.25) assert `rateShock` is bit-equal 500 ms later, plus one preservation test for slider keys. **Limit:** under H1 and H2 these jsdom tests pass on the current code, so they cannot "fail before the fix" as 25.4 requires. The failing-before test is the browser `elementFromPoint` / `input`-event test (H1) or the remount test (H2); 25.4 needs adjusting once the cause is known.

### 9. Batch 3: selection and the Risen pool (Requirements 10, 12, 19)

| Module | Rule |
| --- | --- |
| `model/settle.ts` | `stepSettle(state, value, now)`: settled once the value is unchanged for 0.25 s, from `state.clock.elapsedTime`. |
| `model/selection.ts` | `assignNearest(candidates, 8)`: nearest to the destination Selection_Pose, ties by lower `cik`, order-independent. Only Newly_Undead firms are candidates (Already_Undead never get a character, 26.1). |
| `SelectionController` | Selection_Event on Settled_Shock, Camera_Rig target change (destination pose, at move start) or first Firm list load; writes `selectionStore` (`risen`, `modelByCik`, `version`) and `settledShock` to the main store. |
| `model/risenPool.ts` | Phases `idle, waiting, stirring, rising, up, lowering`; 8 slots; times from `riseTimeline`; lowering takes at most 1.2 s with no Rise_Cut; Reduced_Motion goes straight to `up`. Emits `started` at Stir start and `finished` at keys time 3.2. |
| `model/modelAssignment.ts` | Pure module (no React, no three.js), exported so the future lab and failure scare import the same function. `modelFor(cik, storyCik): 'hero' \| 'walker' \| 'crawler'`: the Firm whose `cik` equals `storyCik` gets `hero`; every other Firm gets `['hero','walker','crawler'][fnv1a32(cik) % 3]`, with `fnv1a32` imported from `layout/jitter`. `storyCik` is `null` until the control-room-ui spec defines it. Input is only `(cik, storyCik)`: no distance, camera, selection, Lights_Mode, Reduced_Motion or call order. `resolveModel(wanted, failed)` is only the load-failure fallback: Hero/Crawler fail to Walker; Walker failure: no Risen_Zombie. `requestedModels(ciks, storyCik, failed)` maps `modelFor` over the assigned Firms and does not read Lights_Mode (Hero may load in lights on); `CharacterId` has no `watcher` and the Watcher_Model is never requested. Replaces `wantedModel` and the Hero-by-distance rule. |
| `r3f/Characters.tsx` | `SkeletonUtils.clone` per slot, `frustumCulled = false`, `raycast = () => null`, scale to 1.80 to 1.85 m, base colour x0.9 / 0.85 / 0.75, roughness at least 0.75, no shadows in low quality. Models load after the first frame, each only when a Firm that uses it is first assigned; the model of a slot never changes at a Selection_Event, a Lights_Mode change or a camera move. |
| `model/horrorQuality.ts` | Low quality: grass x0.5, no character shadows, Rise_Budget stays 8. |

### 10. Batch 3: rise, Stir and Stare (Requirement 27)

`model/riseTimeline.ts` (pure): `riseClock(s, {reduced, lights})` returns `{phase, a, keysTime, cutNow, showCharacter, tornMound, dirtU}` from seconds since Stir start.

| Constant | Value |
| --- | --- |
| `STIR_S` | 1.4 (a = s / 1.4) |
| `SOIL_BREAK_T` | 0.55 (Torn_Mound swap, Dirt_Burst) |
| `RISE_CUT_T` | first t > 0.8: Static_Cut 0.32 s, glitch 0.2 s, keys time jumps to 1.95 |
| keys time | t before the cut, t + 1.15 after; end 3.2 (t = 2.05) |
| `STARE_S` | 2.8 (smoothstep) |
| Reduced_Motion | Stir without shake; torn mound at t = 0.55, no burst; cut at most 0.15 s, no glitch; zombie at final pose with head at Stare target; `finished` in that frame |

- `model/stir.ts`: `stirOffset(a, rand)` gives mound offsets at most 1.5 cm x a in x/z, 1 cm x a in y; camera shake at most 6 mm x a in x/y (lights off, motion allowed).
- `model/boneAnimator.ts`: `frameAt(keysTime, model)` interpolates the five Rise_Keys (0.0, 0.7, 1.5, 2.3, 3.2 s; root height -1.8 to -0.95 m) with `jerk` (first 40 % of an interval moves 8 %, then cubic ease-out) and returns world-space aim directions; `Characters` applies them with the prototype `aim()`. Root offset 0.05 m for the Crawler. After 3.2 s: `stare(t, headDir, headToCamera)` (target = normalize(unit(head to camera) + (0, 0.15, 0))), finger curl + 0.15 sin(5t + pitX), twitches (first at 2 s, then every 1.2 to 3.5 s, 0.18 s, offsets x -0.6..0.6, y -0.3..0.2) from `mulberry32(fnv1a32(cik))`. No breathing. Lights on: same model as lights off and the same phase and position on a Lights_Mode change (12.3, 12.4); blood material colour set to grey (desaturated, not removed); no Stare (head keeps the last Rise_Keys direction), no twitch, no camera shake (27.14).
- `model/dirtBurst.ts`: `clodAt(u, rest, h)`: outward 35 % to 100 % of rest offset, height 0.03 + 4 h u (1 - u), hidden while u <= 0.02, u over 0.45 s.
- Auto_Aim: on Stir start the Flashlight aims at Pit + 0.5 m for 2.2 s or until the first pointer move; a new Stir replaces a running one.
- Events: `riseEvents` at Stir start, `riseFinishedEvents` at keys time 3.2, once per zombie.

### 11. Batch 3: unease and the Flash_Limiter (Requirement 28)

`model/unease.ts`: `uneaseAt(S, {lights, reduced}, stirA)` with S = Shock_pp in [0, 5]:

| Output | Formula | Zero when |
| --- | --- | --- |
| rumble gain | 0.03 + 0.07 S (tc 0.4 s); during a Stir 0.25 + 0.5 a, max 0.75 (tc 0.1 s), a = largest running | never |
| Camera_Jitter amplitude | x 0.0006 S, y 0.0005 S (sin(23t), sin(31t)) | lights on, Reduced_Motion |
| Random_Glitch chance | 0.002 + 0.0025 S, one frame at strength 0.6 | lights on, Reduced_Motion |
| Flash_Dip chance | 0.004 S, Flashlight x0.3 for one frame | lights on, Reduced_Motion |

Applied from the live Shock_pp from the next frame (28.9), not the Settled_Shock.

`fx/flashLimiter.ts`: `createFlashLimiter()` with `offer({t, kind})`, kinds `static > glitch | dip | flicker`; accepts only if fewer than 3 flashes were accepted in (t - 1000 ms, t]; same-frame candidates: Static_Cut first; a Static_Cut during an accepted one merges (ends later, counts once). `fx/staticCutBus.ts` carries `{staticS, glitchS}` requests; `FlashBus` (priority -30) drains them into the limiter; `CctvPass` sets the grade shader's `stat` and `glitch` uniforms from the accepted ones. The random `GlitchScheduler` is replaced by `uneaseAt` offers; `trigger` is not built.

### 12. Batch 3: audio (Requirement 29)

- `audio/growl.ts`: `growlParams({d, ndcX, uRate})`: gain min(1, 2.2 / d) before master gain; rate 0.85 + 0.2 uRate; pan clamp(ndcX, -1, 1); `lowpassHz` 2000 when d > 10, else null. Engine adds a `StereoPanner` and a `BiquadFilter` per Growl. `createGrowlLimiter` and `pickGrowl` stay (Properties 39, 40).
- `audio/duck.ts`: `duckAt(now, lastStirStart)`: wind 0.1 (tc 0.15 s) from Stir start; from +3.5 s back to 0.35 (tc 0.8 s); no crows until +5 s; the latest Stir replaces the reference.
- Rumble_Bed: Manifest entry `freesound-lennartgreen-low-rumble-loopable` (present as mp3; confirm the ogg is listed in `groupAssets.json`), loaded after the Interaction_Gate, skipped silently on failure. Gain from `uneaseAt`.
- Removed: digging on rise start, Footstep_Bed (`footsteps.ts`, `setFootstepDistance`, `setReducedMotion` for it, `nearbyStanding`). Their files, Manifest entries and `CREDITS.md` rows stay.
- Muted or blocked audio does not change any visual timing (29.4).

### 13. Batch 3: removals (Requirement 26)

Not built: Watcher (`watcher.ts`, `farSpots.ts`, `coneInput.ts`, `Watcher.tsx`, `GlitchScheduler.trigger`), Standing_Zombies (`standing.ts`), Mutant (removed from the scene and from `groupAssets.json`; file, Manifest entry and credits stay), Footstep_Bed, digging sound, Content_Notice. The Watcher_Model is never requested. The bundle check counts only files a graveyard session requests (26.11). The Greenall_Corpse stays static.

### 14. Evidence and gates (Requirements 21, 38)

- `horror-screenshots.mjs --batch 2b|3` writes `horror-batch2b-look.png`, `horror-batch3-stir.png`, `horror-batch3-risen.png` (lights off, 1920 x 1080). The DEV helper `HorrorDebug` gains `?horror=stir|risen`; it stays behind `import.meta.env.DEV` with the existing bundle marker.
- `measure-fps.mjs --horror` runs at the end of Batch 3 (3,000 firms, lowest 0.25 pp step with 8 Newly_Undead, 10 s window) and writes the DEVLOG line of 38.5, counting only Risen_Zombies. If the base script is missing it is finished in Batch 3.
- After any change under `web/src/scenes/**` or `web/src/fx/**`: name `reference/graveyard/horror-direction.png`, `horror-direction-sequence.png` and the Prototype; offer the scene-critic.

## Data Models

| Type | Change |
| --- | --- |
| `StoneLayout` | Batch 2 (delivered): `fallen`, `standingYaw`, `baseY`, `pitCentre`; `PlotLayout.rowAnchors`. |
| `DressingPlan` | Batch 2 (delivered): `torn` / `closed` partition, `stains`; `mounds` equals `undead`. |
| `selectionStore` | `{ risen: string[], modelByCik: Record<string, CharacterId>, version }`; `risen.length <= 8`. |
| main store | Adds `settledShock: number` only (20.5). |
| `RisenSlot` | `{ cik, phase: idle | waiting | stirring | rising | up | lowering, t }`, 8 slots. |

## Correctness Properties

A correctness property is a characteristic or behavior that should hold true across all valid executions of a system, a formal statement about what the system should do. Such statements bridge human-readable specifications and machine-verifiable correctness guarantees.

PBT applies to the pure modules (layout, selection, pool, timeline, animator, limiter, unease, audio parameters, asset tooling). It does not apply to R3F rendering, CSS, real model files, audio output, screenshots or frame rate; those use examples and the Playwright scripts. Property numbers are stable: retired properties keep their number and carry a one-line note. Properties 1 to 3, 5 to 21, 39, 40, 44 and 45 are unchanged from the earlier pass (Properties 4, 29 and 30 follow the `modelFor` rule); 46 and up are new for Batches 2b and 3. Tests use fast-check 4.10.2, at least 100 runs, tagged with the feature name and the property number.

### Property 1: Animation edits keep exactly what they are told to keep

For any glTF document with any set of animation clip names and any list `K` of names, `keepAnimations(K)` leaves exactly the clips whose names are in `K` (order preserved) and no others; `removeAnimations` leaves zero clips and leaves the skin joint names and mesh count unchanged; both are idempotent; for any document that uses `KHR_materials_pbrSpecularGlossiness`, `specGlossToMetalRough` leaves no material with the extension and does not list it in `extensionsUsed`.

**Validates: Requirements 1.3, 1.4, 1.5, 1.6**

### Property 2: Mixamo hosts are refused, animation-free CC BY Sketchfab picks are accepted

For any pick whose `sourceUrl` host is `mixamo.com` or a subdomain of it (any path, any allowed license string), `checkLicense` refuses it as forbidden. For any pick with license `CC BY 4.0`, an http(s) Sketchfab `sourceUrl`, a non-empty author and an `edits` list that contains `removeAnimations`, `checkLicense` accepts it as `CC BY`.

**Validates: Requirements 4.5, 4.6**

### Property 3: Group budget accounting is exact

For any manifest-like file list and the categories of `groupAssets.json`, `computeGroupBudget` returns per-category sums that add up to the total (HDRI bytes reported separately, with and without HDRI totals), counts each sound once (its `.ogg`), reports `over` if and only if the total exceeds 25,000,000, fails when any group key is missing or any group file is above 5,000,000 bytes, and in the failure case its message contains both the measured size and the budget.

**Validates: Requirements 3.13, 5.6, 5.7, 5.8, 5.10**

### Property 4: Requested character models follow need only

For any assigned Firm list, `storyCik`, lights mode and Reduced_Motion value, `requestedModels` returns exactly the set of `modelFor` results of the assigned Firms, never contains `watcher`, is the same for both lights modes and both Reduced_Motion values, and is empty before the first frame.

**Validates: Requirements 5.1, 5.3, 26.2**

### Property 5: Grass placement is deterministic and local to its plot

For any layout and any plot, `placeGrass` called twice returns bit-equal positions, and the cards of a plot are unchanged when other plots (other sectors) are added to or removed from the list.

**Validates: Requirements 6.6**

### Property 6: Grass respects clearance, cap, density and quality

For any layout, every card of a plot lies outside every headstone oriented footprint and every Pit disc and has a height of at most 0.35 m; the plot has at most 1,500 cards; the card density within 1.0 m of a mound is higher than the density farther than 3.0 m from every mound (for plots of at least 5 stones); and the low-quality set has at most half the cards of the normal set.

**Validates: Requirements 6.5, 6.7, 6.8, 6.9**

### Property 7: Every headstone has exactly one mound, and the plan follows the shock and lights

For any firm list, any valid delta and any lights mode: `torn` and `closed` partition all firms; `torn` equals the firms that are `zombie` or Newly_Undead (including Newly_Undead firms beyond the Rise_Budget and zombies at every delta); stains exist only in lights off, number 0 to 3 per torn mound, and only on torn mounds; blood quads exist only in lights off and only on undead stones.

**Validates: Requirements 7.1, 7.4, 7.6, 7.10, 7.11, 10.6, 16.4**

### Property 8: A torn mound is never removed under a character

For any set of undead firms and any set of active pool ciks, `tornMoundSet` equals their union, and a firm leaves the set only when it is neither undead nor active.

**Validates: Requirements 7.5**

### Property 9: Pit and clod geometry

For any cik: the Pit width is between 0.5 m and 0.9 m; the clod count is between 6 and 14; every clod lies at least `PIT_R + 0.05` and at most 1.2 m from the Pit centre.

**Validates: Requirements 7.2**

### Property 10: Mounds follow the jittered, standing headstone

For any layout, every stone's `pitCentre` equals its jittered base centre moved `depth/2 + 0.45` m along its `standingYaw` (front side), also when the stone is fallen; the mound centre is the stone base.

**Validates: Requirements 7.7, 7.8, 7.9**

### Property 11: Jitter is bounded, local to the cik and deterministic

For any cik, `stoneJitter` has `|dx|, |dz| <= 0.30`, `|yaw| <= 20 degrees`, a height factor in [0.90, 1.10]; calling it twice, or computing a layout of a list and of the same list with extra firms, gives bit-equal jitter for the shared firms; for any status the total tilt of an upright stone is at most 8 degrees and the lowest endangered or zombie lean is greater than the highest healthy or insufficient_data lean; final heights lie in [0.765, 1.76].

**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.8, 8.10, 20.3**

### Property 12: Fallen stones lie face up

For any firm, a fallen stone has `pitch = −90 degrees`, its face normal is within 15 degrees of up, its yaw differs from its standing yaw by exactly 90 degrees in either direction, and its sink is between 0 and 0.08 m.

**Validates: Requirements 8.7**

### Property 13: Fallen share is about five percent

For any generated list of 2,500 to 3,000 firms with hash-uniform ciks, the fallen share lies between 3 percent and 7 percent. (Requirement 8.6 gives no hard guarantee below 2,500 firms.)

**Validates: Requirements 8.6**

### Property 14: Stones keep their distance and never cover their own Pit

For any firm list, the oriented footprints of any two stones in the same plot are at least 0.15 m apart (fallen stones use their lying footprint); plot rectangles are at least 1.2 m apart; and no stone footprint intersects the Pit disc of its own firm.

**Validates: Requirements 8.9, 8.10, 8.11**

### Property 15: Reading order does not depend on jitter

For any firm list, `plot.stones` lists each plot's firms in input order, whatever the jitter values, and `nextFocus` returns stones whose jittered centres lie inside the 45 degree cone.

**Validates: Requirements 8.13, 8.14**

### Property 16: Picking equals the brute-force oriented box test

For any layout (with tilted and fallen stones) and any ray, `pickStone` returns the same stone and distance as testing every stone's oriented box, and returns no stone when no box is hit.

**Validates: Requirements 8.12**

### Property 17: Plot camera pose sits among the graves

For any generated layout and any plot, `plotPose` has an eye height within 1.5 +- 0.1 m, the horizontal distance to the nearest headstone base of that plot is at most 4.0 m, and the camera position lies inside the plot rectangle extended by `PLOT_GAP`. The Base_Spec overview property (all plots inside the frustum for aspect ratios 0.5 to 3) still holds unchanged. (Batch 2 values; Property 46 replaces the numbers for Batch 2b.)

**Validates: Requirements 9.1, 9.2, 9.4, 9.6**

### Property 18: Nearest-row mound bases project into the lower half

For any generated layout and plot, at aspect ratios 1440/900 and 390/844 with the neutral pointer and sway 0, `projectToNdc` of the bases of the first-row mounds (front edge points) gives NDC y below 0.

**Validates: Requirements 9.3**

### Property 19: Nearest assignment

For any candidate list with distances and any budget `b`, `assignNearest` returns at most `b` distinct ciks, every returned cik is a candidate, no unreturned candidate is nearer than the farthest returned one (ties broken by lower cik in plain string order), and the result does not depend on the order of the input list.

**Validates: Requirements 10.1, 10.2**

### Property 20: Settled_Shock timing

For any sequence of value changes with timestamps, `stepSettle` reports a settled value only when the value has been unchanged for at least 0.25 s, reports it at the first step at or after that time, and never reports while changes arrive less than 0.25 s apart.

**Validates: Requirements 10.4**

### Property 21: The Risen pool respects the budget and the choreography

For any sequence of `desired` lists (up to 40 ciks), time steps and `ready` answers: the number of non-idle slots is at most 8 at every step; slots hold distinct ciks; a cik leaving `desired` lowers for at most `LOWER_SECONDS` and no other cik takes its slot before the lowering ends; a cik appears in `started` exactly once per transition to `rising` and in `finished` exactly once per transition to `up`; no cik rises while `ready` is false; with Reduced_Motion a desired cik is in `up` after one step with one `started` and one `finished`.

**Validates: Requirements 10.5, 10.7, 10.9, 11.8, 11.15, 12.6, 15.3**

*Property 21 note:* the `rising` phase now begins with the Stir (`riseTimeline`); the budget, lowering, `started`/`finished` and Reduced_Motion rules are unchanged.

**Properties 22 to 28 (retired).** Superseded by the prototype Rise_Keys (Requirement 27): Rise_Sequence shape (22), smoothness (23), nothing below the waist (24, kept as an example test of the root range), idle schedules (25), planted hands by IK (26, IK not built), ballistic Dirt_Burst (27), height range 1.6 m to 1.9 m (28). Replaced by Properties 52 to 56.

### Property 29: Model assignment does not change with lights, selection or rank

For any ordered list of ciks, `storyCik`, and either lights mode: the model of each cik equals `modelFor(cik, storyCik)`; a Lights_Mode, Reduced_Motion, Selection_Event or camera change leaves every model unchanged, so a Risen_Zombie keeps its model, phase and position; the model changes only when `storyCik` changes.

**Validates: Requirements 12.2, 12.3, 12.4, 12.5, 16.3, 19.6**

### Property 30: Model fallback chain

For any wanted model id and any subset of failed ids, `resolveModel` returns `walker` when `hero` or `crawler` failed and `walker` did not, returns `null` when `walker` failed (so no Risen_Zombie and no rise event exist), and returns the wanted id otherwise.

**Validates: Requirements 5.11, 12.7**

**Properties 31 to 38 (retired).** Standing_Zombies (31, 32), the Watcher, Far_Spots, Cone_Active and the vanish glitch (33 to 38) are not built (Requirement 26).

### Property 39: Growl limiter

For any sequence of non-decreasing event times in milliseconds, the number of accepted events in any window of 1,000 ms is at most 1, the first event after a gap of at least 1,000 ms since the last accepted event is accepted, and rejected events are not remembered.

**Validates: Requirements 17.2, 17.10**

### Property 40: Growl choice

For any `u` in [0, 1), `pickGrowl(u)` is one of the two Growl files; the same `u` always gives the same file; values below 0.5 and values from 0.5 up give different files.

**Validates: Requirements 17.11**

**Properties 41 to 43 (retired).** Footstep_Bed silence and gain (41 part, 42) and the Content_Notice storage round trip (43) are not built. The Growl silence rules (before the gate, muted, lights on, no replay) become example tests in `audioEngine.horror.test.ts`.

### Property 44: Horror quality

For any quality flag, `horrorQuality(true)` has half the grass scale of `horrorQuality(false)`, no character shadows, and the same Rise_Budget of 8.

**Validates: Requirements 19.1**

### Property 45: The measurement step finder

For any firm list and any `minCount`, `findShockStep` returns the smallest slider step `k` in 0..20 whose settled batch has at least `minCount` Newly_Undead firms, or `null` when none does, and the count is non-decreasing in `k`.

**Validates: Requirements 21.4**

### Property 46: The plot pose matches the prototype camera

For any generated layout and plot at aspect ratios 1440/900 and 390/844 (pointer centred, sway 0): FOV is 46, eye height is 1.2 ± 0.05 m, the look point height is 0.6 ± 0.05 m, the nearest headstone base is at most 4.0 m away, the camera lies inside the plot rectangle extended by `PLOT_GAP` (margin 0.04 m; if it fails, `CAMERA_BACK` drops to 2.9), the overview ignores the eye height, and the first-row mound bases project below the viewport centre.

**Validates: Requirements 23.1, 23.3, 9.2, 9.4, 9.6**

### Property 47: Grade steps stay in range

For any rgb in [0, 1]^3 and any pixel position, `gradeColour` steps (a) to (c) return channels in [0, 1], the vignette factor is in [0, 1], a grey input stays grey after (a), and the vignette factor is 1 at the centre.

**Validates: Requirements 23.11**

### Property 48: Flash_Limiter never exceeds 3 flashes per second

For any sequence of non-decreasing candidate times and kinds, any window (t - 1000 ms, t] contains at most 3 accepted flashes, and rejected candidates are not queued.

**Validates: Requirements 28.6, 28.7**

### Property 49: Accepted flashes come from candidates, Static_Cut wins, overlaps merge

For any candidate sequence, every accepted flash starts at the time of one of its candidates; when a Static_Cut and another kind arrive on the same frame with one slot left, the Static_Cut is accepted; a Static_Cut starting during an accepted one merges into one flash ending at the later end and counts once.

**Validates: Requirements 28.6, 28.7**

### Property 50: Unease values are non-negative, bounded and monotone in the shock

For any Shock_pp in [0, 5], lights mode, Reduced_Motion value and Stir progress: every chance is in [0, 1], every gain and Camera_Jitter amplitude is at least 0, the rumble gain is at most 0.75, and no value decreases as Shock_pp increases.

**Validates: Requirements 28.2, 28.3, 28.4, 28.5, 28.10**

### Property 51: Unease is pure and switches off where required

For any inputs and an identical random source, `uneaseAt` returns equal outputs; with lights on or Reduced_Motion true, Camera_Jitter, Random_Glitch and Flash_Dip are 0 while the rumble gain is unchanged; at Shock_pp 0 with no Stir the rumble gain is 0.03.

**Validates: Requirements 28.1, 28.8, 28.10**

### Property 52: Rise timeline shape

For any frame times, no rendered keys time lies in (0.8 s, 1.95 s); keys time equals t before the cut and t + 1.15 after; it reaches 3.2 at t = 2.05; the character is hidden during the Stir; the mound offsets of the Stir are at most 1.5 cm x a (x, z) and 1 cm x a (y), a in [0, 1].

**Validates: Requirements 27.1, 27.3, 27.4, 27.5, 27.6, 27.7**

### Property 53: Bone_Animator is pure and smooth

For any cik and t in [0, 10] s, `frameAt` is deterministic, and bone angle change between samples 1/60 s apart is at most 25 degrees (90 degrees within 200 ms after a Rise_Keys interval starts), except at the Rise_Cut jump and for the head across a twitch start or end.

**Validates: Requirements 27.12, 11.12**

### Property 54: Stare and idle follow the specification

For any cik and head geometry: the Stare head direction equals the last key direction at 0 s and the normalised target at 2.8 s and stays there; twitch intervals are in [1.2, 3.5] s after a first twitch at 2 s, each lasts 0.18 s with offsets in range; the schedule is identical for the same cik; no chest or spine bone moves periodically (no breathing).

**Validates: Requirements 27.8, 27.9, 11.10**

### Property 55: Reduced_Motion rise ends in the final pose in one step

For any firm with Reduced_Motion true, the Stir has no shake, the cut lasts at most 0.15 s with no glitch, and the first frame after it shows keys time 3.2 with the head at the Stare target and one `finished` event.

**Validates: Requirements 27.15**

### Property 56: Clod arc

For any seed, rest offset and u in [0, 1]: the Clod is hidden while u <= 0.02; its outward distance is 35 % to 100 % of the rest offset; its height is in [0.03, 0.03 + h] with h in [0.08, 0.30].

**Validates: Requirements 27.4**

### Property 57: Growl parameters

For any distance d > 0, ndcX and uniform draws: gain is min(1, 2.2 / d), rate is in [0.85, 1.05], pan is in [-1, 1], and a 2,000 Hz low-pass applies if and only if d > 10.

**Validates: Requirements 29.1, 29.6**

### Property 58: Duck schedule follows the latest Stir

For any sequence of Stir start times: wind target is 0.1 from the latest start, 0.35 from +3.5 s; crow sounds are blocked until +5 s after the latest start; an earlier Stir never overrides a later one.

**Validates: Requirements 29.3**

### Property 59: Already-undead firms never get a character

For any firm list and shock, the candidate list for `assignNearest` contains only Newly_Undead firms, no `zombie`-at-delta-0 firm, and the assignment has at most 8 entries.

**Validates: Requirements 26.1, 26.4**

### Property 60: modelFor is a pure function of the cik and the story firm

For any cik, any `storyCik` (a cik or null) and any list of other Firms: `modelFor(cik, storyCik)` is always one of `hero`, `walker`, `crawler`; the same input always gives the same model; the result is independent of call order and of the other Firms (computing it for a list in any permutation, or for the list with Firms added or removed, gives the same model for each shared cik); and when `cik` equals `storyCik` the result is `hero`.

**Validates: Requirements 12.1, 12.2, 12.9**

## Error Handling

| Condition | Handling |
| --- | --- |
| Required zip missing or conversion step fails (Batch 1) | Pick skipped and listed with its cause; `--strict` exits non-zero (1.9). |
| Converted model over 5,000,000 bytes | Warning with texture, decimation, KTX2 suggestions (1.10); group check also fails (5.10). |
| Group total over 25,000,000 bytes | `pnpm build` fails with measured size and budget (5.7); fallback order of section 2 (5.13). |
| Character_Model fails to load | Console report of the asset name; Hero/Crawler fall back to Walker; Walker failure: no Risen_Zombie, no rise event, Torn_Mounds stay (12.7). |
| Ground_Texture fails to load | Flat `#0b0806` ground and the HUD notice (6.3). |
| Growl file fails | The other file; both failing skips silently (17.7). |
| Rumble_Bed fails to load or decode | Skipped, no error shown, other sounds continue (29.5). |
| Browser blocks audio or audio muted | Visual choreography unchanged (29.4). |
| Flash candidate over the limit | Dropped, not queued (28.6). |
| `?horror=` in a production build | Ignored; helper not in the bundle; `check-bundle` fails on the marker. |
| Skinned bounds culling a rising character | `frustumCulled = false`. |
| Uncaught render error | Existing `SceneHost` boundary with Retry. |

## Testing Strategy

Unit and example tests cover wiring and edge cases; the properties above cover the pure modules (fast-check, at least 100 runs, tagged with the property number). Properties 1 to 21 and the Batch 1 and 2 test files are delivered and unchanged.

| Test file | Content |
| --- | --- |
| `scenes/graveyard/look.test.ts` | Example: every value listed in `horror-direction-params.md` equals the constant (23.17). |
| `layout/camera.property.test.ts` | Property 46 (replaces the Batch 2 eye-height cases). |
| `fx/cctvGrade.property.test.ts` | Property 47. |
| `fx/flashLimiter.property.test.ts` | Properties 48, 49. |
| `model/unease.property.test.ts` | Properties 50, 51. |
| `model/riseTimeline.property.test.ts`, `boneAnimator.property.test.ts` | Properties 52 to 55 (Reduced_Motion example included). |
| `model/dirtBurst.property.test.ts` | Property 56. |
| `audio/growl.property.test.ts`, `audio/duck.property.test.ts` | Properties 39, 40, 57, 58. |
| `model/selection.property.test.ts`, `settle.property.test.ts`, `risenPool.property.test.ts` | Properties 19 to 21, 59. |
| `model/modelAssignment.property.test.ts` | Properties 4, 29, 30, 60 (`modelFor`, `resolveModel`, `requestedModels`). |
| `r3f/soilMaterials.test.tsx` | Example: six materials, both modes (24.5). |
| `ui/controls/LightsButton.test.tsx` and a Playwright check | Requirement 25 (see section 8 for the limit of jsdom tests). |
| `horror.purity.test.ts` | No `react`/`three` imports, no `setTimeout`/`setInterval` in the pure modules. |
| `Horror.scene.test.tsx` | No `Hands`, `Watcher` or `Standing` import; characters have `raycast` null; at most 8 characters. |

### Tests superseded by Batches 2b and 3 (Requirement 20.4)

| Test file | Change |
| --- | --- |
| `layout/camera.test.ts` | Plot pose cases assert FOV 46, eye 1.2, look 0.6, back 3.0; target easing cases removed. The Base_Spec 10.5 `flickerFactor` case (Property 24) is removed with `flickerFactor`; the 23.9 flicker and its 3-per-second cap are tested in `r3f/flashlightState.test.ts`. |
| `model/sceneParams.test.ts`, `r3f/lightsBlend.test.ts` | Plot_Fog, hemisphere, moon, background and environment values for lights-off framed plots. |
| `r3f/TornMounds.test.ts`, `model/tornMound.test.ts`, `r3f/Grass.test.ts` | No `emissiveMap`, black emissive, Clod and Pit colours. |
| `fx/glitchScheduler` tests | Random glitch offered through the Flash_Limiter; no vanish trigger. |
| `r3f/flashlightState.test.ts` | New Flashlight values and Flash_Dip offers. |
| `model/handPool.test.ts` | Deleted; cases move to `selection.property.test.ts` and `risenPool.property.test.ts`. |
| `audio/audioEngine.test.ts`, `useGraveyardAudio.test.tsx` | Rumble_Bed, duck, positional Growl; no digging, no footsteps; `linearRampToValueAtTime` on the fake param. |
| `model/modelAssignment.test.ts`, lights-on character tests | Old cases (Hero for rank 0 by distance, Walker swap in lights on, no Hero request in lights on) removed; now assert `modelFor` is the same in both lights modes, blood colour grey in lights on, no Stare, twitch or camera shake in lights on. |
| Mutant tests (props / `Creatures`) | Mutant no longer rendered; tests assert absence. |
| Standing / Watcher tests | Not built; none added. |

Commands (PowerShell): `Set-Location web; pnpm typecheck; pnpm lint; pnpm format; pnpm test; pnpm build`, then `node scripts/horror-screenshots.mjs --batch 2b --url http://localhost:5173` (dev server started separately).

## Requirement to Component Mapping

| Req | Primary files |
| --- | --- |
| 1 to 5 | `tools/asset-lib/*`, `tools/picks.json`, `manifest.json`, `CREDITS.md`, `groupAssets.json`, `check-bundle.mjs` (delivered) |
| 6 to 9 | `model/grass.ts`, `r3f/{Ground,Grass,Mounds,TornMounds}.tsx`, `layout/{jitter,extents,layout,pick,camera}.ts` (delivered) |
| 10 | `model/{settle,selection,risenPool}.ts`, `r3f/SelectionController.tsx`, `selectionStore.ts` |
| 11, 27 | `model/{riseTimeline,boneAnimator,stir,dirtBurst}.ts`, `r3f/Characters.tsx` |
| 12 | `model/modelAssignment.ts` (`modelFor`, shared with the future lab), `r3f/characterLoader.ts` |
| 15, 26 | `GraveyardScene.tsx` (no Hands, Mutant, Watcher), `riseEvents.ts` |
| 16, 19 | `model/dressing.ts`, `model/horrorQuality.ts` |
| 23 | `look.ts`, `layout/camera.ts`, `model/sceneParams.ts`, `r3f/{SceneLights,Flashlight,Props,Stones}.tsx`, `fx/CctvGradeEffect.ts` |
| 24 | `r3f/{soil,TornMounds,Mounds,Grass,Ground}.tsx` |
| 25 | `ui/controls/*`, `scenes/graveyard/dev/HorrorDebug.tsx` (section 8) |
| 28 | `model/unease.ts`, `fx/{flashLimiter,staticCutBus,FlashBus}`, `r3f/CameraRig.tsx` |
| 29 | `audio/{audioEngine,growl,duck,useGraveyardAudio}.ts` |
| 20, 21, 22, 38 | Test table above, evidence scripts, `tasks.md` batches |

Moved to the future control-room-experience spec (2026-11-13); not designed here: Requirements 30 to 37 (OSD, camera switcher, rate console, controls hint and menu, hover tag, Firm_Lookup, Status_Word, Opening, Framed_Set, Plot_Fall, Fall_Armed, Jump_Scare, jump-scare face and OSD font assets, steering exceptions). Requirement 35 is cancelled.

Steering compliance: engine, `/pipeline`, `/data` and `data-contract.md` untouched; every asset has a `CREDITS.md` row; commits use `feat(graveyard-horror-pass): ...`.

## Decisions

1. **Band-packed layout** (Batch 2): extents instead of a larger fixed pitch; 0.15 m gap by construction.
2. **Fallen stones fall backwards** (Batch 2): the Pit is never covered.
3. **Settled_Shock from the render clock**: no timer, deterministic tests.
4. **`.ogg` is the counted audio file**; mp3 fallbacks reported separately.
5. **Pipeline ceiling 40,000,000 bytes on disk**; the 25 MB Group_Budget is the visitor limit.
6. **Separate `selectionStore`**: only `settledShock` goes into the main store (20.5).
7. **9.3 and 23.3 are evaluated at the framed pose** (pointer centred, no sway).
8. **Dev-only `HorrorDebug`** behind `import.meta.env.DEV` with a bundle marker.
9. **Camera move kept**: the 1.2 s Base_Spec move stays; only pose constants and the fog end state change.
10. **One grade effect**: glitch folded into `CctvGradeEffect`; the lights-off chain is ToneMapping + grade.
11. **Pit material is `MeshStandardMaterial`** so 24.1 applies to it.
12. **Flash_Limiter is the only place that counts flashes**; Static_Cuts, glitches, dips and flickers are candidates.
13. **No IK, no clips**: prototype Rise_Keys with a fixed root keep hands planted.
14. **One model per Firm everywhere** (2026-11-14): `modelFor(cik, storyCik)` replaces Hero-by-distance and the lights-on Walker swap; the story firm is always Hero, so the captured zombie looks the same in the graveyard, the lab and the failure scare. `storyCik` is null until the control-room-ui spec.

## Risks and requirement notes

- **Requirement 25 root cause is not proven** (section 8): ranked hypotheses and a first instrumentation task; the "fails before the fix" clause of 25.4 may not hold for jsdom tests.
- **Camera margin:** with `CAMERA_BACK` 3.0 the camera is only 0.04 m inside the extended plot boundary; Property 46 decides, fallback 2.9.
- **Fallen share (8.6):** guaranteed only for 2,500 to 3,000 firms.
- **Prototype values** (`KEYS`, shader constants) are read from the Prototype at task time; bone maps and axis signs are tuned against `horror-direction-sequence.png`.
- **Convolution effect and glitch:** folding the glitch into the grade shader must be checked against postprocessing 6.39.6 with context7 at task time.
- **Character triangle counts** are unknown until measured; the pipeline decimates above 30,000.

## Delivery in four batches

Batch 1 (assets and licensing) and Batch 2 (ground, graves, stones, camera) are delivered. Batch 2b (Requirements 23 to 25) and Batch 3 (Requirements 26 to 29 and the Risen_Zombie parts of 10, 11, 12, 15, 16, 19, with the fps measurement) each end with a STOP task. Each batch runs the full check before its report, saves its screenshots to `reference/progress/`, and waits for approval. No Batch 4 exists in this spec.
