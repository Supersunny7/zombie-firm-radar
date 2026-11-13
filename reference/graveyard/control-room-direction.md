# Graveyard direction v2: the control room

Reference only (never imported by app code). Decided with the user on 2026-11-13 after testing the interactive
prototype in `prototype/demo/` (source: `main.js`, `index.html`). Exact look values are in `../horror-direction-params.md`.
Where this file and the graveyard-scene or graveyard-horror-pass specs disagree, this file wins for the graveyard.

## 1. Premise
The viewer is a night guard watching a CCTV feed of a graveyard of US public firms. Every piece of UI belongs to the
monitor (on-screen display, camera switcher, rate-shock console). Nothing looks like a web page floating over a game.

## 2. Emotional line (the only one)
Quiet -> unease that the viewer causes -> one release.
1. **Quiet.** Wind only. Nothing moves on its own. The viewer sweeps the flashlight over stones and reads them.
2. **Unease, caused by the viewer.** Each step of the rate-shock lever raises it: low rumble gain `0.03 + 0.07 * shock`,
   camera jitter amplitude `~0.0006 * shock`, random glitch chance per frame `0.002 + 0.0025 * shock`,
   flashlight dip chance per frame `0.004 * shock`.
3. **A firm crosses the line** (its shocked ICR < 1): its grave stirs for 1.4 s (mound shakes, rumble swells to 0.75,
   camera shakes), the soil breaks (clods burst out over 0.45 s), the hand claws up; at 0.8 s the feed cuts to static
   for 0.32 s and returns with the zombie already hauled out to the waist; it then turns its head to stare at the lens
   over 2.8 s and keeps breathing, twitching and clawing. The flashlight auto-aims at the grave for 2.2 s unless the
   pointer moves. No smooth full climb is ever shown: the cut hides the stiffness of procedural animation.
4. **One jump scare per plot**, only when every shock-eligible firm framed in the plot has risen ("the plot falls"):
   2.2 s after the last one finishes, all sound ducks to silence and crows are held; 1.4 s later the flashlight
   flickers out; then a full-screen close-up of the possessed-undead face lunges at the lens (`assets/jumpscare-face.webp`,
   CSS scale 0.7 -> 1.25 -> 1.45 over 0.75 s with two opacity flickers and scanlines), with the vibrating-jumpscare
   sound and a growl at full volume and a body shake; then NO SIGNAL with full static for 2.2 s; then the feed
   reconnects and the wind fades back. It fires again only after the shock is lowered below the line and raised again.
5. **The other jump scare lives in the lab**: a failed rescue (see the lab storyboard). The graveyard never has more than one.

Removed after testing (do not build): deliberate frame-rate drops, the approaching walker, the hooded Watcher,
breathing, random lens attacks, "motion detected" alerts, and the large case-file card.

## 3. Screen layout (desktop; phone in section 6)
- Viewfinder: four corner brackets 38 px, 2 px, rgba(233,230,218,.55), inset 14 px.
- Top left: `REC` (red, blinking dot) + `CAM 03`; below it the plot name (`PLOT 4 · MANUFACTURING`) in the dim colour.
- Under it: camera switcher, one small box per camera; keys 1-9 switch. A switch = 0.28 s static + 0.12 s glitch, then a cut.
  In the app, cameras map to plots (sectors); the overview is its own camera (`CAM 00 · OVERVIEW`).
- Top right: timestamp (ticking, YYYY-MM-DD HH:MM:SS) and `SEC EDGAR · <n> FIRMS` (+ `· SAMPLE` for sample data).
- Bottom centre: rate-shock console (dark metal panel, notched track, metal lever thumb, ticks 0 to +5) with a red LED
  counter on the right (`RISEN`, two digits, glow).
- Bottom left: a three-line controls hint that fades after 14 s.
- Bottom right: `≡ MENU` holding Sound, Lights on/off, Table view, Credits, and the sample-data note.
- Fonts (Google Fonts, OFL): VT323 for all on-screen display; no other UI font in the graveyard.
- Colours: text #e9e6da, dim #8d8a80, red #e0342a, panels #0c0d0f to #17181b.

## 4. Reading a firm (replaces the file card)
Hovering a stone, mound or zombie with the flashlight shows a small tag next to the pointer:
line 1 the firm name in caps; line 2 `ICR <value at the current shock> · <STATUS>` with RESTING (green #8fb07a),
ENDANGERED (amber #e0a030), RISEN or ZOMBIE (red). It disappears when the pointer leaves. No click, no close button.
Keyboard: the existing stone focus proxy shows the same tag next to the focused stone and announces it in the live region.
The full history stays in the table view.

## 5. Opening
Black screen; four lines type out (32 ms per character, 420 ms between lines):
`SEC EDGAR · 3,000 US PUBLIC FIRMS · FY2022–FY2024` (dim) /
`A firm whose profits cannot cover its interest,` / `three years running, is a zombie.` /
`Some of them are buried here.` (red); then the button `▸ CONNECT TO CAM 03` and the line
`Contains horror and gore · headphones recommended`. The click starts audio, fires 0.45 s of static and fades the
overlay in 0.6 s. Skippable with Enter or Esc; remembered after the first visit.

## 6. Phone (390 px)
Same elements, smaller: corner brackets inset 8 px; the console spans the width at the bottom; the hint is hidden;
the menu sits top right; hover tags appear on tap and hide after 2.5 s.

## 7. Lights on, reduced motion, sound off
- Lights on: no gore, no stare, no jump scare, no shake; the plot falling is shown by the counter and a brief static cut.
- Reduced motion: no shake, no jitter, no lunge animation (the jump scare becomes a 0.4 s still frame, or is skipped in
  lights on); static cuts stay but are shorter.
- Sound off or blocked: everything still happens silently; the jump scare still shows.

## 8. Assets
- Jump-scare face: `prototype/demo/assets/jumpscare-face.webp`, a render of the possessed-undead model
  ("Possessed undead" by giantSwing, CC BY 4.0) made with `prototype/demo/jumpscare-face-render.html`
  (cold key light from below, red rim light, CCTV grade). Credit it as a derivative of that model.
- Sounds: freesound-qubodup-vibrating-jumpscare, freesound-lennartgreen-low-rumble-loopable,
  freesound-tonsil5-zombie-growl-5, freesound-ezcah-zombie-growl-01, wind and crows (all already in the repo).
- No shovel or digging sound for zombies.
