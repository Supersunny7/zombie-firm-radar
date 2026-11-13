# Experience plan (agreed 2026-11-13, reviewed v2)

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
On load, pick the **story firm** and frame its plot. Candidates: `shock_eligible` and `rescue_eligible` firms that are
not zombies at 0 pp and cross ICR < 1 at +1.00 pp or less. Prefer, in order: untreated survival below 15 % and best
achievable survival (any allowed treatment) above 50 % (so both outcomes are possible); then the smallest crossing shock;
then nearest the front row. If no firm qualifies, relax the rules in that order. Recomputed whenever the data changes.
The first radio line points the searchlight at the story firm's stone. Survival is never tuned by hand: it comes from
the engine and the data; the story-firm rule is how we get an interesting case.

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
- **Result card fan chart**: 10th–90th and 25th–75th percentile bands and the median of ICR over 3 years from the 1,000
  simulated futures, the drawn path as a line, the ICR = 1 line marked. Needs an engine change: `simulate` returns the
  percentiles per year (today it returns only the median).
- **Retry draws a new future**: `seedFrom` today is fixed per firm, treatment and day, so "same cure, new future" would
  repeat the same outcome. Add an attempt number to the seed (engine change with tests).
- **Data line** on the result card: `At +x.xx pp, N of M firms can no longer cover their interest (K of them already
  zombies at 0 pp).` M = shock-eligible firms; N = shock-eligible firms with shocked ICR < 1.
- **Hint** on a failed result: the engine's hint (`hintScan`), e.g. which change would have pushed survival above 50 %.
- **After a rescue**, back in the graveyard that firm's stone shows intact and its tag says `RESCUED (simulated)` for the
  session.

## 7. The two scares (same zombie, different kinds)
The captured firm is the patient in the lab and the one that scares on failure: same firm name, same model (three
models: possessed undead, crawler, gaunt), same blood. Model per firm is a deterministic hash.
| | Scare 1: capture (always, first capture only) | Scare 2: failed rescue (only on failure) |
|---|---|---|
| Kind | attack: fast, impact | presence: still, close, revealed in the dark |
| Beat | hold, struggle (shake, growl rising) → at 70 % of the ring it breaks free and lunges | flatline → 3 s false calm → head turns slowly to the lens → lights out 1.5 s → red emergency light: its face is already at the lens, still, staring → scream after 1 s |
| Picture | claws fill the frame, both hands slam the lens, blood handprints smear, frame knocked askew | the face, clear and motionless, large |
| Works without sound | yes (impact, shake, tilt) | yes (darkness, then a large face) |
| After | NO SIGNAL → reconnect inside the lab, handprints still on the lens | NO SIGNAL → reconnect: the table is empty |
What can be captured: a firm that is RISEN or ZOMBIE and `rescue_eligible`. Hold on its zombie, or on its stone or torn
mound when no zombie is out (then its zombie claws up in a short rise and fights back). Firms that are not
rescue-eligible show `NO RECORDS · CANNOT TREAT` in the tag and cannot be captured. Other ways in, with no scare:
keyboard (focus a stone, press C), and `SEND TO LAB` in FILES or the find-a-firm result.
Rules: no other jump scares anywhere (the plot-fall scare is cancelled). Scares must work without sound. Safe mode and
reduced motion: no scares, a short static cut instead. Close-up renders for each model are made from the prototypes.

## 8. Honesty
- Lever wording: "borrowing costs", not "the Fed". All debt reprices at once (state it).
- Status words: RESTING (healthy), ENDANGERED (status from the data), ZOMBIE (three-year definition), NO DATA, and
  **RISEN** for a firm that crosses ICR < 1 only under the current shock. A RISEN tag says `ICR < 1 at +x.xx pp ·
  latest year only`. (Not "at risk": too close to "endangered".)
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

## 10. Dependencies and order
- The lab needs `/data/firms/{cik}.json` and `/data/macro.json`. In development the sample generator already makes
  firm files, so the lab can be built on sample data; production needs Frank's `data/mock` (due 11/15) or real data (11/22).
- `control-room-ui` captures into the existing lab placeholder scene until `morgue-lab` lands.
- Engine changes (percentiles, attempt seed) belong to `morgue-lab`, with property tests.

## 11. Wait for real data before fixing
Lever range, story-plot rule thresholds, default survival target, colour thresholds of the ICR display. Run a
distribution check on the real `firms_index` first.

## 12. Scope
| Must | Should | Cut |
|---|---|---|
| opening, safe mode, task icons, radio line | camera switcher with counts | liquidation ending |
| graveyard look and rising zombies | overview camera | Watcher, approaching walker, breathing |
| story plot rule | multiple zombies rising at once | plot-fall scare |
| capture + scare 1 | demo mode | extra jump-scare images |
| lab + real engine + scare 2 + result card with fan chart | | |
| find a firm, FILES button | | |
| video, write-up | rescued stone shown intact | |

If time or credits run short, cut in this order: overview camera, multiple simultaneous risers, camera counts, demo mode
(record the video by hand), rescued-stone payoff. Never cut: story firm, capture, both scares, real engine, FILES.

Credit budget (about 2,000 left on 11/13): horror-pass 2b+3 ≈ 450; control-room-ui ≈ 450; morgue-lab ≈ 550;
polish-and-demo ≈ 250; reserve ≈ 300.

## 13. Specs (small, one job each)
1. `graveyard-horror-pass`: finish Batch 2b (look) and Batch 3 (rising zombies, unease). Nothing else.
2. `control-room-ui`, in batches: (a) opening, safe mode, OSD, console, radio line, task icons; (b) story firm,
   find-a-firm, FILES button, camera switcher with counts; (c) capture with scare 1, keyboard and FILES paths, lab preload.
3. `morgue-lab`, in batches: (a) engine changes (percentiles, attempt seed) with tests; (b) lab scene, patient model
   matching, treatments wired to the engine; (c) switch, outcomes, scare 2, result card with fan chart, data line, hint.
4. `polish-and-demo`: demo mode, phone, README, performance.
Each design document stays short: only what is needed to implement and test.
