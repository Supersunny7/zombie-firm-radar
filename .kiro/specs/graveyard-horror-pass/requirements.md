# Requirements Document

## Introduction

The graveyard of the `graveyard-scene` spec works, but the picture is stiff, clean and not scary. The Horror_Pass makes the graveyard look and behave like the reference frames `reference/graveyard/horror-direction.png` and `reference/graveyard/horror-direction-sequence.png`: found-footage CCTV, a bloody zombie hauling itself out of a torn grave, a gaunt zombie shambling between stones, and a hooded woman standing far back.

Every spooky element stays tied to a financial fact (`product.md`, `design-system.md`):

- A zombie that climbs out of a grave is a Newly_Undead firm at the current rate shock.
- A zombie that stands or shambles among the stones is a firm that is already `zombie` at shock 0.
- A torn-open grave marks a `zombie` or Newly_Undead firm; a closed mound marks every other firm.
- The hooded woman, the dead-grass cards and the stone jitter are atmosphere only and carry no data. The woman exists in lights off only.

The Horror_Pass is an extension of `graveyard-scene`. It reuses the Shock_Model, the shared `icr()`, the store, the HUD, the Table_View, keyboard navigation, the Audio_Engine and the CCTV_Pass without change, except where the Supersession list in Requirement 20 says otherwise.

Scope boundaries:

- No change to `data-contract.md`, the JSON Schemas, the TypeScript types in `web/src/types` or any file under `/data`. No edit to `/pipeline` or to pipeline generation code.
- The engine in `web/src/engine` is not touched. Selection and placement rules live in pure modules under `web/src/scenes/graveyard` (no React, no three.js imports), and rendering lives in `web/src/scenes/graveyard/r3f` and `web/src/fx`.
- The lab, the Theatre.js cinematics and the capture interaction are out of scope.
- Animation uses rigged models and procedural keyframes on bones. No Mixamo animation clip is used anywhere (`animation-direction.md`, `asset-licensing.md`).
- The work is delivered in three batches with a STOP after each (Requirement 22).

## Glossary

- **Base_Spec**: The existing spec `.kiro/specs/graveyard-scene`. Terms defined there (Graveyard_Scene, Headstone, Stone_Renderer, Layout_Engine, Plot, Mound, Shock_Slider, Shock_Model, Newly_Undead, Already_Undead, Flashlight, CCTV_Pass, Lights_Mode, Reduced_Motion, Audio_Engine, Interaction_Gate, Sound_Setting, Camera_Rig, HUD, Table_View, File_Card, Credits_Dialog, Mutant, Greenall_Corpse, Craggle_Hand, Ground_Fog, Overview_Fog, Plot_Fog, Firm) keep their meaning here.
- **Horror_Pass**: The feature specified by this document.
- **Asset_Pipeline**: The tooling in `tools/fetch-assets.mjs`, `tools/picks.json` and `tools/asset-lib` that converts downloads into files under `web/public/assets`, writes `manifest.json` and checks licenses.
- **Manifest**: The file `web/public/assets/manifest.json`.
- **Hero_Model**: The glb for `sketchfab-possessed-undead-giantswing` ("Possessed undead" by giantSwing), used for the nearest Risen_Zombie in lights off.
- **Walker_Model**: The glb for `sketchfab-zombie-pxltiger` ("Zombie" by pxltiger). It keeps the clips Idle, Walk1_InPlace, Attack and FallingForward.
- **Crawler_Model**: The glb for `sketchfab-zombie-walk-oscar` ("Zombie Walk Test" by OSCAR CREATIVO). Its skeleton uses Mixamo bone names; the mesh and skeleton are kept and the animation clip is removed.
- **Watcher_Model**: The glb for `sketchfab-hooded-horror-woman-purplepoint` ("Terrifying Hooded Horror Woman" by Purple.Point).
- **Character_Models**: The Hero_Model, Walker_Model, Crawler_Model and Watcher_Model together.
- **Ground_Texture**: The one Poly Haven CC0 forest-floor or muddy-leaves texture set (diffuse, normal, roughness) chosen by the agent, at 1k resolution.
- **Graveyard_Asset_Group**: Every file the Graveyard_Scene downloads in a session with all optional models in use: the Ground_Texture, the Character_Models, the three stone models, the files referenced by `props.json` (including the Mutant, the Greenall_Corpse, the cobweb pack and the rubble textures), and for each sound one file in the format the Audio_Engine requests. The HDRI files are reported separately and are not part of the group.
- **Group_Budget**: 25,000,000 bytes (25 MB) for the Graveyard_Asset_Group.
- **Settled_Shock**: The Shock_Slider value 250 ms after the last change to that value.
- **Selection_Event**: Either a Settled_Shock, or a change of the Camera_Rig target (a Plot index or the overview), or the first successful load of the Firm list.
- **Selection_Pose**: The camera position used to measure distance at a Selection_Event. For a Selection_Event caused by a Camera_Rig target change it is the destination pose of that target, not the interpolated pose.
- **Risen_Zombie**: A zombie character that climbs out of the grave of one Newly_Undead Firm.
- **Rise_Budget**: The maximum of 8 Risen_Zombies animating at once.
- **Standing_Zombie**: A Walker_Model character that stands or shambles in place beside the Headstone of one Already_Undead Firm.
- **Standing_Budget**: The maximum of 4 Standing_Zombies at once.
- **Rise_Sequence**: The jerky 3 s procedural motion of a Risen_Zombie from underground to a waist-high pose on the grave rim.
- **Idle_Loop**: The procedural breathing and random head twitches of a Risen_Zombie after the Rise_Sequence.
- **Bone_Animator**: The pure module that computes bone rotations for the Rise_Sequence and the Idle_Loop from elapsed time, a bone map for the model and a per-Firm seed.
- **Dirt_Burst**: The short particle effect of soil thrown up when fingers break the surface.
- **Closed_Mound**: A smooth grave mound in front of a Headstone whose Firm is neither `zombie` nor Newly_Undead.
- **Torn_Mound**: A mound torn open with a dark Pit and thrown-out Clods, in front of a Headstone whose Firm is `zombie` or Newly_Undead.
- **Pit**: The dark opening in the Torn_Mound from which a zombie emerges.
- **Clod**: A small dirt lump thrown out around the Pit.
- **Grass_Cards**: Instanced crossed-quad cards of dead grass drawn with an alpha-tested texture generated by our own code (own work).
- **Stone_Jitter**: The seeded per-Firm variation of position, yaw, tilt and height of a Headstone, and the Fallen_Stone flag.
- **Fallen_Stone**: A Headstone that lies flat on the ground instead of standing.
- **Plot_Camera_Pose**: The Camera_Rig pose that frames one Plot (replaces the Base_Spec `plotPose`).
- **Watcher**: The single hooded woman character that uses the Watcher_Model.
- **Cone_Active**: The state in which the Flashlight has a player-driven target: on pointer devices, the pointer is inside the canvas; on touch devices, at least one tap on the canvas has occurred since page load.
- **Cone_Target**: The point the Flashlight aims at: on pointer devices, the pointer ray hit (Base_Spec Requirement 10.3); on touch devices, the ray hit of the most recent tap.
- **Far_Spots**: Positions for the Watcher on the ground within the farthest two rows of the framed Plot (or, in the overview, of the Plot farthest from the camera), outside every Headstone footprint and every zombie footprint.
- **Vanish_Glitch**: The CCTV_Pass tracking glitch of at most 0.4 s that plays when the Watcher vanishes.
- **Growl**: One of the two CC0 sounds `freesound-tonsil5-zombie-growl-5` (https://freesound.org/people/tonsil5/sounds/555417/, source file `freesound-tonsil5-zombie-growl-5.wav`) and `freesound-ezcah-zombie-growl-01` (https://freesound.org/people/Ezcah/sounds/204821/, source file `freesound-ezcah-zombie-growl-01.flac`), played when a Risen_Zombie finishes its Rise_Sequence. Both source files are already in `tools/cache/manual`.
- **Growl_Source**: The injectable random source (a function that returns a number in [0, 1)) that picks which of the two Growl files plays for one rise. Production code supplies a non-seeded source and tests supply a seeded one.
- **Growl_Limiter**: The Audio_Engine rule that allows at most one Growl start per 1,000 ms.
- **Footstep_Bed**: The quiet looping shambling-footsteps sound `freesound-indieground-pas-zombie-route`, played near Standing_Zombies. It is not a growl. It is already listed in the Manifest and in `CREDITS.md`.
- **Nearby_Standing_Zombie**: A Standing_Zombie whose position is inside the framed Plot or inside the camera viewport at the current frame.
- **Footstep_Distance**: The straight-line distance in metres from the camera to the nearest Nearby_Standing_Zombie.
- **Content_Notice**: The dismissible one-line note with the text "Contains horror and gore".
- **Notice_Link**: The footer control with the text "Contains horror and gore" that reopens the Content_Notice.
- **Batch**: One of the three delivery groups in Requirement 22.
- **Measurement_Script**: The existing headed-Playwright fps script of Base_Spec Requirement 21.5 to 21.8.

## Requirements

### Requirement 1: Convert the four character models

**User Story:** As a developer, I want the four downloaded Sketchfab characters converted by the Asset_Pipeline into small web-ready glb files, so that the graveyard can load them within budget.

#### Acceptance Criteria

1. WHEN the Asset_Pipeline runs with the four zip files present under `tools/cache/manual/<pick>/<pick>.zip`, THE Asset_Pipeline SHALL write one Meshopt-compressed glb per pick to `web/public/assets/models/<pick>/<pick>.glb` for the picks `sketchfab-possessed-undead-giantswing`, `sketchfab-zombie-pxltiger`, `sketchfab-zombie-walk-oscar` and `sketchfab-hooded-horror-woman-purplepoint`.
2. THE Asset_Pipeline SHALL resize every texture of the Character_Models to at most 1024 x 1024 pixels and encode it as WebP.
3. WHEN a Character_Model material uses the KHR_materials_pbrSpecularGlossiness extension, THE Asset_Pipeline SHALL convert that material to metallic-roughness and SHALL write no glb that contains the KHR_materials_pbrSpecularGlossiness extension.
4. THE Asset_Pipeline SHALL remove all animation clips from the Hero_Model, the Crawler_Model and the Watcher_Model while keeping their meshes, skins and skeleton nodes.
5. THE Asset_Pipeline SHALL keep exactly the clips named Idle, Walk1_InPlace, Attack and FallingForward in the Walker_Model and SHALL remove every other clip from the Walker_Model.
6. WHEN the Crawler_Model is converted, THE Asset_Pipeline SHALL keep the mesh and the skeleton with its original bone names and SHALL remove the Mixamo animation clip.
7. THE converted Hero_Model, Walker_Model, Crawler_Model and Watcher_Model SHALL each load with the Meshopt decoder in a Vitest test and expose at least one skinned mesh whose skeleton has at least 15 bones.
8. WHEN the Asset_Pipeline runs twice on identical inputs, THE Asset_Pipeline SHALL produce byte-identical glb files and an unchanged Manifest.
9. IF a required zip is missing or a conversion step fails, THEN THE Asset_Pipeline SHALL skip that pick, SHALL list the pick name and the cause in its report, SHALL leave all other picks untouched, and SHALL exit with a non-zero code when the run was started with the strict flag of the existing pipeline.
10. IF a converted Character_Model file exceeds 5,000,000 bytes, THEN THE Asset_Pipeline report SHALL name the file and suggest a compression step (texture size, triangle decimation or KTX2).

### Requirement 2: Choose the ground texture

**User Story:** As the art lead, I want one fitting forest-floor texture set chosen from Poly Haven and shown to me, so that I can approve the ground before it is used.

#### Acceptance Criteria

1. WHEN Batch 1 starts, THE agent SHALL search the Poly Haven API for CC0 texture sets in the forest-floor and muddy-leaves categories and SHALL pick exactly one set with diffuse, normal and roughness maps available at 1k.
2. THE Asset_Pipeline SHALL download the chosen set at 1k resolution, encode every map as WebP, and write it to `web/public/assets/textures/polyhaven-<slug>/`.
3. THE Ground_Texture set SHALL occupy at most 3,000,000 bytes across its three maps.
4. THE Batch 1 screenshot `reference/progress/horror-batch1-assets.png` SHALL show the chosen Ground_Texture on a plane together with the four Character_Models, rendered in the lights-off look at 1920 x 1080 pixels, through the existing preview tooling in `tools/preview`.
5. THE Batch 1 report SHALL state the slug of the chosen set, its Poly Haven URL, why it was chosen, and the names of the two next-best candidates.
6. IF no Poly Haven set satisfies criterion 1, THEN THE agent SHALL stop Batch 1 and ask the user for a decision.

### Requirement 3: Manifest, credits and manual-download list

**User Story:** As a maintainer, I want every new file listed with its license and author, so that attribution and audits stay correct.

#### Acceptance Criteria

1. THE Manifest SHALL contain one entry for each new glb, each Ground_Texture map and each of the two Growl files, with the fields already used by existing entries (`pick`, `title`, `author`, `sourceUrl`, `license`, `changes`, `group`, `bytes`, `sha256`, `inputsSha256`, `recipe`).
2. THE Manifest SHALL record the license "CC BY 4.0" for the four Character_Models, with these titles, authors and URLs: "Possessed undead" by giantSwing (`https://sketchfab.com/3d-models/possessed-undead-7394bdf26d664810b42b83153411cf74`), "Zombie" by pxltiger (`https://sketchfab.com/3d-models/zombie-73ef58af341e46afba1da53366ed79cf`), "Zombie Walk Test" by OSCAR CREATIVO (`https://sketchfab.com/3d-models/zombie-walk-test-165fd9342c364216bfdd8c2f1102223c`) and "Terrifying Hooded Horror Woman" by Purple.Point (`https://sketchfab.com/3d-models/terrifying-hooded-horror-woman-f59d17be392f4494a5b85d927df48ffd`).
3. THE Manifest SHALL record the license "CC0" for the Ground_Texture maps and for the two Growl files.
4. THE file `CREDITS.md` SHALL contain exactly one row in the format `| Path | Title | Author | Source URL | License | Changes we made |` for each new Manifest file, and no row for a file that does not exist in the repository.
5. THE `CREDITS.md` row of the Crawler_Model SHALL state in the "Changes we made" cell that the rig uses Mixamo bone names, that the mesh and skeleton are kept, and that the Mixamo animation clip was removed.
6. THE `CREDITS.md` rows of the Hero_Model and the Watcher_Model SHALL state that the embedded animation was removed, and the row of the Walker_Model SHALL state which four clips were kept.
7. THE `CREDITS.md` row of each of the four Character_Models SHALL state in the "Changes we made" cell: "no AI-generated tag on the Sketchfab model page, checked 2026-11-12". The user read the tags of all four model pages through the Sketchfab API on that date, and none has an AI-generated tag.
8. IF a later re-check of a Character_Model page shows an AI-generated tag, THEN THE agent SHALL report the pick name and the finding in the next Batch report and SHALL NOT stop a Batch for it. Batch 1 SHALL NOT run an AI-tag check or stop for one.
9. THE file `tools/picks.json` SHALL contain one pick for each of the four Character_Models, one for the Ground_Texture and one for each of the two Growl files (`freesound-tonsil5-zombie-growl-5` and `freesound-ezcah-zombie-growl-01`), each in the pick and recipe format already used for Freesound picks, so that `tools/fetch-assets.mjs` reproduces the files from the cache.
10. WHEN the manual-download README generator runs, THE file `tools/cache/manual/README.md` SHALL list the four Character_Models and the two Growl files with expected file name, source page, credit line and notes, and its checklist count SHALL equal the number of listed downloads.
11. THE `CREDITS.md` SHALL contain one row for each of the two Growl files, with the CC0 license, the source URLs `https://freesound.org/people/tonsil5/sounds/555417/` and `https://freesound.org/people/Ezcah/sounds/204821/`, and the author names of those Freesound pages.
12. THE Credits_Dialog SHALL show the new `CREDITS.md` rows without code change, because it renders the full text of `CREDITS.md`.
13. WHEN the Asset_Pipeline runs with the two Growl source files present under `tools/cache/manual`, THE Asset_Pipeline SHALL convert each file through the existing sound-conversion path into the one output format the Audio_Engine requests for the other Freesound sounds, SHALL write it under `web/public/assets` with its Manifest entry, and SHALL count both files in the sounds category of the Graveyard_Asset_Group (one file per sound).
14. THE Graveyard_Scene SHALL NOT add a `CREDITS.md` row or a Manifest entry for the Footstep_Bed, because `freesound-indieground-pas-zombie-route` is already listed.

### Requirement 4: Update the asset licensing rule

**User Story:** As a maintainer, I want the written license rule to match what the project now uses, so that audits and the pipeline agree.

#### Acceptance Criteria

1. THE file `.kiro/steering/asset-licensing.md` SHALL state that a CC BY upload from Sketchfab is allowed WHEN its model page has no AI-generated tag, and that the four Character_Models were checked on 2026-11-12 with no such tag found.
2. THE file `.kiro/steering/asset-licensing.md` SHALL state that Mixamo animation clips and other Mixamo-hosted files stay forbidden, and that a CC BY uploader's mesh and skeleton on a Mixamo-style rig are allowed.
3. THE Forbidden list in `.kiro/steering/asset-licensing.md` SHALL keep every other existing entry unchanged.
4. THE "Current sources" list in `.kiro/steering/asset-licensing.md` SHALL name the four Character_Models' Sketchfab CC BY uploads.
5. WHEN the Asset_Pipeline license check receives a pick with the host `mixamo.com`, THE Asset_Pipeline SHALL still refuse the pick as forbidden.
6. WHEN the Asset_Pipeline license check receives a CC BY pick whose recipe removes the Mixamo animation clip, THE Asset_Pipeline SHALL accept the pick.
7. THE Asset_Pipeline tests SHALL cover criteria 5 and 6 with one named example test each.
8. WHEN Batch 1 is complete, THE asset-auditor agent SHALL be run and its report SHALL show no missing `CREDITS.md` row, no forbidden license and no missing attribution for the new files.

### Requirement 5: Lazy loading and the 25 MB graveyard budget

**User Story:** As a viewer on a slow connection, I want the new models to arrive after the first frame and the whole graveyard to stay small, so that the page opens fast.

#### Acceptance Criteria

1. THE Graveyard_Scene SHALL request no Character_Model file before the first frame has rendered.
2. WHEN the first frame has rendered, THE Graveyard_Scene SHALL begin loading the Ground_Texture within 100 ms, and SHALL load each Character_Model only when a character that uses it is first needed.
3. WHILE Lights_Mode is "lights on", THE Graveyard_Scene SHALL NOT request the Hero_Model or the Watcher_Model.
4. WHILE Reduced_Motion is true, THE Graveyard_Scene SHALL NOT request the Watcher_Model.
5. THE Graveyard_Scene SHALL load each Character_Model at most once per page session and SHALL reuse the loaded geometry and textures for every character instance of that model.
6. THE Graveyard_Asset_Group SHALL total at most the Group_Budget.
7. WHEN the bundle check runs, THE bundle check SHALL compute the Graveyard_Asset_Group size from the Manifest, SHALL print the bytes per category (ground, Character_Models, stones, props, sounds) and the separate HDRI bytes, and SHALL fail with a non-zero exit code and a message naming the measured size and the Group_Budget WHEN the total exceeds the Group_Budget.
8. THE Batch 1 report and the final report SHALL include the same per-file and per-category byte breakdown, with and without the HDRI files.
9. THE initial download before the first frame SHALL stay at or below 25 MB and the Base_Spec Requirement 8.10 check SHALL continue to pass.
10. THE Graveyard_Asset_Group SHALL contain no file with a Manifest bytes value above 5,000,000, except the 2k sky HDRI which is outside the group.
11. IF a Character_Model fails to load, THEN THE Graveyard_Scene SHALL report the failed asset name in the developer console, SHALL use the fallback of Requirement 12 criterion 6, and SHALL keep running.

### Requirement 6: Ground texture and dead grass

**User Story:** As a viewer, I want a real forest-floor ground with sparse dead grass, so that the cemetery stops looking like a clean game level.

#### Acceptance Criteria

1. THE Graveyard_Scene SHALL render the ground with the Ground_Texture set at 1k resolution, repeated so that the texel density on the ground is at least 128 texels per metre.
2. THE Graveyard_Scene SHALL keep using the Poly Haven excavated soil wall material for the Torn_Mound, the Closed_Mound and the Clods.
3. THE Graveyard_Scene SHALL keep the ground extent rule of Base_Spec Requirement 7.2 (no visible horizon) and the flat colour `#0b0806` fallback of Base_Spec Requirement 7.13 WHEN the Ground_Texture fails to load.
4. THE Graveyard_Scene SHALL draw Grass_Cards from one InstancedMesh, with an alpha-tested texture produced by our own generator code, so that the texture needs no `CREDITS.md` row.
5. THE Graveyard_Scene SHALL give each Grass_Card a height of at most 0.35 m.
6. THE Graveyard_Scene SHALL place Grass_Cards from a seeded generator, so that two page loads with the same Firm list show the same card positions to the bit.
7. THE Graveyard_Scene SHALL place Grass_Cards so that the density within 1.0 m of a Mound is higher than the density farther than 3.0 m from every Mound, and the number of cards within the framed Plot SHALL NOT exceed 1,500.
8. THE Graveyard_Scene SHALL place no Grass_Card inside a Headstone footprint or inside a Pit.
9. WHERE the low quality toggle is on, THE Graveyard_Scene SHALL draw at most half the number of Grass_Cards of normal quality.
10. WHILE Lights_Mode is "lights on", THE Graveyard_Scene SHALL draw the same Grass_Cards, lit by the lights-on values.
11. THE Grass_Cards, the Closed_Mound instances, the Torn_Mound instances and the Clods SHALL each use instancing, so that their draw-call count does not grow with the Firm count.

### Requirement 7: Closed mounds and torn-open graves

**User Story:** As a viewer, I want zombie graves torn open and the other graves left closed, so that the ground itself tells me which firms are undead.

#### Acceptance Criteria

1. THE Graveyard_Scene SHALL place exactly one Closed_Mound or one Torn_Mound in front of every Headstone, such that a Firm that is `zombie` or Newly_Undead has a Torn_Mound and every other Firm has a Closed_Mound.
2. THE Torn_Mound SHALL show a dark Pit that is visibly darker than the surrounding soil and between 0.5 m and 0.9 m wide, a raised broken rim, and at least 6 and at most 14 Clods lying within 1.2 m of the Pit centre.
3. THE Torn_Mound SHALL be built so that the Pit opening is open: no geometry covers the opening, and the ground surface hides every part of a character body below the Pit rim.
4. WHEN the Shock_Model flags a Firm as Newly_Undead, THE Graveyard_Scene SHALL replace that Firm's Closed_Mound with a Torn_Mound within 1 s of the shock change, including Newly_Undead Firms that receive no Risen_Zombie because of the Rise_Budget.
5. WHEN a Firm stops being Newly_Undead, THE Graveyard_Scene SHALL replace its Torn_Mound with a Closed_Mound within 2 s, after any Risen_Zombie of that Firm has finished lowering (Requirement 10 criterion 7).
6. THE Graveyard_Scene SHALL place the Torn_Mound of every Already_Undead Firm at shock 0 and keep it at every shock value.
7. THE Graveyard_Scene SHALL position the Torn_Mound or Closed_Mound on the side of the Headstone that faces the Plot_Camera_Pose, at the same distance from the stone base as the Base_Spec mound.
8. WHEN Stone_Jitter moves, rotates or tilts a Headstone, THE Graveyard_Scene SHALL move the mound with that Headstone, so that the mound stays in front of the stone face.
9. WHEN Stone_Jitter makes a Headstone a Fallen_Stone, THE Graveyard_Scene SHALL keep the mound at the former standing position of that stone.
10. WHILE Lights_Mode is "lights on", THE Graveyard_Scene SHALL show the Torn_Mound with the Pit and the Clods and SHALL show no blood on the Torn_Mound.
11. WHILE Lights_Mode is "lights off", THE Graveyard_Scene SHALL show no more than 3 dark-red stain decals on each Torn_Mound.

### Requirement 8: Break the stone grid

**User Story:** As a viewer, I want the stones scattered like a real old graveyard, so that the grid stops looking like a parking lot.

#### Acceptance Criteria

1. THE Layout_Engine SHALL derive the Stone_Jitter of each Firm from a seeded generator whose seed is a hash of the Firm's `cik` only, so that the jitter of one Firm does not change WHEN other Firms are added to or removed from the list.
2. THE Layout_Engine SHALL apply a position offset to each Headstone that is at most 0.30 m on the ground plane in each axis before spacing correction.
3. THE Layout_Engine SHALL apply a yaw offset in the closed range -20 degrees to +20 degrees to each Headstone.
4. THE Layout_Engine SHALL apply a total tilt of at most 8 degrees (the angle between the stone's up axis and vertical) to each upright Headstone.
5. THE Layout_Engine SHALL multiply the Base_Spec height of each Headstone by a seeded factor in the closed range 0.90 to 1.10.
6. THE Layout_Engine SHALL set the Fallen_Stone flag for between 3 percent and 7 percent of the Firms of any generated list of at least 1,000 Firms, chosen by the seeded generator.
7. THE Layout_Engine SHALL lay a Fallen_Stone flat on the ground with its engraved face up or at most 15 degrees from up, at yaw within the range of criterion 3 plus or minus 90 degrees, and sunk into the ground by 0 m to 0.08 m.
8. WHEN the Layout_Engine runs twice on the same Firm list in the same order, THE Layout_Engine SHALL return identical Stone_Jitter values, equal to the bit.
9. THE Layout_Engine SHALL keep the Base_Spec Requirement 3.2 rule (at least 0.15 m between footprint edges) using the oriented footprint of each Headstone after yaw, tilt and the Fallen_Stone lying footprint, and MAY enlarge the cell pitch to satisfy it.
10. THE Layout_Engine SHALL keep the Base_Spec Requirement 3.3 rule (paths at least 1.2 m wide between Plots) and the Base_Spec Requirement 3.9 rule (the minimum tilt of an `endangered` or `zombie` Headstone is greater than the maximum tilt of a `healthy` or `insufficient_data` Headstone).
11. THE Layout_Engine SHALL keep a Fallen_Stone out of the Plot front row space reserved for the mound of its own Firm, so that a Fallen_Stone never covers a Torn_Mound Pit.
12. WHEN the pointer ray passes through the rendered shape of any Headstone, including a tilted or Fallen_Stone, THE pick function SHALL return that Headstone, and WHEN the ray passes through no Headstone, THE pick function SHALL return no Headstone.
13. THE keyboard reading order of Base_Spec Requirement 18.1 SHALL use the grid slot of each Firm (left to right, then front to back) and SHALL NOT change with Stone_Jitter.
14. THE arrow-key navigation of Base_Spec Requirement 18.2 SHALL use the jittered ground-plane centres of the Headstones.
15. THE Stone_Renderer SHALL keep exactly 3 stone InstancedMesh objects and SHALL render a Fallen_Stone through the same InstancedMesh as an upright stone of the same status.
16. THE Layout_Engine tests SHALL include fast-check properties, each running at least 100 cases, for criteria 2 to 6, 8, 9 and 12, and an example test for criterion 13 in which a jitter change leaves the keyboard order unchanged.

### Requirement 9: Camera inside the plot

**User Story:** As a viewer, I want the camera at eye height among the graves, so that the nearest mounds fill the lower half of the frame as in the reference.

#### Acceptance Criteria

1. THE Camera_Rig SHALL place the Plot_Camera_Pose at an eye height of 1.5 m, with a tolerance of 0.1 m.
2. THE Camera_Rig SHALL place the Plot_Camera_Pose so that the horizontal distance from the camera to the nearest Headstone of the framed Plot is at most 4.0 m.
3. WHEN a Plot is framed at its Plot_Camera_Pose, THE bases of the nearest-row mounds of that Plot SHALL project into the lower half of the viewport (below the vertical centre) at 1440 x 900 and at 390 x 844 pixels.
4. THE Camera_Rig SHALL keep the Plot_Camera_Pose inside the Plot boundary extended by the Plot gap, so that the camera is among the graves and not on the path outside.
5. THE Camera_Rig SHALL keep the field of view 52 degrees, the look-target smoothing, the handheld sway amplitudes, the camera-local Flashlight offset and the 1.5 s move limit of the Base_Spec.
6. THE Camera_Rig SHALL keep the overview pose rule (all Plots fully inside the viewport) and SHALL NOT apply the 1.5 m eye height to the overview.
7. WHEN the Plot_Camera_Pose changes eye height or distance, THE Camera_Rig SHALL set the look target so that the pointer offset keeps the Base_Spec ranges (pointer.x * 3.2 and 0.2 + pointer.y * 1.3 relative to the plot look point).
8. THE Camera_Rig tests SHALL cover criteria 1, 2, 4 and 6 with a property test over generated Plot sizes, with at least 100 cases.
9. THE Plot_Camera_Pose at the start of the session SHALL be the pose that frames Plot 1.
10. THE Graveyard_Scene SHALL keep the fog rules of Base_Spec Requirement 7 (Plot_Fog, Overview_Fog, interpolation) unchanged at the new pose.

### Requirement 10: Risen zombies tied to Newly_Undead firms

**User Story:** As an investor, I want a zombie to climb out of the grave of each firm that turns undead under the rate shock, so that I see which firms the shock kills.

#### Acceptance Criteria

1. WHEN a Selection_Event occurs, THE Graveyard_Scene SHALL assign Risen_Zombies to the at most 8 Newly_Undead Firms whose Headstone base is nearest to the Selection_Pose, measured as straight-line distance.
2. WHEN two Newly_Undead Firms have equal distance at a Selection_Event, THE Graveyard_Scene SHALL give the Risen_Zombie to the Firm with the lower `cik` in ascending string order.
3. THE Graveyard_Scene SHALL NOT change the set of assigned Risen_Zombies between two Selection_Events, whatever the pointer position, camera sway, camera interpolation or Flashlight aim.
4. THE Graveyard_Scene SHALL produce a Settled_Shock 250 ms after the last Shock_Slider change, with a tolerance of 50 ms, and SHALL produce no Settled_Shock WHILE the slider value keeps changing at intervals shorter than 250 ms.
5. WHEN a Firm becomes Newly_Undead and receives a Risen_Zombie at a Selection_Event, THE Graveyard_Scene SHALL start the Rise_Sequence of that Risen_Zombie within 100 ms of the Selection_Event.
6. WHEN a Firm that has no Risen_Zombie falls outside the Rise_Budget, THE Graveyard_Scene SHALL show its Torn_Mound and its Broken_Stone without a character.
7. WHEN a Selection_Event removes a Firm from the assigned set, THE Graveyard_Scene SHALL lower that Risen_Zombie back into its Pit within 2 s, SHALL then remove the character, and SHALL start no new Rise_Sequence for a replacement Firm before the lowering ends.
8. WHEN the Camera_Rig target changes between Plots or to the overview, THE Graveyard_Scene SHALL compute the assignment from the destination Selection_Pose at the start of the move, so that no Risen_Zombie appears or disappears during the camera move.
9. THE Graveyard_Scene SHALL show at most 8 Risen_Zombies at every rendered frame, counting Risen_Zombies that are still lowering into the total of 8.
10. WHILE the Shock_Slider value is changing, THE Graveyard_Scene SHALL keep the Torn_Mounds, Broken_Stones, blood decals and counters updating on the Base_Spec and Requirement 7 timings, and SHALL keep the current Risen_Zombies as they are.
11. THE assignment function SHALL be a pure module that takes the list of Newly_Undead Firms with their Headstone base positions, the Selection_Pose and the budget, and returns the ordered list of assigned Firms.
12. THE assignment function tests SHALL include fast-check properties, each running at least 100 cases: the result has at most 8 entries, every entry is Newly_Undead, no unassigned Newly_Undead Firm is nearer than the farthest assigned one (ties by `cik`), and the result is independent of the order of the input list.
13. THE Graveyard_Scene SHALL let a Risen_Zombie never intercept the pointer ray used for Headstone picking.

### Requirement 11: Rise sequence and idle

**User Story:** As a viewer, I want the zombie to haul itself out in jerky, held poses, then breathe and twitch, so that it feels physical and unsettling.

#### Acceptance Criteria

1. THE Bone_Animator SHALL compute the Rise_Sequence from procedural keyframes on the model bones and SHALL NOT play any animation clip for the Rise_Sequence.
2. THE Bone_Animator SHALL run the Rise_Sequence in this order: fingers break the soil with a Dirt_Burst; head and shoulders jerk up; arms plant on the Pit rim; the torso hauls out to the waist.
3. THE Rise_Sequence SHALL last 3.0 s with a tolerance of 0.3 s from the start of the first phase to the start of the Idle_Loop.
4. THE Rise_Sequence SHALL use at least 4 key poses, each reached by a transition of at most 200 ms and then held for at least 100 ms.
5. THE Graveyard_Scene SHALL emit the Dirt_Burst once, at the moment the fingers break the soil, from a pooled particle set of at most 40 particles per Risen_Zombie.
6. THE Graveyard_Scene SHALL show no body part of a Risen_Zombie below the waist, and no body part through the ground surface, at any frame of the Rise_Sequence or the Idle_Loop.
7. THE Graveyard_Scene SHALL keep the root of a Risen_Zombie fixed relative to its Pit during the Idle_Loop and SHALL keep its hands planted on the rim (no foot sliding, no hand sliding).
8. WHEN the Rise_Sequence ends, THE Graveyard_Scene SHALL start the Idle_Loop within one frame, and SHALL emit one rise-finished event for that Risen_Zombie.
9. WHILE the Idle_Loop runs, THE Bone_Animator SHALL apply a breathing motion of the chest at a period between 3 s and 5 s, and SHALL apply a head twitch at random intervals between 1 s and 4 s, each twitch lasting at most 250 ms.
10. THE Bone_Animator SHALL draw the twitch intervals from a generator seeded by the `cik` of the Firm, so that the same Firm shows the same twitch schedule in two sessions.
11. THE Bone_Animator SHALL provide a bone map for each of the Hero_Model, the Walker_Model and the Crawler_Model that names the bones used for fingers, head, shoulders, arms, spine and chest, and a Vitest test SHALL assert that every bone name of each map exists in the loaded model.
12. THE Bone_Animator SHALL be pure: for equal elapsed time, bone map and seed, it SHALL return equal bone rotations, and it SHALL import neither React nor three.js.
13. FOR ALL elapsed times from 0 s to 10 s, THE Bone_Animator SHALL return rotations whose angle change between two samples 1/60 s apart is at most 25 degrees per bone, except inside the transitions of criterion 4 where the limit is 90 degrees.
14. THE Graveyard_Scene SHALL advance the Rise_Sequence, the Idle_Loop and every other timed behaviour of the Horror_Pass with the render-loop clock, and SHALL NOT use `setTimeout` or `setInterval` for choreography. The Settled_Shock debounce of Requirement 10 criterion 4 is an input debounce and is exempt.
15. WHILE Reduced_Motion is true, THE Graveyard_Scene SHALL show each Risen_Zombie in its final pose (waist-high on the rim, arms planted) in the first rendered frame after assignment, SHALL apply no Dirt_Burst, no breathing and no head twitch, and SHALL still emit the rise-finished event in that frame.
16. THE Graveyard_Scene SHALL make each character stand 1.6 m to 1.9 m tall when fully upright, by scaling the loaded model, so that characters from different source units have a comparable size.

### Requirement 12: Which model each zombie uses

**User Story:** As a viewer, I want the nearest zombie to be the best-looking one and the rest to vary, so that the crowd does not look cloned.

#### Acceptance Criteria

1. WHILE Lights_Mode is "lights off", THE Graveyard_Scene SHALL give the Risen_Zombie with the smallest distance to the Selection_Pose (ties by lower `cik`) the Hero_Model.
2. THE Graveyard_Scene SHALL give every other Risen_Zombie either the Walker_Model or the Crawler_Model, chosen by one bit of a hash of the Firm `cik`, so that the choice is deterministic per Firm.
3. WHILE Lights_Mode is "lights on", THE Graveyard_Scene SHALL give the Risen_Zombie that would use the Hero_Model the Walker_Model instead, and SHALL leave the model choice of every other Risen_Zombie unchanged.
4. WHEN Lights_Mode changes while the nearest Risen_Zombie is shown, THE Graveyard_Scene SHALL swap its model within 500 ms and SHALL keep its current phase (Rise_Sequence time or Idle_Loop time) and position.
5. THE model assignment SHALL change only at a Selection_Event or at a Lights_Mode change, and SHALL NOT change when the camera moves.
6. IF a model needed by a Risen_Zombie has not finished loading, THEN THE Graveyard_Scene SHALL start the Rise_Sequence only after the model is available, with the Torn_Mound already shown.
7. IF the Hero_Model fails to load, THEN THE Graveyard_Scene SHALL use the Walker_Model for that Risen_Zombie; IF the Crawler_Model fails to load, THEN THE Graveyard_Scene SHALL use the Walker_Model for that Risen_Zombie; IF the Walker_Model fails to load, THEN THE Graveyard_Scene SHALL render no Risen_Zombie and no Standing_Zombie, SHALL emit no rise event, and SHALL keep the Torn_Mounds.
8. THE Graveyard_Scene SHALL have at most 13 skinned characters in the scene at any frame (8 Risen_Zombies, 4 Standing_Zombies and 1 Watcher).

### Requirement 13: Standing zombies for firms already undead

**User Story:** As a viewer, I want a few zombies standing among the stones of firms that are already zombies, so that the graveyard feels inhabited from the first frame.

#### Acceptance Criteria

1. WHEN a Selection_Event caused by the first Firm list load or by a Camera_Rig target change occurs, THE Graveyard_Scene SHALL assign Standing_Zombies to the at most 4 Already_Undead Firms whose Headstone base is nearest to the Selection_Pose, ties by lower `cik`.
2. THE Graveyard_Scene SHALL NOT change the Standing_Zombie assignment at a Settled_Shock or on a camera movement without a target change.
3. THE Graveyard_Scene SHALL give every Standing_Zombie the Walker_Model, in lights off and in lights on.
4. THE Graveyard_Scene SHALL play the Idle clip for a Standing_Zombie WHEN one bit of a hash of the Firm `cik` is 0, and the Walk1_InPlace clip WHEN the bit is 1.
5. THE Graveyard_Scene SHALL keep the root of a Walk1_InPlace Standing_Zombie fixed, so that the character shambles in place and does not travel.
6. THE Graveyard_Scene SHALL turn each Standing_Zombie to face the Selection_Pose and SHALL keep that heading until the next Selection_Event.
7. THE Graveyard_Scene SHALL place each Standing_Zombie on the camera-facing side of its Headstone, outside every Headstone footprint (including its own), outside every Pit, and at least 0.7 m from the centre of every other zombie.
8. WHEN the Firm list has fewer than 4 Already_Undead Firms, THE Graveyard_Scene SHALL show one Standing_Zombie for each of them.
9. WHEN the Firm list has no Already_Undead Firm, THE Graveyard_Scene SHALL show no Standing_Zombie and SHALL keep running without error.
10. WHEN a Selection_Event removes a Firm from the Standing_Zombie assignment, THE Graveyard_Scene SHALL remove that character no earlier than the end of the camera move, and SHALL NOT remove a character that is inside the viewport at the removal frame.
11. WHILE Reduced_Motion is true, THE Graveyard_Scene SHALL show each Standing_Zombie in the first frame of the Idle clip and SHALL NOT play the Idle or Walk1_InPlace clip.
12. THE Standing_Zombie placement function SHALL be a pure module with fast-check properties of at least 100 cases each: the result has at most 4 entries, every entry is an Already_Undead Firm, and the placement satisfies the clearances of criterion 7.
13. THE Graveyard_Scene SHALL draw no blood decal on a Standing_Zombie.

### Requirement 14: The hooded woman

**User Story:** As a viewer, I want a hooded woman who watches from far back and vanishes when my light reaches her, so that the graveyard has something I fear to look at.

#### Acceptance Criteria

1. WHILE Lights_Mode is "lights off", Reduced_Motion is false and Cone_Active is true, THE Graveyard_Scene SHALL be allowed to show the Watcher.
2. THE Graveyard_Scene SHALL show at most one Watcher at any frame.
3. WHEN the Watcher appears, THE Graveyard_Scene SHALL place the Watcher on a Far_Spot outside the Flashlight cone and facing the Selection_Pose.
4. WHEN the Flashlight cone begins to cover any part of the Watcher (using the same cone test as the Mutant in Base_Spec Requirement 9.3), THE Graveyard_Scene SHALL hide the Watcher within 100 ms and SHALL start one Vanish_Glitch at the same moment.
5. WHEN the Watcher has vanished, THE Graveyard_Scene SHALL show the Watcher again after a delay drawn at random from 20 s to 60 s inclusive, on a Far_Spot that differs from the previous one.
6. THE Graveyard_Scene SHALL place each new appearance of the Watcher at a distance from the Selection_Pose that is smaller than the previous appearance by 0.5 m to 1.5 m, until the distance reaches the nearest Far_Spot distance, and SHALL then keep appearances at that distance.
7. THE Graveyard_Scene SHALL NOT choose a Far_Spot that the Flashlight cone covers at the moment of appearance, and IF every Far_Spot is covered, THEN THE Graveyard_Scene SHALL retry once per second.
8. WHEN the first appearance condition of criterion 1 starts to hold after page load, THE Graveyard_Scene SHALL schedule the first appearance with a delay drawn at random from 20 s to 60 s inclusive.
9. WHILE Cone_Active is false, THE Graveyard_Scene SHALL keep the Watcher hidden, and WHEN Cone_Active turns false while the Watcher is shown, THE Graveyard_Scene SHALL hide the Watcher within 100 ms without a Vanish_Glitch.
10. WHILE the device reports touch pointer events, THE Graveyard_Scene SHALL set the Cone_Target to the ray hit of the most recent tap, SHALL keep the Flashlight aimed there until the next tap, and SHALL apply criteria 1 to 9 with that Cone_Target.
11. WHEN Lights_Mode changes to "lights on", THE Graveyard_Scene SHALL hide the Watcher within 100 ms, SHALL play no Vanish_Glitch, and SHALL cancel the schedule.
12. WHEN Lights_Mode changes to "lights off" and Reduced_Motion is false, THE Graveyard_Scene SHALL schedule a new first appearance as in criterion 8.
13. WHILE Reduced_Motion is true, THE Graveyard_Scene SHALL NOT show the Watcher, SHALL NOT request the Watcher_Model and SHALL NOT start a Vanish_Glitch.
14. WHEN Reduced_Motion changes to true while the Watcher is shown, THE Graveyard_Scene SHALL hide the Watcher within one frame without a Vanish_Glitch.
15. WHEN the Camera_Rig target changes, THE Graveyard_Scene SHALL hide the Watcher without a Vanish_Glitch at the start of the move, SHALL keep the distance progress of criterion 6, and SHALL schedule the next appearance with a delay drawn at random from 20 s to 60 s inclusive.
16. THE Graveyard_Scene SHALL emit no audio cue when the Watcher appears or vanishes.
17. THE Vanish_Glitch SHALL be a CCTV_Pass tracking glitch of at most 0.4 s that changes at most 4 times per second and flips no full-screen luminance, so that the 3-flashes-per-second rule of Base_Spec Requirement 17.6 holds.
18. IF a random CCTV_Pass glitch of Base_Spec Requirement 15.5 is in progress when the Watcher vanishes, THEN THE CCTV_Pass SHALL continue that glitch without starting a second one and without extending it beyond its original end.
19. THE Watcher SHALL NOT trigger a jump scare, blood or any sound.
20. THE Watcher schedule and the Far_Spots selection SHALL be pure modules driven by a seeded generator and an injected clock, with Vitest tests that cover criteria 4, 5, 6, 8, 9, 11, 13 and 15.

### Requirement 15: Retire the Craggle hand from the graveyard

**User Story:** As a developer, I want the graveyard to stop using the Craggle hand, so that the zombies replace it and the hand stays free for later screen-edge scares.

#### Acceptance Criteria

1. THE Graveyard_Scene SHALL NOT load, render or animate the Craggle_Hand model.
2. THE Craggle_Hand file, its Manifest entry and its `CREDITS.md` row SHALL stay in the repository.
3. THE rise events of Base_Spec Requirement 14.9 SHALL be emitted by the Risen_Zombie Rise_Sequence start instead of the Craggle_Hand rising, once per Risen_Zombie.
4. THE hand pool, hand pose and hand geometry modules and their tests MAY be removed or kept, provided no production import of them remains in the Graveyard_Scene bundle.
5. THE Graveyard_Scene SHALL keep the Ruella hand unused, as in the Base_Spec.
6. THE production bundle check SHALL pass without the Craggle_Hand model in the Graveyard_Asset_Group.

### Requirement 16: Lights-on behaviour of the horror pass

**User Story:** As a player who prefers the calm mode, I want zombies to still show me the data without blood or scares, so that lights on stays an accessible mode.

#### Acceptance Criteria

1. WHILE Lights_Mode is "lights on", THE Graveyard_Scene SHALL show Risen_Zombies and Standing_Zombies for the same Firms as in "lights off".
2. WHILE Lights_Mode is "lights on", THE Graveyard_Scene SHALL run the same Rise_Sequence timing and motion as in "lights off", including the Dirt_Burst.
3. WHILE Lights_Mode is "lights on", THE Graveyard_Scene SHALL use the Walker_Model in place of the Hero_Model (Requirement 12 criterion 3).
4. WHILE Lights_Mode is "lights on", THE Graveyard_Scene SHALL draw no blood decal on Headstones, Mounds or characters, as in Base_Spec Requirement 6.2.
5. WHILE Lights_Mode is "lights on", THE Audio_Engine SHALL play no Growl, and SHALL keep playing the Footstep_Bed under the rules of Requirement 17 criteria 11 to 20.
6. WHILE Lights_Mode is "lights on", THE Graveyard_Scene SHALL show no Watcher and SHALL start no Vanish_Glitch.
7. THE Graveyard_Scene SHALL show the same Firm statuses, figures and labels in both Lights_Mode values (Base_Spec Requirement 17.3).

### Requirement 17: Growl when a zombie finishes rising, and footsteps near standing zombies

**User Story:** As a viewer, I want a low growl when a zombie finishes hauling itself out and a faint shuffle near the zombies that stand among the stones, so that the scene sounds as unsettling as it looks.

#### Acceptance Criteria

1. WHEN a rise-finished event occurs, Lights_Mode is "lights off" and the Audio_Engine is not muted, THE Audio_Engine SHALL start one Growl within 200 ms of the event, choosing one of the two Growl files with the Growl_Source once per rise.
2. THE Growl_Limiter SHALL allow at most one Growl start in any window of 1,000 ms, and SHALL drop (not queue) every rise-finished event that arrives inside the window after a Growl start.
3. THE Audio_Engine SHALL play the Growl at a gain no higher than 0.4 of full scale after the master gain, and SHALL stop it, with a fade-out, no later than 3 s after its start.
4. WHILE Lights_Mode is "lights on", THE Audio_Engine SHALL play no Growl.
5. WHILE the Interaction_Gate has not occurred, or the Audio_Engine is muted, THE Audio_Engine SHALL play no Growl and SHALL NOT replay or queue Growls triggered during that time (Base_Spec Requirements 16.1 and 16.8).
6. THE Audio_Engine SHALL load the Growl only from the Manifest entries `freesound-tonsil5-zombie-growl-5` and `freesound-ezcah-zombie-growl-01`, and SHALL load them lazily at the first rise-finished event or the first Lights_Mode change to "lights off" after the Interaction_Gate, whichever is first.
7. IF one Growl file fails to load or decode, THEN THE Audio_Engine SHALL play the other file for every Growl; IF both fail, THEN THE Audio_Engine SHALL skip the Growl, keep all other sounds working, and show no error to the user.
8. WHILE Reduced_Motion is true, THE Audio_Engine SHALL play the Growl on the same rise-finished events and with the same limiter as in standard motion (Base_Spec Requirement 16.7).
9. THE Audio_Engine SHALL keep playing the digging sound once per Risen_Zombie at the start of its Rise_Sequence, in place of once per Craggle_Hand (Base_Spec Requirement 16.4).
10. THE Growl_Limiter SHALL be a pure function of the event times, with a fast-check property of at least 100 cases: for any sequence of event times the number of accepted Growls in any 1,000 ms window is at most 1, and the first event after a gap of at least 1,000 ms is accepted.
11. THE Growl choice SHALL be a pure function of the value returned by the Growl_Source, with fast-check properties of at least 100 cases: the chosen file is always one of the two Growl files, the same Growl_Source value always gives the same file, and values below 0.5 and from 0.5 up select different files.
12. WHILE a Nearby_Standing_Zombie exists, the Audio_Engine is not muted and the Interaction_Gate has occurred, THE Audio_Engine SHALL play the Footstep_Bed as a continuous loop, in "lights on" and in "lights off".
13. THE Audio_Engine SHALL load the Footstep_Bed only from the Manifest entry `freesound-indieground-pas-zombie-route`, and SHALL load it lazily when the first Nearby_Standing_Zombie exists after the Interaction_Gate.
14. WHEN the first Nearby_Standing_Zombie appears while the Footstep_Bed is stopped, THE Audio_Engine SHALL start the loop with a fade-in of 1 s.
15. THE Audio_Engine SHALL set the Footstep_Bed gain after the master gain to 0.15 multiplied by an attenuation factor that is 1 at a Footstep_Distance of 2 m or less, falls linearly to 0 at 12 m, and is 0 beyond 12 m, so that the gain is never above 0.15.
16. WHILE the Footstep_Bed plays, THE Audio_Engine SHALL update the gain of criterion 15 from the current Footstep_Distance at every rendered frame, with a smoothing time of at most 250 ms.
17. WHEN no Nearby_Standing_Zombie exists, THE Audio_Engine SHALL fade the Footstep_Bed out over 1 s with a tolerance of 0.1 s and SHALL then stop the loop.
18. WHILE the Interaction_Gate has not occurred, or the Audio_Engine is muted, THE Audio_Engine SHALL play no Footstep_Bed, and WHEN the Audio_Engine is unmuted while a Nearby_Standing_Zombie exists, THE Audio_Engine SHALL start the Footstep_Bed as in criterion 14.
19. WHILE Reduced_Motion is true, THE Audio_Engine SHALL play the Footstep_Bed under criteria 12 to 18, because the sound follows the presence of a Standing_Zombie and not its animation.
20. IF the Footstep_Bed fails to load or decode, THEN THE Audio_Engine SHALL skip it, keep all other sounds working, and show no error to the user.
21. THE Footstep_Bed gain function (criterion 15) SHALL be a pure function of the Footstep_Distance, with a fast-check property of at least 100 cases: the gain is within [0, 0.15] for every distance, and a larger distance never gives a higher gain.

### Requirement 18: Content notice

**User Story:** As a visitor, I want a short warning that the site contains horror and gore, so that I can decide how to continue.

#### Acceptance Criteria

1. WHEN the app loads and no stored dismissal exists, THE HUD SHALL show the Content_Notice as a single line of text "Contains horror and gore" with a dismiss button.
2. WHEN the user activates the dismiss button by pointer, touch, Enter or Space, THE HUD SHALL hide the Content_Notice within 200 ms and SHALL store the dismissal so that the Content_Notice stays hidden on later page loads in the same browser.
3. IF the stored dismissal cannot be read or written, THEN THE HUD SHALL show the Content_Notice on each page load, SHALL hide it for the current page after dismissal, and SHALL raise no error.
4. THE HUD SHALL show the Notice_Link with the text "Contains horror and gore" in the footer, next to the footer text "Data: SEC EDGAR. Not investment advice.", at all times while the graveyard or the Table_View is displayed.
5. WHEN the user activates the Notice_Link, THE HUD SHALL show the Content_Notice within 200 ms and SHALL move keyboard focus to its dismiss button.
6. WHEN the Content_Notice is dismissed again after reopening, THE HUD SHALL return keyboard focus to the Notice_Link.
7. THE Content_Notice SHALL dock outside the 3D stage area, at the bottom edge above the footer or at the top edge, and SHALL NOT cover the Shock_Slider, the plot chips, the File_Card or the footer.
8. THE Content_Notice, the dismiss button and the Notice_Link SHALL each have an accessible name, be reachable with Tab in DOM order, and show a visible focus ring of at least 2 CSS pixels.
9. THE Content_Notice and the Notice_Link text SHALL have a contrast ratio of at least 4.5:1 against their background in both Lights_Mode values.
10. THE Content_Notice SHALL show the same text in lights on and lights off.
11. WHEN the user dismisses the Content_Notice with a click, tap or key press, THE Audio_Engine SHALL treat that action as the Interaction_Gate like any other first interaction.
12. THE Content_Notice SHALL fit on one line at 390 px viewport width, by truncating nothing and shrinking the font no smaller than 12 px.

### Requirement 19: Quality settings and accessibility for the horror pass

**User Story:** As a user with a weak GPU or sensory needs, I want the new effects to respect low quality and reduced motion, so that the graveyard stays usable.

#### Acceptance Criteria

1. WHERE the low quality toggle is on, THE Graveyard_Scene SHALL keep the Rise_Budget of 8 and the Standing_Budget of 4, SHALL halve the Grass_Cards (Requirement 6 criterion 9) and the Dirt_Burst particles, and SHALL render the characters without shadow casting.
2. WHERE the low quality toggle is on, THE Graveyard_Scene SHALL keep the Watcher rules of Requirement 14 unchanged.
3. THE Graveyard_Scene SHALL emit no more than 3 flashes in any 1 s window with the Horror_Pass effects (Dirt_Burst, Vanish_Glitch, Watcher appearance), as defined in Base_Spec Requirement 17.6.
4. THE Risen_Zombies, Standing_Zombies and the Watcher SHALL be decorative: THE Table_View, the File_Card, the live region and the keyboard navigation SHALL carry the same information and SHALL need no change to describe them.
5. THE Graveyard_Scene SHALL NOT let a character mesh take keyboard focus or pointer hover events.
6. THE Graveyard_Scene SHALL show no blood on any character WHILE Lights_Mode is "lights on" (Requirement 16 criterion 4), and the Hero_Model SHALL NOT be shown in that mode.
7. THE Table_View counters, the Risen_Counter and the Already_Undead line SHALL stay equal to the Base_Spec values for the same shock delta, whatever the Rise_Budget, because the budget limits the characters and not the data.

### Requirement 20: Preservation and supersession

**User Story:** As a maintainer, I want the working graveyard preserved and every deliberate change listed, so that the horror pass does not break what already works.

#### Acceptance Criteria

1. THE Horror_Pass SHALL preserve the behaviour of the Base_Spec for: data loading and the fixtures fallback (Requirement 1), the Shock_Model (Requirement 2), plot grouping (Requirement 3, except criteria listed in criterion 3 below), instanced stones and status shapes (Requirement 4), engravings (Requirement 5), blood decals on stones (Requirement 6), sky, lights and fog (Requirement 7, except criteria listed below), props (Requirement 8), Mutant and corpse (Requirement 9), Flashlight (Requirement 10, except criterion 7), plot framing and HUD labels (Requirement 11), File_Card (Requirement 12), Shock_Slider and counters (Requirement 13), CCTV_Pass (Requirement 15), Audio_Engine (Requirement 16, except criterion 4 which Requirement 17 criterion 9 changes), Lights_Mode and Reduced_Motion (Requirement 17), keyboard navigation (Requirement 18), Table_View (Requirement 19), Credits (Requirement 20) and quality (Requirement 21, except criterion 12).
2. THE existing Vitest tests of the Base_Spec SHALL continue to pass, except tests that assert a Base_Spec criterion listed in criterion 3, which SHALL be updated in the same change to assert the superseding criterion of this spec.
3. THE following Base_Spec criteria are superseded: 3.5 (heights now carry the 0.90 to 1.10 factor of Requirement 8, so the final height range is 0.765 m to 1.76 m), 3.10 for Fallen_Stones (Requirement 8 criterion 7), 7.1 (the ground uses the Ground_Texture, the soil material stays for mounds), 7.10 (every Headstone has a Closed_Mound or a Torn_Mound), 10.7 and the `plotPose` constants (Requirement 9), 14.1 to 14.10 (Craggle hands replaced by Requirement 10 to 15), 16.4 (digging once per Risen_Zombie) and 21.12 (this spec adds files to `web/public/assets` and rows to `CREDITS.md`).
4. THE `design.md` of this spec SHALL list each superseded Base_Spec test file and the change made to it.
5. THE Horror_Pass SHALL NOT change the store shape used by the Table_View and the HUD, except for the fields needed for the Content_Notice dismissal and the Settled_Shock value.
6. THE Horror_Pass SHALL NOT change `data-contract.md`, the JSON Schemas, `/data`, `/pipeline` or the engine in `web/src/engine`.
7. THE Horror_Pass SHALL keep the budgets of the Base_Spec: 400 KB gzip JS on the initial closure, 25 MB before the first frame, and the lab outside the initial closure.
8. THE new pure modules (selection, standing placement, Far_Spots, Watcher schedule, Growl_Limiter, Growl choice, Footstep_Bed gain, Bone_Animator, Stone_Jitter, camera pose) SHALL import neither React nor three.js.

### Requirement 21: Quality gates and evidence

**User Story:** As a maintainer, I want the usual checks, a measured frame rate and screenshots, so that the result can be accepted on evidence.

#### Acceptance Criteria

1. WHEN the full check runs from `web`, THE commands `pnpm typecheck`, `pnpm lint`, `pnpm format`, `pnpm test` and `pnpm build` SHALL each exit with code 0, and `pnpm build` SHALL include a passing `check-bundle` step that enforces the Group_Budget.
2. WHEN each Batch is complete, THE full check of criterion 1 SHALL pass before the Batch report is written.
3. WHEN the Measurement_Script runs, THE Measurement_Script SHALL drive headed (not headless) Playwright on the user's machine against the dev server with `?firms=3000`, in lights off, normal quality, at 1920 x 1080 pixels, with a Plot framed.
4. WHEN the Measurement_Script runs for the Horror_Pass, THE Measurement_Script SHALL first set the Shock_Slider to the lowest value in steps of 0.25 pp at which at least 8 Newly_Undead Firms exist among the 3,000 Firms, SHALL wait at least 2 s after the Settled_Shock, and SHALL then record frames for a continuous window of at least 10 s.
5. THE Measurement_Script entry in `DEVLOG.md` SHALL contain the average frames per second (rounded to 1 decimal), the minimum 1-second frames per second, the GPU name reported by the WebGL renderer information, the browser name and version, the viewport, the quality setting, the shock value used, the number of Risen_Zombies, Standing_Zombies and Watchers shown at the start of the window, and the date in YYYY-MM-DD form.
6. THE average frames per second in that entry SHALL be at least 50.
7. IF the average frames per second is below 50, THEN THE agent SHALL report the number, the GPU name and the cost of the largest contributors (Character_Models, Grass_Cards, Torn_Mounds, post-processing), and SHALL NOT mark the Horror_Pass complete.
8. IF the machine is not an integrated-GPU laptop, THEN THE Measurement_Script entry SHALL state that fact (Base_Spec Requirement 21.7).
9. THE agent SHALL report the measured numbers and the GPU name to the user, AND the final acceptance of the Horror_Pass SHALL be recorded only after the user gives a sign-off.
10. WHEN each Batch is complete, THE Playwright run SHALL save lights-off screenshots at 1920 x 1080 pixels to `reference/progress/horror-batch<N>-<name>.png`, where `<N>` is 1, 2 or 3, and each Batch SHALL save at least the screenshots listed in Requirement 22.
11. THE screenshots SHALL be taken in lights off and SHALL NOT be committed under any path other than `reference/progress/`.

### Requirement 22: Delivery in three batches and workflow rules

**User Story:** As the project owner, I want the work delivered in three reviewable batches with a stop after each, so that I can approve each step before the next one starts.

#### Acceptance Criteria

1. THE tasks of the Horror_Pass SHALL be split into three Batches: Batch 1 contains the assets and licensing (Requirements 1 to 5), Batch 2 contains the ground, graves, stones and camera (Requirements 6 to 9), and Batch 3 contains the zombies, the Watcher, the sound and the notice (Requirements 10 to 19).
2. THE tasks file SHALL end each Batch with a line `STOP` that tells the agent to stop and wait for the user, and SHALL contain no task of the next Batch before that line.
3. WHEN a Batch is complete, THE agent SHALL stop, report what was done, the check results, the screenshots and the open decisions, and SHALL start the next Batch only after the user approves.
4. THE Batch 1 deliverables SHALL include the two Growl files with their Manifest entries and `CREDITS.md` rows (Requirement 3 criteria 9 to 11 and 13), `reference/progress/horror-batch1-assets.png` (Requirement 2 criterion 4), the byte breakdown (Requirement 5 criterion 8) and the asset-auditor report.
5. THE Batch 2 deliverables SHALL include at least `reference/progress/horror-batch2-ground-graves.png`, taken at the Plot_Camera_Pose of Plot 1 with the nearest mounds in the lower half, and `reference/progress/horror-batch2-stones.png`, showing tilted, rotated and at least one Fallen_Stone.
6. THE Batch 3 deliverables SHALL include at least `reference/progress/horror-batch3-rise.png` (a Risen_Zombie at the waist-high pose), `reference/progress/horror-batch3-standing.png` (Standing_Zombies among stones), `reference/progress/horror-batch3-watcher.png` (the Watcher in the far rows), `reference/progress/horror-batch3-notice.png` (the Content_Notice), and the Measurement_Script numbers of Requirement 21.
7. WHEN files under `web/src/scenes/**` or `web/src/fx/**` change, THE agent SHALL name `reference/graveyard/horror-direction.png` and `reference/graveyard/horror-direction-sequence.png` as the matching references (and `reference/graveyard/graveyard-rate-shock-3pp.png` for unchanged parts), and SHALL offer a scene-critic review.
8. BEFORE using an API of `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `three-custom-shader-material` or `@theatre/core`, THE agent SHALL look it up with the context7 MCP server.
9. THE agent SHALL NOT edit `/pipeline`, `/data` generation code or `data-contract.md`.
10. THE agent SHALL pin every new dependency to an exact version, and SHALL add no dependency without naming it in the Batch report.
11. THE commit messages SHALL use conventional commits with the scope `graveyard-horror-pass`, for example `feat(graveyard-horror-pass): add torn mound`, and the agent SHALL create a commit only when the user asks.
12. BEFORE starting work the agent SHALL run `git pull`, because the repository is shared with the partner and a documentation assistant.
