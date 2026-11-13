# Experience plan (agreed 2026-11-13, v3: value pass after reviewing the Kiroween 2025 winners)

Reference only. This is the agreed end-to-end experience. Graveyard look values: `graveyard/horror-direction-params.md`.
Graveyard control-room details: `graveyard/control-room-direction.md` (sections on the plot-fall scare and the
case-file card are replaced by this plan). Prototypes: `graveyard/prototype/demo/` (first look-dev) and
`graveyard/prototype/demo-v2/` (current: rise polish, both scares, climax, camera pan). Read only, never imported.
What to port from demo-v2 and where: `graveyard/prototype/demo-v2/PORTING.md`.

## 1. The one thing a judge should remember
"When borrowing costs rise, a set of US firms that were barely alive can no longer pay their interest. Saving them has
a price, and it does not always work."

Who it is for and what it solves (say this in the opening, the README and the first 10 s of the video):
"For students, journalists and retail investors: see which real US public companies could no longer pay their
interest if borrowing costs rise, and what it would take to save them."

Why this matters for judging (2026 criteria: Potential Impact, Technological Implementation, Design, Innovation/Idea,
Presentation): the 2025 Costume Contest winners used the horror to serve a real function (Seance: a quiz-gated history
book; SpookBnB, 3rd overall: horror layered over a working rental site with a light mode that shows the real product).
So every scare here must lead to information, and a plain analyst view must prove the tool under the costume.

## 2. Role
The viewer is the night-shift operator of the Zombie Firm Radar, watching CCTV of a graveyard where every stone is a US
public firm. Mission: find out who rises if borrowing costs go up, capture one, and get it through restructuring before
dawn. Metaphors are stated on screen: stone = firm; rising = can no longer cover interest; surgery = debt
restructuring; dying on the table = failure.

## 3. Flow (about 2 minutes)
| # | Screen | Viewer does | Screen says | Learns |
|---|---|---|---|---|
| 1 | Opening (typed) | `▸ START SHIFT`, `SAFE MODE · NO SCARES` or `DAYLIGHT · ANALYST VIEW` | the one-sentence pitch, role, mission, zombie = ICR < 1 three years running | who it is for, the definition |
| 2 | Graveyard, story plot | first prompt: `FIND A COMPANY YOU KNOW` (or sweep the searchlight over the story plot) | hover tag: name, ICR, status | stone look = health; it is about real firms |
| 3 | Graveyard | pushes the borrowing-cost lever | `IF BORROWING COSTS RISE BY +x pp` (2022–23 Fed hikes ≈ +5 pp shown as a tick) | rates raise interest |
| 4 | Graveyard | watches a firm rise | radio line names the firm and the reason | which firm and why |
| 5 | Graveyard | holds on it to capture | **scare 1** (it fights back), NO SIGNAL, transfer | — |
| 6 | Lab (CAM 12) | sets treatments | new ICR, the price of each cure, survival out of 1,000 futures | cures cost something |
| 7 | Lab | pulls the switch | rescued, or **scare 2** | odds are not promises |
| 8 | Result card | `SAME CURE, NEW FUTURE` / `TRY THE CURE THAT WORKS` / `BACK TO GRAVEYARD` | fan chart of 1,000 futures, the data line, and on failure the autopsy line | why it died, what would have saved it |
| 9 | Dawn shift report | `END SHIFT` (also in the menu any time) | at the current shock: N of M firms, the most exposed sectors, the firms you saved and lost, share link, CSV | the takeaway a judge leaves with |

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
- **Daylight (analyst view)**, opened by the FILES button next to the console and offered on the opening screen: the
  same data with no horror. Sortable table of firms at the current shock (name, ticker, sector, ICR now, ICR at the
  shock, status, debt), a sector summary, CSV export of the current view, and a shareable URL (`?shock=2.00&firm=TICKER`)
  that opens the same state. Switching back returns to the same camera and shock. This is the "light mode" that proves
  the tool under the costume (as SpookBnB did). Accessible: keyboard, screen-reader table, no motion.
- **Result card fan chart**: 10th–90th and 25th–75th percentile bands and the median of ICR over 3 years from the 1,000
  simulated futures, the drawn path as a line, the ICR = 1 line marked. Needs an engine change: `simulate` returns the
  percentiles per year (today it returns only the median).
- **Retry draws a new future**: `seedFrom` today is fixed per firm, treatment and day, so "same cure, new future" would
  repeat the same outcome. Add an attempt number to the seed (engine change with tests).
- **Data line** on the result card: `At +x.xx pp, N of M firms can no longer cover their interest (K of them already
  zombies at 0 pp).` M = shock-eligible firms; N = shock-eligible firms with shocked ICR < 1.
- **Autopsy line** on a failed result (required): why it died (`interest $X > operating profit $Y in year N of this
  future`) and the cheapest cure that would have worked (`hintScan`, e.g. `cutting costs 8 % would have saved it in
  62 % of futures`). `TRY THE CURE THAT WORKS` applies it. Each scare therefore ends in a lesson (like a wrong answer in
  Seance sends you back with the answer to learn).
- **Dawn shift report** (step 9): one screen, also exportable, that sums up the session at the current shock: the data
  line, the three most exposed sectors (share of shock-eligible firms crossing), the firms captured with outcome and
  cure, and the share link. It is the last shot of the video.
- **After a rescue**, back in the graveyard that firm's stone shows intact and its tag says `RESCUED (simulated)` for the
  session.

## 7. The two scares (same zombie, different kinds; built in the 3D scene, see demo-v2)
The captured firm is the patient in the lab and the one that scares on failure: same firm name, same model (three
models: possessed undead, crawler, gaunt), same blood. Model per firm is a deterministic hash (`modelFor`).
| | Scare 1: capture (always, first capture only) | Scare 2: failed rescue (only on failure) |
|---|---|---|
| Kind | front attack: it comes at the lens | disappearance, then a side attack that knocks the camera over |
| Beat | hold 2.4 s: struggle (0 to 35 %, frame shakes) → it goes limp, head hanging (35 %) → silence, it slowly lifts its head to the lens (45 to 75 %) → at 78 % 0.3 s of silence, then 5 stepped jumps toward the lens (2.4, 1.65, 1.08, 0.68, 0.42 m, 0.12 s each, light scaled with distance²) → face at the lens, eyes glowing → impact | flatline → 3 s calm → head turns to the lens (3.0 to 4.2 s) → lights stutter twice; after the second, the table is empty (5.5 s) → lights die, red emergency light (6.7 s) → it enters from the side in 5 stepped jumps (2.2 to 0.52 m) lit red → the camera is knocked over: drops and rolls 80° onto the floor |
| Without sound | impact shake and tilt | darkness, empty table, a red face |
| After | NO SIGNAL → transfer → lab (later captures: plain 1.3 s hold, no scare) | NO SIGNAL → result card with the autopsy line; the table stays empty |
No image overlays (the pre-rendered faces and blood handprints were tried and dropped: they read as stickers).
At the top of the lever with every story-plot zombie risen: all freeze, heads drop, the sound cuts, and 1.1 s later they
all lift their heads to the lens at once with one low hit. Not a jump scare. Releases when the lever comes down.
What can be captured: a firm that is RISEN or ZOMBIE and `rescue_eligible`. Hold on its zombie, or on its stone or torn
mound when no zombie is out (then its zombie claws up in a short rise and fights back). Firms that are not
rescue-eligible show `NO RECORDS · CANNOT TREAT` in the tag and cannot be captured. Other ways in, with no scare:
keyboard (focus a stone, press C), and `SEND TO LAB` in Daylight or the find-a-firm result.
Rules: no other jump scares anywhere. Scares must work without sound. Safe mode and reduced motion: no scares, a short
static cut instead.

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
- Daylight: the analyst view of section 6 (no scene at all). Offered on the opening screen.
- Camera: pans slightly toward the searchlight (yaw 0.075 rad, pitch 0.045 rad at the screen edge) with a slow sway.
- Reduced motion: no shake, no lunge animation, shorter cuts.
- Phone: tap = turn the searchlight and show the tag; press and hold = capture. Console full width at the bottom.
- Demo mode `?demo`: plays the whole loop automatically (lever, rise, capture, a failed rescue). Used to record the
  video and offered on the opening screen as "watch first".
- Lab assets preload in the background while the viewer is in the graveyard.

## 10. Dependencies and order
- The lab needs `/data/firms/{cik}.json` and `/data/macro.json`. In development the sample generator already makes
  firm files, so the lab can be built on sample data; production needs Frank's `data/mock` (due 11/15) or real data (11/22).
- Real data is required (Potential Impact and Innovation reward real public datasets). If nothing from Frank by 11/17,
  Sunny builds a slim EDGAR pipeline with Kiro (fallback).
- `control-room-ui` captures into the existing lab placeholder scene until `morgue-lab` lands.
- Engine changes (percentiles, attempt seed) belong to `morgue-lab`, with property tests.

## 11. Wait for real data before fixing
Lever range, story-plot rule thresholds, default survival target, colour thresholds of the ICR display. Run a
distribution check on the real `firms_index` first.

## 12. Scope
| Must | Should | Cut |
|---|---|---|
| opening with the pitch line, safe mode, task icons, radio line | camera switcher with counts | liquidation ending |
| graveyard look and rising zombies | overview camera | Watcher, approaching walker, breathing |
| story plot rule; find a company first | multiple zombies rising at once | plot-fall scare, image overlays |
| capture + scare 1 | demo mode; max-lever climax | |
| lab + real engine + scare 2 + result card with fan chart + autopsy line | rescued stone shown intact | |
| Daylight analyst view (table, sectors, CSV, share URL) | | |
| dawn shift report | | |
| real data; video, write-up | | |

If time or credits run short, cut in this order: overview camera, multiple simultaneous risers, camera counts, climax,
demo mode (record the video by hand), rescued-stone payoff. Never cut: story firm, find a company, capture, both scares,
real engine, autopsy line, Daylight, shift report.

Credit budget (about 1,600 left after Batch 2b, which cost about 400): horror-pass Batch 3, slimmed ≈ 300;
control-room-ui ≈ 450; morgue-lab ≈ 450; polish-and-demo ≈ 200; reserve ≈ 200. Port from demo-v2 instead of
redesigning; use Auto for porting and edits with exact values, Opus for visual tuning and hard bugs.

## 13. Specs (small, one job each)
1. `graveyard-horror-pass`: Batch 3 only (rising zombies, unease), slimmed, porting the rise polish and the head-facing
   fix from demo-v2. Nothing else.
2. `control-room-ui`, in batches: (a) opening with the pitch line, safe mode, OSD, console, radio line, task icons,
   camera pan; (b) story firm, find-a-company first, Daylight analyst view (table, sectors, CSV, share URL), camera
   switcher with counts; (c) capture with scare 1 (port demo-v2), keyboard and Daylight paths, lab preload, climax.
3. `morgue-lab`, in batches: (a) engine changes (percentiles, attempt seed) with property tests; (b) lab scene, patient
   model matching, treatments wired to the engine; (c) switch, outcomes, scare 2 (port demo-v2), result card with fan
   chart, data line, autopsy line, dawn shift report.
4. `polish-and-demo`: demo mode, phone, README, performance.
Each design document stays short: only what is needed to implement and test.

## 14. Submission (from the 2026 rules and the 2025 winners)
- Category: Costume Contest. Also eligible: Best Demo (all submissions); Best Student Project: Costume Contest only if
  every team member is a student (check with Frank); Blog Post and Social Blitz bonuses (cheap, do both).
- Video (under 3 min), in this order: the problem and who it is for (10 s) → find a known company → lever → rise →
  capture and scare 1 → lab, cure prices → failure, scare 2 → autopsy line → retry with the cure that works → Daylight
  view with the same data → dawn shift report → how Kiro built it (30 s).
- Write-up covers every Kiro feature asked about: specs (batches with STOP tasks), steering, hooks, custom agents
  (scene-critic, finance-reviewer, asset-auditor), MCP (Playwright, context7), property-based testing (engine and scene
  properties, with a bug PBT caught), Kiro powers, and which Kiro apps were tried (IDE, CLI, Web, Crew).
