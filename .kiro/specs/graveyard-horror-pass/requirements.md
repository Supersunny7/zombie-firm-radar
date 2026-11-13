# Requirements Document

## Introduction

The graveyard of the `graveyard-scene` spec works, but the picture is stiff, clean and not scary. The Horror_Pass makes the graveyard look and behave like the reference frames `reference/graveyard/horror-direction.png` and `reference/graveyard/horror-direction-sequence.png` and like the interactive prototype in `reference/graveyard/prototype/demo/` (`main.js`, `index.html`; reference only, never imported).

Premise (Control_Room_Direction, decided with the user on 2026-11-13): the viewer is a night guard watching a CCTV feed of a graveyard of US public firms. The emotional line is quiet, then unease that the viewer causes with the rate-shock lever. Where `reference/graveyard/control-room-direction.md` disagrees with this spec or the Base_Spec about the look (Batch 2b) or the zombies (Batch 3), the direction file wins for the graveyard; this document records each such change as a supersession.

Scope change (decided with the user on 2026-11-13): the experience plan (role, task list, capture, lab, two scares) is still being decided, so this spec stops at Batch 3. It delivers the look (Batch 2b: Requirements 23 to 25) and the zombies with the unease effects and sound (Batch 3: Requirements 26 to 29, plus the Risen_Zombie parts of Requirements 10, 11, 12, 15, 16 and 19). The control-room UI (OSD, camera switcher, rate console, hover tag, Opening, jump-scare face and font assets, steering exceptions; Requirements 30 to 37) is moved to a future control-room-experience spec and is not designed, tasked or delivered here. The plot-fall jump scare (Requirement 35) is cancelled; the graveyard scare will happen during capture in the future spec.

Every spooky element stays tied to a financial fact (`product.md`, `design-system.md`):

- A zombie that climbs out of a grave is a Newly_Undead firm at the current rate shock.
- A torn-open grave marks a `zombie` or Newly_Undead firm; a closed mound marks every other firm. A firm that is already `zombie` at shock 0 has a torn grave and no character.
- The unease effects (rumble, camera jitter, glitches, flashlight dips) grow with the rate shock the viewer sets.
- The dead-grass cards and the stone jitter are atmosphere only and carry no data.

**Superseded (control-room direction, 2026-11-13):** the earlier picture of a gaunt zombie shambling between stones (Standing_Zombies) and a hooded woman standing far back (Watcher) no longer holds; see Requirement 20 criterion 9.

The Horror_Pass is an extension of `graveyard-scene`. It reuses the Shock_Model, the shared `icr()`, the store, the Table_View, keyboard navigation, the Audio_Engine and the CCTV_Pass, except where the supersession lists in Requirement 20 say otherwise. The HUD, the File_Card, the Plot navigation and the Camera_Rig move of the Base_Spec stay as they are in this spec (Requirement 20 criterion 10); the Content_Notice has an open question (Requirement 18).

Scope boundaries:

- No change to `data-contract.md`, the JSON Schemas, the TypeScript types in `web/src/types` or any file under `/data`. No edit to `/pipeline` or to pipeline generation code.
- The engine in `web/src/engine` is not touched. Selection and placement rules live in pure modules under `web/src/scenes/graveyard` (no React, no three.js imports), and rendering lives in `web/src/scenes/graveyard/r3f` and `web/src/fx`.
- The lab, the Theatre.js cinematics and the capture interaction are out of scope. The lab's failure jump scare is separate and is not part of this spec.
- Animation uses rigged models and procedural keyframes on bones. No Mixamo animation clip is used anywhere (`animation-direction.md`, `asset-licensing.md`).
- **Superseded (control-room direction, 2026-11-13):** the work is delivered in four batches (1, 2, 3a, 3b); replaced by Requirement 38 (Batches 1, 2, 2b and 3, with a STOP after each). Batches 1 and 2 are complete.
- Removed after user testing and not built: deliberate frame-rate drops, the approaching walker, the hooded Watcher, breathing (chest motion and breath sounds), random lens attacks, "motion detected" alerts, the large case-file card, and the digging (shovel) sound for zombies.

## Glossary

- **Base_Spec**: The existing spec `.kiro/specs/graveyard-scene`. Terms defined there (Graveyard_Scene, Headstone, Stone_Renderer, Layout_Engine, Plot, Mound, Shock_Slider, Shock_Model, Newly_Undead, Already_Undead, Flashlight, CCTV_Pass, Lights_Mode, Reduced_Motion, Audio_Engine, Interaction_Gate, Sound_Setting, Camera_Rig, HUD, Table_View, File_Card, Credits_Dialog, Mutant, Greenall_Corpse, Craggle_Hand, Ground_Fog, Overview_Fog, Plot_Fog, Firm, Dev_Fixtures, Risen_Counter) keep their meaning here.
- **Horror_Pass**: The feature specified by this document.
- **Asset_Pipeline**: The tooling in `tools/fetch-assets.mjs`, `tools/picks.json` and `tools/asset-lib` that converts downloads into files under `web/public/assets`, writes `manifest.json` and checks licenses.
- **Manifest**: The file `web/public/assets/manifest.json`.
- **Hero_Model**: The glb for `sketchfab-possessed-undead-giantswing` ("Possessed undead" by giantSwing), given to the Story_Firm and to other Firms by the `modelFor` hash (Requirement 12). Not tied to distance or Lights_Mode.
- **Walker_Model**: The glb for `sketchfab-zombie-pxltiger` ("Zombie" by pxltiger). It keeps the clips Idle, Walk1_InPlace, Attack and FallingForward. It is one of the three `modelFor` results and the fallback model when another model fails to load (Requirement 12 criterion 7).
- **Crawler_Model**: The glb for `sketchfab-zombie-walk-oscar` ("Zombie Walk Test" by OSCAR CREATIVO). Its skeleton uses Mixamo bone names; the mesh and skeleton are kept and the animation clip is removed.
- **Watcher_Model**: The glb for `sketchfab-hooded-horror-woman-purplepoint` ("Terrifying Hooded Horror Woman" by Purple.Point). Since the control-room direction (2026-11-13) the file stays in the repository but the Graveyard_Scene does not load it (Requirement 26).
- **Character_Models**: The Hero_Model, Walker_Model, Crawler_Model and Watcher_Model together.
- **Story_Firm**: The Firm whose cik equals `storyCik`, the single Firm that the experience plan makes the captured zombie. `storyCik` is null (no Story_Firm) until the control-room-ui spec defines it. The Story_Firm always gets the Hero_Model.
- **modelFor**: The pure function `modelFor(cik, storyCik)` that returns the Hero_Model, Walker_Model or Crawler_Model for a Firm (Requirement 12). The graveyard, the future lab and the failure scare use the same function, so the captured zombie keeps one model everywhere.
- **Ground_Texture**: The one Poly Haven CC0 forest-floor or muddy-leaves texture set (diffuse, normal, roughness) chosen by the agent, at 1k resolution.
- **Graveyard_Asset_Group**: Every file the Graveyard_Scene downloads in a session with all optional models in use: the Ground_Texture, the Character_Models, the three stone models, the files referenced by `props.json` (including the Mutant, the Greenall_Corpse, the cobweb pack and the rubble textures), and for each sound one file in the format the Audio_Engine requests. The HDRI files are reported separately and are not part of the group.
- **Group_Budget**: 25,000,000 bytes (25 MB) for the Graveyard_Asset_Group.
- **Settled_Shock**: The Shock_Slider value 250 ms after the last change to that value.
- **Selection_Event**: Either a Settled_Shock, or a change of the Camera_Rig target (a Plot index or the overview), or the first successful load of the Firm list.
- **Selection_Pose**: The camera position used to measure distance at a Selection_Event. For a Selection_Event caused by a Camera_Rig target change it is the destination pose of that target, not the interpolated pose.
- **Risen_Zombie**: A zombie character that climbs out of the grave of one Newly_Undead Firm.
- **Rise_Budget**: The maximum of 8 Risen_Zombies animating at once.
- **Standing_Zombie**: **Superseded (control-room direction, 2026-11-13):** retired; Already_Undead Firms show a Torn_Mound and no character (Requirement 26). Former meaning: a Walker_Model character that stands or shambles in place beside the Headstone of one Already_Undead Firm.
- **Standing_Budget**: **Superseded (control-room direction, 2026-11-13):** retired with the Standing_Zombie (Requirement 26). Former meaning: the maximum of 4 Standing_Zombies at once.
- **Rise_Sequence**: The procedural motion of a Risen_Zombie from underground to a waist-high pose on the grave rim. Since the control-room direction it starts with the Stir, is interrupted by the Rise_Cut and follows the Rise_Keys (Requirement 27).
- **Idle_Loop**: The procedural behaviour of a Risen_Zombie after the Rise_Sequence. Since the control-room direction it is the Stare, idle finger clawing and random head twitches, with no breathing (Requirement 27).
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
- **Watcher**: **Superseded (control-room direction, 2026-11-13):** retired (Requirement 26). Former meaning: the single hooded woman character that uses the Watcher_Model.
- **Cone_Active**: **Superseded (control-room direction, 2026-11-13):** retired with the Watcher (Requirement 26). Former meaning: the state in which the Flashlight has a player-driven target: on pointer devices, the pointer is inside the canvas; on touch devices, at least one tap on the canvas has occurred since page load.
- **Cone_Target**: The point the Flashlight aims at: on pointer devices, the pointer ray hit (Base_Spec Requirement 10.3); on touch devices, the ray hit of the most recent tap. While an Auto_Aim is active it is the Auto_Aim point.
- **Far_Spots**: **Superseded (control-room direction, 2026-11-13):** retired with the Watcher (Requirement 26). Former meaning: positions for the Watcher on the ground within the farthest two rows of the framed Plot, outside every Headstone and zombie footprint.
- **Vanish_Glitch**: **Superseded (control-room direction, 2026-11-13):** retired with the Watcher (Requirement 26). Former meaning: the CCTV_Pass tracking glitch of at most 0.4 s that plays when the Watcher vanishes.
- **Growl**: One of the two CC0 sounds `freesound-tonsil5-zombie-growl-5` (https://freesound.org/people/tonsil5/sounds/555417/, source file `freesound-tonsil5-zombie-growl-5.wav`) and `freesound-ezcah-zombie-growl-01` (https://freesound.org/people/Ezcah/sounds/204821/, source file `freesound-ezcah-zombie-growl-01.flac`), played when a Risen_Zombie finishes its Rise_Sequence. Both source files are already in `tools/cache/manual`.
- **Growl_Source**: The injectable random source (a function that returns a number in [0, 1)) that picks which of the two Growl files plays for one rise. Production code supplies a non-seeded source and tests supply a seeded one.
- **Growl_Limiter**: The Audio_Engine rule that allows at most one Growl start per 1,000 ms.
- **Footstep_Bed**: **Superseded (control-room direction, 2026-11-13):** retired with the Standing_Zombie (Requirement 26). Former meaning: the quiet looping shambling-footsteps sound `freesound-indieground-pas-zombie-route`, played near Standing_Zombies. The file, its Manifest entry and its `CREDITS.md` row stay in the repository.
- **Nearby_Standing_Zombie**: **Superseded (control-room direction, 2026-11-13):** retired (Requirement 26).
- **Footstep_Distance**: **Superseded (control-room direction, 2026-11-13):** retired (Requirement 26).
- **Content_Notice**: **Superseded (control-room direction, 2026-11-13):** replaced by the Opening and the Warning_Replay menu item (Requirement 34). Former meaning: the dismissible one-line note with the text "Contains horror and gore".
- **Notice_Link**: **Superseded (control-room direction, 2026-11-13):** replaced by the Warning_Replay menu item (Requirement 34). Former meaning: the footer control that reopens the Content_Notice.
- **Batch**: One of the delivery groups 1, 2, 2b and 3 in Requirement 38. The former Batch 4 (control-room UI) is moved to the future control-room-experience spec. (Before 2026-11-13: 1, 2, 3a, 3b in Requirement 22.)
- **Measurement_Script**: The existing headed-Playwright fps script of Base_Spec Requirement 21.5 to 21.8.
- **Control_Room_Direction**: The file `reference/graveyard/control-room-direction.md` with its exact look values in `reference/graveyard/horror-direction-params.md` and the Prototype.
- **Prototype**: The reference-only files `reference/graveyard/prototype/demo/main.js` and `index.html`. No app code imports them.
- **Shock_pp**: The current Shock_Slider value in percentage points, from 0 to 5 (delta x 100).
- **Framed_Set** (moved to the future control-room-experience spec): The Firms whose Headstone base projects inside the camera viewport at the Plot_Camera_Pose of the framed Plot, with no sway, no jitter and the pointer centred. It is computed once per Selection_Event caused by a Camera_Rig target change or by the first Firm list load, and is empty in the overview.
- **Plot_Fall** (moved to the future control-room-experience spec): The event that occurs when the Framed_Set is not empty, every shock-eligible Firm in the Framed_Set that is not `zombie` at delta 0 is Newly_Undead, and the last Risen_Zombie assigned among them has finished its Rise_Sequence.
- **Fall_Armed** (moved to the future control-room-experience spec): The per-Plot flag that allows the next Plot_Fall. It is true at page load and becomes true again only after the Plot_Fall condition stops holding at a lower shock for that Plot.
- **Jump_Scare** (moved to the future control-room-experience spec): The one graveyard scare that follows a Plot_Fall (Requirement 35).
- **Jump_Scare_Face** (moved to the future control-room-experience spec): The image `jumpscare-face.webp`, an own render of the Hero_Model, used by the Jump_Scare.
- **Static_Cut**: A short full-feed static of the CCTV_Pass: the whole feed is replaced by animated noise for the stated duration (0.32 s for the Rise_Cut), accompanied by a tracking glitch of the stated length. It is allowed in both Lights_Mode values and under Reduced_Motion (Requirement 27 criteria 14 and 15). Camera switches, the Opening and the scares that will also use it belong to the future control-room-experience spec.
- **Stir**: The 1.4 s phase before the soil breaks, in which the Closed_Mound of a Firm shakes and the rumble swells.
- **Rise_Cut**: The Static_Cut during the Rise_Sequence after which the Risen_Zombie is shown already hauled out to the waist.
- **Rise_Keys**: The five key poses of the Prototype `KEYS` table (times 0.0, 0.7, 1.5, 2.3 and 3.2 s, root height -1.8 m to -0.95 m) with the Jerk_Easing.
- **Jerk_Easing**: The easing of the Prototype `jerk` function: over the first 40 percent of a key interval the pose moves 8 percent of the way, then lurches the remaining 92 percent with a cubic ease-out.
- **Stare**: The 2.8 s smoothstep blend of a Risen_Zombie's head direction, after the Rise_Sequence, from the last Rise_Keys head direction to the normalized sum of the unit vector from the head bone to the camera and (0, 0.15, 0) (Requirement 27 criterion 8).
- **Auto_Aim**: The 2.2 s period after a Stir starts in which the Flashlight aims at that grave unless the pointer moves.
- **Unease_Effects**: The shock-driven rumble gain, Camera_Jitter, Random_Glitch and Flash_Dip of Requirement 28.
- **Camera_Jitter**: The camera offset of 0.0006 x Shock_pp x sin(23 t) m in x and 0.0005 x Shock_pp x sin(31 t) m in y.
- **Random_Glitch**: A CCTV_Pass tracking glitch that starts on a frame with chance 0.002 + 0.0025 x Shock_pp.
- **Flash_Dip**: A frame on which the Flashlight intensity is multiplied by 0.3, with chance 0.004 x Shock_pp per frame.
- **Flash_Limiter**: The pure rule that counts every Static_Cut, Random_Glitch, Flash_Dip and Flashlight flicker as a flash candidate and drops every candidate that would make more than 3 flashes in any 1 s window.
- **Rumble_Bed**: The loop `freesound-lennartgreen-low-rumble-loopable`.
- **CCTV_Grade**: The six-step colour grade of Requirement 23, applied after tone mapping.
- **Lantern_Light**: The point light of the lantern prop.
- **OSD** (moved to the future control-room-experience spec): The on-screen display of the CCTV monitor, rendered in the DOM over the 3D stage: viewfinder corners, REC line, Camera_Switcher, timestamp, source line, Rate_Console, Controls_Hint, OSD_Menu, Hover_Tag, the data footer line and the live region.
- **Camera_Switcher** (moved to the future control-room-experience spec): The row of small boxes, one per camera, that switches the camera with a Static_Cut. CAM 00 is the overview; CAM nn (nn = Plot number, two digits) is Plot nn.
- **Camera_Switch** (moved to the future control-room-experience spec): A change of camera through the Camera_Switcher, a number key, the arrow keys or keyboard focus. It is 0.28 s of Static_Cut followed by a 0.12 s glitch, with the cut to the new pose on one frame inside the Static_Cut (Requirement 31 criterion 5).
- **Rate_Console** (moved to the future control-room-experience spec): The bottom-centre panel that holds the Shock_Slider, its tick labels, the disclosure lines and the Risen_LED.
- **Risen_LED** (moved to the future control-room-experience spec): The red two-digit `RISEN` counter in the Rate_Console. It shows the Base_Spec Risen_Counter value.
- **Controls_Hint** (moved to the future control-room-experience spec): The three-line hint at the bottom left that fades after 14 s.
- **OSD_Menu** (moved to the future control-room-experience spec): The `≡ MENU` button at the bottom right and the menu it opens.
- **Warning_Replay** (moved to the future control-room-experience spec): The OSD_Menu item "Content warning" that shows the Opening again.
- **Hover_Tag** (moved to the future control-room-experience spec): The small two-line tag next to the pointer or the focused stone that names a Firm, its shocked ICR and a Status_Word.
- **Status_Word** (moved to the future control-room-experience spec): The word on line 2 of the Hover_Tag: RESTING, ENDANGERED, RISEN, ZOMBIE or NO DATA.
- **Firm_Lookup** (moved to the future control-room-experience spec): The pure function that maps a pick result (Headstone instance, Mound instance or Risen_Zombie slot) to its Firm.
- **Opening** (moved to the future control-room-experience spec): The black intro screen with four typed lines, the connect button and the warning line.
- **Opening_Key** (moved to the future control-room-experience spec): The localStorage key `zfr.opening.v1` that records that the Opening has been completed once.
- **OSD_Font** (moved to the future control-room-experience spec): The VT323 font (Google Fonts, SIL OFL), added through the Asset_Pipeline.

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
3. WHILE Lights_Mode is "lights on", THE Graveyard_Scene MAY request the Hero_Model, because the model of a Firm does not depend on Lights_Mode (Requirement 12 criterion 3). The Watcher_Model is never requested (Requirement 26 criterion 2).
4. **Superseded (control-room direction, 2026-11-13):** replaced by Requirement 26 criterion 2 (the Watcher_Model is never requested). Former text: WHILE Reduced_Motion is true, THE Graveyard_Scene SHALL NOT request the Watcher_Model.
5. THE Graveyard_Scene SHALL load each Character_Model at most once per page session and SHALL reuse the loaded geometry and textures for every character instance of that model.
6. THE Graveyard_Asset_Group SHALL total at most the Group_Budget.
7. WHEN the bundle check runs, THE bundle check SHALL compute the Graveyard_Asset_Group size from the Manifest, SHALL print the bytes per category (ground, Character_Models, stones, props, sounds) and the separate HDRI bytes, and SHALL fail with a non-zero exit code and a message naming the measured size and the Group_Budget WHEN the total exceeds the Group_Budget.
8. THE Batch 1 report and the final report SHALL include the same per-file and per-category byte breakdown, with and without the HDRI files.
9. THE initial download before the first frame SHALL stay at or below 25 MB and the Base_Spec Requirement 8.10 check SHALL continue to pass.
10. THE Graveyard_Asset_Group SHALL contain no file with a Manifest bytes value above 5,000,000, except the 2k sky HDRI which is outside the group.
11. IF a Character_Model fails to load, THEN THE Graveyard_Scene SHALL report the failed asset name in the developer console, SHALL use the fallback of Requirement 12 criterion 7, and SHALL keep running.
12. THE Asset_Pipeline ceiling `LIMITS.graveyard` in `tools/asset-lib/budgets.mjs` SHALL be 40,000,000 bytes, counted on disk over every file of the graveyard Manifest group (both HDRI files, both audio formats and unused sources), and the Group_Budget of criterion 6 SHALL stay the binding limit for the visitor session.
13. IF the Graveyard_Asset_Group exceeds the Group_Budget, THEN THE agent SHALL reduce it in this fixed order and SHALL stop at the first step after which the total is at most the Group_Budget: first, stop loading and shipping the assets the Graveyard_Scene no longer uses, namely the Craggle_Hand (Requirement 15) and the Mutant, which the Watcher replaces (the Mutant file leaves `groupAssets.json` and the scene only after the user approves superseding Base_Spec Requirement 9 for the Mutant); second, reduce texture quality (a lower texture resolution or a stronger compression for the largest texture files in the group, never below the resolution that keeps Requirement 6 criterion 1).
14. WHENEVER criterion 13 is applied, or the Group_Budget check fails, THE agent SHALL report the per-file and per-category byte breakdown (criterion 8) before and after each step, and SHALL name each file that was removed or recompressed.

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
10. WHILE Lights_Mode is "lights on", THE Graveyard_Scene SHALL show the Torn_Mound with the Pit and the Clods and SHALL show no blood on the Torn_Mound. (Blood on characters is a separate rule: Requirement 27 criterion 14.)
11. WHILE Lights_Mode is "lights off", THE Graveyard_Scene SHALL show no more than 3 dark-red stain decals on each Torn_Mound.

### Requirement 8: Break the stone grid

**User Story:** As a viewer, I want the stones scattered like a real old graveyard, so that the grid stops looking like a parking lot.

#### Acceptance Criteria

1. THE Layout_Engine SHALL derive the Stone_Jitter of each Firm from a seeded generator whose seed is a hash of the Firm's `cik` only, so that the jitter of one Firm does not change WHEN other Firms are added to or removed from the list.
2. THE Layout_Engine SHALL apply a position offset to each Headstone that is at most 0.30 m on the ground plane in each axis before spacing correction.
3. THE Layout_Engine SHALL apply a yaw offset in the closed range -20 degrees to +20 degrees to each Headstone.
4. THE Layout_Engine SHALL apply a total tilt of at most 8 degrees (the angle between the stone's up axis and vertical) to each upright Headstone.
5. THE Layout_Engine SHALL multiply the Base_Spec height of each Headstone by a seeded factor in the closed range 0.90 to 1.10.
6. THE Layout_Engine SHALL set the Fallen_Stone flag for between 3 percent and 7 percent of the Firms of any generated list of 2,500 to 3,000 Firms, chosen by the seeded generator. For a list of fewer than 2,500 Firms the 3 to 7 percent share is a statistical expectation only and carries no hard guarantee.
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

1. **Superseded (control-room direction, 2026-11-13):** replaced by Requirement 23 criterion 1 (eye height 1.2 m). Former text: THE Camera_Rig SHALL place the Plot_Camera_Pose at an eye height of 1.5 m, with a tolerance of 0.1 m.
2. THE Camera_Rig SHALL place the Plot_Camera_Pose so that the horizontal distance from the camera to the nearest Headstone of the framed Plot is at most 4.0 m.
3. (Re-checked with the Requirement 23 camera values: FOV 46 degrees, eye height 1.2 m, look-at height 0.6 m.) WHEN a Plot is framed at its Plot_Camera_Pose with the pointer centred and no handheld sway, THE bases of the nearest-row mounds of that Plot SHALL project into the lower half of the viewport (below the vertical centre) at 1440 x 900 and at 390 x 844 pixels.
4. THE Camera_Rig SHALL keep the Plot_Camera_Pose inside the Plot boundary extended by the Plot gap, so that the camera is among the graves and not on the path outside.
5. **Superseded in part (control-room direction, 2026-11-13):** the field of view becomes 46 degrees (Requirement 23 criterion 1). The look-target smoothing, the handheld sway amplitudes, the camera-local Flashlight offset and the 1.5 s move limit of the Base_Spec stay; the cut-based camera switch that would replace the move limit is moved to the future control-room-experience spec. Former text: THE Camera_Rig SHALL keep the field of view 52 degrees, the look-target smoothing, the handheld sway amplitudes, the camera-local Flashlight offset and the 1.5 s move limit of the Base_Spec.
6. THE Camera_Rig SHALL keep the overview pose rule (all Plots fully inside the viewport) and SHALL NOT apply the Plot eye height (1.2 m since Requirement 23) to the overview.
7. WHEN the Plot_Camera_Pose changes eye height or distance, THE Camera_Rig SHALL set the look target so that the pointer offset keeps the Base_Spec ranges (pointer.x * 3.2 and 0.2 + pointer.y * 1.3 relative to the plot look point).
8. THE Camera_Rig tests SHALL cover criteria 1, 2, 4 and 6 with a property test over generated Plot sizes, with at least 100 cases.
9. THE Plot_Camera_Pose at the start of the session SHALL be the pose that frames Plot 1.
10. **Superseded (control-room direction, 2026-11-13):** replaced by Requirement 23 criteria 4 to 6 (lights-off Plot_Fog values, fog switches at the cut). Former text: THE Graveyard_Scene SHALL keep the fog rules of Base_Spec Requirement 7 (Plot_Fog, Overview_Fog, interpolation) unchanged at the new pose.

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
13. **Superseded (control-room direction, 2026-11-13):** replaced by Requirement 33 criteria 2 and 3 (the skinned mesh is never raycast; a Risen_Zombie resolves to its Firm through the Firm_Lookup). Open question (2026-11-13): Requirement 33 is moved to the future control-room-experience spec; until it ships, this criterion is neither enforced nor removed. Decision pending with the user. Former text: THE Graveyard_Scene SHALL let a Risen_Zombie never intercept the pointer ray used for Headstone picking.

### Requirement 11: Rise sequence and idle

**User Story:** As a viewer, I want the zombie to haul itself out in jerky, held poses, then breathe and twitch, so that it feels physical and unsettling.

#### Acceptance Criteria

1. THE Bone_Animator SHALL compute the Rise_Sequence from procedural keyframes on the model bones and SHALL NOT play any animation clip for the Rise_Sequence.
2. **Superseded (control-room direction, 2026-11-13):** replaced by Requirement 27 criteria 1 to 6 (Stir, soil break, Rise_Cut, Rise_Keys). Former text: THE Bone_Animator SHALL run the Rise_Sequence in this order: fingers break the soil with a Dirt_Burst; head and shoulders jerk up; arms plant on the Pit rim; the torso hauls out to the waist.
3. **Superseded (control-room direction, 2026-11-13):** replaced by Requirement 27 criterion 6 (Rise_Keys end at 3.2 s). Former text: THE Rise_Sequence SHALL last 3.0 s with a tolerance of 0.3 s from the start of the first phase to the start of the Idle_Loop.
4. **Superseded (control-room direction, 2026-11-13):** replaced by Requirement 27 criterion 6 (five Rise_Keys with the Jerk_Easing). Former text: THE Rise_Sequence SHALL use at least 4 key poses, each reached by a transition of at most 200 ms and then held for at least 100 ms.
5. THE Graveyard_Scene SHALL emit the Dirt_Burst once, at the moment the fingers break the soil, from a pooled particle set of at most 40 particles per Risen_Zombie.
6. THE Graveyard_Scene SHALL show no body part of a Risen_Zombie below the waist, and no body part through the ground surface, at any frame of the Rise_Sequence or the Idle_Loop.
7. THE Graveyard_Scene SHALL keep the root of a Risen_Zombie fixed relative to its Pit during the Idle_Loop and SHALL keep its hands planted on the rim (no foot sliding, no hand sliding).
8. WHEN the Rise_Sequence ends, THE Graveyard_Scene SHALL start the Idle_Loop within one frame, and SHALL emit one rise-finished event for that Risen_Zombie.
9. **Superseded (control-room direction, 2026-11-13):** replaced by Requirement 27 criteria 8 and 9 (no breathing; twitches every 1.2 s to 3.5 s lasting 0.18 s; finger clawing). Former text: WHILE the Idle_Loop runs, THE Bone_Animator SHALL apply a breathing motion of the chest at a period between 3 s and 5 s, and SHALL apply a head twitch at random intervals between 1 s and 4 s, each twitch lasting at most 250 ms.
10. THE Bone_Animator SHALL draw the twitch intervals from a generator seeded by the `cik` of the Firm, so that the same Firm shows the same twitch schedule in two sessions.
11. THE Bone_Animator SHALL provide a bone map for each of the Hero_Model, the Walker_Model and the Crawler_Model that names the bones used for fingers, head, shoulders, arms, spine and chest, and a Vitest test SHALL assert that every bone name of each map exists in the loaded model.
12. THE Bone_Animator SHALL be pure: for equal elapsed time, bone map and seed, it SHALL return equal bone rotations, and it SHALL import neither React nor three.js.
13. **Superseded (control-room direction, 2026-11-13):** replaced by Requirement 27 criterion 12 (same smoothness limits, the Rise_Cut jump exempt). Former text: FOR ALL elapsed times from 0 s to 10 s, THE Bone_Animator SHALL return rotations whose angle change between two samples 1/60 s apart is at most 25 degrees per bone, except inside the transitions of criterion 4 where the limit is 90 degrees.
14. THE Graveyard_Scene SHALL advance the Rise_Sequence, the Idle_Loop and every other timed behaviour of the Horror_Pass with the render-loop clock, and SHALL NOT use `setTimeout` or `setInterval` for choreography. The Settled_Shock debounce of Requirement 10 criterion 4 is an input debounce and is exempt.
15. **Superseded (control-room direction, 2026-11-13):** replaced by Requirement 27 criterion 15 (reduced motion keeps the Stir without shake and a shorter Rise_Cut). Former text: WHILE Reduced_Motion is true, THE Graveyard_Scene SHALL show each Risen_Zombie in its final pose (waist-high on the rim, arms planted) in the first rendered frame after assignment, SHALL apply no Dirt_Burst, no breathing and no head twitch, and SHALL still emit the rise-finished event in that frame.
16. **Superseded (control-room direction, 2026-11-13):** replaced by Requirement 27 criterion 13 (1.80 m to 1.85 m, with material scaling). Former text: THE Graveyard_Scene SHALL make each character stand 1.6 m to 1.9 m tall when fully upright, by scaling the loaded model, so that characters from different source units have a comparable size.

### Requirement 12: Which model each zombie uses

**User Story:** As a viewer, I want each firm to have one fixed zombie model, with the story firm always the best-looking one, so that the crowd does not look cloned and the captured zombie is the same in the graveyard, the lab and the failure scare.

#### Acceptance Criteria

1. THE model of a Firm SHALL be the result of the pure function `modelFor(cik, storyCik)`: the Firm whose `cik` equals `storyCik` gets the Hero_Model; every other Firm gets one of the Hero_Model, the Walker_Model or the Crawler_Model, chosen by a hash of its `cik`. Until the control-room-ui spec defines the Story_Firm, `storyCik` is null (no Firm is the Story_Firm).
2. THE result of `modelFor` SHALL NOT depend on distance, camera, selection, Lights_Mode, Reduced_Motion or call order.
3. WHILE Lights_Mode is "lights on", THE Risen_Zombie SHALL keep the same model as in "lights off"; the Hero_Model MAY load in lights on; the blood SHALL be desaturated (the blood material colour set to grey); and no Stare, no head twitch and no camera shake SHALL be applied (Requirement 27 criterion 14).
4. WHEN Lights_Mode changes while a Risen_Zombie is shown, THE Graveyard_Scene SHALL keep its model, its current phase (Rise_Sequence time or Idle_Loop time) and its position.
5. THE model of a Risen_Zombie SHALL NOT change at a Selection_Event, at a Lights_Mode change or when the camera moves; it changes only when `storyCik` changes.
6. IF a model needed by a Risen_Zombie has not finished loading, THEN THE Graveyard_Scene SHALL start the Rise_Sequence only after the model is available, with the Torn_Mound already shown.
7. IF a model needed by a Risen_Zombie fails to load, THEN THE Graveyard_Scene SHALL use the Walker_Model for that Risen_Zombie; IF the Walker_Model fails to load, THEN THE Graveyard_Scene SHALL render no Risen_Zombie, SHALL emit no rise event, and SHALL keep the Torn_Mounds.
8. **Superseded (control-room direction, 2026-11-13):** replaced by Requirement 26 criterion 4 (at most 8 skinned characters). Former text: THE Graveyard_Scene SHALL have at most 13 skinned characters in the scene at any frame (8 Risen_Zombies, 4 Standing_Zombies and 1 Watcher).
9. THE function `modelFor` SHALL be exported from a pure module (no React, no three.js) so that the future lab can reuse it, with a fast-check property of at least 100 cases: the same input always gives the same model, and the result is independent of call order and of the other Firms.

### Requirement 13: **Superseded (control-room direction, 2026-11-13):** Standing zombies for firms already undead

Replaced by Requirement 26 criteria 1 and 3: Already_Undead Firms keep the Torn_Mound and show no character. Every criterion below is superseded and kept only for traceability.

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

### Requirement 14: **Superseded (control-room direction, 2026-11-13):** The hooded woman

Replaced by Requirement 26 criterion 2: the Watcher is not built. Every criterion below is superseded and kept only for traceability.

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
2. **Superseded (control-room direction, 2026-11-13):** replaced by Requirement 27 criterion 14 (lights on keeps the Stir and the Rise_Cut, with no shake and no Stare). Former text: WHILE Lights_Mode is "lights on", THE Graveyard_Scene SHALL run the same Rise_Sequence timing and motion as in "lights off", including the Dirt_Burst.
3. **Superseded (2026-11-14):** replaced by Requirement 12 criteria 1 to 3 (the model of a Firm does not change in lights on). Former text: WHILE Lights_Mode is "lights on", THE Graveyard_Scene SHALL use the Walker_Model in place of the Hero_Model.
4. WHILE Lights_Mode is "lights on", THE Graveyard_Scene SHALL draw no blood decal on Headstones or Mounds, as in Base_Spec Requirement 6.2. (Blood on characters is desaturated to grey in lights on, not removed: see Requirement 27 criterion 14.)
5. **Superseded in part (control-room direction, 2026-11-13):** the Footstep_Bed part is retired (Requirement 26). WHILE Lights_Mode is "lights on", THE Audio_Engine SHALL play no Growl.
6. **Superseded (control-room direction, 2026-11-13):** the Watcher is retired (Requirement 26). Former text: WHILE Lights_Mode is "lights on", THE Graveyard_Scene SHALL show no Watcher and SHALL start no Vanish_Glitch.
7. THE Graveyard_Scene SHALL show the same Firm statuses, figures and labels in both Lights_Mode values (Base_Spec Requirement 17.3).

### Requirement 17: Growl when a zombie finishes rising, and footsteps near standing zombies

(Since the control-room direction, 2026-11-13: criteria 3 and 9 and criteria 12 to 21 are superseded; see Requirement 29.)

**User Story:** As a viewer, I want a low growl when a zombie finishes hauling itself out and a faint shuffle near the zombies that stand among the stones, so that the scene sounds as unsettling as it looks.

#### Acceptance Criteria

1. WHEN a rise-finished event occurs, Lights_Mode is "lights off" and the Audio_Engine is not muted, THE Audio_Engine SHALL start one Growl within 200 ms of the event, choosing one of the two Growl files with the Growl_Source once per rise.
2. THE Growl_Limiter SHALL allow at most one Growl start in any window of 1,000 ms, and SHALL drop (not queue) every rise-finished event that arrives inside the window after a Growl start.
3. **Superseded (control-room direction, 2026-11-13):** replaced by Requirement 29 criteria 1 and 2 (positional gain, pitch, pan). Former text: THE Audio_Engine SHALL play the Growl at a gain no higher than 0.4 of full scale after the master gain, and SHALL stop it, with a fade-out, no later than 3 s after its start.
4. WHILE Lights_Mode is "lights on", THE Audio_Engine SHALL play no Growl.
5. WHILE the Interaction_Gate has not occurred, or the Audio_Engine is muted, THE Audio_Engine SHALL play no Growl and SHALL NOT replay or queue Growls triggered during that time (Base_Spec Requirements 16.1 and 16.8).
6. THE Audio_Engine SHALL load the Growl only from the Manifest entries `freesound-tonsil5-zombie-growl-5` and `freesound-ezcah-zombie-growl-01`, and SHALL load them lazily at the first rise-finished event or the first Lights_Mode change to "lights off" after the Interaction_Gate, whichever is first.
7. IF one Growl file fails to load or decode, THEN THE Audio_Engine SHALL play the other file for every Growl; IF both fail, THEN THE Audio_Engine SHALL skip the Growl, keep all other sounds working, and show no error to the user.
8. WHILE Reduced_Motion is true, THE Audio_Engine SHALL play the Growl on the same rise-finished events and with the same limiter as in standard motion (Base_Spec Requirement 16.7).
9. **Superseded (control-room direction, 2026-11-13):** replaced by Requirement 26 criterion 6 (no digging sound for zombies). Former text: THE Audio_Engine SHALL keep playing the digging sound once per Risen_Zombie at the start of its Rise_Sequence, in place of once per Craggle_Hand (Base_Spec Requirement 16.4).
10. THE Growl_Limiter SHALL be a pure function of the event times, with a fast-check property of at least 100 cases: for any sequence of event times the number of accepted Growls in any 1,000 ms window is at most 1, and the first event after a gap of at least 1,000 ms is accepted.
11. THE Growl choice SHALL be a pure function of the value returned by the Growl_Source, with fast-check properties of at least 100 cases: the chosen file is always one of the two Growl files, the same Growl_Source value always gives the same file, and values below 0.5 and from 0.5 up select different files.
12. **Superseded (control-room direction, 2026-11-13):** the Footstep_Bed is retired (Requirement 26 criterion 5). Former text: WHILE a Nearby_Standing_Zombie exists, the Audio_Engine is not muted, the Interaction_Gate has occurred and Reduced_Motion is false, THE Audio_Engine SHALL play the Footstep_Bed as a continuous loop, in "lights on" and in "lights off".
13. **Superseded (control-room direction, 2026-11-13):** the Footstep_Bed is retired (Requirement 26 criterion 5). Former text: THE Audio_Engine SHALL load the Footstep_Bed only from the Manifest entry `freesound-indieground-pas-zombie-route`, and SHALL load it lazily when the first Nearby_Standing_Zombie exists after the Interaction_Gate.
14. **Superseded (control-room direction, 2026-11-13):** the Footstep_Bed is retired (Requirement 26 criterion 5). Former text: WHEN the first Nearby_Standing_Zombie appears while the Footstep_Bed is stopped, THE Audio_Engine SHALL start the loop with a fade-in of 1 s.
15. **Superseded (control-room direction, 2026-11-13):** the Footstep_Bed is retired (Requirement 26 criterion 5). Former text: THE Audio_Engine SHALL set the Footstep_Bed gain after the master gain to 0.15 multiplied by an attenuation factor that is 1 at a Footstep_Distance of 2 m or less, falls linearly to 0 at 12 m, and is 0 beyond 12 m, so that the gain is never above 0.15.
16. **Superseded (control-room direction, 2026-11-13):** the Footstep_Bed is retired (Requirement 26 criterion 5). Former text: WHILE the Footstep_Bed plays, THE Audio_Engine SHALL update the gain of criterion 15 from the current Footstep_Distance at every rendered frame, with a smoothing time of at most 250 ms.
17. **Superseded (control-room direction, 2026-11-13):** the Footstep_Bed is retired (Requirement 26 criterion 5). Former text: WHEN no Nearby_Standing_Zombie exists, THE Audio_Engine SHALL fade the Footstep_Bed out over 1 s with a tolerance of 0.1 s and SHALL then stop the loop.
18. **Superseded (control-room direction, 2026-11-13):** the Footstep_Bed is retired (Requirement 26 criterion 5). Former text: WHILE the Interaction_Gate has not occurred, or the Audio_Engine is muted, THE Audio_Engine SHALL play no Footstep_Bed, and WHEN the Audio_Engine is unmuted while a Nearby_Standing_Zombie exists, THE Audio_Engine SHALL start the Footstep_Bed as in criterion 14.
19. **Superseded (control-room direction, 2026-11-13):** the Footstep_Bed is retired (Requirement 26 criterion 5). Former text: WHILE Reduced_Motion is true, THE Audio_Engine SHALL play no Footstep_Bed and SHALL NOT load it, because the Standing_Zombies do not move; WHEN Reduced_Motion changes to true while the Footstep_Bed plays, THE Audio_Engine SHALL fade it out over 1 s and stop it as in criterion 17; WHEN Reduced_Motion changes to false while a Nearby_Standing_Zombie exists, the Audio_Engine is not muted and the Interaction_Gate has occurred, THE Audio_Engine SHALL start the Footstep_Bed as in criterion 14. The Growl is not affected (criterion 8).
20. **Superseded (control-room direction, 2026-11-13):** the Footstep_Bed is retired (Requirement 26 criterion 5). Former text: IF the Footstep_Bed fails to load or decode, THEN THE Audio_Engine SHALL skip it, keep all other sounds working, and show no error to the user.
21. **Superseded (control-room direction, 2026-11-13):** the Footstep_Bed is retired (Requirement 26 criterion 5). Former text: THE Footstep_Bed gain function (criterion 15) SHALL be a pure function of the Footstep_Distance, with a fast-check property of at least 100 cases: the gain is within [0, 0.15] for every distance, and a larger distance never gives a higher gain.

### Requirement 18: **Superseded (control-room direction, 2026-11-13):** Content notice

Replaced by Requirement 34 (the Opening and the Warning_Replay menu item) and Requirement 30 criterion 8 (the data footer line). Every criterion below is superseded and kept only for traceability.

Open question (2026-11-13): the Opening that replaces this is moved out of this spec; until the future spec ships, the Content_Notice of this requirement is neither built nor removed from the app. Decision pending with the user.

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

1. **Superseded in part (control-room direction, 2026-11-13):** the Standing_Budget is retired (Requirement 26). WHERE the low quality toggle is on, THE Graveyard_Scene SHALL keep the Rise_Budget of 8, SHALL halve the Grass_Cards (Requirement 6 criterion 9) and the Dirt_Burst particles, and SHALL render the characters without shadow casting.
2. **Superseded (control-room direction, 2026-11-13):** the Watcher is retired (Requirement 26). Former text: WHERE the low quality toggle is on, THE Graveyard_Scene SHALL keep the Watcher rules of Requirement 14 unchanged.
3. **Superseded (control-room direction, 2026-11-13):** replaced by Requirement 28 criteria 6 and 7 (Flash_Limiter over every Static_Cut, glitch, dip and flicker). Former text: THE Graveyard_Scene SHALL emit no more than 3 flashes in any 1 s window with the Horror_Pass effects (Dirt_Burst, Vanish_Glitch, Watcher appearance), as defined in Base_Spec Requirement 17.6.
4. (Since 2026-11-13 the Standing_Zombies and the Watcher are retired; the rule applies to the Risen_Zombies.) THE Risen_Zombies, Standing_Zombies and the Watcher SHALL be decorative: THE Table_View, the File_Card, the live region and the keyboard navigation SHALL carry the same information and SHALL need no change to describe them.
5. THE Graveyard_Scene SHALL NOT let a character mesh take keyboard focus or pointer hover events.
6. WHILE Lights_Mode is "lights on", THE Graveyard_Scene SHALL show the blood on any character desaturated to grey (Requirement 27 criterion 14), and the model of each character SHALL be the same as in "lights off" (Requirement 12 criterion 3).
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
8. **Superseded in part (control-room direction, 2026-11-13):** the module list is replaced by criterion 11. Former text: THE new pure modules (selection, standing placement, Far_Spots, Watcher schedule, Growl_Limiter, Growl choice, Footstep_Bed gain, Bone_Animator, Stone_Jitter, camera pose) SHALL import neither React nor three.js.
9. THE following criteria of this spec are superseded by the Control_Room_Direction (2026-11-13) and are marked in place: the Batch bullet of the Introduction; 5.4; 9.1; 9.5 (field of view only); 9.10; 10.13; 11.2; 11.3; 11.4; 11.9; 11.13; 11.15; 11.16; 12.8; Requirement 13 (all criteria); Requirement 14 (all criteria); 16.2; 16.3 (replaced by Requirement 12 criteria 1 to 3 on 2026-11-14; 12.1 to 12.5 and 12.7 were rewritten the same day); 16.5 (Footstep_Bed part); 16.6; 17.3; 17.9; 17.12 to 17.21; Requirement 18 (all criteria); 19.1 (Standing_Budget part); 19.2; 19.3; 20.8 (module list); 21.5; 21.10; 22.1; 22.2; 22.5; 22.6; 22.7. Done tasks and tests that cite these ids keep their ids; tests that assert a superseded criterion SHALL be updated in the same change to assert the replacing criterion, or removed when the behaviour is retired.
10. THE following Base_Spec criteria are newly superseded in the graveyard by the Control_Room_Direction, and this list overrides criterion 1 where they overlap: 7.3 (lights-off Plot_Fog, Requirement 23 criterion 4); 7.5, 7.6, 7.7 and 7.8 inside lights-off framed Plots only, with the lights-off overview keeping its Base_Spec background, environment, moon and hemisphere values (Requirement 23 criteria 5, 7, 8 and 18); 7.11 and 7.12 (Ground_Fog layers) inside lights-off framed Plots only (Requirement 23 criterion 19); 10.6 (volumetric Flashlight cone) inside lights-off framed Plots only (Requirement 23 criterion 19); 9.1 to 9.5 and 9.8 for the Mutant only (Requirement 26 criterion 7; the Greenall_Corpse criteria 9.6 to 9.8 stay); 10.1 (Flashlight values, Requirement 23 criterion 9); 10.5 (flicker, Requirement 23 criterion 9 and Requirement 28); 15.1, 15.3 and 15.4 for lights off (CCTV_Grade, Requirement 23 criteria 11 and 12); 15.5 (Random_Glitch, Requirement 28 criterion 3); 15.6, 17.4 and 17.5 for Static_Cuts only (Static_Cuts are allowed in lights on and in Reduced_Motion, Requirement 27 criteria 14 and 15); 16.4 (no digging sound, Requirement 26 criterion 6). The Base_Spec rules for flashes (17.6), Reduced_Motion camera cuts (10.10) and the Lights_Mode button label (17.1) stay. Supersessions that only Requirements 30 to 37 would cause take effect when the future control-room-experience spec is delivered; until then these Base_Spec behaviours stay.
11. THE pure modules of the Horror_Pass (rise selection, Growl_Limiter, Growl choice, Bone_Animator, Stone_Jitter, camera pose, Unease_Effects, Flash_Limiter) SHALL import neither React nor three.js.

### Requirement 21: Quality gates and evidence

**User Story:** As a maintainer, I want the usual checks, a measured frame rate and screenshots, so that the result can be accepted on evidence.

#### Acceptance Criteria

1. WHEN the full check runs from `web`, THE commands `pnpm typecheck`, `pnpm lint`, `pnpm format`, `pnpm test` and `pnpm build` SHALL each exit with code 0, and `pnpm build` SHALL include a passing `check-bundle` step that enforces the Group_Budget.
2. WHEN each Batch is complete, THE full check of criterion 1 SHALL pass before the Batch report is written.
3. WHEN the Measurement_Script runs, THE Measurement_Script SHALL drive headed (not headless) Playwright on the user's machine against the dev server with `?firms=3000`, in lights off, normal quality, at 1920 x 1080 pixels, with a Plot framed.
4. WHEN the Measurement_Script runs for the Horror_Pass, THE Measurement_Script SHALL first set the Shock_Slider to the lowest value in steps of 0.25 pp at which at least 8 Newly_Undead Firms exist among the 3,000 Firms, SHALL wait at least 2 s after the Settled_Shock, and SHALL then record frames for a continuous window of at least 10 s.
5. **Superseded (control-room direction, 2026-11-13):** replaced by Requirement 38 criterion 5 (only Risen_Zombies are counted). Former text: THE Measurement_Script entry in `DEVLOG.md` SHALL contain the average frames per second (rounded to 1 decimal), the minimum 1-second frames per second, the GPU name reported by the WebGL renderer information, the browser name and version, the viewport, the quality setting, the shock value used, the number of Risen_Zombies, Standing_Zombies and Watchers shown at the start of the window, and the date in YYYY-MM-DD form.
6. THE average frames per second in that entry SHALL be at least 50.
7. IF the average frames per second is below 50, THEN THE agent SHALL report the number, the GPU name and the cost of the largest contributors (Character_Models, Grass_Cards, Torn_Mounds, post-processing), and SHALL NOT mark the Horror_Pass complete.
8. IF the machine is not an integrated-GPU laptop, THEN THE Measurement_Script entry SHALL state that fact (Base_Spec Requirement 21.7).
9. THE agent SHALL report the measured numbers and the GPU name to the user, AND the final acceptance of the Horror_Pass SHALL be recorded only after the user gives a sign-off.
10. **Superseded (control-room direction, 2026-11-13):** replaced by Requirement 38 criterion 6 (Batch names 1, 2, 2b and 3). Former text: WHEN each Batch is complete, THE Playwright run SHALL save lights-off screenshots at 1920 x 1080 pixels to `reference/progress/horror-batch<N>-<name>.png`, where `<N>` is 1, 2 or 3, and each Batch SHALL save at least the screenshots listed in Requirement 22.
11. THE screenshots SHALL be taken in lights off and SHALL NOT be committed under any path other than `reference/progress/`.
12. THE Measurement_Script SHALL run at the end of Batch 3, before the Batch 3 STOP task, and THE Measurement_Script entry SHALL count only Risen_Zombies.

### Requirement 22: Workflow rules (batch delivery is defined in Requirement 38)

The batch split 1, 2, 3a, 3b is superseded; the active batch split is Requirement 38 (Batches 1, 2, 2b and 3). Criteria 3, 4 and 8 to 12 stay in force.

**User Story:** As the project owner, I want the work delivered in reviewable batches with a stop after each, so that I can approve each step before the next one starts.

#### Acceptance Criteria

1. **Superseded (control-room direction, 2026-11-13):** replaced by Requirement 38 criterion 1. Former text: THE tasks of the Horror_Pass SHALL be split into four Batches: Batch 1 contains the assets and licensing (Requirements 1 to 5), Batch 2 contains the ground, graves, stones and camera (Requirements 6 to 9), Batch 3a contains the rising zombies (the Rise_Sequence, the Bone_Animator, the rise selection with Risen_Zombies, the Torn_Mound swap, the Dirt_Burst, the lowering and the Hero_Model swap in lights on; Requirements 10, 11, 12, 15 and 19 as far as they concern Risen_Zombies), and Batch 3b contains the Standing_Zombies (Requirement 13), the Watcher (Requirement 14), the sound (Requirement 17), the Content_Notice (Requirement 18), the remaining parts of Requirements 16 and 19, and the quality gates of Requirement 21.
2. **Superseded (control-room direction, 2026-11-13):** replaced by Requirement 38 criterion 2. Former text: THE tasks file SHALL end each Batch (1, 2, 3a and 3b) with a task `STOP: wait for the user to review Batch <name> before continuing.` that tells the agent to stop and wait for the user, and SHALL contain no task of the next Batch before that task. The Batch 3a STOP task SHALL come after the Batch 3a typecheck, lint, format and test checks and the Batch 3a screenshot, and before any Standing_Zombie, Watcher, sound or Content_Notice work.
3. WHEN a Batch is complete, THE agent SHALL stop, report what was done, the check results, the screenshots and the open decisions, and SHALL start the next Batch only after the user approves.
4. THE Batch 1 deliverables SHALL include the two Growl files with their Manifest entries and `CREDITS.md` rows (Requirement 3 criteria 9 to 11 and 13), `reference/progress/horror-batch1-assets.png` (Requirement 2 criterion 4), the byte breakdown (Requirement 5 criterion 8) and the asset-auditor report.
5. **Superseded (control-room direction, 2026-11-13):** replaced by Requirement 38 criterion 3 (Batch 2 is delivered; its screenshots stay valid). Former text: THE Batch 2 deliverables SHALL include at least `reference/progress/horror-batch2-ground-graves.png`, taken at the Plot_Camera_Pose of Plot 1 with the nearest mounds in the lower half, and `reference/progress/horror-batch2-stones.png`, showing tilted, rotated and at least one Fallen_Stone.
6. **Superseded (control-room direction, 2026-11-13):** replaced by Requirement 38 criteria 4 and 5. Former text: THE Batch 3a deliverables SHALL include at least `reference/progress/horror-batch3a-rise.png` (a Risen_Zombie at the waist-high pose, lights off, with its Torn_Mound), the results of typecheck, lint, format and test, and the Batch 3a report. THE Batch 3b deliverables SHALL include at least `reference/progress/horror-batch3b-standing.png` (Standing_Zombies among stones), `reference/progress/horror-batch3b-watcher.png` (the Watcher in the far rows), `reference/progress/horror-batch3b-notice.png` (the Content_Notice), and the Measurement_Script numbers of Requirement 21. The Standing_Zombies belong to Batch 3b.
7. **Superseded (control-room direction, 2026-11-13):** replaced by Requirement 38 criterion 7 (adds the Prototype and the Control_Room_Direction as references). Former text: WHEN files under `web/src/scenes/**` or `web/src/fx/**` change, THE agent SHALL name `reference/graveyard/horror-direction.png` and `reference/graveyard/horror-direction-sequence.png` as the matching references (and `reference/graveyard/graveyard-rate-shock-3pp.png` for unchanged parts), and SHALL offer a scene-critic review.
8. BEFORE using an API of `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `three-custom-shader-material` or `@theatre/core`, THE agent SHALL look it up with the context7 MCP server.
9. THE agent SHALL NOT edit `/pipeline`, `/data` generation code or `data-contract.md`.
10. THE agent SHALL pin every new dependency to an exact version, and SHALL add no dependency without naming it in the Batch report.
11. THE commit messages SHALL use conventional commits with the scope `graveyard-horror-pass`, for example `feat(graveyard-horror-pass): add torn mound`, and the agent SHALL create a commit only when the user asks.
12. BEFORE starting work the agent SHALL run `git pull`, because the repository is shared with the partner and a documentation assistant.

### Requirement 23: Prototype look in lights off (Batch 2b)

**User Story:** As a viewer, I want the plot to look like the prototype feed, with two warm pools of light in a cold, almost black field, so that the graveyard is as frightening as the reference.

#### Acceptance Criteria

1. THE Camera_Rig SHALL use a field of view of 46 degrees, place the Plot_Camera_Pose at an eye height of 1.2 m (tolerance 0.05 m) and set the plot look point at a height of 0.6 m (tolerance 0.05 m), keeping the pose centred on the framed Plot and keeping Requirement 9 criteria 2, 4 and 6.
2. THE Camera_Rig tests SHALL cover criterion 1 with a property test over generated Plot sizes of at least 100 cases, in place of the eye-height part of Requirement 9 criterion 8.
3. WHEN a Plot is framed at the criterion 1 pose with the pointer centred and no sway, THE bases of the nearest-row mounds SHALL project into the lower half of the viewport at 1440 x 900 and 390 x 844 pixels (Requirement 9 criterion 3, re-checked).
4. WHILE Lights_Mode is "lights off" and a Plot is framed, THE Graveyard_Scene SHALL use FogExp2 with colour `#0a0d13` and density 0.075 (Plot_Fog).
5. WHILE Lights_Mode is "lights off" and a Plot is framed, THE Graveyard_Scene SHALL set the scene background to the fog colour `#0a0d13`, so that no horizon is visible.
6. WHEN the existing Base_Spec camera move between the overview and a framed Plot ends, THE Graveyard_Scene SHALL show Plot_Fog for the framed Plot or Overview_Fog for the overview, with the fog interpolated during the move as in Base_Spec Requirement 7. The Overview_Fog values of Base_Spec Requirement 7.14 stay unchanged. The cut-based switch will be specified in the future control-room-experience spec.
7. WHILE Lights_Mode is "lights off" and a Plot is framed, THE Graveyard_Scene SHALL use one hemisphere light with sky colour `#3a4a66`, ground colour `#0a0806` and intensity 0.18, and SHALL set the environment lighting intensity to 0.
8. WHILE Lights_Mode is "lights off" and a Plot is framed, THE Graveyard_Scene SHALL use one shadow-casting directional moon light of colour `#7f9cd6` and intensity 1.1, placed at the offset (-4, 9, -22) m from the centre of the framed Plot, so that it lights the stones from behind and draws rim light on their edges.
9. THE Flashlight SHALL be a shadow-casting spot light of colour `#ffe7c4`, intensity 55, distance 26, angle 0.36 rad, penumbra 0.95 and decay 2, attached at the camera-local offset of Base_Spec Requirement 10.2, in both Lights_Mode values; its base flicker SHALL multiply the intensity by 0.35 for one frame, starting on any frame with chance 0.006, subject to the Flash_Limiter.
10. THE Lantern_Light SHALL be a point light of colour `#ff9a4a`, intensity 1.2 x (0.85 + 0.15 x sin(13 t) x sin(7.3 t)) with t in seconds of the render-loop clock, distance 4 m and decay 2, placed 0.28 m above the ground at the lantern prop; WHILE Reduced_Motion is true THE Lantern_Light SHALL keep the constant intensity 1.2.
11. WHILE Lights_Mode is "lights off", THE CCTV_Pass SHALL apply the CCTV_Grade after tone mapping, in this order: (a) saturation 0.6, as a mix of 40 percent luma (weights 0.3, 0.59, 0.11) and 60 percent colour; (b) colour x 1.4 + 0.015, clamped to [0, 1], then raised to the power 0.9; (c) vignette multiply by 1 - 0.38 x r^2.5 with r = 0 at the centre and 1 at the edge midpoints, with the factor clamped to [0, 1]; (d) gaussian grain with sigma 0.035, with a new pattern every frame; (e) every third pixel row multiplied by 0.88; (f) the red channel mixed 40 percent with the red channel sampled 2 pixels to the left, so that a red ghost appears 2 pixels to the right. The sample of step (f) SHALL be taken from the tone-mapped input image before step (a), as in the Prototype.
12. WHILE Lights_Mode is "lights off", THE CCTV_Pass SHALL apply no bloom and no chromatic aberration other than the red ghost of criterion 11 (f).
13. WHERE the low quality toggle is on, THE CCTV_Pass SHALL keep all six steps of the CCTV_Grade. WHILE Reduced_Motion is true, THE CCTV_Pass SHALL keep the grain of step (d) as a static pattern that does not change between frames.
14. WHILE Lights_Mode is "lights off", THE Stone_Renderer SHALL multiply the base colour of every Headstone material by 0.55, to keep the stones from blowing out to white in the Flashlight beam.
15. WHILE Lights_Mode is "lights off", THE Graveyard_Scene SHALL use ACES filmic tone mapping with exposure 1.0.
16. WHILE Lights_Mode is "lights on", THE Graveyard_Scene SHALL keep the Base_Spec lights-on fog, light, HDRI and CCTV_Pass values, except the Flashlight values of criterion 9 and the Lantern_Light of criterion 10.
17. THE look values of criteria 1, 4, 5, 7 to 11, 14 and 15 SHALL be defined once in a single constants module, and a Vitest example test SHALL check every one of them that `reference/graveyard/horror-direction-params.md` lists against the value in that file.
18. WHILE Lights_Mode is "lights off" and the overview is shown, THE Graveyard_Scene SHALL keep the Base_Spec lights-off overview lighting (environment, moon and the Overview stone emissive lift) and the Overview_Fog; criteria 4, 5, 7 and 8 apply inside a framed Plot only.
19. WHILE Lights_Mode is "lights off" and a Plot is framed, THE Graveyard_Scene SHALL draw no ground-fog layer (Base_Spec Requirements 7.11 and 7.12) and no volumetric Flashlight cone (Base_Spec Requirement 10.6); WHILE Lights_Mode is "lights on" or the overview is shown, these stay as in the Base_Spec.

### Requirement 24: No glowing soil, mounds, clods or grass (Batch 2b)

**User Story:** As a viewer, I want the earth to stay dark, so that orange blobs no longer float in the night.

#### Acceptance Criteria

1. THE Graveyard_Scene SHALL render every soil material (the ground surface that uses the Ground_Texture), and every Closed_Mound, Torn_Mound heap, Pit, Clod and Grass_Card material, with an emissive colour of black (`#000000`), an emissive intensity of 0 and no emissive map, in both Lights_Mode values.
2. THE Graveyard_Scene SHALL render the Clods flat-shaded, with material colour `#3b2c1f` and roughness 1, in both Lights_Mode values.
3. THE Graveyard_Scene SHALL render the Pit with material colour `#040302` in both Lights_Mode values.
4. THE design SHALL remove the two known causes of the orange blobs, so that after the change none of the following remain: an `emissiveMap` on the heap or Clod materials in `web/src/scenes/graveyard/r3f/TornMounds.tsx`; the warm lights-off `glow` option of `useSoilTint` in `web/src/scenes/graveyard/r3f/soil.tsx`, including every call site that passes it; and an `emissiveMap` on the Grass_Card material in `web/src/scenes/graveyard/r3f/Grass.tsx`.
5. THE Graveyard_Scene tests SHALL include an example test that mounts the soil, Closed_Mound, Torn_Mound heap, Pit, Clod and Grass_Card materials once in lights off and once in lights on, and asserts criterion 1 for each material, and criteria 2 and 3 for the Clod and Pit materials.
6. THE Stone_Renderer SHALL pass the glTF metal/roughness texture of each stone model as both its roughness map and its metalness map, so that a stone whose metallicFactor is 1 renders with the metalness its texture gives (Note 2026-11-13: the earlier alpha-flatten criterion was dropped because the stone textures have no transparent texels).
7. THE Graveyard_Scene tests SHALL include an example test that the stone material of each stone model has its metalness map set to the same texture as its roughness map, and the Batch 2b report SHALL show a close-up of a lit stone before and after the fix.

### Requirement 25: The Lights toggle leaves the rate shock alone (Batch 2b, bug fix)

**User Story:** As a viewer, I want to switch the lights without changing the rate shock, so that the data I set stays what I set.

#### Acceptance Criteria

1. WHEN the user activates the Lights_Mode control by pointer, touch, Enter or Space, THE Shock_Slider value SHALL stay bit-for-bit equal to its value before the activation for at least 500 ms after the activation, no Settled_Shock SHALL be produced by that activation, and the Lights_Mode SHALL switch to the other mode as it did before the fix.
2. WHEN the user drags the Shock_Slider thumb, or presses Arrow Left, Arrow Right, Arrow Up, Arrow Down, Home or End on the focused Shock_Slider, THE Shock_Slider SHALL keep changing its value as in Base_Spec Requirement 13.7 (preservation).
3. THE design SHALL name the root cause of the observed jump to +0.25 pp in its bug analysis, and each fix task in the tasks document SHALL reference that root cause.
4. THE HUD tests SHALL include, for each of pointer, Enter and Space activation, one test of criterion 1 that fails on the code before the fix and passes after it. Each of these tests SHALL start with the Shock_Slider at 0 pp and again at one value in (0, 5] pp other than 0.25 pp. THE tests SHALL also include one preservation test for criterion 2 that passes both before and after the fix.

Note (2026-11-13): the user reduced 25.3 and 25.4 to the H2 fix and jsdom tests, because the HUD Lights button and slider are replaced in the control-room-ui spec; H1 and H3 are not investigated.

### Requirement 26: Retired characters, props and sounds (Batch 3)

**User Story:** As the art lead, I want the elements removed after testing kept out of the graveyard, so that the scene follows the one emotional line.

#### Acceptance Criteria

1. THE Graveyard_Scene SHALL show a Torn_Mound, and assign no character model, for every Already_Undead Firm at every Shock_pp value from 0 to 5.
2. THE Graveyard_Scene SHALL NOT build the Watcher, and SHALL NOT load or send a network request for the Watcher_Model file at any point in a session.
3. THE Graveyard_Scene SHALL NOT build Standing_Zombies.
4. THE Graveyard_Scene SHALL have at most 8 skinned characters in the scene on any frame, and every one of them SHALL be a Risen_Zombie.
5. WHILE the Graveyard_Scene is active, THE Audio_Engine SHALL NOT load or play the Footstep_Bed.
6. WHILE the Graveyard_Scene is active, THE Audio_Engine SHALL NOT load or play any sound whose Manifest title or `CREDITS.md` title names digging or a shovel.
7. THE Graveyard_Scene SHALL NOT load, render or animate the Mutant, and the Mutant file SHALL be excluded from the Graveyard_Asset_Group (Requirement 5 criterion 13, step 1, approved by the user on 2026-11-13).
8. THE Graveyard_Scene SHALL keep the Greenall_Corpse as a static prop under Base_Spec Requirement 9 criteria 6 to 8.
9. THE Graveyard_Scene SHALL include none of these removed elements: deliberate frame-rate drops (frames skipped, delayed or throttled on purpose; Static_Cuts and Random_Glitches do not count), an approaching walker (any character whose root moves across the ground toward the camera), breathing (periodic chest or spine bone motion, or breath sounds), random lens attacks (a character or hand striking the camera lens at any time), "motion detected" alerts (any OSD text that announces detected motion) and a case-file card (any new panel in the graveyard that shows a Firm's filing details; the Base_Spec File_Card stays as it is until the future control-room-experience spec ships).
10. THE Watcher_Model, the Crawler_Model, the Mutant and the Footstep_Bed files, their Manifest entries and their `CREDITS.md` rows SHALL stay in the repository.
11. THE Asset_Pipeline bundle check SHALL count toward the Group_Budget only files that the Graveyard_Scene or the Audio_Engine requests in a graveyard session, and SHALL exclude the Watcher_Model, the Mutant and the Footstep_Bed from the Graveyard_Asset_Group even though the glossary includes the Character_Models in that group. The Crawler_Model is still used by Risen_Zombies and stays in the group.

### Requirement 27: A firm crossing the line rises (Batch 3)

**User Story:** As an investor, I want the grave of a firm that turns undead to stir, break open and give up a zombie that stares at me, so that the rate shock I set has a visible victim.

The times below are measured from the start of the Stir (s = 0) and from the end of the Stir (t = 0, that is s = 1.4 s). Before the Rise_Cut the Rise_Keys time equals t; from the Rise_Cut frame on, the Rise_Keys time equals t + 1.15 s, so the Rise_Sequence ends at t = 2.05 s.

#### Acceptance Criteria

1. WHEN a Firm receives a Risen_Zombie at a Selection_Event, THE Graveyard_Scene SHALL start its Stir within 100 ms. For 1.4 s the Closed_Mound SHALL shake by random offsets from its rest position, scaled by the Stir progress a = s / 1.4. The offsets SHALL be at most ±1.5 cm x a in x and z and at most ±1 cm x a in y. No character SHALL be visible during the Stir.
2. WHILE a Stir runs in lights off and Reduced_Motion is false, THE Camera_Rig SHALL add a random camera shake of at most ±6 mm x a in x and y.
3. WHEN the Stir ends (t = 0), THE Graveyard_Scene SHALL return the Closed_Mound to its rest position and SHALL show the Risen_Zombie at Rise_Keys time 0 (root height -1.8 m, fully below the ground).
4. WHEN t reaches 0.55 s, THE Graveyard_Scene SHALL replace the Closed_Mound with the Torn_Mound and emit the Dirt_Burst. The Dirt_Burst SHALL move each Clod over 0.45 s, with u going from 0 to 1. Each Clod SHALL move outward from 35 percent to 100 percent of its rest offset, at a height of 0.03 m + 4 x h x u x (1 - u), where h is the seeded Clod height from 0.08 m to 0.30 m. Each Clod SHALL stay hidden while u <= 0.02. The Rise_Keys SHALL keep advancing during the Dirt_Burst.
5. WHEN t first exceeds 0.8 s, THE Graveyard_Scene SHALL start a Rise_Cut (a Static_Cut of 0.32 s with a tracking glitch of 0.2 s) and SHALL set the Rise_Keys time to 1.95 s in the same frame, so that the zombie appears already hauled out to the waist when the static clears.
6. THE Bone_Animator SHALL compute the Rise_Sequence from the five Rise_Keys of the Prototype, interpolated with the Jerk_Easing. Each Rise_Key holds root height, root tilt, right and left upper arm and forearm directions, finger curl, and spine and head directions, at 0.0, 0.7, 1.5, 2.3 and 3.2 s. THE Bone_Animator SHALL clamp the Rise_Keys time to 3.2 s and SHALL end the Rise_Sequence at Rise_Keys time 3.2 s with the root at -0.95 m (waist at ground level) plus the per-model root height offset (0 m for the Hero_Model and Walker_Model, 0.05 m for the Crawler_Model).
7. THE Graveyard_Scene SHALL render no frame whose Rise_Keys time lies in the open interval (0.8 s, 1.95 s).
8. WHEN the Rise_Sequence ends, THE Bone_Animator SHALL start the Stare. Over 2.8 s it SHALL blend the head direction, with smoothstep easing, from the last Rise_Keys head direction to the target direction. The target direction is the normalized result of adding (0, 0.15, 0) to the unit vector from the head bone to the camera. After the 2.8 s THE Bone_Animator SHALL keep the head at the target direction.
9. WHILE the Idle_Loop runs, THE Bone_Animator SHALL add 0.15 x sin(5 t + x) to the finger curl, where x is the Pit x position. It SHALL apply the first head twitch 2 s after the Idle_Loop starts and each following twitch after an interval drawn from 1.2 s to 3.5 s. Each twitch SHALL last 0.18 s and SHALL add an offset of -0.6 to 0.6 in x and -0.3 to 0.2 in y to the head direction. The intervals and offsets SHALL come from a generator seeded by the Firm `cik`. THE Bone_Animator SHALL apply no breathing.
10. WHEN a Stir starts, THE Flashlight SHALL aim at the point 0.5 m above the Pit centre (Auto_Aim). The Auto_Aim SHALL replace any running Auto_Aim. It SHALL end after 2.2 s or at the first pointer move after the Stir starts, whichever comes first, and the Flashlight SHALL then follow the pointer.
11. THE Graveyard_Scene SHALL emit the rise event of Requirement 15 criterion 3 when the Stir starts and the rise-finished event of Requirement 11 criterion 8 when the Rise_Sequence ends, once per Risen_Zombie.
12. FOR ALL Firm `cik` seeds and all values of t from 0 s to 10 s, THE Bone_Animator SHALL return rotations whose angle change between two samples 1/60 s apart is at most 25 degrees per bone. The limit is 90 degrees within 200 ms after the start of a Rise_Keys interval. There is no limit in the frame of the Rise_Cut jump, or for the head bone in a pair of samples that spans the start or end of a head twitch.
13. THE Graveyard_Scene SHALL scale each Risen_Zombie to a standing height of 1.80 m to 1.85 m. It SHALL multiply the material base colour by 0.9 for the Hero_Model, 0.85 for the Walker_Model and 0.75 for the Crawler_Model, and SHALL set every material roughness to at least 0.75.
14. WHILE Lights_Mode is "lights on", THE Graveyard_Scene SHALL keep the Stir mound motion, the soil break, the Dirt_Burst and the Rise_Cut, SHALL keep the model of Requirement 12 criterion 1, SHALL desaturate the blood (material colour to grey), and SHALL apply no camera shake, no Stare (the head keeps the last Rise_Keys direction) and no head twitch.
15. WHILE Reduced_Motion is true, THE Graveyard_Scene SHALL run the 1.4 s Stir without mound shake or camera shake. At t = 0.55 s it SHALL show the Torn_Mound with the Clods at rest and no Dirt_Burst. It SHALL shorten the Rise_Cut to at most 0.15 s with no tracking glitch. When the static clears it SHALL show the zombie at the final pose (Rise_Keys time 3.2 s) with the head already at the Stare target direction, and SHALL emit the rise-finished event in that frame. It SHALL apply no Stare animation, no clawing and no twitch.
16. THE Graveyard_Scene SHALL keep the following requirements for the Risen_Zombies: Requirement 10 except criterion 13; Requirement 11 criteria 1, 5 to 8, 10 to 12 and 14; and Requirement 12 except criterion 8. The lowering of Requirement 10 criterion 7 SHALL run without a Rise_Cut.
17. THE Bone_Animator tests SHALL include example tests for criteria 5, 6 and 8 and the fast-check property of criterion 12 with at least 100 cases.

### Requirement 28: Unease grows with the rate shock (Batch 3)

**User Story:** As a viewer, I want the feed to grow more unsettled each time I raise the rate shock, so that I feel I am the one causing it.

#### Acceptance Criteria

1. WHILE Shock_pp is 0 and no Stir runs, THE Graveyard_Scene SHALL move nothing on its own except the Flashlight following the pointer, the Lantern_Light flicker, the grain and the handheld sway, and THE Audio_Engine SHALL play the wind loop, the crows and the Rumble_Bed at gain 0.03.
2. WHILE no Stir runs, THE Audio_Engine SHALL set the Rumble_Bed's own gain to 0.03 + 0.07 x Shock_pp, with a smoothing time constant of 0.4 s; the master gain then scales this value. WHILE a Stir runs, THE Audio_Engine SHALL set the Rumble_Bed's own gain to 0.25 + 0.5 x a, with a time constant of 0.1 s. Here a = (seconds since that Stir started) / 1.4, clamped to [0, 1], so the gain is at most 0.75. If more than one Stir runs at once, a is the largest of their values.
3. WHILE Lights_Mode is "lights off" and Reduced_Motion is false, THE CCTV_Pass SHALL offer a Random_Glitch to the Flash_Limiter on a rendered frame with chance 0.002 + 0.0025 x Shock_pp. An accepted Random_Glitch lasts one rendered frame at strength 0.6.
4. WHILE Lights_Mode is "lights off" and Reduced_Motion is false, THE Camera_Rig SHALL add the Camera_Jitter to the camera position on every rendered frame, with t equal to the frame time in seconds.
5. WHILE Lights_Mode is "lights off" and Reduced_Motion is false, THE Flashlight SHALL offer a Flash_Dip to the Flash_Limiter on a rendered frame with chance 0.004 x Shock_pp. An accepted Flash_Dip multiplies the Flashlight intensity by 0.3 for that one rendered frame.
6. THE Flash_Limiter SHALL accept a flash candidate at time t only if fewer than 3 flashes were accepted in the window (t − 1,000 ms, t], and SHALL drop (not queue) every other candidate. IF a Static_Cut candidate and a Random_Glitch, Flash_Dip or Flashlight flicker candidate arrive on the same rendered frame and only one slot remains, THEN THE Flash_Limiter SHALL accept the Static_Cut and drop the other. A Static_Cut that starts while another accepted Static_Cut is shown SHALL merge with it into one flash that ends at the later end, and the merged flash counts once.
7. THE Flash_Limiter SHALL be a pure function with fast-check properties of at least 100 cases each, over any sequence of candidate times and kinds: (a) any 1,000 ms window holds at most 3 accepted flashes, so that Base_Spec Requirement 17.6 holds; (b) every accepted flash starts at the time of one of its candidates; (c) the same-frame priority of criterion 6 holds.
8. WHILE Lights_Mode is "lights on", THE Graveyard_Scene SHALL apply no Camera_Jitter, no Random_Glitch and no Flash_Dip. WHILE Reduced_Motion is true, THE Graveyard_Scene SHALL apply no Camera_Jitter, no Random_Glitch and no Flash_Dip. The Rumble_Bed of criterion 2 plays in both cases.
9. WHEN the Shock_Slider value changes, THE Graveyard_Scene SHALL apply the new Shock_pp to criteria 2 to 5 from the next rendered frame on, without waiting for the Settled_Shock.
10. THE Unease_Effects SHALL be computed by a pure function of Shock_pp (in [0, 5]), Lights_Mode, Reduced_Motion, the frame time and an injected random source. Identical inputs and an identical random source SHALL give identical outputs. Fast-check properties of at least 100 cases each SHALL show that: every chance, gain and Camera_Jitter amplitude (the coefficient of sin, not the offset) is 0 or positive and every chance is at most 1; none of them decreases as Shock_pp increases; and the Camera_Jitter, Random_Glitch and Flash_Dip values are 0 wherever criterion 8 requires it, with the rumble gain exempt.

### Requirement 29: Sound of a rise (Batch 3)

**User Story:** As a viewer, I want the world to go quiet before a zombie growls, so that the growl lands.

#### Acceptance Criteria

1. WHEN a rise-finished event occurs while Lights_Mode is "lights off", the Audio_Engine is not muted and the Growl_Limiter allows a start, THE Audio_Engine SHALL start exactly one Growl within 200 ms of the event. The Growl file SHALL be chosen with the Growl_Source. The playback rate SHALL be drawn uniformly from [0.85, 1.05]. The gain SHALL be min(1, 2.2 / d), applied before the master gain so that the master gain scales it. The pan SHALL be the zombie root's projected screen x (normalized device coordinates) clamped to [-1, 1]. Here d is the distance in metres from the camera to the zombie root, and both d and the pan are measured at the moment of the rise-finished event.
2. THE Audio_Engine SHALL keep the Growl_Limiter, the Growl choice and Requirement 17 criteria 1, 2 and 4 to 8, 10 and 11.
3. WHEN a Stir starts, THE Audio_Engine SHALL lower the wind gain to 0.1 with a time constant of 0.15 s. 3.5 s after the Stir start it SHALL begin raising the wind gain back to 0.35 with a time constant of 0.8 s. It SHALL start no crow sound during the 5 s after the Stir start. If another Stir starts before these 5 s have passed, the later Stir's start time SHALL replace the earlier one as the reference for all three timings.
4. WHILE the Audio_Engine is muted, or its audio output has not started because the Interaction_Gate has not been passed or the browser is blocking playback, THE Graveyard_Scene SHALL run every visual step of Requirements 27 and 28 with the same timings and outcomes as when sound plays.
5. THE Audio_Engine SHALL load the Rumble_Bed only from the Manifest entry `freesound-lennartgreen-low-rumble-loopable`, and only after the Interaction_Gate. IF the Rumble_Bed fails to load or decode, THEN THE Audio_Engine SHALL skip it and show the user no error, and every other sound SHALL keep playing.
6. IF d is above 10 m at the moment of the rise-finished event, THEN THE Audio_Engine SHALL route that Growl through a low-pass filter with a cutoff of 2,000 Hz. IF d is 10 m or less, THEN THE Audio_Engine SHALL play the Growl unfiltered.

### Requirement 30: OSD layout and style (Moved to the future control-room-experience spec, 2026-11-13)

**Moved to the future control-room-experience spec (2026-11-13).** Not designed, not tasked and not delivered by this spec; kept here only as a draft for that spec.

**User Story:** As a night guard, I want every control to look like part of the CCTV monitor, so that nothing feels like a web page floating over a game.

#### Acceptance Criteria

1. THE OSD SHALL be rendered in the DOM over the 3D stage, SHALL replace the graveyard HUD panels of the Base_Spec, and SHALL leave every OSD pixel unaltered by the CCTV_Pass (Base_Spec Requirement 15.8).
2. THE OSD SHALL show four viewfinder corner brackets of 38 px legs and 2 px stroke in `rgba(233,230,218,.55)`, inset 14 px from the viewport edges (8 px at viewport widths of 640 px or less), that receive no pointer events.
3. THE OSD SHALL show at the top left `REC` in `#e0342a` with a dot that is lit for 0.55 s and unlit for 0.55 s in each 1.1 s period, followed by the CAM id (`CAM nn` for a framed Plot, `CAM 00` for the overview), and below it in `#8d8a80` the line `PLOT n · SECTOR` in capitals for a framed Plot or `OVERVIEW · n PLOTS` for the overview; WHILE Reduced_Motion is true the dot SHALL stay lit.
4. THE OSD SHALL show at the top right a timestamp of the device's local time in the zero-padded 24-hour form `YYYY-MM-DD HH:MM:SS` that advances once per second, and below it the source line `SEC EDGAR · {n} FIRMS` with {n} the number of Firms in the loaded Firm list written with comma thousands separators (e.g. `3,000`), followed by ` · SAMPLE` for Dev_Fixtures or sample data and ` · MOCK` for mock data.
5. THE OSD SHALL use the OSD_Font for all its text, with `ui-monospace, monospace` as the fallback, and SHALL use no other font in the graveyard.
6. THE OSD SHALL use the text colour `#e9e6da`, the dim colour `#8d8a80` and the red `#e0342a`, and every OSD panel background colour (each stop, for a gradient) SHALL have each RGB channel between the matching channels of `#0c0d0f` and `#17181b`, inclusive.
7. THE OSD SHALL give every text a contrast ratio of at least 4.5:1 against its panel, or, for text drawn over the feed, against a text shadow or backing that keeps the ratio at least 4.5:1 over any feed pixel, in both Lights_Mode values.
8. THE OSD SHALL show the line "Data: SEC EDGAR. Not investment advice." in the dim colour at the bottom edge at all times while the graveyard, the Opening or the Table_View is displayed (Base_Spec Requirement 12.13).
9. WHILE the viewport is 640 px wide or less, THE OSD SHALL inset the corners 8 px, span the Rate_Console across the width at the bottom, hide the Controls_Hint and place the OSD_Menu button at the top right, and at 390 x 844 pixels with the OSD_Menu closed no two bounding boxes of visible OSD elements SHALL overlap (the corner brackets, the Hover_Tag and the visually hidden live region excluded).
10. THE OSD SHALL keep one polite ARIA live region that announces, in words, each change of the Risen_Counter after a Settled_Shock ("{n} firms risen at +x.xx pp"), each Plot_Fall (naming the Plot number and sector), each Camera_Switch ("Camera nn, Plot n, {sector}", or "Camera 00, overview") and both lines of the Hover_Tag each time keyboard focus moves to a Headstone.
11. THE OSD SHALL give every control an accessible name and a visible focus ring of at least 2 CSS pixels in `#e0342a` or `#e9e6da` with a contrast of at least 3:1 against the background directly behind the control.

### Requirement 31: Camera switcher (Moved to the future control-room-experience spec, 2026-11-13)

**Moved to the future control-room-experience spec (2026-11-13).** Not designed, not tasked and not delivered by this spec; kept here only as a draft for that spec.

**User Story:** As a night guard, I want to switch between cameras like on a real monitor, so that moving between plots feels like CCTV and not a game camera.

#### Acceptance Criteria

1. THE Camera_Switcher SHALL show one box for CAM 00 (the overview) and one box per Plot in Plot order (CAM 01 = Plot 1, CAM 02 = Plot 2, ...), each a button with `aria-pressed` true only for the current camera and an accessible name of the form "Camera 01, Plot 1, {sector}" or "Camera 00, overview".
2. WHEN the Camera_Switcher has more boxes than fit in one row, THE Camera_Switcher SHALL wrap or scroll inside its own area, and no box's bounding rectangle SHALL overlap the bounding rectangle of another OSD element at viewport widths from 360 px to 3840 px.
3. WHEN the user presses a digit key 1 to 9 (top row or numpad) with no Ctrl, Alt or Meta modifier held, THE Camera_Rig SHALL perform a Camera_Switch to Plot 1 to 9 respectively, and WHEN the user presses 0 under the same conditions, THE Camera_Rig SHALL perform a Camera_Switch to the overview; IF keyboard focus is in a text field, on the Shock_Slider, inside the OSD_Menu, the Opening or a dialog, or a Ctrl, Alt or Meta modifier is held, or the Plot does not exist, THEN THE Camera_Rig SHALL ignore the digit key and leave the current camera, `aria-pressed` and the CAM id unchanged.
4. THE Camera_Rig SHALL keep the Left and Right arrow keys of Base_Spec Requirement 11.4 and 11.5 for the previous and next Plot, and SHALL reach Plots 10 and above through the Camera_Switcher boxes and the arrow keys.
5. WHEN a Camera_Switch starts, THE CCTV_Pass SHALL show a Static_Cut of 0.28 s followed by a tracking glitch of 0.12 s (each within ±1 frame), and THE Camera_Rig SHALL cut to the new pose on a single frame inside the Static_Cut, with no interpolated move, and SHALL update the CAM id, the plot line and `aria-pressed` on that same frame.
6. WHILE Reduced_Motion is true, THE Camera_Switch SHALL use a Static_Cut of at most 0.15 s and no tracking glitch; WHILE Lights_Mode is "lights on", THE Camera_Switch SHALL keep the Static_Cut and the glitch.
7. WHEN a Camera_Switch starts, THE Graveyard_Scene SHALL raise the Selection_Event of the destination pose on the start frame, publish a move progress of 0 before the cut and 1 from the cut frame on, and hide the Hover_Tag.
8. IF the requested camera is the current camera, THEN THE Camera_Rig SHALL do nothing: no Static_Cut, no glitch and no Selection_Event.
9. WHEN the Firm list first loads successfully, THE Camera_Rig SHALL show CAM 01 (Plot 1) without a Camera_Switch; IF the loaded Firm list yields no Plots, THEN THE Camera_Rig SHALL show CAM 00 instead.
10. WHEN keyboard focus moves to a Headstone in another Plot, THE Camera_Rig SHALL perform a Camera_Switch to that Plot and keep focus on the Headstone (Base_Spec Requirement 18.8).
11. THE Camera_Switch key mapping SHALL be a pure function with example tests for every digit, for a missing Plot, for each modifier of criterion 3 and for each ignored focus target of criterion 3.
12. IF a Camera_Switch is requested while another Camera_Switch is in progress, THEN THE Camera_Rig SHALL change the in-progress switch's destination to the newest request when its cut frame has not yet occurred, and otherwise SHALL start the new Camera_Switch when the current one ends, so that at most one Static_Cut is shown at a time.

### Requirement 32: Rate console, controls hint and menu (Moved to the future control-room-experience spec, 2026-11-13)

**Moved to the future control-room-experience spec (2026-11-13).** Not designed, not tasked and not delivered by this spec; kept here only as a draft for that spec.

**User Story:** As a night guard, I want a metal lever to raise rates and a red counter of the risen, so that I control the shock like a piece of equipment.

#### Acceptance Criteria

1. WHILE the viewport is wider than 640 px, THE Rate_Console SHALL be a dark metal panel centred horizontally at the bottom edge, at most 560 px wide, with a notched track, a metal lever thumb and decorative tick labels `0`, `+1`, `+2`, `+3`, `+4` and `+5` at the track positions for 0 to 5 Shock_pp.
2. THE Rate_Console SHALL show the label `RATE SHOCK` and the value `+x.xx pp`, which is Shock_pp with exactly two decimals (for example `+0.00 pp`, `+2.25 pp`). It SHALL keep the Shock_Slider as a native range input with the 21 values of Base_Spec Requirement 13.1, its accessible name, its `aria-valuetext` and its keys (Base_Spec Requirement 13.7).
3. THE Rate_Console SHALL always show the disclosure lines "Approximation based on index data; simplified rate shock" and "Debt reprices at once; simplified model" (Base_Spec Requirements 2.14 and 13.8), and the line "{N} already undead" (Base_Spec Requirement 13.5), in the dim colour of Requirement 30 criterion 6.
4. THE Risen_LED SHALL show the Risen_Counter zero-padded to two digits (for example `03`), or as three digits when the value is 100 or more, in `#e0342a` with a red glow and the caption `RISEN`. The value SHALL equal the Base_Spec Risen_Counter for the current shock, whatever the Rise_Budget and however many Risen_Zombies are animating.
5. WHILE the viewport is wider than 640 px, THE Controls_Hint SHALL show three lines at the bottom left: `MOVE · flashlight`, `DRAG · raise rates` and `0–9 · camera`. Starting 14 s after the Opening ends, or 14 s after the first rendered frame when no Opening is shown, it SHALL fade linearly from full opacity to 0 over 1.5 s and then be hidden. WHILE Reduced_Motion is true, it SHALL instead go from full opacity to hidden in a single frame at the 14 s mark.
6. THE OSD_Menu button SHALL read `≡ MENU` and SHALL expose `aria-haspopup` and an `aria-expanded` value that is `true` while the menu is open and `false` otherwise. On activation it SHALL open a menu with the items Sound, Lights, Table view, Credits and Content warning, in that order.
7. THE Sound item SHALL show "Sound on" or "Sound off" to match the current Audio_Engine state (Base_Spec Requirement 16.6), and THE Lights item SHALL show the label of Base_Spec Requirement 17.1 for the current Lights_Mode.
8. WHEN the OSD_Menu opens, THE OSD_Menu SHALL move focus to the first item. Tab and Down Arrow SHALL move focus to the next item and Shift+Tab and Up Arrow to the previous item, wrapping between the first and last items. The menu SHALL close on Esc or on activation of an item, and SHALL return focus to the `≡ MENU` button when it closes.
9. WHEN the user activates Table view or Credits, THE OSD_Menu SHALL open the existing Table_View or Credits_Dialog unchanged.
10. IF one or more loaded Firms are not shock-eligible, THEN THE Rate_Console SHALL show the line "{N} not shock-eligible" (Base_Spec Requirement 13.6) in the dim colour of Requirement 30 criterion 6, with {N} the count of those Firms. IF that count is 0, THEN THE Rate_Console SHALL not show the line.
11. IF the loaded data is sample or fixture data, THEN THE OSD_Menu SHALL show the note "Look-dev sample · fictional firms" in the open menu. IF the loaded data is mock data, THEN THE OSD_Menu SHALL show "Mock data". IF the data is neither, THEN THE OSD_Menu SHALL show no note.

### Requirement 33: Reading a firm with the hover tag (Moved to the future control-room-experience spec, 2026-11-13)

**Moved to the future control-room-experience spec (2026-11-13).** Not designed, not tasked and not delivered by this spec; kept here only as a draft for that spec.

**User Story:** As a viewer, I want to sweep my flashlight over a grave and read the firm, its coverage and its status at once, so that every grave tells me its fact without a card in the way.

#### Acceptance Criteria

1. WHEN the pointer moves over a Headstone, a Mound or a Risen_Zombie, THE OSD SHALL show the Hover_Tag for its Firm within 100 ms, with its top-left corner 16 px right of and 14 px below the pointer. If that position would put any part of the tag outside the viewport, THE OSD SHALL shift the tag only as far as needed to keep it fully inside the viewport. WHEN the pointer moves off all of them, THE OSD SHALL hide the Hover_Tag within 100 ms.
2. THE Firm_Lookup SHALL map a Headstone instance and a Mound instance to its Firm by instance index, and a Risen_Zombie to its Firm by a pointer-ray test against one simple bounding shape per assigned Risen_Zombie slot; THE Graveyard_Scene SHALL NOT raycast any skinned mesh.
3. WHEN the pointer ray hits more than one Headstone, Mound or Risen_Zombie bounding shape, THE Firm_Lookup SHALL return the Firm of the hit with the smallest distance from the camera along the ray.
4. THE Hover_Tag SHALL show the Firm name in capitals on line 1 and `ICR {value} · {Status_Word}` on line 2. {value} SHALL be the shocked ICR from the Shock_Model at the current shock if the Firm is shock-eligible, or `latest_icr` if the Firm is not shock-eligible. Either value SHALL be rounded half away from zero to 2 decimals, with a leading minus sign for negative values. If the Firm is not shock-eligible and `latest_icr` is null, or the status is `insufficient_data`, {value} SHALL be `—`.
5. THE Status_Word SHALL be chosen by the first matching rule in this order: (a) status `insufficient_data` gives NO DATA in `#8d8a80` with ICR `—`; (b) `zombie` at delta 0 gives ZOMBIE in `#e0342a`; (c) Newly_Undead at the current shock gives RISEN in `#e0342a`; (d) `endangered` at the current shock gives ENDANGERED in `#e0a030`; (e) `healthy` at the current shock gives RESTING in `#8fb07a`. For a Firm that is not shock-eligible, the status at the current shock SHALL be its status at delta 0.
6. THE Hover_Tag SHALL be drawn on a panel of colour `#0c0d0f` with an alpha of at least 0.92, and SHALL give every text, including each Status_Word colour, a contrast ratio of at least 4.5:1 against that panel. The ratio SHALL be measured with the panel composited over a pure black background and again over a pure white background.
7. WHEN a Headstone receives keyboard focus, THE OSD SHALL show the same Hover_Tag 16 px right of and 14 px below the projected centre of that Headstone, shifted to stay inside the viewport as in criterion 1. THE OSD SHALL also announce "{name}, ICR {value}, {status in words}" in the live region, where {status in words} is "healthy", "endangered", "zombie", "insufficient data" or "risen under this rate shock" and matches the Status_Word rule of criterion 5 (Base_Spec Requirements 17.7 and 18.9). WHEN that Headstone loses keyboard focus and the pointer is not over a Firm, THE OSD SHALL hide the Hover_Tag within 100 ms.
8. WHEN the user taps the canvas on a touch device, THE Flashlight SHALL aim at the tap point. If the tap hits a Firm, THE OSD SHALL show that Firm's Hover_Tag; if it hits no Firm, THE OSD SHALL hide the Hover_Tag. THE OSD SHALL hide a Hover_Tag opened by a tap 2.5 s after that tap, or at the next tap, whichever comes first.
9. THE Graveyard_Scene SHALL open no card and show no close button on click or tap. WHEN a Headstone has keyboard focus and the user presses Enter, THE Graveyard_Scene SHALL start the existing route to the lab for that Firm, using the same store action as the Table_View, until the capture spec defines the drag.
10. WHILE the Hover_Tag is shown, WHEN the Shock_Slider value changes, THE OSD SHALL update the ICR value and the Status_Word in the next rendered frame.
11. WHILE the Opening, a Static_Cut or the Jump_Scare is shown, THE OSD SHALL hide the Hover_Tag. WHEN that overlay ends, THE OSD SHALL show the Hover_Tag again only at the next pointer move, tap or focus change that targets a Firm.
12. THE Firm_Lookup and the Status_Word mapping SHALL be pure functions, each tested with fast-check properties of at least 100 cases: every instance index of a generated layout maps to the Firm rendered at that index, and every Firm and shock in [0, 0.05] gives exactly one Status_Word that agrees with the Shock_Model and the order in criterion 5.
13. THE Table_View SHALL keep showing every fiscal year of every Firm; THE Hover_Tag SHALL NOT replace or shorten the Table_View.

### Requirement 34: Opening and content warning (Moved to the future control-room-experience spec, 2026-11-13)

**Moved to the future control-room-experience spec (2026-11-13).** Not designed, not tasked and not delivered by this spec; kept here only as a draft for that spec.

**User Story:** As a first-time visitor, I want a short typed intro and a clear warning before the feed connects, so that I know what I am watching and can choose to continue.

#### Acceptance Criteria

1. WHEN the app loads and no Opening_Key is stored, THE OSD SHALL show the Opening as a black full-screen dialog (`role="dialog"`, `aria-modal="true"`, accessible name "Opening") with four lines: (1) `SEC EDGAR · {n} US PUBLIC FIRMS · FY{first}–FY{last}` in the dim colour, (2) `A firm whose profits cannot cover its interest,`, (3) `three years running, is a zombie.`, (4) `Some of them are buried here.` in `#e0342a`.
2. THE Opening SHALL take {n} from the length of the loaded Firm list with thousands separators, and {first} and {last} from the first and last of the last three values of `meta.fiscal_years`; IF `meta.fiscal_years` has fewer than 3 values or is missing, THEN THE Opening SHALL omit the ` · FY{first}–FY{last}` part; WHERE the data is Dev_Fixtures or sample data, THE Opening SHALL append ` · SAMPLE` to line 1, and WHERE it is mock data, ` · MOCK`, using the same rule as the OSD source line (Requirement 30 criterion 4).
3. THE Opening SHALL start typing line 1 when the Firm list load has either succeeded or failed; IF the Firm list load failed, THEN line 1 SHALL read `SEC EDGAR` with no count, fiscal-year or data-source part, and the Opening SHALL still type lines 2 to 4 and show the button.
4. THE Opening SHALL type the lines in order. Each character SHALL appear 32 ms after the previous character of the same line, or 18 ms after it if the character is a space. The first character of each line after line 1 SHALL appear 420 ms after the last character of the previous line. The button `▸ CONNECT TO CAM {id}`, with {id} the CAM id of the start Plot (Requirement 31 criterion 9), SHALL appear 420 ms after the last character of line 4, and focus SHALL move to it at the same moment.
5. THE Opening SHALL show the line `Contains horror and gore · headphones recommended` from its first frame, before any line is typed.
6. WHILE the Opening is typing, WHEN the user presses Enter or Esc, THE Opening SHALL show all four lines and the button at once and move focus to the button, and that key press SHALL NOT also connect. WHILE the button is shown, WHEN the user activates it or presses a new Enter or Esc, THE Opening SHALL connect. Repeats of a key that is still held down from the reveal SHALL NOT connect.
7. WHEN the Opening connects, THE Audio_Engine SHALL treat the action as the Interaction_Gate, THE OSD SHALL store the Opening_Key, and, starting at the same moment, THE CCTV_Pass SHALL show a Static_Cut of 0.45 s whose first 0.25 s carry a tracking glitch, and THE Opening SHALL fade its opacity from 1 to 0 over 0.6 s and then leave the DOM, or become hidden and inert.
8. WHEN the app loads and the Opening_Key is stored, THE OSD SHALL show no Opening and the Interaction_Gate SHALL follow the Base_Spec rules.
9. IF the Opening_Key cannot be read or written, THEN THE OSD SHALL show the Opening on each load, SHALL connect normally, and SHALL raise no error.
10. WHILE Reduced_Motion is true, THE Opening SHALL show all lines and the button at once, SHALL use a Static_Cut of at most 0.15 s and SHALL close without a fade.
11. WHEN the user activates the Content warning item of the OSD_Menu, THE OSD SHALL show the Opening with all lines and the button at once, without changing the shock, the camera, Lights_Mode or the Audio_Engine state, and WHEN it connects again, THE OSD SHALL return focus to the `≡ MENU` button.
12. WHILE the Opening is shown, THE OSD SHALL keep focus inside the Opening (Tab and Shift+Tab cycle only within it) and keep the data footer line of Requirement 30 criterion 8 visible.
13. THE Opening typing schedule SHALL be a pure function from the four line texts to character times and the button time, with example tests for criterion 4 and criterion 6.

### Requirement 35: The plot falls: one jump scare (Cancelled in this spec, 2026-11-13)

**Cancelled in this spec (2026-11-13).** The plot-fall jump scare is cancelled; the graveyard scare will happen during capture in the future spec. The text below is kept only as a draft for that spec.

**User Story:** As a viewer, I want one hard scare when every firm I am watching has turned undead, so that pushing the rates too far has a release.

#### Acceptance Criteria

1. WHEN a Selection_Event caused by a Camera_Rig target change or by the first Firm list load occurs, THE Graveyard_Scene SHALL compute the Framed_Set as the Firms whose Headstone base lies inside the camera viewport at the destination Plot_Camera_Pose. It SHALL keep that Framed_Set unchanged through Settled_Shock changes until the next such Selection_Event. In the overview the Framed_Set SHALL be empty.
2. WHEN the Plot_Fall condition changes from false to true for the framed Plot while Fall_Armed is true for that Plot and no Jump_Scare is running, THE Graveyard_Scene SHALL raise exactly one Plot_Fall and set Fall_Armed for that Plot to false. IF the Framed_Set is empty, or contains no shock-eligible Firm that is not `zombie` at delta 0, THEN THE Graveyard_Scene SHALL raise no Plot_Fall at any shock.
3. WHEN a Settled_Shock lower than the shock of the last Plot_Fall makes the Plot_Fall condition false for a Plot, THE Graveyard_Scene SHALL set Fall_Armed for that Plot to true. A Camera_Switch, a Framed_Set recomputation or the end or abort of a Jump_Scare SHALL NOT re-arm a Plot. Fall_Armed SHALL persist per Plot across Camera_Switches until the page is reloaded.
4. WHILE Lights_Mode is "lights off", WHEN a Plot_Fall occurs, THE Graveyard_Scene SHALL run the Jump_Scare timeline from T = 0 at the Plot_Fall, with each step accurate to ±0.05 s:
   - At T = 2.2 s, THE Audio_Engine SHALL lower the wind, the Rumble_Bed and every other playing sound to silence with a time constant of 0.25 s, and SHALL start no crow sound for the next 15 s.
   - From T = 3.6 s to T = 4.4 s, THE Flashlight SHALL flicker between intensity 0 and 10, subject to the Flash_Limiter.
   - At T = 4.4 s, THE OSD SHALL show the Jump_Scare_Face.
5. WHEN the Jump_Scare_Face appears, the following SHALL hold:
   - THE Flashlight SHALL stop flickering and return to intensity 55 on the same frame.
   - THE Jump_Scare_Face SHALL fill the viewport with cover fit.
   - The face SHALL scale from 0.7 to 1.25 at 35 percent of 0.75 s and to 1.45 at 100 percent of 0.75 s.
   - Its opacity SHALL dip to 0.2 between 12 and 16 percent and to 0.4 between 60 and 64 percent of 0.75 s.
   - A scanline overlay SHALL cover the face.
   - The OSD SHALL shake with a displacement of at most 14 px for 0.45 s.
6. WHEN the Jump_Scare_Face appears and the Audio_Engine is not muted, THE Audio_Engine SHALL play `freesound-qubodup-vibrating-jumpscare` at gain 1.0, and `freesound-tonsil5-zombie-growl-5` at gain 1.0 and playback rate 0.85 regardless of the Growl_Limiter. No gain SHALL exceed 1.0 after the master gain is applied.
7. WHEN 0.75 s of the Jump_Scare_Face have passed, THE OSD SHALL hide the face and show `NO SIGNAL` with the line `CAM LINK LOST · RECONNECTING…` over a full Static_Cut for 2.2 s (tolerance 0.1 s). It SHALL then reconnect with a 0.3 s Static_Cut. At the same time, THE Audio_Engine SHALL raise the wind back to its gain from before T = 2.2 s with a time constant of 0.6 s, and return the Rumble_Bed to its Unease_Effects gain. The Jump_Scare SHALL end when that Static_Cut ends.
8. THE Graveyard_Scene SHALL run at most one Jump_Scare at a time, and at most one per Plot between two arming events (criterion 3). IF the Plot_Fall condition becomes true while a Jump_Scare is running, THEN THE Graveyard_Scene SHALL raise no Plot_Fall and leave Fall_Armed unchanged.
9. WHILE Lights_Mode is "lights on", WHEN a Plot_Fall occurs, THE Graveyard_Scene SHALL show the Plot_Fall only through the Risen_LED, one Static_Cut of 0.32 s and the live region. It SHALL show no Jump_Scare_Face, no shake and no flicker, SHALL apply no audio silencing and SHALL play none of the sounds in criterion 6.
10. WHILE Reduced_Motion is true and Lights_Mode is "lights off", WHEN a Plot_Fall occurs, THE Graveyard_Scene SHALL run the silencing of criterion 4 at T = 2.2 s with no flicker.
    - At T = 4.4 s it SHALL show the Jump_Scare_Face as a still frame at scale 1.25 and opacity 1 for 0.4 s, with the sounds of criterion 6. There SHALL be no scaling, no opacity dips, no shake and no scanline motion.
    - It SHALL then show `NO SIGNAL` and its line over a still dark frame for 2.2 s (tolerance 0.1 s).
    - It SHALL then reconnect with a Static_Cut of at most 0.15 s, with the audio recovery of criterion 7.
11. WHILE the Audio_Engine is muted or audio playback is blocked by the browser, THE Graveyard_Scene SHALL run the Jump_Scare visuals and timings unchanged.
12. WHEN the user presses Esc, performs a Camera_Switch or switches Lights_Mode to "lights on" while a Jump_Scare is running, THE Graveyard_Scene SHALL abort the remaining timeline:
    - It SHALL hide the Jump_Scare_Face, stop every flicker and set the Flashlight to intensity 55.
    - It SHALL show `NO SIGNAL` for 0.3 s and then reconnect.
    - It SHALL apply the audio recovery of criterion 7.
    - It SHALL leave Fall_Armed false.

    THE Jump_Scare overlay SHALL never take keyboard focus, SHALL receive no pointer events and SHALL be hidden from assistive technology. Keyboard focus SHALL stay on the element that had it before the Plot_Fall.
13. WHEN a Plot_Fall occurs, in either Lights_Mode, THE OSD SHALL announce "Plot {n} has fallen: every firm in view is undead at +x.xx pp" once in the live region. {n} is the Plot number and x.xx is the Settled_Shock in Shock_pp with two decimals.
14. IF the Jump_Scare_Face image is not loaded and decoded at T = 4.4 s, THEN THE Graveyard_Scene SHALL skip the face, its shake and its sounds, and go directly to the `NO SIGNAL` step of criterion 7 (criterion 10 under Reduced_Motion).
15. THE Graveyard_Scene SHALL advance the Jump_Scare timeline with the render-loop clock, by at most 0.25 s per frame. WHILE the document is hidden, THE Graveyard_Scene SHALL pause the timeline, and SHALL resume it from the same T when the document becomes visible.
16. THE Framed_Set, the Plot_Fall and Fall_Armed rules and the Jump_Scare timeline SHALL be pure modules. They SHALL have example tests for criteria 2, 3, 8, 9, 10, 12 and 15, and a fast-check property of at least 100 cases: for any sequence of Settled_Shock values and Camera_Switches, no Plot raises a second Plot_Fall without a re-arming (criterion 3) in between.

### Requirement 36: Jump-scare face and OSD font assets (Moved to the future control-room-experience spec, 2026-11-13)

**Moved to the future control-room-experience spec (2026-11-13).** Not designed, not tasked and not delivered by this spec; kept here only as a draft for that spec.

**User Story:** As a maintainer, I want the new face image and the font listed and budgeted like every other asset, so that licensing and size stay correct.

#### Acceptance Criteria

1. THE Asset_Pipeline SHALL add the Jump_Scare_Face as a manual pick from `reference/graveyard/prototype/demo/assets/jumpscare-face.webp`, copied without re-encoding so that the file written under `web/public/assets` is 24,006 bytes and byte-identical to the source. Its Manifest entry SHALL have license "CC BY 4.0", title "Possessed undead", author giantSwing, source URL `https://sketchfab.com/3d-models/possessed-undead-7394bdf26d664810b42b83153411cf74`, and the change note "own render of 'Possessed undead' by giantSwing with jumpscare-face-render.html: cold key light from below, red rim light, CCTV grade".
2. THE file `CREDITS.md` SHALL contain exactly one row for the Jump_Scare_Face. That row SHALL fill every column of the `asset-licensing.md` table (Path, Title, Author, Source URL, License, Changes we made) with the values of criterion 1, and SHALL state that the file is a derivative render of "Possessed undead" by giantSwing (CC BY 4.0).
3. WHILE Lights_Mode is "lights off", WHEN the first Stir of the session starts, or WHEN exactly one shock-eligible Firm in the Framed_Set of the framed Plot that is not `zombie` at delta 0 is not yet Newly_Undead (whichever comes first), THE Graveyard_Scene SHALL request the Jump_Scare_Face. It SHALL request no Jump_Scare_Face before the first frame has rendered, SHALL request none while Lights_Mode is "lights on", and SHALL request it at most once per page session. If a trigger occurred while Lights_Mode was "lights on", the request SHALL be made when Lights_Mode changes to "lights off".
4. THE Asset_Pipeline SHALL add the OSD_Font as a Google Fonts pick (VT323, SIL OFL 1.1). The pick SHALL be a self-hosted woff2 file, with the OFL 1.1 license text in the same folder. It SHALL have a Manifest entry with license "SIL OFL 1.1". It SHALL have exactly one `CREDITS.md` row that fills every column of the `asset-licensing.md` table, with the author taken from the copyright notice in the font's OFL text.
5. THE OSD SHALL load the OSD_Font with `font-display: swap`, so that the OSD text renders in the fallback font `ui-monospace, monospace` until the file arrives. IF the OSD_Font fails to load, THEN THE OSD SHALL keep rendering in that fallback font and the app SHALL keep running.
6. THE bundle check SHALL count the Jump_Scare_Face in the Graveyard_Asset_Group under category "images" and the OSD_Font under category "fonts". It SHALL print both categories next to the categories of Requirement 5 criterion 7. It SHALL also count the OSD_Font in the initial download. The Group_Budget check of Requirement 5 criterion 6 and the 25 MB initial-download check of Requirement 5 criterion 9 SHALL both still pass.
7. WHEN the assets of this requirement are added, THE asset-auditor agent SHALL be run, and its report SHALL show no missing `CREDITS.md` row, no forbidden license and no missing attribution for the Jump_Scare_Face, the OSD_Font file and its license text.
8. THE app SHALL make no network request to `fonts.googleapis.com` or `fonts.gstatic.com` in any page session, as checked in the browser network log from page load through the Opening, one Camera_Switch and one Jump_Scare.

### Requirement 37: Steering exceptions for the graveyard (Moved to the future control-room-experience spec, 2026-11-13)

**Moved to the future control-room-experience spec (2026-11-13).** Not designed, not tasked and not delivered by this spec; kept here only as a draft for that spec.

**User Story:** As a maintainer, I want the steering files to allow the control-room look in the graveyard, so that reviews and agents do not flag it as a violation.

#### Acceptance Criteria

1. THE file `.kiro/steering/design-system.md` SHALL contain exactly one section whose heading contains the words "Graveyard exception". That section SHALL link to `reference/graveyard/control-room-direction.md`, SHALL state that it applies to the Graveyard_Scene only and not to the lab, and SHALL allow exactly these five items: (a) the OSD_Font as the only font of the OSD; (b) the OSD text colours `#e9e6da`, `#8d8a80` and `#e0342a`, and OSD panel background colours in the range `#0c0d0f` to `#17181b` as listed in the Control_Room_Direction; (c) OSD text drawn over the 3D stage; (d) Static_Cuts in lights on and under Reduced_Motion; (e) one graveyard Jump_Scare per Plot_Fall, in lights off only.
2. THE file `.kiro/steering/product.md` SHALL contain one paragraph of at most 120 words that names the same five allowances (a) to (e), states that they apply to the graveyard only and links to `reference/graveyard/control-room-direction.md`.
3. THE file `.kiro/steering/product.md` SHALL keep the rule that the UI always shows "Data: SEC EDGAR. Not investment advice." with that text unchanged.
4. WHEN the steering changes of this requirement are compared with the previous commit of `.kiro/steering/design-system.md` and `.kiro/steering/product.md`, THE diff SHALL contain only added lines that belong to the new exception section or paragraph. No existing line, including the front-matter `inclusion` and `fileMatchPattern` lines, SHALL be removed or altered.
5. THE graveyard exception in both files SHALL state that these rules still apply in the graveyard: no jump scares in lights on, no blood in lights on, and no more than 3 flashes per second.

### Requirement 38: Delivery in Batches 1, 2, 2b and 3

**User Story:** As the project owner, I want the remaining work delivered in reviewable batches with a stop after each, so that I can approve each step before the next one starts.

#### Acceptance Criteria

1. THE tasks of the Horror_Pass SHALL be split into four Batches: Batch 1 (assets and licensing, Requirements 1 to 5; done), Batch 2 (ground, graves, stones and camera, Requirements 6 to 9; done), Batch 2b (prototype look in lights off, no glowing soil and the Lights toggle bug, Requirements 23 to 25, with the workflow rules of Requirements 20 to 22), and Batch 3 (zombies and unease, Requirements 26 to 29, the Risen_Zombie parts of Requirements 10, 11, 12, 15, 16 and 19, and the quality gates and fps measurement of Requirement 21).
2. THE tasks file SHALL end each of Batches 2b and 3 with a task `STOP: wait for the user to review Batch <name> before continuing.`, and SHALL contain no task of the next Batch before that task; the existing Batch 1 and Batch 2 STOP tasks stay.
3. THE Batch 2 deliverables `reference/progress/horror-batch2-ground-graves.png` and `reference/progress/horror-batch2-stones.png` SHALL stay as delivered.
4. THE Batch 2b deliverables SHALL include `reference/progress/horror-batch2b-look.png` at 1920 x 1080 pixels in lights off at the Plot_Camera_Pose of Plot 1, compared in the Batch report with `reference/graveyard/horror-direction.png`, and the result of the full check of Requirement 21 criterion 1.
5. THE Batch 3 deliverables SHALL include `reference/progress/horror-batch3-stir.png` (a Closed_Mound during the Stir), `reference/progress/horror-batch3-risen.png` (a Risen_Zombie at the waist-high pose staring at the lens, with its Torn_Mound), both in lights off at 1920 x 1080 pixels, the result of the full check of Requirement 21 criterion 1, and the Measurement_Script entry in `DEVLOG.md` with the average frames per second (rounded to 1 decimal), the minimum 1-second frames per second, the GPU name reported by the WebGL renderer information, the browser name and version, the viewport, the quality setting, the shock value used, the number of Risen_Zombies shown at the start of the window (only Risen_Zombies are counted) and the date in YYYY-MM-DD form.
6. WHEN each Batch is complete, THE Playwright run SHALL save the screenshots of criteria 4 and 5 to `reference/progress/horror-batch<N>-<name>.png` with `<N>` one of 1, 2, 2b or 3, in lights off.
7. WHEN files under `web/src/scenes/**` or `web/src/fx/**` change, THE agent SHALL name `reference/graveyard/horror-direction.png` and `reference/graveyard/horror-direction-sequence.png` as the matching references, and the Prototype with `reference/graveyard/control-room-direction.md` for the look values, and SHALL offer a scene-critic review.
8. Requirement 22 criteria 3, 4 and 8 to 12 SHALL keep applying to every Batch.
9. THE Horror_Pass SHALL NOT deliver Requirements 30 to 37 (OSD, camera switcher, rate console, hover tag, Opening, jump-scare face and font assets, steering exceptions) and SHALL NOT contain a Batch 4; these are delivered by the future control-room-experience spec. THE plot-fall jump scare of Requirement 35 is cancelled in this spec.