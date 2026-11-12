# Requirements Document

## Introduction

The graveyard scene is the first screen of Zombie Firm Radar. It shows one headstone per firm from `firms_index.json`, grouped in plots by sector, in a night-time graveyard filmed by a security camera. A flashlight follows the pointer, hovering a stone shows a file card, and an interest-rate slider (0 to +5 pp) makes newly undead firms claw out of their graves.

The visual target is `reference/graveyard/graveyard-rate-shock-3pp.png`. Lighting, fog, camera and post-processing values come from `scene-reference.md` (Graveyard section). Mood, accessibility and gore rules come from `design-system.md`. Capture and sound conventions come from `animation-direction.md`. Assets come only from `web/public/assets` (see `manifest.json`); no asset is added and `CREDITS.md` already lists every file.

Scope boundaries:

- The scene is read-only on data. No change to `data-contract.md`, the JSON Schemas or `/data`.
- The capture interaction (dragging a zombie into the lab) is outside this spec.
- The shock rule is a pure function in `web/src/engine` that reuses the shared `icr()`; presentation lives in `web/src/scenes`, `web/src/fx` and `web/src/ui`.
- The shock status is an approximation built only from `firms_index.json` fields, and the UI says so.

## Glossary

- **Graveyard_Scene**: The React Three Fiber scene in `web/src/scenes/graveyard` that renders plots, stones, props, lights and effects.
- **Firm_Loader**: The module `web/src/data/loader.ts` that supplies the firm list to the Graveyard_Scene, falling back to Dev_Fixtures when `firms_index.json` is absent.
- **Dev_Fixtures**: Seeded mock data in `web/src/dev`, used only for tests, the fps measurement and the `?firms=3000` URL flag.
- **Firm**: One entry of `firms_index.json` with `cik`, `name`, `sector`, `age_years`, `first_filing_year`, `status`, `latest_icr`, `total_debt_usd`, `implied_rate` and `shock_eligible`.
- **Headstone**: The instanced 3D stone that represents one Firm.
- **Stone_Renderer**: The component that draws all Headstones with one InstancedMesh per model.
- **Layout_Engine**: The pure function that assigns each Firm a plot, a position, a rotation, a lean, a scale and a sink depth.
- **Plot**: A group of Headstones of one sector, separated from other plots by paths.
- **Intact_Stone**: Model `sketchfab-small-gravestone-drydoctoregg`, used for `healthy`.
- **Cracked_Stone**: Model `own-headstone-cracked`, used for `endangered`.
- **Broken_Stone**: Model `sketchfab-damaged-tombstone-drydoctoregg`, used for `zombie`.
- **Engraving_Pool**: The fixed pool of at most 13 canvas textures used as decals showing firm name, first filing year and ICR.
- **File_Card**: The small panel that shows name, sector, ICR, debt and status reason for one Firm.
- **Shock_Slider**: The control that sets the rate shock delta from 0 to 0.05 (0 to +5 pp) in steps of 0.0025 (0.25 pp).
- **Shock_Model**: The pure function in `web/src/engine` that computes the shocked ICR and the newly undead flag for a Firm and a delta.
- **Newly_Undead**: A Firm that is not `zombie` at delta 0 and is classed undead by the Shock_Model at the chosen delta.
- **Already_Undead**: A Firm whose status is `zombie` at delta 0.
- **Risen_Counter**: The HUD counter "Risen from the grave: N", where N is the number of Newly_Undead Firms.
- **Mound**: The pile of excavated soil in front of a Headstone.
- **Craggle_Hand**: The model of the Craggle hand that rises from a Mound.
- **Hand_Budget**: The maximum of 8 Craggle_Hands animating at once.
- **Flashlight**: The spot light attached to the camera that aims at the pointer's ray hit.
- **CCTV_Pass**: The post-processing chain (grain, vignette, scanlines, desaturation, chromatic aberration, bloom, rare glitch).
- **Ground_Fog**: The three horizontal noise fog layers at y = 0.1, 0.38 and 0.8 m.
- **Lights_Mode**: The intensity mode, either "lights off" (full horror) or "lights on" (no blood, no jump scare, brighter).
- **Reduced_Motion**: The state in which the user agent reports `prefers-reduced-motion: reduce`.
- **Audio_Engine**: The Web Audio module that plays wind, crows, digging and gate sounds.
- **Interaction_Gate**: The first user gesture (pointer, key or touch) on the page, required before audio starts.
- **Table_View**: The existing accessible table in `web/src/ui/table/TableView.tsx`.
- **Settings_Menu**: The existing menu in `web/src/ui/SettingsMenu.tsx`.
- **Credits_Dialog**: The modal dialog that renders the text of `CREDITS.md`.
- **Camera_Rig**: The component that frames one Plot at a time or all Plots in the overview.
- **HUD**: The overlay in `web/src/ui/Hud.tsx` and its sibling panels.
- **Mutant**: The model `zombie mutant` placed far behind the last row.
- **Greenall_Corpse**: The Greenall corpse model lying half out of one grave.
- **Reference_Frame**: The screenshot `reference/graveyard/graveyard-rate-shock-3pp.png`.

## Requirements

### Requirement 1: Load firms with a fixture fallback

**User Story:** As a developer, I want the scene to load firms from one place with a safe fallback, so that the scene runs before the pipeline data exists.

#### Acceptance Criteria

1. WHEN the Graveyard_Scene mounts, THE Firm_Loader SHALL request `firms_index.json` once and supply its Firm list to the Graveyard_Scene, preserving the file's firm order and including every firm in the file.
2. IF `firms_index.json` cannot be loaded (network failure, a non-success response, a response body that is not valid JSON, or a response whose firm list does not satisfy the field types of `firms_index.schema.json`), THEN THE Firm_Loader SHALL supply Firms from Dev_Fixtures and THE HUD SHALL show the text "Sample data" within 500 ms of the failure, and THE Graveyard_Scene SHALL keep running without an unhandled error.
3. WHERE the URL query contains `firms=3000`, THE Firm_Loader SHALL supply exactly 3,000 Firms from the seeded Dev_Fixtures generator instead of requesting `firms_index.json`, and THE HUD SHALL show the text "Sample data".
4. WHERE the URL query contains a `firms` value other than `3000`, THE Firm_Loader SHALL ignore the `firms` value and follow criteria 1 and 2.
5. WHEN the Dev_Fixtures generator runs twice with the same seed and the same firm count, THE Dev_Fixtures generator SHALL produce Firm lists that are deeply equal, with the same Firms in the same order and the same field values.
6. THE Dev_Fixtures generator SHALL produce Firms whose fields satisfy the types and enumerations of `firms_index.schema.json`, using `null` for missing values only in the nullable fields `ticker`, `latest_icr`, `total_debt_usd` and `implied_rate`, and giving each Firm a unique 10-digit zero-padded `cik`.
7. THE Graveyard_Scene SHALL NOT create, modify or delete any file under the `/data` directory.

### Requirement 2: Shared shock rule in the engine

**User Story:** As an analyst, I want the shock status computed by one pure function that reuses the shared ICR, so that the graveyard agrees with the zombie definition.

#### Acceptance Criteria

1. THE Shock_Model SHALL reside in `web/src/engine` and SHALL import neither React nor three.js.
2. WHEN the Shock_Model is called with a Firm and a delta, THE Shock_Model SHALL compute the shocked ICR by calling the shared `icr()` with EBIT and shocked interest, where EBIT equals `latest_icr * implied_rate * total_debt_usd` and shocked interest equals `total_debt_usd * (implied_rate + delta)`.
3. IF `latest_icr`, `total_debt_usd` or `implied_rate` is `null`, or `shock_eligible` is false, THEN THE Shock_Model SHALL return a result with `shock_eligible` set to false, SHALL return the Firm status unchanged, and SHALL return no shocked ICR value.
4. IF delta is below 0, is greater than 0.05, or is not a finite number, THEN THE Shock_Model SHALL return a typed error identifying delta as invalid and SHALL return no status or ICR.
5. IF shocked interest is 0 or negative, or `icr()` returns null for the shocked inputs, THEN THE Shock_Model SHALL return a result flagged as not shock-eligible, SHALL return the Firm status unchanged, and SHALL return no shocked ICR value.
6. WHEN a Firm is not `zombie` at delta 0, has `age_years` of at least 10, has `latest_icr` below 1 and has a shocked ICR below 1, THE Shock_Model SHALL flag the Firm as Newly_Undead.
7. WHEN a Firm has status `zombie`, THE Shock_Model SHALL keep the Firm undead at every delta from 0 to 0.05 inclusive.
8. WHEN delta equals 0, THE Shock_Model SHALL return for every Firm the same status and ICR as the unshocked input.
9. FOR ALL Firms with EBIT of at least 0 and delta of at least 0, THE Shock_Model SHALL return a shocked ICR that is not higher than the unshocked ICR.
10. FOR ALL Firm lists and every pair delta_a below delta_b, THE Shock_Model SHALL return a count of undead Firms at delta_b that is not lower than at delta_a.
11. FOR ALL Firms and every pair delta_a below delta_b, THE Shock_Model SHALL return a status at delta_b that is not better than the status at delta_a, with the order healthy better than endangered better than undead.
12. THE Shock_Model SHALL be covered by Vitest and fast-check property tests for criteria 8 to 11, each running at least 100 generated cases.
13. THE Graveyard_Scene SHALL NOT reimplement the ICR division outside the shared `icr()`.
14. THE HUD SHALL display the label "Approximation based on index data; simplified rate shock" next to the Shock_Slider.

### Requirement 3: Plot layout by sector

**User Story:** As a viewer, I want firms grouped by sector in plots with paths between them, so that I can find a company's neighbours.

#### Acceptance Criteria

1. THE Layout_Engine SHALL assign every Firm in the input Firm list to exactly one Plot, such that all Firms with the same `sector` value share the same Plot and Firms with different `sector` values are in different Plots.
2. THE Layout_Engine SHALL place every Headstone so that the minimum distance between the edges of its footprint and the footprint edges of every other Headstone in the same Plot is at least 0.15 m.
3. THE Layout_Engine SHALL leave a path at least 1.2 m wide, measured as the minimum distance between the boundaries of any two adjacent Plots.
4. WHEN the Layout_Engine runs twice on the same Firm list in the same order, THE Layout_Engine SHALL return identical positions, rotations, leans and scales, with every numeric value equal to the bit.
5. THE Layout_Engine SHALL set each Headstone height to a value in the range 0.85 m to 1.6 m, mapped linearly on the base-10 logarithm of `total_debt_usd` between the lowest and highest `total_debt_usd` values in the input Firm list.
6. IF `total_debt_usd` is `null`, zero or negative, THEN THE Layout_Engine SHALL set the Headstone height to 0.85 m.
7. THE Layout_Engine SHALL set each Headstone width to a value in the range 0.62 m to 0.88 m.
8. IF the Firm list is empty, THEN THE Layout_Engine SHALL return an empty layout without raising an error.
9. WHEN a Firm has status `endangered` or `zombie`, THE Layout_Engine SHALL apply a lean angle greater than the maximum lean angle applied to any Firm with status `healthy` or `insufficient_data`.
10. THE Layout_Engine SHALL sink every Headstone into the ground by a depth in the range 15 percent to 20 percent of its height.
11. THE Layout_Engine SHALL be a pure function that has no React or three.js imports and does not modify its input Firm list.

### Requirement 4: Instanced headstones by status

**User Story:** As a viewer, I want each stone's shape to show its status, so that status is readable without colour.

#### Acceptance Criteria

1. THE Stone_Renderer SHALL render each Firm with `healthy` status using the Intact_Stone model, each Firm with `endangered` status using the Cracked_Stone model, and each Firm with `zombie` status using the Broken_Stone model.
2. THE Stone_Renderer SHALL render each Firm with `insufficient_data` status using the Intact_Stone model with its instance colour multiplied by 0.45 on each of the red, green and blue channels.
3. THE Stone_Renderer SHALL draw each of the three models with exactly one InstancedMesh, so that the Graveyard_Scene contains exactly 3 stone InstancedMesh objects regardless of Firm count.
4. THE Stone_Renderer SHALL place the thin bent flap near the base of the Broken_Stone and Intact_Stone models below the ground plane, using the sink depth from Requirement 3, so that no part of the flap is visible above the ground plane.
5. WHEN the shock delta changes and a Firm becomes Newly_Undead, THE Stone_Renderer SHALL swap that Firm's instance to the Broken_Stone model within 1000 ms of the shock delta change.
6. WHEN the shock delta changes and a Firm that was Newly_Undead is no longer Newly_Undead, THE Stone_Renderer SHALL restore that Firm's instance to the model for its unshocked status within 1000 ms of the shock delta change.
7. WHILE the Graveyard_Scene renders 3,000 Firms, THE Graveyard_Scene SHALL sustain a frame rate of at least 50 frames per second, averaged over a 10 s window, on the measurement machine described in Requirement 21.
8. WHEN the Stone_Renderer loads a model, THE Stone_Renderer SHALL load that model exactly once per page session and SHALL load only models listed in `manifest.json`.
9. IF a model required by the Stone_Renderer is absent from `manifest.json` or fails to load, THEN THE Stone_Renderer SHALL render no instances for that model, SHALL keep rendering the other models, and SHALL report an error indicating which model failed.

### Requirement 5: Engraving decals on nearby stones

**User Story:** As a viewer, I want to read a firm's name, filing year and ICR on the stone near me, so that I can identify it in the scene.

#### Acceptance Criteria

1. WHEN the pointer starts hovering a Headstone, THE Graveyard_Scene SHALL draw an engraving decal on that Headstone showing the firm name, the first filing year as a 4-digit year, and the ICR rounded to 2 decimal places.
2. WHEN the pointer starts hovering a Headstone, THE Graveyard_Scene SHALL also draw engraving decals on the 12 other Headstones with the smallest perpendicular distance to the pointer ray, so that up to 13 Headstones carry an engraving.
3. IF fewer than 12 other Headstones exist in the scene, THEN THE Graveyard_Scene SHALL draw engravings on all existing Headstones and SHALL NOT report an error.
4. THE Engraving_Pool SHALL contain at most 13 canvas textures at any time.
5. WHEN the hovered Headstone changes, THE Graveyard_Scene SHALL rebuild the Engraving_Pool for the new set of up to 13 Headstones, and SHALL release the canvas textures of Headstones that are no longer in the set within the same rebuild.
6. WHILE no Headstone is hovered, THE Graveyard_Scene SHALL keep the previously drawn engravings unchanged until the pointer hovers a different Headstone.
7. IF `latest_icr` is `null`, THEN THE Graveyard_Scene SHALL show the text "ICR n/a" in place of the ICR value on that engraving.
8. THE Graveyard_Scene SHALL render the firm name in Cormorant Garamond and the first filing year and ICR in JetBrains Mono.
9. IF Cormorant Garamond or JetBrains Mono is not loaded when an engraving is drawn, THEN THE Graveyard_Scene SHALL draw the engraving with a generic serif font for the name and a generic monospace font for the year and ICR, and SHALL keep the text legible.
10. WHEN a Firm has status `endangered`, THE Graveyard_Scene SHALL draw a visible crack on that Firm's engraving.

### Requirement 6: Blood decals only in lights off

**User Story:** As a player who wants a gentler view, I want blood only in lights-off mode, so that lights on is an accessible mode.

#### Acceptance Criteria

1. WHILE Lights_Mode is "lights off", THE Graveyard_Scene SHALL draw at least 1 and at most 5 blood decals on each Headstone whose Firm has status `zombie` or is a Newly_Undead Firm.
2. WHILE Lights_Mode is "lights on", THE Graveyard_Scene SHALL draw 0 blood decals on every Headstone.
3. WHEN Lights_Mode changes, THE Graveyard_Scene SHALL show or remove all blood decals within 1 s of the change, such that the number of visible blood decals is 0 after a change to "lights on" and matches criterion 1 after a change to "lights off".
4. THE Graveyard_Scene SHALL draw 0 blood decals on every Headstone whose Firm has status `endangered`, `healthy` or `insufficient_data` and is not a Newly_Undead Firm, in both Lights_Mode values.
5. WHEN the slider-driven shock changes a Firm to or from the Newly_Undead state while Lights_Mode is "lights off", THE Graveyard_Scene SHALL add or remove that Headstone's blood decals within 1 s.

### Requirement 7: Ground, mounds, sky and environment

**User Story:** As a viewer, I want a believable night ground and sky, so that the scene reads as a real graveyard.

#### Acceptance Criteria

1. THE Graveyard_Scene SHALL render the ground with the Poly Haven excavated soil wall material at 2k resolution (2048 x 2048 pixel textures).
2. THE Graveyard_Scene SHALL extend the ground so that its nearest edge is at least 1.5 times the fog distance from the camera, so that no horizon line is visible in any camera position allowed by the camera controls.
3. WHILE lights off is active, THE Graveyard_Scene SHALL set the fog colour to `#171b21` with FogExp2 density 0.085.
4. WHILE lights on is active, THE Graveyard_Scene SHALL set the fog colour to `#171b21` with FogExp2 density 0.05.
5. THE Graveyard_Scene SHALL use the `polyhaven-moonlit-golf` HDRI as the background, at intensity 0.045 WHILE lights off is active and 0.12 WHILE lights on is active.
6. THE Graveyard_Scene SHALL light the environment at intensity 0.05 WHILE lights off is active and 0.3 WHILE lights on is active.
7. THE Graveyard_Scene SHALL add one shadow-casting directional moon light of colour `#8ea9d6` positioned at (-14, 18, -22), at intensity 0.12 WHILE lights off is active and 0.7 WHILE lights on is active.
8. THE Graveyard_Scene SHALL add one hemisphere light of sky colour `#3a4a66` and ground colour `#0b0806`, at intensity 0.03 WHILE lights off is active and 0.35 WHILE lights on is active.
9. THE Graveyard_Scene SHALL use ACES tone mapping.
10. WHEN a Firm is `zombie` or Newly_Undead, THE Graveyard_Scene SHALL place exactly one Mound in front of that Firm's Headstone, and SHALL place no Mound in front of the Headstone of any other Firm.
11. THE Graveyard_Scene SHALL render Ground_Fog as three layers at y = 0.1 m, 0.38 m and 0.8 m with colour `#2b323c`, at base opacity 0.42, 0.26 and 0.12 respectively WHILE lights off is active, and 0.26, 0.16 and 0.08 respectively WHILE lights on is active.
12. WHEN the shock delta changes within 0 to +5 percentage points (0 to 0.05), THE Graveyard_Scene SHALL set each Ground_Fog layer opacity to base opacity x (1 + 0.5 x delta / 0.05), so that opacity equals the base at delta 0 and 1.5 times the base at +5 pp.
13. IF the soil material textures or the HDRI fail to load, THEN THE Graveyard_Scene SHALL keep rendering with a flat ground colour of `#0b0806` and the fog colour as background, and SHALL show a non-blocking notice that an environment asset failed to load.

### Requirement 8: Hand-placed props

**User Story:** As a viewer, I want props placed by hand around the plots, so that the graveyard feels composed.

#### Acceptance Criteria

1. THE Graveyard_Scene SHALL place exactly one iron gate behind the last row of Plots, at a depth farther from the camera than every Plot and facing the camera.
2. THE Graveyard_Scene SHALL place exactly one gothic statue, exactly one dead tree trunk, at least 2 and at most 8 stumps, at least 10 and at most 60 scattered rubble stones, and at least 2 and at most 10 cobweb cards, each at a fixed position and rotation read from one props file, so that two page loads show every prop at identical positions.
3. THE Graveyard_Scene SHALL place exactly one lantern with a point light of colour `#ff9a4a`, so that the point light has a positive intensity and a finite range.
4. THE Graveyard_Scene SHALL load only models, textures and cards that are listed in `manifest.json`.
5. IF a model, texture or card referenced by the props file is not listed in `manifest.json`, THEN THE Graveyard_Scene SHALL skip that prop, keep rendering all other props and Plots, and report the unlisted asset name in the developer console.
6. IF a prop fails to load, THEN THE Graveyard_Scene SHALL omit that prop, keep rendering all other props and Plots, and report the failed asset name in the developer console.
7. WHEN the first frame has rendered, THE Graveyard_Scene SHALL begin loading the props and the 2k sky HDRI within 100 ms.
8. WHILE the 2k sky HDRI has not finished loading, THE Graveyard_Scene SHALL show the 1k environment HDRI.
9. WHEN the 2k sky HDRI has finished loading, THE Graveyard_Scene SHALL replace the 1k environment HDRI with it without a blank frame, meaning no rendered frame shows a missing environment.
10. THE Graveyard_Scene SHALL keep the initial download at or below 25 MB (25 × 1,000,000 bytes), counting every byte transferred before the first frame has rendered and excluding the props and the 2k sky HDRI that load after it.

### Requirement 9: Mutant and corpse

**User Story:** As a viewer, I want hidden creatures in the dark, so that the graveyard rewards exploration.

#### Acceptance Criteria

1. THE Graveyard_Scene SHALL place the Mutant at a distance of at least 20 scene units behind the center of the last row of Plots, measured along the row-depth axis away from the initial camera position.
2. WHILE the Flashlight cone does not cover the Mutant, THE Graveyard_Scene SHALL keep the Mutant invisible in the rendered frame, including under Lights_Mode "lights on" and "lights off".
3. WHEN the Flashlight cone begins to cover any part of the Mutant, THE Graveyard_Scene SHALL render the Mutant visible within 100 ms.
4. WHEN the Flashlight cone stops covering the Mutant, THE Graveyard_Scene SHALL render the Mutant invisible within 100 ms.
5. THE Graveyard_Scene SHALL emit no audio cue, including no positional audio, when the Mutant becomes visible or invisible.
6. THE Graveyard_Scene SHALL place the Greenall_Corpse lying with approximately half of its body length (50% ± 10%) outside the grave opening of the `zombie` Headstone whose position is nearest to the initial camera position, measured by straight-line distance.
7. IF no Headstone has the status `zombie`, THEN THE Graveyard_Scene SHALL omit the Greenall_Corpse and SHALL still render all Plots and the Mutant without error.
8. WHILE Lights_Mode is "lights on", THE Graveyard_Scene SHALL render the Mutant and the Greenall_Corpse with no blood geometry, blood textures or blood particle effects visible.

### Requirement 10: Flashlight and camera

**User Story:** As a viewer, I want to explore with a flashlight that follows my pointer, so that the darkness feels real.

#### Acceptance Criteria

1. THE Flashlight SHALL use colour `#fff1d6`, intensity 240, distance 34, angle 0.32 rad, penumbra 0.5, decay 1.7 and shadow casting.
2. THE Flashlight SHALL attach to the camera at offset (0.28, -0.32, 0.1) in camera-local units (metres).
3. WHILE the pointer is over the Graveyard_Scene canvas, THE Flashlight SHALL aim at the first scene surface hit by a ray cast from the camera through the pointer position, updated on every rendered frame.
4. IF the pointer ray hits no scene surface or the pointer is outside the canvas, THEN THE Flashlight SHALL keep aiming at its most recent valid target, or at (0, 0.2, -2) if no valid target exists yet.
5. THE Flashlight SHALL flicker by at most 6 percent of its base intensity of 240 (range 225.6 to 254.4) and SHALL NOT exceed 3 flicker events per second, measured over any 1-second window.
6. THE Graveyard_Scene SHALL add an additive volumetric cone of opacity 0.11 that follows the Flashlight position and aim on every rendered frame.
7. THE Camera_Rig SHALL use a perspective camera of field of view 52 degrees at position (0, 2.15, 9.4) as the initial pose.
8. THE Camera_Rig SHALL smooth the camera look target toward (pointer.x * 3.2, 0.2 + pointer.y * 1.3, -2), where pointer.x and pointer.y are normalised device coordinates in the range -1 to 1, and SHALL reach within 5 percent of a new target within 1 second of a pointer change.
9. WHILE Reduced_Motion is false, THE Camera_Rig SHALL apply handheld sway of 0.035 m amplitude in lights off and 0.02 m in lights on.
10. WHILE Reduced_Motion is true, THE Camera_Rig SHALL apply no sway and SHALL cut between poses instantly (within a single frame, with no interpolation).
11. WHILE Lights_Mode is "lights on", THE Flashlight SHALL remain active with the same parameters as in lights off.

### Requirement 11: One graveyard, one plot at a time

**User Story:** As a viewer, I want the camera to frame one plot at a time, so that I can read stones without getting lost.

#### Acceptance Criteria

1. THE Camera_Rig SHALL frame exactly one Plot at a time, except while showing the overview (see criterion 3).
2. WHEN the user selects a sector chip, THE Camera_Rig SHALL move to the Plot of that sector and THE HUD SHALL update the plot label to that Plot within 100 ms of the selection.
3. WHEN the user activates "← Overview", THE Camera_Rig SHALL pull back to a pose in which all Plots are fully inside the viewport.
4. WHEN the user presses the Left or Right arrow key and no Headstone is focused, THE Camera_Rig SHALL move to the previous or next Plot respectively, in Plot number order.
5. IF the user presses the Left arrow key while the first Plot is framed, or the Right arrow key while the last Plot is framed, THEN THE Camera_Rig SHALL remain on the current Plot and SHALL NOT wrap around.
6. WHILE a Plot is framed, THE HUD SHALL show "REC · CAM 03", the label "PLOT {n} — {SECTOR} · {count} GRAVES" with {n} as the 1-based Plot number and {count} as the number of Headstones in that Plot, and a timestamp that advances once per second.
7. WHILE the Camera_Rig shows the overview, THE HUD SHALL show "REC · CAM 03", the running timestamp, and the label "OVERVIEW · {plot count} PLOTS" in place of the plot label.
8. WHILE Reduced_Motion is false, THE Camera_Rig SHALL complete each move between poses within 1.5 s.
9. WHILE Reduced_Motion is true, THE Camera_Rig SHALL move to the target pose without an animated transition, within 100 ms of the triggering input.

### Requirement 12: File card on hover and focus

**User Story:** As a viewer, I want a small card with the firm's facts when I hover a stone, so that I can read the data behind the horror.

#### Acceptance Criteria

1. WHEN the pointer enters a Headstone, THE HUD SHALL show the File_Card for that Firm within 100 ms.
2. WHEN a Headstone receives keyboard focus, THE HUD SHALL show the File_Card for that Firm within 100 ms.
3. WHEN the pointer leaves a Headstone and no other Headstone is hovered or focused, THE HUD SHALL hide the File_Card within 100 ms.
4. WHEN the pointer moves directly from one Headstone to another, THE HUD SHALL show only the File_Card of the newly hovered Firm and SHALL NOT show more than one File_Card at a time.
5. THE File_Card SHALL show the firm name, sector, ICR (as a number with 2 decimal places), total debt (in USD, abbreviated with a unit suffix such as K, M or B), status as text, and the status reasons.
6. IF `latest_icr` is `null`, THEN THE File_Card SHALL show "n/a" for the ICR field.
7. IF `total_debt_usd` is `null`, THEN THE File_Card SHALL show "n/a" for the total debt field.
8. WHEN a Firm has status `insufficient_data`, THE File_Card SHALL show the text "not enough data" in the status reasons area.
9. WHEN a Firm is Newly_Undead, THE File_Card SHALL show the text "undead under this rate shock" and the shocked ICR (as a number with 2 decimal places).
10. THE File_Card SHALL show status as text and SHALL NOT rely on colour alone to convey it.
11. THE File_Card SHALL dock to the right edge or the bottom edge of the viewport and SHALL NOT overlap the screen area occupied by the Headstone it describes.
12. THE File_Card SHALL use the status colours defined in `design-system.md` with a text contrast ratio of at least 4.5:1 against the card panel background.
13. THE HUD SHALL show the footer "Data: SEC EDGAR. Not investment advice." at all times while the graveyard is displayed.

### Requirement 13: Rate shock slider and counters

**User Story:** As an investor, I want to raise interest rates and see which firms rise, so that I understand rate sensitivity.

#### Acceptance Criteria

1. THE Shock_Slider SHALL accept values from 0.00 pp to +5.00 pp inclusive in steps of 0.25 pp, giving 21 selectable values, and SHALL have an initial value of 0.00 pp.
2. THE HUD SHALL show the text "IF INTEREST RATES RISE BY +{delta} pp" where {delta} is the current Shock_Slider value formatted with exactly two decimal places (for example "+3.00 pp" and "+0.00 pp").
3. WHEN the Shock_Slider value changes, THE Graveyard_Scene SHALL recompute the status of all Firms through the Shock_Model and update the Risen_Counter, the Already_Undead count and the not-shock-eligible count within 100 ms for a dataset of 3,000 Firms, measured from the value change to the updated counters being rendered.
4. THE Risen_Counter SHALL display an integer equal to the number of Newly_Undead Firms, where a Newly_Undead Firm is a Firm whose status is not "zombie" at delta 0 and is "zombie" at the current delta.
5. THE HUD SHALL display a second line "{N} already undead" where N is an integer equal to the number of Already_Undead Firms, meaning Firms whose status is "zombie" at delta 0.
6. IF one or more Firms are not shock-eligible, THEN THE HUD SHALL display the line "{N} not shock-eligible" where N is the integer count of those excluded Firms, and THE Shock_Model SHALL exclude those Firms from the Newly_Undead count.
7. WHERE a user interacts with the Shock_Slider, THE Shock_Slider SHALL expose an accessible name, SHALL expose a value text in the form "+{delta} percentage points" with two decimals (for example "+3.00 percentage points"), and SHALL change its value by 0.25 pp on Arrow Left/Down (decrease) and Arrow Right/Up (increase), set it to 0.00 pp on Home and to +5.00 pp on End, without moving beyond those bounds.
8. THE HUD SHALL display the text "Debt reprices at once; simplified model" within the same HUD panel as the Shock_Slider at all times.
9. THE Shock_Slider value SHALL be held in the zustand store as a single shared value, so that WHEN it changes, Table_View and Graveyard_Scene both reflect the same value on the next render.

### Requirement 14: Craggle hands rising

**User Story:** As a viewer, I want newly undead firms to claw out of their graves, so that the shock is visible in the scene.

#### Acceptance Criteria

1. WHEN a Firm becomes Newly_Undead, THE Graveyard_Scene SHALL place one Mound directly in front of that Firm's Broken_Stone, on the side facing the camera's default viewpoint, within 1 s of the status change.
2. THE Graveyard_Scene SHALL use only the Craggle_Hand model for rising hands and SHALL NOT load or render the Ruella hand model.
3. THE Graveyard_Scene SHALL animate at most 8 Craggle_Hands at the same time, per the Hand_Budget.
4. WHEN more than 8 Firms are Newly_Undead, THE Graveyard_Scene SHALL animate the 8 Craggle_Hands whose Headstones are nearest the camera, measured by straight-line distance from the camera position to the Headstone base, and SHALL give every other Newly_Undead Firm a Mound and a Broken_Stone without a hand.
5. WHEN two Newly_Undead Firms have equal camera distance at a Hand_Budget assignment, THE Graveyard_Scene SHALL give the hand to the Firm with the lower CIK in ascending string order.
6. WHEN the camera moves, THE Graveyard_Scene SHALL reassign the Hand_Budget to the 8 nearest Newly_Undead Firms within 1 s of the camera coming to rest, and SHALL NOT show more than 8 Craggle_Hands at any frame during the reassignment.
7. WHEN a Newly_Undead Firm falls back below the shock threshold, THE Graveyard_Scene SHALL lower its Craggle_Hand and remove its Mound within 2 s, and SHALL free its Hand_Budget slot for the nearest Newly_Undead Firm without a hand.
8. WHILE Reduced_Motion is true, THE Graveyard_Scene SHALL show each Craggle_Hand at its final raised pose in the first rendered frame after assignment, without a rising animation.
9. WHEN a Craggle_Hand starts rising, THE Graveyard_Scene SHALL emit exactly one rise event for that hand, and THE Audio_Engine SHALL consume that event once, producing one rise sound per hand.
10. IF the Craggle_Hand model fails to load, THEN THE Graveyard_Scene SHALL still place the Mound and Broken_Stone for each Newly_Undead Firm, SHALL render no hand, SHALL emit no rise events, and SHALL keep the scene running.

### Requirement 15: CCTV post-processing

**User Story:** As a viewer, I want the picture to look like a security camera, so that the theme is clear.

#### Acceptance Criteria

1. WHILE Lights_Mode is "lights off", THE CCTV_Pass SHALL apply film grain of 0.11, desaturation of 0.45 and a vignette of 1.15 to every rendered frame.
2. WHILE Lights_Mode is "lights on", THE CCTV_Pass SHALL apply film grain of 0.05, desaturation of 0.3 and a vignette of 0.95 to every rendered frame.
3. THE CCTV_Pass SHALL apply chromatic aberration of 0.0022 and horizontal scanlines to every rendered frame, with scanline opacity of at most 0.15 on a 0 to 1 scale.
4. WHERE the low quality toggle is off, THE CCTV_Pass SHALL apply bloom with strength 0.55, radius 0.6 and threshold 0.82 and chromatic aberration of 0.0022.
5. WHILE Lights_Mode is "lights off" and Reduced_Motion is false, THE CCTV_Pass SHALL apply a tracking glitch lasting at most 0.4 s, starting at random intervals between 20 s and 60 s after the previous glitch ended, with the first glitch starting between 20 s and 60 s after the mode became active.
6. WHILE Lights_Mode is "lights on" or Reduced_Motion is true, THE CCTV_Pass SHALL apply no tracking glitch.
7. IF Lights_Mode changes to "lights on" or Reduced_Motion changes to true while a tracking glitch is in progress, THEN THE CCTV_Pass SHALL end the glitch within one frame and schedule no further glitch.
8. THE CCTV_Pass SHALL NOT alter the pixels of HUD text, which is rendered in the HTML layer above the canvas, and every glitch, grain and scanline effect SHALL be confined to the 3D canvas.
9. WHERE the low quality toggle is on, THE CCTV_Pass SHALL disable bloom and chromatic aberration and SHALL continue to apply grain, desaturation, vignette and scanlines at the values defined in criteria 1 to 3.

### Requirement 16: Sound

**User Story:** As a viewer, I want ambient sound that starts only after I interact, so that the browser does not surprise me.

#### Acceptance Criteria

1. WHILE the Interaction_Gate has not occurred, THE Audio_Engine SHALL play no sound and SHALL create no audible output.
2. WHEN the Interaction_Gate occurs and the Audio_Engine is not muted, THE Audio_Engine SHALL start the `freesound-tomhannen-howling-wind-tower` wind loop within 500 ms and SHALL repeat it without a silent gap longer than 100 ms until the Graveyard_Scene unmounts or the Audio_Engine is muted.
3. WHILE the Graveyard_Scene is active and the Audio_Engine is not muted, THE Audio_Engine SHALL play `freesound-giddster-crows-cawing` once per interval, with each interval drawn at random from 20 s to 60 s inclusive, and SHALL start the first interval when the Interaction_Gate occurs.
4. WHEN a Craggle_Hand starts rising and the Audio_Engine is not muted, THE Audio_Engine SHALL play `freesound-guyburns-digging-with-shovel` exactly once for that hand, within 200 ms of the rise starting.
5. WHEN the user leaves the Graveyard_Scene and the Audio_Engine is not muted, THE Audio_Engine SHALL play `freesound-launemax-open-close-iron-gate` exactly once.
6. WHEN the user activates the Sound button, THE Audio_Engine SHALL toggle between muted and unmuted for all sounds within 100 ms, AND THE Sound button SHALL show the text "Sound on" while unmuted and "Sound off" while muted.
7. THE Audio_Engine SHALL apply identical audio behaviour (same sounds, triggers and timings) in Reduced_Motion and in standard motion.
8. WHILE the Audio_Engine is muted, THE Audio_Engine SHALL play no sound, including digging triggered by a rising hand, and SHALL NOT queue or replay sounds that were triggered during muting once it is unmuted.
9. WHEN the Graveyard_Scene unmounts, THE Audio_Engine SHALL stop the wind loop and cancel the crow timer within 200 ms, and no crow sound SHALL start after the unmount.
10. THE Audio_Engine SHALL load only audio files listed in `manifest.json`.
11. IF an audio file fails to load or decode, THEN THE Audio_Engine SHALL skip that sound, keep all other sounds working, and keep the scene running without showing an error to the user.
12. IF the browser blocks audio playback after the Interaction_Gate has occurred, THEN THE Sound button SHALL show "Sound off" and THE Audio_Engine SHALL retry starting audio on the next activation of the Sound button.

### Requirement 17: Lights off, lights on and reduced motion

**User Story:** As a player with sensory needs, I want a bright, calm mode and reduced motion, so that I can use the app comfortably.

#### Acceptance Criteria

1. THE HUD SHALL provide one button that toggles Lights_Mode between "lights off" and "lights on", and the button label SHALL name the mode the button will switch to ("Lights on" while the mode is "lights off", "Lights off" while the mode is "lights on").
2. WHEN the player activates the Lights_Mode button, THE Graveyard_Scene SHALL apply the new Lights_Mode within 500 ms, without reloading the page and without changing the selected firm, the Shock_Slider value or the camera position.
3. WHILE Lights_Mode is "lights on", THE Graveyard_Scene SHALL show the same firms, statuses, figures and labels as in "lights off", using the brighter lighting, fog and exposure values defined in `scene-reference.md`.
4. WHILE Lights_Mode is "lights on", THE Graveyard_Scene SHALL show no blood effects, no jump scares and no glitch effects.
5. WHILE Reduced_Motion is true, THE Graveyard_Scene SHALL apply no camera sway, no glitch effects and camera cuts that complete in 0 ms (instant, with no interpolated movement).
6. THE Graveyard_Scene SHALL emit no more than 3 flashes in any 1-second window, where a flash is a pair of opposing luminance changes covering more than 25% of the viewport at a relative luminance change greater than 10%.
7. THE Graveyard_Scene SHALL show each firm's status through three channels at once: the Headstone shape, a text label naming the status ("zombie", "endangered", "healthy" or "insufficient data"), and colour, with each status having a distinct Headstone shape and a distinct text label.
8. IF the stored Lights_Mode preference cannot be read at startup, THEN THE HUD SHALL start in "lights off" mode and show the Lights_Mode button with the label "Lights on".

### Requirement 18: Keyboard navigation

**User Story:** As a keyboard user, I want to move between stones and open cards without a pointer, so that I can use every 3D interaction.

#### Acceptance Criteria

1. WHEN a Plot is framed and the user presses Tab, THE Graveyard_Scene SHALL move keyboard focus to the first Headstone of that Plot, where "first" is the Headstone with the lowest index in the Plot's reading order (left to right, then front to back).
2. WHEN a Headstone has focus and the user presses an arrow key, THE Graveyard_Scene SHALL move focus to the Headstone in the same Plot whose center is nearest, by Euclidean distance on the ground plane, among Headstones lying within 45 degrees either side of the pressed direction in screen space.
3. IF a Headstone has focus and the user presses an arrow key and no Headstone in the same Plot lies within 45 degrees either side of that direction, THEN THE Graveyard_Scene SHALL keep focus on the current Headstone.
4. WHEN a Headstone has focus and the user presses Enter, THE HUD SHALL open the File_Card for that Firm within 200 ms and move keyboard focus to the first focusable control inside the File_Card.
5. WHEN the File_Card is open and the user presses Esc, THE HUD SHALL close the File_Card within 200 ms and return keyboard focus to the Headstone that was focused when the File_Card opened.
6. WHEN a Headstone receives focus, THE Flashlight SHALL aim at that Headstone within 300 ms and THE Engraving_Pool SHALL rebuild around it.
7. WHILE a control or Headstone has keyboard focus, THE HUD SHALL show a focus ring of at least 2 CSS pixels in width on the focused control, or a visible marker on the focused Headstone, with a contrast ratio of at least 3:1 against its adjacent colors in both lights-off and lights-on modes.
8. WHEN focus moves to a Headstone that lies outside the currently framed Plot, THE Camera_Rig SHALL move to the Plot containing that Headstone and complete the move within 1500 ms, with focus remaining on that Headstone.
9. WHEN a Headstone receives focus, THE HUD SHALL update an ARIA live region (polite) within 500 ms with the Firm name and its status.

### Requirement 19: Table view parity

**User Story:** As a screen-reader user, I want the table view to offer everything the scene does, so that I do not need the 3D view.

#### Acceptance Criteria

1. THE Table_View SHALL list every Firm in the loaded firms index as one row, with name, sector, status, latest ICR and total debt in USD.
2. IF a Firm has a null latest ICR or null total debt, THEN THE Table_View SHALL show the text "n/a" in that cell and SHALL NOT show 0 as a placeholder.
3. WHEN the shock delta changes, THE Table_View SHALL update the status, shocked ICR and Newly_Undead marker of every Firm within 200 ms of the change.
4. IF a Firm has shock_eligible equal to false, THEN THE Table_View SHALL show that Firm's original status and ICR unchanged and SHALL mark the row as excluded from the shock.
5. THE Table_View SHALL show the Risen_Counter and the Already_Undead line with values equal to those shown by the Graveyard_Scene for the same shock delta.
6. WHEN the user selects a row by pointer click or by pressing Enter or Space while the row has keyboard focus, THE Table_View SHALL show a File_Card whose content is identical to the File_Card shown by the Graveyard_Scene for the same Firm.
7. THE Table_View SHALL provide the Shock_Slider (range 0 to 5 percentage points), the Lights_Mode toggle and the Sound button, each reachable by keyboard Tab navigation and each with an accessible name.
8. WHEN the user chooses a sector filter, THE Table_View SHALL show only Firms of that sector, and WHEN the user clears the filter, THE Table_View SHALL show all Firms again.
9. IF the sector filter matches zero Firms, THEN THE Table_View SHALL show a message stating that no Firms match, and SHALL keep the filter control available.

### Requirement 20: Credits in settings

**User Story:** As a contributor, I want attribution to be visible in the app, so that licences are honoured.

#### Acceptance Criteria

1. THE Settings_Menu SHALL include a button with the visible text "Credits" that is reachable by keyboard Tab navigation.
2. WHEN the user activates the "Credits" button by mouse click, touch tap, or the Enter or Space key, THE Settings_Menu SHALL open the Credits_Dialog within 200 ms.
3. WHEN the Credits_Dialog opens, THE Credits_Dialog SHALL render the full text of `CREDITS.md`, imported as raw text at build time, in a scrollable region, preserving every table row and every link URL as visible text.
4. WHILE the Credits_Dialog is open, THE Credits_Dialog SHALL keep keyboard focus within the dialog, so that Tab on the last focusable element moves focus to the first and Shift+Tab on the first focusable element moves focus to the last.
5. WHEN the Credits_Dialog opens, THE Credits_Dialog SHALL move keyboard focus to the close button.
6. WHEN the user presses Esc or activates the close button, THE Credits_Dialog SHALL close within 200 ms and return keyboard focus to the "Credits" button.
7. THE Credits_Dialog SHALL have the role "dialog", the accessible name "Credits", and a visible close button with an accessible name of "Close".
8. THE Credits_Dialog SHALL render its text and close button with a contrast ratio of at least 4.5:1 against their background in both the lights-off and lights-on modes.
9. IF the text of `CREDITS.md` is empty, THEN THE Credits_Dialog SHALL open and display a message indicating that no credits are available, and THE close button SHALL remain operable.

### Requirement 21: Performance, quality and evidence

**User Story:** As a maintainer, I want measured performance and visual evidence, so that the acceptance can be checked.

#### Acceptance Criteria

1. WHEN `pnpm test` runs from the `web` directory, THE test suite SHALL exit with code 0, with zero failed tests and zero skipped Shock_Model property tests or Layout_Engine tests.
2. IF any test in `pnpm test` fails, THEN THE test suite SHALL exit with a non-zero code and report the name of each failing test.
3. WHEN `pnpm build` runs from the `web` directory, THE build SHALL exit with code 0, with the TypeScript build, the Vite build and the bundle size check all passing.
4. IF the initial download size exceeds 25 MB, THEN THE bundle size check SHALL fail the build with a non-zero exit code and report the measured size and the 25 MB limit.
5. WHEN the app loads with `?firms=3000` in a Playwright run, THE measurement script SHALL record the average frames per second over a continuous window of at least 10 s, starting after the first rendered frame of the Graveyard_Scene.
6. WHEN the measurement script finishes, THE measurement script SHALL append an entry to `DEVLOG.md` containing the average frames per second (rounded to 1 decimal), the GPU model, the browser name and version, the viewport resolution in pixels, the quality setting (low or normal) and the date in YYYY-MM-DD form.
7. IF the measurement machine is not an integrated-GPU laptop, THEN THE measurement script SHALL write a line in the `DEVLOG.md` entry stating that the machine is not an integrated-GPU laptop.
8. IF the measurement script cannot load the app or records fewer than 10 s of frames, THEN THE measurement script SHALL exit with a non-zero code, write no frames-per-second result to `DEVLOG.md`, and print an error indicating the cause.
9. WHERE the low quality toggle is on, THE Graveyard_Scene SHALL render with a lower pixel ratio than in normal quality, disable shadows cast by the Flashlight, and render exactly one fog layer.
10. WHEN the Playwright run completes, THE Playwright run SHALL save one lights-off screenshot and one lights-on screenshot, each at 1920x1080 pixels, to `reference/progress/`.
11. WHEN files under `web/src/scenes/**` or `web/src/fx/**` change, THE development workflow SHALL name `reference/graveyard/graveyard-rate-shock-3pp.png` as the matching reference and offer a scene-critic review.
12. THE Graveyard_Scene SHALL add 0 files to `web/public/assets` and 0 rows to `CREDITS.md`.
13. THE web package SHALL pin react 19, @react-three/fiber 9 and @react-three/drei 10 to exact versions, with no range prefix (`^`, `~`, `>`, `<`, `*`) in `package.json`.