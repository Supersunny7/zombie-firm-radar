# Experience plan (agreed 2026-11-13)

Reference only. This is the agreed end-to-end experience. Graveyard look values: `graveyard/horror-direction-params.md`.
Graveyard control-room details: `graveyard/control-room-direction.md` (sections on the plot-fall scare and the
case-file card are replaced by this plan). Prototypes: `graveyard/prototype/demo/` (read only, never imported).

## 1. The one thing a judge should remember
"When borrowing costs rise, a set of US firms that were barely alive can no longer pay their interest. Saving them has
a price, and it does not always work."

## 2. Role
The viewer is the night-shift operator of the Zombie Firm Radar, watching CCTV of a graveyard where every stone is a US
public firm. Mission: find out who rises if borrowing costs go up, capture one, and get it through restructuring before
dawn. Metaphors are stated on screen: stone = firm; rising = can no longer cover interest; surgery = debt
restructuring; dying on the table = failure.

## 3. Flow (about 2 minutes)
| # | Screen | Viewer does | Screen says | Learns |
|---|---|---|---|---|
| 1 | Opening (typed) | `▸ START SHIFT` or `SAFE MODE · NO SCARES` | role, mission, zombie = ICR < 1 three years running | the definition |
| 2 | Graveyard, story plot | sweeps the searchlight over 3 stones | hover tag: name, ICR, status | stone look = health |
| 3 | Graveyard | pushes the borrowing-cost lever | `IF BORROWING COSTS RISE BY +x pp` (2022–23 Fed hikes ≈ +5 pp shown as a tick) | rates raise interest |
| 4 | Graveyard | watches a firm rise | radio line names the firm and the reason | which firm and why |
| 5 | Graveyard | holds on it to capture | **scare 1** (it fights back), NO SIGNAL, transfer | — |
| 6 | Lab (CAM 12) | sets treatments | new ICR, the price of each cure, survival out of 1,000 futures | cures cost something |
| 7 | Lab | pulls the switch | rescued, or **scare 2** | odds are not promises |
| 8 | Result card | `SAME CURE, NEW FUTURE` / `TRY ANOTHER CURE` / `BACK TO GRAVEYARD` | fan chart of 1,000 futures + one data line | the big picture |

## 4. Story plot (guarantees the flow works with any data)
On load, the default camera is the plot whose front rows contain at least one firm that crosses ICR < 1 at a shock of
+1.00 pp or less, nearest the camera. If none exists, pick the plot with the smallest crossing shock. Recomputed
whenever the data changes. The first radio line points the searchlight at that firm's stone.

## 5. Guidance layer (keep it quiet)
- Always on: REC/camera/plot OSD and the lever console. Nothing else is permanent.
- Task list: four small icons top right (inspect, raise, capture, rescue); the current one blinks; done ones tick.
- Radio line: one line at the bottom, 3 s, replaces every controls hint. Examples:
  `CAM 03 ONLINE. EVERY STONE IS A FIRM. SWEEP THE LIGHT.` / `FALLOWMERE MANUFACTURING CROSSED THE LINE: PROFIT < INTEREST.` /
  `IT'S LOOSE. HOLD THE LIGHT ON IT TO DRAG IT IN.` / `PICK A CURE. EVERY CURE COSTS SOMETHING.`
- Menu keeps Sound, Safe mode, Files (table), Credits, Morgue lab (shortcut).

## 6. The radar function (the data, not just the game)
- **Find a firm**: a search field in the console (name or ticker). Cuts to that plot, points the searchlight at the
  stone, shows its tag. The strongest feature once real data arrives.
- **Camera buttons carry counts**: `CAM 04 · MANUFACTURING · 31 AT RISK` at the current shock.
- **FILES** button next to the console opens the table view (full data, sortable, accessible). Not hidden in the menu.
- **Result card fan chart**: ICR paths of all 1,000 simulated futures over 3 years, the drawn path highlighted, the
  ICR = 1 line marked.
- **Data line** on the result card: `At +x.xx pp, N of M firms can no longer cover their interest.`

## 7. The two scares (same zombie, different kinds)
The captured firm is the patient in the lab and the one that scares on failure: same firm name, same model (three
models: possessed undead, crawler, gaunt), same blood. Model per firm is a deterministic hash.
| | Scare 1: capture (always, first capture only) | Scare 2: failed rescue (only on failure) |
|---|---|---|
| Kind | attack: fast, impact | presence: still, close, revealed in the dark |
| Beat | hold, struggle (shake, growl rising) → at 70 % of the ring it breaks free and lunges | flatline → 3 s false calm → head turns slowly to the lens → lights out 1.5 s → red emergency light: its face is already at the lens, still, staring → scream after 1 s |
| Picture | claws fill the frame, both hands slam the lens, blood handprints smear, frame knocked askew | the face, clear and motionless, large |
| After | NO SIGNAL → reconnect inside the lab, handprints still on the lens | NO SIGNAL → reconnect: the table is empty |
Rules: no other jump scares anywhere (the plot-fall scare is cancelled). Scares must work without sound. Safe mode and
reduced motion: no scares, a short static cut instead. Close-up renders for each model are made from the prototypes.

## 8. Honesty
- Lever wording: "borrowing costs", not "the Fed". All debt reprices at once (state it).
- Firms that cross the line under a shock are **AT RISK** (latest fiscal year only); **ZOMBIE** is kept for the
  three-year definition. The tag says "latest year".
- Sample data is labelled `SAMPLE DATA` everywhere until real data is in.
- The lab uses the real rescue engine (`web/src/engine`), not the prototype's simplified maths.
- Result text says "in this simulated future". Footer: SEC EDGAR; not investment advice. Facts only about real firms.
- Default survival with no treatment is below 15 %, so the viewer has to act.

## 9. Modes and devices
- Safe mode (was "lights on"): no gore, no scares, same data and flow. Offered on the opening screen.
- Reduced motion: no shake, no lunge animation, shorter cuts.
- Phone: tap = turn the searchlight and show the tag; press and hold = capture. Console full width at the bottom.
- Demo mode `?demo`: plays the whole loop automatically (lever, rise, capture, a failed rescue). Used to record the
  video and offered on the opening screen as "watch first".
- Lab assets preload in the background while the viewer is in the graveyard.

## 10. Wait for real data before fixing
Lever range, story-plot rule thresholds, default survival target, colour thresholds of the ICR display. Run a
distribution check on the real `firms_index` first.

## 11. Scope
| Must | Should | Cut |
|---|---|---|
| opening, safe mode, task icons, radio line | camera switcher with counts | liquidation ending |
| graveyard look and rising zombies | overview camera | Watcher, approaching walker, breathing |
| story plot rule | multiple zombies rising at once | plot-fall scare |
| capture + scare 1 | demo mode | extra jump-scare images |
| lab + real engine + scare 2 + result card with fan chart | | |
| find a firm, FILES button | | |
| video, write-up | | |

## 12. Specs (small, one job each)
1. `graveyard-horror-pass`: finish Batch 2b (look) and Batch 3 (rising zombies, unease). Nothing else.
2. `control-room-ui`: opening, safe mode, OSD, task icons, radio line, console with find-a-firm, FILES, camera
   switcher, story plot, capture with scare 1, lab preload.
3. `morgue-lab`: lab scene, real engine wiring, treatments, switch, scare 2, result card with fan chart and data line.
4. `polish-and-demo`: demo mode, phone, README, performance.
Each design document stays short: only what is needed to implement and test.
