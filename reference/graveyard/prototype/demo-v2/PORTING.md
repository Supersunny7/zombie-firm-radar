# demo-v2: what to port, and where

Reference only. Never imported by app code. `main.js` is the graveyard, `lab.js` the morgue lab, `index.html` and
`lab.html` hold the overlay markup and CSS. The hosted demo (Claude artifact) loads the same models from base64 `.glb.js`
wrappers; that loading code is a hosting workaround: do not port it.

**Port the logic and the numbers, not the code.** The app is React Three Fiber and TypeScript with pure model modules
and property tests; demo-v2 is one vanilla three.js loop. Keep the app's structure (pure `model/*.ts` + thin `r3f/*.tsx`)
and copy the values below. Line numbers are for this copy of the files.

Already done in the app, do not port: the stone material fix in `main.js` (`stoneFix`, line ~154). The real cause was the
missing metalness map (Batch 2b, task 3.31); the demo's alpha patch is wrong and unused by the app.

Dead code in `main.js`, ignore: `scare1`, `lensAttack`, the walker, the Watcher (`EXTRAS = false`), `grabPose` (hands on
the lens: tried, does not read on CCTV, dropped), the `#s1` overlay CSS in `index.html`.

## 1. Graveyard rise polish (horror-pass Batch 3, tasks 4.3, 4.7, 4.36)
| Piece | demo-v2 | Values | App target |
|---|---|---|---|
| Rise keyframes and `jerk` easing | `main.js` `KEYS`, `jerk`, `riseFrame` (~322 to 345) | unchanged from demo v1 | `model/boneAnimator.ts` |
| Root height spring (overshoot, then settle) | frame loop, `r.yc` / `r.yv` (~487) | stiffness 140, damping 11, per second; at the Rise_Cut (t jumps to 1.95) snap `yc` to the key and set velocity +0.35 m/s | `model/boneAnimator.ts` (pure step function `springStep(y, v, target, dt)`) |
| Struggle noise while rising (t < RISE_T) | frame loop `nz` (~488) | `nz(f, ph) = sin(t f + ph + x 3.1) · sin(0.37 t f + 2 ph)`; arms ± 0.09 on x/y of the upper and fore directions with f = 11, 13, 12, 9, 15, 10, 14, 11; head ± 0.12 / 0.08 (f 17, 19); finger curl ± 0.25 (f 21) | `model/boneAnimator.ts` |
| Dust burst at soil break (t > 0.55) | `dustBurst`, `dustTick` (~194 to 205) | 70 points, radial speed 0.4 to 1.6, up 0.6 to 2.0 m/s, gravity 1.6, drag 0.97 per frame, life 1.8 s, size 0.35 + 0.5 t, opacity 0.9 → 0, colour `#9a8070`, soft radial sprite | new `model/dustBurst.ts` (pure positions) + `r3f/DustBurst.tsx` (one `Points`) |
| Distant dead trees instead of near stumps | `main.js` ~176 | trunk model at height 6.5 to 7.5 m, 13 to 21 m away, dim 0.4 | `props.json` |
| Lantern | `main.js` line 178 | 0.36 m tall, on the ground 0.45 m left of the camera and 2.45 m ahead of it (camera at (-0.55, 1.2, 1.35), lantern at (-1.0, 0, -1.1)), warm light `#ff9a4a` 1.2, distance 4 | `props.json` offset for each plot camera |

## 2. Facing the lens (fixes a bug the app probably has too)
Aiming the neck→head bone axis at the camera shows the **crown** of the skull, not the face. Facing the lens means the
skull stays upright and tips toward the camera:
`headDir = normalize(up + 0.45 · toCamera)` (`headToCam`, ~261). Use this for the Stare (task 4.5, Requirement 27.8)
and anywhere a zombie looks at the lens. `hangDir` (~262) is the head-down pose: `normalize(0.9 · toCameraFlat + 0.15 · up)`.
Check the Stare property test against this definition.

## 3. Camera pan and sway (control-room-ui (a); can go into Batch 3 task 4.39 if cheap)
`main.js` ~574 to 577, after `lookAt`:
pan follows the pointer with smoothing `1 - exp(-1.8 dt)`; yaw `-0.075 · panX`, pitch `0.045 · panY` (pointer in
NDC); sway yaw `0.004 sin(0.31 t) + 0.0015 sin(0.83 t)`, pitch `0.003 sin(0.23 t)`. Frozen while a scare runs.
Reduced motion: no sway, pan without smoothing limits unchanged.

## 4. Max-lever climax (control-room-ui (c))
`main.js` `scareTick` (~755 to 765) and the riser loop. When the lever is at its top and every story-plot zombie is
risen: all freeze (pose time frozen, no twitches), heads go to `hangDir`; wind and rumble fade to 0 (time constant 0.3 s);
at 1.1 s all heads snap to `headToCam` in the same frame, glitch 0.15 s, the searchlight drops to 0 for one frame, one
low hit (sine 55 → 30 Hz over 1.2 s, gain 0.7 → 0.001 over 1.4 s). Lowering the lever releases it and restores the wind.
Not a jump scare. Safe mode and reduced motion: freeze and snap only, no hit.

## 5. Scare 1: capture (control-room-ui (c))
`main.js` capture `setInterval` (~800 to 820), riser loop `r.cap` branch (~508), `lungePose`, `lungeTick`,
`startLunge`, `handsSlam` (~263 to 317).
- First capture only: hold time 2.4 s (later captures 1.3 s, no scare). `cap` = hold fraction.
- 0 to 0.35 struggle: head ± 0.7 / 0.35 (sin 14 t, 11 t), arms ± 0.6, curl ± 0.5 (sin 17 t), root x ± 0.025 (sin 23 t);
  frame shake up to 10 × 8 px; random glitch.
- ≥ 0.35 freeze: pose time frozen, head to `hangDir`; no shake, no glitch.
- 0.45 to 0.75: wind and rumble fade to 0 (time constant 0.08 s); head eases (smoothstep) from `hangDir` to `headToCam`.
- 0.78: the scare starts (releasing the pointer no longer cancels). Pointer pan frozen.
- Lunge: 0.3 s silence (searchlight flickers 2 / 40), then 5 steps of 0.12 s at distances 2.4, 1.65, 1.08, 0.68,
  0.42 m from the camera. Direction lerps from camera→zombie-head toward the camera forward by `min(1, 1.35 u)`,
  `u = 1 - d / 2.4`; head target 0.03 d below that point. Each step: glitch 0.08 s, static 0.07 s. Step 1 plays the
  jump-scare sting and a growl (rate 0.8).
- `lungePose`: face the camera (yaw only), spine `0.6 to + 0.8 up`, arms upper `to ± 0.32 side + 0.22 up`, fore
  `to ± 0.12 side + 0.18 up`, curl 1.05, head `up + 0.38 to`; then translate the root so the head bone lands on the target.
  `side = to × up` is the zombie's right for the `R` chain.
- Searchlight during the lunge: aimed at the head, intensity `22 (d / 3)^2` (keeps the face exposed the same at every
  distance; at 0.42 m only the eyes read: keep it).
- Impact 0.04 s after the last step: thud (sine 90 → 35 Hz, 0.35 s) and growl, frame shake; at 0.14 s the frame tilts
  3.5° and scales 1.08, glitch 0.3 s; NO SIGNAL at 0.65 s; transfer text at 2.2 s; lab at 3.0 s.
- Test hooks in the demo: `?lunge=pos|pxl|mix` starts the lunge at 1.5 s; `?slow=N` slows the lunge N times.

## 6. Scare 2: failed rescue (morgue-lab (c))
`lab.js` `lungePose`, `restoreBody`, `thud`, and the failed branch of `frame` (~270 to 305). Times `e` in seconds after
the verdict:
| e | Beat |
|---|---|
| 0 | flatline sound, ECG flat, hum fades out |
| 3.0 to 4.2 | head turns to the camera (linear blend) |
| 4.6 to 4.75 and 5.3 to 5.5 | lamp 0, hemisphere 0.02 (the lights stutter); small zap at 4.6 |
| 5.5 | body hidden: the table is empty; glitch 0.08 s; rumble off |
| 6.7 | lights stay dead; red point light near the camera, intensity 2.2 to 3.0 flicker, distance 9 |
| 7.4 | lunge: 5 steps of 0.12 s at 2.2, 1.5, 1.0, 0.7, 0.52 m; start direction = camera forward rotated 0.62 rad to the right (it enters from the side), lerped to forward by `min(1, 1.35 u)`; the same standing `lungePose` (the lying body is re-posed standing); red light at the camera offset (-0.2, -0.25, -0.05), intensity `0.5 + 3.2 d^2`; step 1 plays the sting and a growl (rate 0.6) |
| 8.06 | knocked over: thud and shake; over 0.32 s (ease-out) the camera drops to 0.12 m above the floor, moves 0.4 m left and 0.2 m back, rolls 1.45 rad and pitches -0.35 rad; small bounce after; body hidden once 30 % in; red light moves to (camera x - 0.9, 0.9, camera z - 0.8) |
| 8.96 | NO SIGNAL, the camera stays on the floor |
| 10.96 | NO SIGNAL off, camera and body restored, the table stays empty, result card with the autopsy line |
The lab model is the captured firm's model (`modelFor`), with the three bone maps in `MAPS` (`lab.js` ~79).
Test hooks: `?force=fail`, `?slow=N`, `?hold=e` freezes the timeline at `e` for screenshots.

## 7. Bone maps (all three models)
`main.js` `MAPS` (~206) and `lab.js` `MAPS` (~79): upper arm, forearm, hand, neck, head, spine, chest and finger chains
for `pos` (sketchfab-possessed-undead-giantswing), `pxl` (sketchfab-zombie-pxltiger) and `mix`
(sketchfab-zombie-walk-oscar). `aim(bone, child, dir)` and `arm(side, upper, fore, curl)` are the only pose primitives.
