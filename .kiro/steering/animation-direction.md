---
inclusion: fileMatch
fileMatchPattern: ["web/src/cinematics/**", "web/src/scenes/**", "tools/**"]
---

# Animation Direction

## Sources

- Motion capture first.
  - Rocketbox animations (same skeleton, MIT) for walking, shambling (`m_walk_drunk`, `m_walk_bruised`), and standing up from a table (`m_sit_stand_up_table_*`).
  - CMU Graphics Lab motion capture (credit required) for lying, sitting up from lying, lunging, collapsing and staggering. Retarget to the Rocketbox Biped skeleton with scripts in `/tools`.
  - Never Mixamo.
- Procedural layers on top:
  - IK so hands grip the table edge.
  - The head tracks the camera with half a beat of delay when the camera is within 0.6 m (lights-off only).
  - Convulsions as noisy additive bone rotation, scaled by electroshock and by (1 - survival odds).
  - Breathing when survival odds > 0.5.
  - Anything CMU does not have is done procedurally.
- Root motion drives position: feet never slide.
- Every CMU clip used must be listed in `CREDITS.md`.

## Timing

- One timeline clock per sequence (Theatre.js). Never `setTimeout` for choreography.
- Camera, lights, decay, sound and HUD events live on the same timeline.
- Anticipation before big moves, follow-through after.

## Sequences

### Revive (~7 s)
- 0.0 cut to the switch, lever pulled.
- 0.4 three flashes (<= 3 per second) with full-body convulsion and light camera shake.
- 1.6 flat ECG, 1 s of silence.
- 2.6 one heartbeat, push in to the face, eyes open.
- 3.4 decay recedes from the chest outward.
- 4.6 hands grip the table edge, sits up.
- 5.8 stands, looks at the camera, turns.
- 6.5 walks out through the door into moonlight.
- Then the result card.

### Fail (~5 s)
- 0.4 flashes and convulsion as above.
- 1.4 ECG flatline tone.
- 2.0 0.8 s of false calm.
- 2.8 the head snaps to the camera, eyes roll white.
- 3.2 lunges at the camera while hands reach in from the screen edges (lights-off only).
- 3.8 blood floods in from the edges, frame tears.
- 4.4 0.3 s black.
- Then the result card with the failure reason.

### Liquidate (~4 s)
- A white sheet covers the body and collapses into ash.
- Ash particles drift.
- The table shows only ash.
- Then the result card with losses.

### Capture (graveyard)
- Hold the pointer on a lit hand; a struggle bar fills.
- The hand is dragged out and the camera follows the pull.
- Cut to black with an iron gate sound.
- Letting go early makes the hand lunge at the camera.

### Lights-on versions
- Every sequence keeps the same timing and information.
- No blood, no jump scare, no eyes rolling, no hands reaching in.

## Acceptance

- No foot sliding; no body passing through the table.
- >= 50 fps on an integrated-GPU laptop at 1080p.
- Each sequence <= 8 s and skippable with Esc.
- Jump scares only in lights-off mode, at most one per outcome.
- With `prefers-reduced-motion`: camera cuts instead of moves, no shake, no glitch.
