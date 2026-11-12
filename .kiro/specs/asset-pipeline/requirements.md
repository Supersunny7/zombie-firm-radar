# Requirements Document

## Introduction

The asset-pipeline feature supplies the licensed 3D models, textures, HDRIs, avatars, animations and sounds for the graveyard and lab scenes of Zombie Firm Radar. It runs in two phases.

Phase 1 (Scouting) finds, verifies and documents 2-3 candidates per sub-item in 7 categories, then stops and waits for the user's picks. Phase 2 (Download and Convert) downloads the picked assets with a reproducible script, converts them to web formats, enforces size budgets, and records licenses in `CREDITS.md` and `web/public/assets/manifest.json`.

The tasks document first listed Phase 1 only. After the user's final picks for rounds 2 and 3, the tasks document holds a Phase 1 wrap-up (task 13) and all Phase 2 tasks (tasks 14 and later), and every one of them is required. The visual targets are the images in `/reference` (near-black night scene with one warm flashlight pool and cold moon rim light in the graveyard; surgical lamp pool on the patient in a dark crypt in the lab). Licensing rules come from `.kiro/steering/asset-licensing.md`. The tech stack and budgets come from `.kiro/steering/tech.md`.

## Glossary

- **Asset_Pipeline**: The combined set of scouting activities (Phase 1) and the download-and-convert tooling (Phase 2) defined in this document.
- **Scout_Agent**: The Kiro agent that performs Phase 1 scouting.
- **Candidate**: A single downloadable asset or asset pack proposed by the Scout_Agent for one sub-item.
- **Category**: One of the 7 asset groups: (1) graveyard ground and stone textures, (2) night sky HDRIs, (3) graveyard props, (4) lab props, (5) patient avatars, (6) zombie and grabbing-hand scans, (7) sound effects.
- **Sub_Item**: A named asset need inside a Category (for example "dead trees" in Category 3 or "ECG flatline" in Category 7).
- **Fallback**: A pre-agreed Candidate for a Sub_Item, listed first in the candidate table.
- **Allowed_License**: A license permitted by `asset-licensing.md`: CC0, CC BY, MIT, Apache-2.0, SIL OFL, own work, or CMU Graphics Lab motion capture with credit.
- **Forbidden_Asset**: An asset that is NonCommercial (CC BY-NC*), a Mixamo file, a paid marketplace asset (CGTrader, Fab, TurboSquid), AI-generated of unknown origin, showing a real person, a film or game character, logo or trademark, or copyrighted music.
- **Candidates_README**: The file `reference/candidates/README.md` containing one table per Category.
- **Night_Read_Rating**: An estimate on a 1 to 3 scale of how a visual Candidate should read at night under a single flashlight: 1 = likely to read poorly, 2 = acceptable, 3 = likely to read well. The rating is advisory and never excludes a Candidate.
- **Preview_Screenshot**: A PNG saved at `reference/candidates/<category>/<name>.png` showing the Candidate's source page.
- **Playwright_Server**: The Playwright MCP server used to open Candidate pages and capture screenshots.
- **Rocketbox_Skeleton**: The Microsoft Rocketbox avatar skeleton to which all project animations are targeted.
- **Manual_Pick**: A picked Sketchfab asset that the user downloads by hand because Sketchfab requires login.
- **Fetch_Script**: The Node script `tools/fetch-assets.mjs` and its helper modules in `tools/`.
- **Asset_Cache**: The git-ignored download cache under `tools/cache/`.
- **Manual_Cache**: The git-ignored folder `tools/cache/manual/<name>/` where Manual_Picks are placed.
- **Asset_Root**: The folder `web/public/assets` with subfolders `textures`, `hdri`, `models`, `avatars`, `animations` and `audio`.
- **Manifest**: The file `web/public/assets/manifest.json` recording source URL, author, license and changes for each file.
- **Credits_File**: The file `CREDITS.md` at the repository root.
- **Graveyard_Budget**: The size limit for assets loaded at startup by the graveyard scene, 25 MB in total.
- **Lab_Budget**: The size limit for lazy-loaded lab assets, 25 MB in total, counted separately from the Graveyard_Budget.
- **Total_Budget**: The size limit for all files under Asset_Root, 60 MB.
- **Asset_Auditor**: The `asset-auditor` custom agent that checks assets against `CREDITS.md` and `asset-licensing.md`.
- **Prebuilt_Binary_Package**: An npm package that downloads a prebuilt binary on install, such as sharp, ffmpeg-static or fbx2gltf.
- **Owned_Paths**: The only paths the Asset_Pipeline may stage and commit: `tools/`, `web/public/assets`, `reference/candidates`, `CREDITS.md`, `.gitignore`, `.kiro/specs/asset-pipeline`.
- **Visible_In_App_Note**: The note at the top of the Credits_File headed "Visible in app", stating that the Credits_File content is shown in the Credits button of the Settings menu in the app.
- **Parallel_Chat**: A concurrent working session that edits `web/src/engine` and `web/src/state` and holds uncommitted work.
- **Final_Picks**: The user's final selections for rounds 2 and 3, recorded in the Picks and Not picked sections of the Candidates_README.
- **Picks_File**: The committed file `tools/picks.json`, the recipe that lists every picked asset with its source, edits and credit fields.
- **Edit_Operation**: One named, parameterised change that the Fetch_Script applies to a model or texture of a pick after conversion to glTF or to an image, such as decimate, removeNode, desaturate, darken, grime, selectVariant or splitMesh.
- **Edit_List**: The ordered list of Edit_Operations stored in the `edits` field of a pick.
- **Decal_Generator**: The own-work script `tools/gen-decals.mjs` that draws the handprint and drag-mark decal images procedurally.
- **Cracked_Headstone_Script**: The own-work script `tools/make-cracked-headstone.mjs` that derives the cracked headstone model from the intact headstone scan.
- **Intact_Headstone_Scan**: The Manual_Pick model `sketchfab-small-gravestone-drydoctoregg` by the author drydoctoregg, licensed CC BY.
- **Bip01_Skeleton**: The 3ds Max Biped skeleton of the Microsoft Rocketbox avatars, whose bone names start with `Bip01`.
- **Proop_Account**: The Sketchfab account (shown as ALTEREGO or Proop) that uploaded `sketchfab-butchers-hook-chain-proop`.
- **Manual_README**: The file `tools/cache/manual/README.md`, which lists how to download and where to place every Manual_Pick.
- **Own_Work_Tool_Output**: A file produced by the Decal_Generator or the Cracked_Headstone_Script.

## Requirements

### Requirement 1: Preparation and context reading

**User Story:** As the project owner, I want the scout to start from a current repository and the project's visual targets, so that candidates match the project's look and rules.

#### Acceptance Criteria

1. WHEN the first task of the Asset_Pipeline starts, THE Scout_Agent SHALL run `git pull` as its first command, before any file read, file write or other command.
2. WHEN `git pull` completes with exit code 0, THE Scout_Agent SHALL read all five steering files `asset-licensing.md`, `tech.md`, `structure.md`, `kiro-workflow.md` and `product.md` from `.kiro/steering/`, and every image file (png, jpg, jpeg, gif, webp) under `/reference` including its subfolders, before proposing any candidate asset.
3. IF `git pull` exits with a non-zero code or reports a merge conflict, THEN THE Scout_Agent SHALL stop all further actions, report to the user the command output and the failure reason, leave every file in the repository unmodified, and retain the failed state without attempting `git reset`, `git stash` or `git checkout`.
4. IF any of the five steering files is missing or unreadable, THEN THE Scout_Agent SHALL stop before proposing any candidate asset and report to the user the name of each missing or unreadable file.
5. IF `/reference` contains no image files, THEN THE Scout_Agent SHALL continue with scouting and report to the user that no visual targets were found.
6. THE Scout_Agent SHALL write every shell command in PowerShell syntax and chain multiple commands with `;`, using no `&&` operator.

### Requirement 2: Scouting coverage and candidate count

**User Story:** As the project owner, I want a bounded but complete list of candidates for every category, so that I can pick assets without reviewing an unmanageable list.

#### Acceptance Criteria

1. THE Scout_Agent SHALL propose a minimum of 2 and a maximum of 3 Candidates for each Sub_Item of Categories 1 to 7, except for a Sub_Item recorded under criterion 6.
2. WHERE one pack covers two or more Sub_Items in a single consistent style, THE Scout_Agent SHALL list that pack as a single Candidate that counts once toward the total in criterion 3, and SHALL list it before separate single-item Candidates for the covered Sub_Items.
3. THE Scout_Agent SHALL limit the total number of distinct Candidates across all Categories to 35, with a tolerance of 3 additional Candidates (an absolute maximum of 38).
4. WHERE a Fallback is defined for a Sub_Item, THE Scout_Agent SHALL list the Fallback as the first row in that Sub_Item's table, and the Fallback SHALL count toward the 2 to 3 Candidates limit in criterion 1.
5. THE Scout_Agent SHALL draw Candidates only from Poly Haven, ambientCG, Kenney, Quaternius, Sketchfab (downloadable, CC BY or CC0 only), Freesound (CC0 only) and OpenGameArt (CC0 only).
6. IF no Candidate that meets the source and license criteria exists for a Sub_Item, THEN THE Scout_Agent SHALL record that Sub_Item in the Candidates_README as "no suitable candidate found", together with the list of sources searched, and SHALL NOT propose a Candidate that violates criterion 5 for that Sub_Item.
7. IF the total number of distinct Candidates would exceed 38, THEN THE Scout_Agent SHALL remove Candidates from Sub_Items that have 3 Candidates, starting with the lowest-ranked, until the total is 38 or fewer, without reducing any Sub_Item below 2 Candidates.

### Requirement 3: Category 1, ground and stone textures

**User Story:** As the project owner, I want graveyard ground and stone textures, so that the terrain and tombstones read as real surfaces under a flashlight.

#### Acceptance Criteria

1. THE Scout_Agent SHALL list the Poly Haven textures lichen_rock, mossy_rock, brown_mud_leaves_01 and excavated_soil_wall as Fallbacks for Category 1.
2. THE Scout_Agent SHALL propose at least 2 Candidates for ground texture and at least 2 Candidates for stone texture.
3. THE Scout_Agent SHALL record for each Category 1 Candidate whether PBR maps (color, normal, roughness) are provided.

### Requirement 4: Category 2, night sky HDRIs

**User Story:** As the project owner, I want night sky HDRIs, so that the graveyard has a believable moonlit background and cold rim light.

#### Acceptance Criteria

1. THE Scout_Agent SHALL list the Poly Haven HDRIs kloppenheim_02_puresky and rogland_moonlit_night as Fallbacks for Category 2.
2. THE Scout_Agent SHALL propose Candidates for a background sky and for environment lighting, and record for each whether a 1k and a 2k version exists.

### Requirement 5: Category 3, graveyard props

**User Story:** As the project owner, I want graveyard props, so that the scene contains a gate, statue, dead trees, stumps, a lantern, a fence and broken stones.

#### Acceptance Criteria

1. THE Scout_Agent SHALL cover the Sub_Items gate, statue, dead trees, stumps, lantern, fence and broken stones in Category 3.
2. THE Scout_Agent SHALL list the Poly Haven models large_iron_gate, gothic_statue, dead_tree_trunk, tree_stump_01 and Lantern_01 as Fallbacks for their matching Sub_Items.
3. THE Scout_Agent SHALL record the polygon count of each Category 3 Candidate.

### Requirement 6: Category 4, lab props

**User Story:** As the project owner, I want lab props, so that the lab scene has an operating table, surgical lamp, IV stand, medical cart and instruments.

#### Acceptance Criteria

1. THE Scout_Agent SHALL cover the Sub_Items operating table, surgical lamp, IV stand, medical cart and instruments in Category 4.
2. THE Scout_Agent SHALL treat Category 4 as having no Fallback.
3. WHEN a single pack covers three or more Category 4 Sub_Items in one consistent style, THE Scout_Agent SHALL present that pack as a separate Candidate row.

### Requirement 7: Category 5, patient avatars

**User Story:** As the project owner, I want realistic rigged patient avatars that work with the existing animations, so that one avatar per sector can be added later without re-animating.

#### Acceptance Criteria

1. THE Scout_Agent SHALL list Microsoft Rocketbox Business_Male_02 (`github.com/microsoft/microsoft-rocketbox`, path `Assets/Avatars/Professions/Business_Male_02`) as the Fallback for Category 5.
2. THE Scout_Agent SHALL list the animations m_walk_neutral_01, m_walk_drunk and m_walk_bruised as Fallback animations for Category 5.
3. THE Scout_Agent SHALL search for further realistic rigged avatars licensed MIT, CC0 or CC BY.
4. THE Scout_Agent SHALL prefer Candidates that share the Rocketbox_Skeleton or can be retargeted to it with little effort.
5. THE Scout_Agent SHALL record for each Category 5 Candidate its skeleton type and an estimate of retargeting effort (none, low, medium or high) with one sentence of justification.

### Requirement 8: Category 6, zombie and hand scans

**User Story:** As the project owner, I want zombie and grabbing-hand scans for the failure scene, so that the failure outcome has a scanned, realistic look.

#### Acceptance Criteria

1. THE Scout_Agent SHALL search Sketchfab for CC BY or CC0 downloadable zombie and grabbing-hand scans for Category 6.
2. THE Scout_Agent SHALL record author name, author profile link and model page link for each Category 6 Candidate.
3. THE Scout_Agent SHALL mark each Category 6 Candidate as a Manual_Pick in the Candidates_README.
4. THE Scout_Agent SHALL limit Category 6 work to finding Candidates and SHALL NOT download Sketchfab files.

### Requirement 9: Category 7, sound effects

**User Story:** As the project owner, I want CC0 sound effects, so that the scenes have medical and ambient audio without license risk.

#### Acceptance Criteria

1. THE Scout_Agent SHALL cover the Sub_Items ECG beep, ECG flatline, heartbeat, low drone, iron gate, electric zap and wind in Category 7.
2. THE Scout_Agent SHALL treat Category 7 as having no Fallback.
3. THE Scout_Agent SHALL propose only Freesound or OpenGameArt Candidates licensed CC0 for Category 7.
4. THE Scout_Agent SHALL record the duration and file format of each Category 7 Candidate.

### Requirement 10: Selection criteria

**User Story:** As the project owner, I want every candidate to pass the same quality and license bar, so that no candidate has to be rejected after I pick it.

#### Acceptance Criteria

1. THE Scout_Agent SHALL propose only Candidates whose source page describes them as photoreal, photogrammetry or scanned, and SHALL exclude Candidates whose source page or preview images show a cartoon, stylized or low-poly style (fewer than 1,000 triangles for a prop or fewer than 5,000 triangles for a character, where the source page states a triangle count).
2. WHEN the Scout_Agent evaluates a visual Candidate, THE Scout_Agent SHALL compare the Candidate's preview images with the images and the qualities listed in `reference/README.md`, and SHALL assign a Night_Read_Rating of 1, 2 or 3 with a one-line reason based on the Candidate's materials (roughness, albedo and surface detail), where 1 means likely to read poorly, 2 means acceptable and 3 means likely to read well under a single flashlight at night.
3. THE Scout_Agent SHALL propose each Candidate that meets criteria 1 and 5 to 11 regardless of its Night_Read_Rating, and SHALL leave the final decision on every Candidate to the user, because most preview images are lit by daylight and the rating is an estimate.
4. IF `reference/README.md` cannot be read or lists no qualities, THEN THE Scout_Agent SHALL assign each Night_Read_Rating from the images under `/reference` alone and SHALL report to the user that the reference qualities are unavailable.
5. THE Scout_Agent SHALL propose only Candidates whose estimated size after Meshopt (models) or WebP (textures) compression is below 5 MB per file, and SHALL record the estimated size in MB with one decimal place and the basis of the estimate (source file size or stated compression ratio).
6. IF the file size of a Candidate cannot be determined from its page, THEN THE Scout_Agent SHALL exclude that Candidate from the proposals.
7. WHEN the Scout_Agent evaluates a Candidate, THE Scout_Agent SHALL verify the license on the Candidate's own page and SHALL record the exact license name as shown on that page and the URL of the page.
8. IF a Candidate is a Forbidden_Asset, THEN THE Scout_Agent SHALL exclude that Candidate from the proposals.
9. IF the license of a Candidate cannot be verified on the Candidate's own page, or the license shown is not on the allowed list in `asset-licensing.md`, THEN THE Scout_Agent SHALL exclude that Candidate from the proposals.
10. WHERE a CC BY license applies to a Candidate, THE Scout_Agent SHALL record the author name and the author or asset link required for attribution.
11. IF a CC BY Candidate's author name or attribution link cannot be found on the Candidate's page, THEN THE Scout_Agent SHALL exclude that Candidate from the proposals.

### Requirement 11: Preview screenshots

**User Story:** As the project owner, I want a screenshot of every candidate page, so that I can judge the look without opening each link.

#### Acceptance Criteria

1. WHEN a Candidate is proposed, THE Scout_Agent SHALL open the Candidate's source page with the Playwright_Server.
2. WHEN the Candidate's source page has loaded, THE Scout_Agent SHALL save a Preview_Screenshot at `reference/candidates/<category>/<name>.png`.
3. IF the Playwright_Server cannot load a Candidate's source page, THEN THE Scout_Agent SHALL record "preview unavailable" and the reason in the Candidates_README row and keep the Candidate only if its license was verified by another means.
4. THE Scout_Agent SHALL name each Preview_Screenshot with lowercase letters, digits and hyphens only.
5. THE Scout_Agent SHALL keep each Preview_Screenshot under 1 MB.

### Requirement 12: Candidates README

**User Story:** As the project owner, I want one comparable table per category, so that I can make my picks in one pass.

#### Acceptance Criteria

1. THE Scout_Agent SHALL write the Candidates_README with one table per Category.
2. THE Scout_Agent SHALL include in each table row the columns name, preview link, source URL, author, license, file size, poly count, night-read rating (1 to 3), night-read reason (one line), and one line on why the Candidate fits.
3. WHERE a column does not apply to a Candidate, including the night-read rating and night-read reason of every Category 7 Candidate, THE Scout_Agent SHALL write "n/a" in that cell.
4. THE Scout_Agent SHALL include in the Candidates_README a comparison of the proposed Candidates with the look of the images in `/reference`.
5. THE Scout_Agent SHALL write each preview link in the Candidates_README as a relative path to an existing Preview_Screenshot.
6. THE Scout_Agent SHALL place Fallback rows first in each Sub_Item and label them "Fallback".

### Requirement 13: Phase 1 stop gate

**User Story:** As the project owner, I want the work to stop after scouting, so that I decide which assets enter the project.

#### Acceptance Criteria

1. WHEN the Candidates_README is complete, THE Scout_Agent SHALL stop and wait for the user's picks.
2. WHILE the user has not given picks, THE Scout_Agent SHALL leave Asset_Root, the Manifest, the Credits_File and the Fetch_Script unchanged.
3. THE Scout_Agent SHALL list only Phase 1 work in the tasks document.
4. WHEN the user asks for Phase 2 after picking, THE Scout_Agent SHALL add Phase 2 tasks to the tasks document before implementing them.

### Requirement 14: Fetch script behavior

**User Story:** As a developer, I want a reproducible download script, so that anyone can rebuild the asset folder from the repository.

#### Acceptance Criteria

1. THE Fetch_Script SHALL be located at `tools/fetch-assets.mjs` with helper modules in `tools/`.
2. WHEN the Fetch_Script runs, THE Fetch_Script SHALL download each picked asset into the Asset_Cache.
3. WHEN the Fetch_Script runs a second time with unchanged picks and an unchanged Asset_Cache, THE Fetch_Script SHALL produce output files whose SHA-256 hashes equal those of the first run and SHALL issue 0 network requests for files already present in the Asset_Cache.
4. WHEN the Fetch_Script finishes converting an asset, THE Fetch_Script SHALL write the converted output to `web/public/assets/{textures,hdri,models,avatars,animations,audio}/<name>/`, where the subfolder matches the asset type and `<name>` is the asset name from the picks.
5. IF a download fails (network error, timeout after 60 seconds, or an HTTP response other than success), THEN THE Fetch_Script SHALL retry up to 2 times, and if the download still fails SHALL report the asset name and the cause, leave any previously cached or output files for that asset unchanged, continue with the remaining assets, and exit with a non-zero code after all assets are processed.
6. THE Fetch_Script SHALL use only Poly Haven API endpoints listed in the official Poly Haven API documentation and SHALL send a User-Agent header that names the project and provides a contact URL or address on every request.
7. THE Fetch_Script SHALL store Asset_Cache content in a path ignored by git.
8. WHEN a Manual_Pick is required, THE Fetch_Script SHALL read the file from the Manual_Cache and SHALL NOT make any network request for that asset.
9. IF a Manual_Pick file is missing from the Manual_Cache, THEN THE Fetch_Script SHALL report the expected file name and the source page URL, skip that asset, continue with the remaining assets, and exit with a non-zero code after all assets are processed.

### Requirement 15: Manual picks documentation

**User Story:** As the project owner, I want exact instructions for manual downloads, so that I can place Sketchfab files correctly on the first try.

#### Acceptance Criteria

1. THE Asset_Pipeline SHALL provide `tools/cache/manual/README.md` listing, for each Manual_Pick, the exact expected file name and the source page URL.
2. THE Asset_Pipeline SHALL use the following `.gitignore` entries, in this order, so that the content of the Manual_Cache is excluded from git while `tools/cache/manual/README.md` stays tracked: `tools/cache/*`, `!tools/cache/manual/`, `tools/cache/manual/*`, `!tools/cache/manual/README.md`.
3. WHEN the `.gitignore` entries in criterion 2 are written, THE Asset_Pipeline SHALL verify with `git check-ignore` that `tools/cache/manual/README.md` is not ignored and that a downloaded file under `tools/cache/` and a file under `tools/cache/manual/<name>/` are ignored.
4. THE Asset_Pipeline SHALL track `tools/cache/manual/README.md` without running `git add -f` or `git add --force`.

### Requirement 16: Format conversion

**User Story:** As a developer, I want assets converted to compact web formats, so that the site meets its download targets.

#### Acceptance Criteria

1. WHEN the Fetch_Script processes a source model or avatar, THE Fetch_Script SHALL write a `.glb` file that uses Meshopt compression, produced with gltf-transform.
2. WHEN the Fetch_Script processes a source texture, THE Fetch_Script SHALL write a WebP file, produced with gltf-transform and sharp. THE Fetch_Script SHALL NOT produce KTX2 output and SHALL NOT invoke toktx in v1.
3. WHEN the Fetch_Script processes a source HDRI, THE Fetch_Script SHALL write a `.hdr` file and SHALL NOT convert it to another format.
4. WHEN the Fetch_Script processes a source audio file, THE Fetch_Script SHALL write both an `.ogg` file and an `.mp3` file from that source.
5. WHERE a source model is FBX, THE Fetch_Script SHALL convert the model to glTF through an npm package before applying Meshopt compression.
6. WHEN the Fetch_Script writes a texture, THE Fetch_Script SHALL limit its longest side to 1024 px, except the main graveyard ground texture, whose longest side SHALL be limited to 2048 px.
7. WHEN the Fetch_Script writes an HDRI, THE Fetch_Script SHALL set its width to 2048 px for the background sky HDRI and to 1024 px for each environment-lighting HDRI.
8. IF a converted file is larger than 5 MB (5,242,880 bytes), THEN THE Fetch_Script SHALL print the file path, its size in MB rounded to 2 decimals, and a compression suggestion, and SHALL keep the file and continue processing the remaining assets. A pick that carries an explicit `sizeException` (`maxBytes`, `reason`) in `tools/picks.json` is reported as an accepted exception with its reason instead of a warning while the file stays within `maxBytes`, and its manifest entry records the exception.
9. IF a conversion step fails for an asset (unreadable source, missing tool, or tool error), THEN THE Fetch_Script SHALL print the asset path and the failure cause, SHALL NOT leave a partial output file for that asset, SHALL continue with the remaining assets, and SHALL exit with a non-zero code after all assets are processed.

### Requirement 17: Size budgets

**User Story:** As a developer, I want enforced size budgets, so that the initial download stays within the project target.

#### Acceptance Criteria

1. THE Fetch_Script SHALL keep the total size of graveyard startup assets at or below the Graveyard_Budget of 25 MB (26,214,400 bytes, where 1 MB = 1,048,576 bytes).
2. THE Fetch_Script SHALL keep the total size of lab lazy-loaded assets at or below the Lab_Budget of 25 MB (26,214,400 bytes), counted separately from the Graveyard_Budget.
3. THE Fetch_Script SHALL keep the total size of all files under Asset_Root, including files in subfolders, at or below the Total_Budget of 60 MB (62,914,560 bytes).
4. WHEN the Fetch_Script finishes with all budgets met, THE Fetch_Script SHALL print the size in bytes of each output file, print the used size and the limit for each of the Graveyard_Budget, Lab_Budget and Total_Budget, and exit with code 0.
5. IF any budget is exceeded, THEN THE Fetch_Script SHALL print the name of each exceeded budget with its used size and limit, print the path and size of the three largest files in the exceeded budget (or all files if fewer than three exist), and exit with a non-zero code.
6. IF a file under Asset_Root is not assigned to the graveyard startup group or the lab lazy-loaded group, THEN THE Fetch_Script SHALL count the file toward the Total_Budget only, print a warning naming the file, and continue.
7. IF the size of an output file cannot be read, THEN THE Fetch_Script SHALL print the file path and the reason, and exit with a non-zero code.

### Requirement 18: Manifest and credits

**User Story:** As the project owner, I want every file traceable to its source and license, so that attribution obligations are met.

#### Acceptance Criteria

1. WHEN the Fetch_Script writes a file to Asset_Root, THE Fetch_Script SHALL write exactly one Manifest entry for that file, containing non-empty values for source URL, author, license and changes made.
2. WHEN the Fetch_Script writes a file to Asset_Root, THE Fetch_Script SHALL add exactly one row to the Credits_File for that file, using the columns Path, Title, Author, Source URL, License and Changes we made, with a non-empty value in every column.
3. THE Fetch_Script SHALL add a row to the Credits_File only for files that exist in the repository under Asset_Root at the time the row is written.
4. WHEN the Fetch_Script runs a second time with unchanged inputs, THE Fetch_Script SHALL leave the Credits_File with exactly one row per Path and with the same row count as after the first run.
5. WHERE the Rocketbox avatars are used, THE Asset_Pipeline SHALL place the Rocketbox LICENSE file in the same directory as the avatar files.
6. WHERE CMU motion capture is used, THE Credits_File SHALL contain the fixed CMU credit line exactly once.
7. IF a file's license is not an Allowed_License, THEN THE Fetch_Script SHALL NOT write that file to Asset_Root, SHALL NOT add a Manifest entry or Credits_File row for it, SHALL report the file name and its license value to the user as an error, and SHALL continue processing the remaining files.
8. IF a file has an empty or missing source URL, author or license value, THEN THE Fetch_Script SHALL NOT write that file to Asset_Root, SHALL report the file name and the missing field to the user as an error, and SHALL continue processing the remaining files.
9. IF the Fetch_Script exits after one or more files were refused under criterion 7 or 8, THEN THE Fetch_Script SHALL exit with a non-zero status.

### Requirement 19: Dependency and binary safety

**User Story:** As the project owner, I want to know about every binary-fetching dependency before it installs, so that nothing unreviewed runs on my machine.

#### Acceptance Criteria

1. THE Asset_Pipeline SHALL pin every added dependency to an exact version.
2. THE Asset_Pipeline SHALL prefer npm packages over native tools on Windows.
3. WHEN a Prebuilt_Binary_Package is needed, THE Scout_Agent SHALL list the package names and versions and tell the user before the first install.
4. THE Asset_Pipeline SHALL run only binaries installed through npm.
5. IF a binary is available only from outside npm, THEN THE Asset_Pipeline SHALL ask the user for another approach instead of running that binary.
6. THE Asset_Pipeline SHALL keep secrets and API keys out of the repository and read them from environment variables.
7. WHEN the Scout_Agent needs to use the Poly Haven API, gltf-transform or an FBX-to-glTF converter, THE Scout_Agent SHALL look up the current documentation through context7 or the web before writing code.
8. THE Asset_Pipeline SHALL declare all Fetch_Script dependencies in a separate `tools/package.json` with its own lockfile in `tools/`, and SHALL NOT add any Fetch_Script dependency to `web/package.json` or the `web/` lockfile.

### Requirement 20: Final audit

**User Story:** As the project owner, I want an independent license and size audit at the end, so that no asset reaches a commit unlisted or oversized.

#### Acceptance Criteria

1. WHEN Phase 2 conversion completes, THE Scout_Agent SHALL invoke the Asset_Auditor.
2. WHEN the Asset_Auditor reports missing rows, forbidden licenses, missing attribution or files over 5 MB, THE Scout_Agent SHALL fix each reported item.
3. WHEN fixes are applied, THE Scout_Agent SHALL invoke the Asset_Auditor again until it reports no findings.

### Requirement 21: Git safety with a parallel chat

**User Story:** As the project owner, I want asset work to avoid disturbing the parallel engine work, so that uncommitted changes are never lost or committed by accident.

#### Acceptance Criteria

1. WHEN the Scout_Agent stages files for a commit, THE Scout_Agent SHALL stage only files inside the Owned_Paths, naming each file or folder explicitly in the `git add` command.
2. THE Scout_Agent SHALL NOT run `git add -A`, `git add .`, `git add --all`, `git stash`, `git reset`, `git checkout`, `git clean` or `git restore` (other than the unstage command in criterion 6) on any path outside the Owned_Paths.
3. THE Scout_Agent SHALL leave every file outside the Owned_Paths, including everything under `web/src/engine` and `web/src/state`, byte-identical to its content before the Scout_Agent's task began, including uncommitted working-tree changes.
4. WHEN the Scout_Agent commits, THE Scout_Agent SHALL use a conventional commit message of the form `<type>(asset-pipeline): <description>`, where `<type>` is one of feat, fix, test, chore or docs and the subject line is at most 72 characters.
5. IF the user has not explicitly asked for a commit in the current request, THEN THE Scout_Agent SHALL NOT run `git commit` and SHALL report the files that are staged or modified and awaiting a commit.
6. IF `git status` shows staged files outside the Owned_Paths before a commit, THEN THE Scout_Agent SHALL unstage only those files with `git restore --staged <path>`, leave their working-tree content unchanged, and report each unstaged path to the user before committing.
7. THE Scout_Agent SHALL ensure `.gitignore` contains the entries `tools/cache/*`, `!tools/cache/manual/`, `tools/cache/manual/*` and `!tools/cache/manual/README.md` in this order, plus an entry for local tool output, SHALL verify with `git check-ignore` that `tools/cache/manual/README.md` is not ignored and that downloaded cache files are ignored, SHALL NOT use `git add -f` or `git add --force`, and SHALL NOT add any entry that ignores `.kiro`, so that `.kiro` files remain tracked.
8. THE Scout_Agent SHALL leave all files under `/pipeline` and all `/data` generation code unmodified.
9. IF a Scout_Agent action would require modifying, staging or discarding a file outside the Owned_Paths, THEN THE Scout_Agent SHALL NOT perform the action, SHALL leave the file unchanged, and SHALL report the file path and the blocked action to the user.

### Requirement 22: Visible credits note

**User Story:** As the project owner, I want `CREDITS.md` to state that its content is shown inside the app, so that the visible-credit condition in Poly Haven's terms is met and nobody removes the note by accident.

#### Acceptance Criteria

1. THE Credits_File SHALL begin with the Visible_In_App_Note as its first section, before any table row.
2. THE Visible_In_App_Note SHALL state that the Credits_File content is shown in the app's Credits button in the Settings menu, that the UI is delivered by the graveyard-scene spec, and that the note is required because Poly Haven's terms need a visible credit.
3. WHEN the Fetch_Script writes or updates the Credits_File, THE Fetch_Script SHALL preserve the Visible_In_App_Note unchanged at the top of the file.
4. WHEN the Fetch_Script runs a second time with unchanged inputs, THE Fetch_Script SHALL leave exactly one Visible_In_App_Note in the Credits_File.
5. IF the Credits_File has no Visible_In_App_Note when the Fetch_Script writes it, THEN THE Fetch_Script SHALL insert the Visible_In_App_Note at the top of the file once.

### Requirement 23: Picks record and rejected list

**User Story:** As the project owner, I want my picks and rejections written into the candidates README, so that Phase 2 starts from a clear, reviewable record of what is used where and why other candidates were dropped.

#### Acceptance Criteria

1. WHEN the user passes picks to the Scout_Agent, THE Scout_Agent SHALL add a section headed "Picks" to the Candidates_README containing one line per pick, each stating the Candidate name, the scene (graveyard or lab) and the role in that scene.
2. THE Scout_Agent SHALL write each pick line using the name of a Candidate that exists in a Candidates_README table.
3. IF a pick names a Candidate that does not exist in any Candidates_README table, THEN THE Scout_Agent SHALL leave it out of the Picks section and report the unknown name to the user.
4. THE Scout_Agent SHALL add a section headed "Rejected" to the Candidates_README listing each rejected Candidate by name with the reason for rejection, for example "sketchfab-broken-headstone: readable inscription of a real person's grave".
5. THE Scout_Agent SHALL keep every Candidate that is not in Picks in its Category table and SHALL NOT delete its row or Preview_Screenshot.
6. WHEN the Picks section names an animation from the Rocketbox repository, THE Scout_Agent SHALL verify that the animation file exists in `github.com/microsoft/microsoft-rocketbox` and SHALL record the commit SHA at which it was verified, so that Phase 2 can pin that SHA.
7. IF a named Rocketbox animation does not exist in the repository, THEN THE Scout_Agent SHALL report the missing name to the user and SHALL NOT list that animation in Picks.

### Requirement 24: Provenance check for reworked Sketchfab models

**User Story:** As the project owner, I want to know whether a Sketchfab model that its author says is a rework of someone else's sculpt is really licensed for use, so that no asset enters the project with an unclear origin.

#### Acceptance Criteria

1. THE Scout_Agent SHALL run the provenance check for each Manual_Pick Sketchfab model whose author states that it reworks another person's sculpt, namely sketchfab-zombie-corpse-greenall and sketchfab-zombie-hand-greenall.
2. WHEN the Scout_Agent runs the provenance check for a model, THE Scout_Agent SHALL search the author's Sketchfab page, the model description, the model comments and any linked ArtStation or other post for the original sculpt.
3. IF the original sculpt is the uploader's own work or is licensed for use in this project, THEN THE Scout_Agent SHALL record the evidence (source URLs and quotes of fewer than 30 words each) in the Candidates_README and SHALL add the model to the Picks section.
4. IF the original sculpt cannot be confirmed as the uploader's own work or as licensed for this use, THEN THE Scout_Agent SHALL keep the model in the Rejected section with the reason "provenance unconfirmed" and SHALL propose one replacement Candidate for it.
5. WHEN a replacement is needed for sketchfab-zombie-corpse-greenall, THE Scout_Agent SHALL propose a realistic emaciated corpse or skeleton; WHEN a replacement is needed for sketchfab-zombie-hand-greenall, THE Scout_Agent SHALL propose a clawing hand.
6. THE Scout_Agent SHALL hold each replacement Candidate to the selection criteria of Requirement 10 and SHALL treat it as a Manual_Pick.
7. THE Scout_Agent SHALL record the provenance result for each checked model in the Candidates_README whether it was confirmed or not.

### Requirement 25: Category 8, horror dressing

**User Story:** As the project owner, I want props and decals that dress the lab and graveyard as a horror set, so that the scenes feel lived-in and unsettling without using real remains or readable personal data.

#### Acceptance Criteria

1. THE Scout_Agent SHALL add Category 8 "horror dressing" to the Candidates_README with the Sub_Items: human skull and bones; body bag; morgue drawer or cold chamber; rusty chains and hooks; leather restraint straps; blood splatter, handprint and drag-mark decals; cobwebs; rotten cloth or sheet; blank headstones in three states (intact, cracked, broken).
2. THE Scout_Agent SHALL propose exactly 2 Candidates for each Category 8 Sub_Item, and SHALL treat Category 8 as having no Fallback.
3. THE Scout_Agent SHALL propose for the Sub_Item human skull and bones only replicas or sculpts and SHALL NOT propose any asset that is or depicts real human remains.
4. THE Scout_Agent SHALL propose for the decal Sub_Item only textures licensed CC0.
5. THE Scout_Agent SHALL apply to Category 8 the same sources, Allowed_License checks, selection criteria, Night_Read_Rating, Preview_Screenshot and README column rules as Requirements 2.5, 10 to 12 define for Categories 1 to 7, with Preview_Screenshots saved in `reference/candidates/08-horror-dressing/`.
6. THE Scout_Agent SHALL NOT count Category 8 Candidates toward the 35 Candidate target or the 38 Candidate maximum of Requirement 2, because Category 8 is a user-requested round with 2 Candidates per Sub_Item.
7. WHERE one pack covers two or more Category 8 Sub_Items in a consistent style, THE Scout_Agent SHALL list it as one Candidate for each Sub_Item it covers.
8. IF no Candidate meeting the criteria exists for a Category 8 Sub_Item, THEN THE Scout_Agent SHALL record that Sub_Item as "no suitable candidate found" with the sources searched.

### Requirement 26: Headstone constraints

**User Story:** As the project owner, I want blank, light-weight headstones whose state reads from their shape, so that thousands of stones can be instanced and each firm's engraving can be added as a decal.

#### Acceptance Criteria

1. THE Scout_Agent SHALL propose only headstone Candidates with a blank face that has no readable inscription and no names.
2. THE Scout_Agent SHALL propose only headstone Candidates of dark, weathered stone.
3. THE Scout_Agent SHALL record for each headstone Candidate the triangle count of the source model and whether decimation is needed to reach at most 20,000 triangles per stone.
4. THE Scout_Agent SHALL propose only headstone Candidates that can be brought to at most 20,000 triangles each by decimation.
5. THE Scout_Agent SHALL propose headstone Candidates whose intact, cracked and broken states are distinguishable from the silhouette alone.
6. THE Scout_Agent SHALL prefer three stones from one author or one scan set so that the styles match.
7. WHERE one Candidate is a set covering all three states, THE Scout_Agent SHALL count it as one Candidate for each of the three state Sub_Items.
8. IF a headstone Candidate shows a readable inscription of a real person, THEN THE Scout_Agent SHALL exclude it and list it in the Rejected section with that reason.

### Requirement 27: Second Phase 1 stop gate

**User Story:** As the project owner, I want the work to stop again after the picks, provenance and Category 8 results are committed, so that I decide before anything is downloaded.

#### Acceptance Criteria

1. WHEN the Picks section, the provenance results and the Category 8 tables are complete and validated, THE Scout_Agent SHALL commit only files inside the Owned_Paths after running `git pull --no-edit`.
2. THE Scout_Agent SHALL run `git pull --no-edit` instead of `git pull` for every pull in this extension.
3. AFTER the commit, THE Scout_Agent SHALL stop and wait for the user's picks for Category 8 and the provenance outcome.
4. WHILE the user has not given those picks, THE Scout_Agent SHALL add no Phase 2 tasks, install no packages, and leave Asset_Root, the Manifest, the Credits_File and the Fetch_Script unchanged.

### Requirement 28: Category 9, lab and finale (round 3)

**User Story:** As the project owner, I want candidates for the switch, the lab exit door and the lab walls and floor, so that the finale and the lab room can be dressed from real, licensed assets.

#### Acceptance Criteria

1. THE Scout_Agent SHALL add Category 9 "lab and finale (round 3)" to the Candidates_README with the Sub_Items: large knife switch or lever (Frankenstein-style) for the "pull the switch" moment; old heavy door (wood or iron) for the lab exit; lab wall texture (old brick or stone crypt wall); lab floor texture (wet stone or tile).
2. THE Scout_Agent SHALL propose exactly 2 Candidates for each Category 9 Sub_Item, and SHALL treat Category 9 as having no Fallback.
3. THE Scout_Agent SHALL prefer Poly Haven or ambientCG Candidates licensed CC0 for the wall and floor texture Sub_Items.
4. THE Scout_Agent SHALL apply to Category 9 the same sources, Allowed_License checks, selection criteria, Night_Read_Rating, Preview_Screenshot and README column rules as Requirements 2.5 and 10 to 12 define for Categories 1 to 7, with Preview_Screenshots saved in `reference/candidates/09-round-3/`.
5. THE Scout_Agent SHALL record for each wall and floor Candidate whether PBR maps (color, normal, roughness) are provided.
6. IF no Candidate meeting the criteria exists for a Category 9 Sub_Item, THEN THE Scout_Agent SHALL record that Sub_Item as "no suitable candidate found" with the sources searched.

### Requirement 29: Category 10, sounds (round 3)

**User Story:** As the project owner, I want sound candidates for the scares and the lab atmosphere, so that outcomes and the graveyard have audio that matches the visuals.

#### Acceptance Criteria

1. THE Scout_Agent SHALL add Category 10 "sounds (round 3)" to the Candidates_README with the Sub_Items: jump-scare sting; digging in dirt; shambling footsteps; cloth rustle; electrical hum before a zap; crows.
2. THE Scout_Agent SHALL propose exactly 2 Candidates for each Category 10 Sub_Item and SHALL propose only Freesound Candidates licensed CC0.
3. THE Scout_Agent SHALL mark every Category 10 row "Manual pick" and SHALL NOT download any file.
4. THE Scout_Agent SHALL record the duration and file format of each Category 10 Candidate and SHALL write `n/a` for its Night_Read_Rating and reason.
5. THE Scout_Agent SHALL save Preview_Screenshots of the sound pages in `reference/candidates/09-round-3/` under names matching `^[a-z0-9-]+\.png$` and each under 1 MB.
6. THE Scout_Agent SHALL treat the Sub_Item crows as optional: IF no CC0 Candidate fits, THEN THE Scout_Agent SHALL record "no suitable candidate found" with the sources searched and SHALL continue without blocking.
7. THE Scout_Agent SHALL NOT count Category 9 or Category 10 Candidates toward the 35 Candidate target or the 38 Candidate maximum of Requirement 2, and the same exemption applies to round 2 (Category 8).

### Requirement 30: Extra Rocketbox avatars

**User Story:** As the project owner, I want six more Rocketbox avatars on the same skeleton, so that patients vary by sector and age without new retargeting work.

#### Acceptance Criteria

1. THE Scout_Agent SHALL list 6 additional Microsoft Rocketbox avatars that use the same 3ds Max Biped (Bip01) skeleton as `Business_Male_02`, with a mix of ages and genders and with everyday or work clothes, for sector variety.
2. THE Scout_Agent SHALL verify that each listed avatar exists in `github.com/microsoft/microsoft-rocketbox` at the pinned commit SHA `0943055db6ec570bcef9f2c8b41c9e5467c808f9` and SHALL record its exact repository path.
3. THE Scout_Agent SHALL record for each avatar the MIT license, the clothing, the apparent age group and gender, and a statement that no real person and no brand or logo is depicted.
4. THE Scout_Agent SHALL NOT be required to scout other sources or take Preview_Screenshots for these avatars, and MAY reference the Rocketbox preview images in the repository by link.
5. IF an avatar cannot be found at the pinned SHA, THEN THE Scout_Agent SHALL leave it out of the list, report it, and choose another avatar so that 6 are listed where possible.
6. THE Scout_Agent SHALL NOT download any avatar file.

### Requirement 31: Combined stop gate for rounds 2 and 3

**User Story:** As the project owner, I want the work to stop after round 3 so that I decide on rounds 2 and 3 together before anything is downloaded.

#### Acceptance Criteria

1. THE Scout_Agent SHALL run `git pull --no-edit` before starting round 3 and before any commit in this extension.
2. WHEN Categories 9 and 10 and the extra avatar list are merged into the Candidates_README and validated, THE Scout_Agent SHALL report the result to the user.
3. THE Scout_Agent SHALL commit only files inside the Owned_Paths, and only WHEN the user asks for a commit; the user has not asked for a commit in this round.
4. AFTER the merge and validation, THE Scout_Agent SHALL stop and wait for the user's picks for rounds 2 and 3 together; the round-2 decisions remain open.
5. WHILE the user has not given those picks, THE Scout_Agent SHALL add no Phase 2 tasks, install no packages, and leave Asset_Root, the Manifest, the Credits_File and the Fetch_Script unchanged.

### Requirement 32: Final picks record for rounds 2 and 3

**User Story:** As the project owner, I want my final picks for rounds 2 and 3 written into the candidates README, so that Phase 2 starts from one reviewable record of what is used, what is edited and what is not used.

#### Acceptance Criteria

1. WHEN the Phase 1 wrap-up starts, THE Scout_Agent SHALL run `git pull --no-edit` as its first command and SHALL stop and report the output on a non-zero exit code or a merge conflict.
2. THE Scout_Agent SHALL write the Final_Picks of round 2 and round 3 into the "Picks" section of the Candidates_README, one line per pick stating the Candidate name, the scene (graveyard or lab) and the role, plus the planned edit in words where the Final_Picks name one (for example "decimate to about 30K triangles", "desaturate the green slightly", "split handle and blade from the base").
3. THE Scout_Agent SHALL write the following Candidates into the "Not picked" section of the Candidates_README, each with the reason "not picked by the user": the leather belt, the plastic skull, the rough linen, both Mr.Nein sets, the RBG crosses, both ambientCG leaking decals, the second body bag, the second morgue unit, knife-switch-type-c, the olkaad iron door, castle-brick-07, slate-floor-02, and the second Candidate in each round-3 sound pair.
4. THE Scout_Agent SHALL keep `sketchfab-zombie-hand-greenall` in the "Rejected" section and SHALL add `sketchfab-zombie-corpse-greenall` to Picks with the note "provenance accepted on the author's statement".
5. THE Scout_Agent SHALL carry the phrase "provenance accepted on the author's statement" into the `credits.changes` field of the pick for `sketchfab-zombie-corpse-greenall` in the Picks_File, so that the Credits_File row records it when the file exists.
6. THE Scout_Agent SHALL write each pick line using the name of a Candidate that exists in a Candidates_README table, and SHALL report any unknown name to the user without adding it.
7. THE Scout_Agent SHALL apply the outcome of the Proop_Account check (Requirement 33) and of the Rocketbox preview check (Requirement 34) to the Picks and Not picked sections before the section is committed.
8. WHEN the Candidates_README, the Manual_README and the spec files are complete, THE Scout_Agent SHALL stage only `reference/candidates`, `tools/cache/manual/README.md` and `.kiro/specs/asset-pipeline` by explicit path, SHALL NOT stage `DEVLOG.md`, and SHALL NOT run `git add -A`, `git add .` or `git add -f`.
9. WHEN the user has asked for the commit in the current request, THE Scout_Agent SHALL commit the staged Owned_Paths with a conventional message of the form `docs(asset-pipeline): <description>` of at most 72 characters and SHALL then stop.

### Requirement 33: AI-account check for the Proop hook upload

**User Story:** As the project owner, I want the uploader of the butcher's hook checked for AI-generated models before I download anything, so that no AI-generated asset of unknown origin enters the project.

#### Acceptance Criteria

1. WHEN the Phase 1 wrap-up runs, THE Scout_Agent SHALL check the Proop_Account before `sketchfab-butchers-hook-chain-proop` is written into the Manual_README.
2. WHEN the Scout_Agent runs the check, THE Scout_Agent SHALL open the Proop_Account page and the pages of its other public uploads with the Playwright_Server in read-only mode (navigation, snapshot and screenshot only, no login, no download, no form input).
3. WHEN the Scout_Agent inspects an upload, THE Scout_Agent SHALL read its title, tags, description and badges for AI-generation statements, including the Sketchfab "createdwithai" tag and the words "AI generated", "AI-generated", "text-to-3D", "image-to-3D", "Meshy", "Tripo", "Luma" and "Rodin".
4. IF any upload of the Proop_Account carries an AI-generation tag or statement, THEN THE Scout_Agent SHALL drop `sketchfab-butchers-hook-chain-proop` from Picks, add it to Rejected with the reason "uploader publishes AI-generated models", leave it out of the Manual_README and the Picks_File, and tell the user in the report which upload triggered the decision.
5. IF no upload of the Proop_Account carries an AI-generation tag or statement, THEN THE Scout_Agent SHALL keep the pick and SHALL record the number of uploads inspected and the date of the check in the Candidates_README.
6. IF the Proop_Account page or any of its upload pages cannot be loaded, THEN THE Scout_Agent SHALL treat the check as unfinished, SHALL NOT list the hook download in the Manual_README, and SHALL ask the user how to proceed.

### Requirement 34: Rocketbox preview logo check and Bip01 bone-name confirmation

**User Story:** As the project owner, I want the six extra Rocketbox avatars checked for brand marks and for the expected skeleton, so that no logo ships in the app and no animation is retargeted onto a wrong rig.

#### Acceptance Criteria

1. WHEN the Phase 1 wrap-up runs, THE Scout_Agent SHALL open the repository preview image of each of the avatars Medical_Female_01, Construction_Male_01, Construction_Female_01, Business_Female_01, Gardener_Male_01 and Female_Adult_06 and SHALL look at each image for logos, brand marks and readable brand text.
2. IF a preview image shows a logo, a brand mark or readable brand text, THEN THE Scout_Agent SHALL drop that avatar from Picks, add it to Not picked with the reason "logo or brand mark visible in the preview", and tell the user which avatars were dropped.
3. WHEN the Fetch_Script converts a Rocketbox avatar, THE Fetch_Script SHALL read the joint names of the converted skeleton and SHALL confirm that every joint name matches the pattern `^Bip01([ _]|$)`, treating a single exported scene root node without the prefix as not a joint.
4. IF the skeleton of a Rocketbox avatar contains a joint whose name does not match the pattern in criterion 3, or contains no joint at all, THEN THE Fetch_Script SHALL fail the conversion of that avatar with a message naming the avatar, the first offending joint name and the expected pattern, SHALL write no output file for that avatar, and SHALL continue with the remaining picks.
5. WHEN the Fetch_Script converts a Rocketbox avatar successfully, THE Fetch_Script SHALL record in the pick's Manifest entry that the Bip01 check passed.

### Requirement 35: Final picks recipe in the Picks_File

**User Story:** As a developer, I want every final pick written as one recipe entry with its source, edits and credit fields, so that the Fetch_Script rebuilds the whole asset folder without manual decisions.

#### Acceptance Criteria

1. THE Picks_File SHALL contain exactly one entry for each pick in the Final_Picks and in the round-1 Picks of the Candidates_README that is not rejected or dropped.
2. THE Picks_File SHALL give each entry the fields `id`, `source`, `manual`, `expectedFile`, `targetFolder`, `group`, `edits` and `credits`, where `expectedFile` and `targetFolder` are null when `manual` is false, `group` is `graveyard` or `lab`, `edits` is a possibly empty Edit_List, and `credits` holds the non-empty values `title`, `author`, `sourceUrl`, `license` and `changes`.
3. WHERE a pick is a Manual_Pick, THE Picks_File SHALL set `manual` to true, `expectedFile` to the exact file name that the Manual_README states, and `targetFolder` to `tools/cache/manual/<id>`.
4. WHERE a pick is a Manual_Pick, THE Fetch_Script SHALL read the pick's file from `targetFolder/expectedFile` and SHALL make no network request for it.
5. WHERE a pick's files come from the Decal_Generator or the Cracked_Headstone_Script, THE Picks_File SHALL set `source.type` to `generated` or `derived` respectively and THE Fetch_Script SHALL run the matching script instead of a download.
6. IF an entry has an unknown key, a missing required field, a duplicate `id`, or an edit that is not defined in Requirement 36, THEN THE Fetch_Script SHALL refuse the entry, report its `id` and the problem, continue with the remaining entries, and exit with a non-zero code after all entries are processed.
7. THE Picks_File SHALL record for the Final_Picks at least these edits: for `sketchfab-zombie-hand-craggle` a desaturate of the green; for `sketchfab-human-skull-danieledefilippis` a darken and a grime; for `sketchfab-morgue-refrigerator-porteous` a decimate to about 30,000 triangles; for `sketchfab-strap-buckles-kit-dmigul` a darken of the webbing to black; for `sketchfab-knife-switch-type-d` a selectVariant of the grey variant and a splitMesh that separates handle and blade from the base; for `sketchfab-crutch-and-iv-drip` a removeNode of the crutch; and for the headstones a decimate to at most 20,000 triangles.

### Requirement 36: Per-asset edit operations

**User Story:** As a developer, I want a small fixed set of repeatable edit operations in the recipe, so that each asset is adapted to the scene without opening a 3D editor.

#### Acceptance Criteria

1. THE Fetch_Script SHALL support these Edit_Operations: `decimate` (target triangle count), `removeNode` (node or mesh name), `desaturate` (texture or material, saturation cap), `darken` (texture or material, maximum channel value), `grime` (texture or material, seed, floor value), `selectVariant` (material or texture variant name) and `splitMesh` (by node or by connected parts, with the output part names).
2. WHEN the Fetch_Script applies an Edit_List, THE Fetch_Script SHALL apply the Edit_Operations in the listed order to the model read from the cache, after the FBX-to-glTF step and before the Meshopt step.
3. WHEN the Fetch_Script applies `decimate`, THE Fetch_Script SHALL reduce the triangle count of each affected mesh so that the total is at most the target, using meshoptimizer through gltf-transform, and SHALL leave a mesh unchanged when its triangle count is already at or below the target.
4. WHEN the Fetch_Script applies `removeNode`, THE Fetch_Script SHALL remove the named node or mesh and its children, SHALL leave every other node unchanged, and SHALL prune resources that no longer have a reference.
5. WHEN the Fetch_Script applies `desaturate`, `darken` or `grime`, THE Fetch_Script SHALL change only the named texture, SHALL set the result so that applying the same operation to its own output changes no 8-bit channel by more than 1, and SHALL use only the seed from the pick for any random value.
6. WHEN the Fetch_Script applies `selectVariant`, THE Fetch_Script SHALL keep only the named material or texture variant and SHALL remove the other variants and unreferenced textures.
7. WHEN the Fetch_Script applies `splitMesh`, THE Fetch_Script SHALL divide the named mesh into the listed parts so that every triangle belongs to exactly one part, the total triangle count is unchanged, and each part is a separate node with the listed name that can be animated.
8. IF an Edit_Operation names a node, mesh, material or texture that does not exist in the model, THEN THE Fetch_Script SHALL fail that pick with a message naming the pick, the operation and the missing name, write no output file for it, and continue with the remaining picks.
9. WHEN the Fetch_Script runs the same Edit_List twice on the same cached input, THE Fetch_Script SHALL produce output files with the same SHA-256 hashes.

### Requirement 37: No executables outside npm for geometry edits

**User Story:** As the project owner, I want all geometry edits done with npm packages only, so that no Blender or other unreviewed program runs on my machine.

#### Acceptance Criteria

1. THE Fetch_Script SHALL perform every geometry edit with gltf-transform and meshoptimizer only.
2. THE Asset_Pipeline SHALL NOT call Blender or any other executable that was not installed through npm.
3. IF a `splitMesh` Edit_Operation cannot be done with gltf-transform and meshoptimizer for a model (for example because the handle and the blade share one connected mesh with no separating node or connected part), THEN THE Scout_Agent SHALL stop work on that pick, SHALL describe the problem and the options to the user, and SHALL wait for the user's answer before continuing with that pick.
4. WHILE the user has not answered a stop under criterion 3, THE Scout_Agent SHALL continue with the other picks and SHALL leave the stopped pick out of the Manifest and the Credits_File.
5. IF a conversion step needs a binary that is available only outside npm, THEN THE Scout_Agent SHALL ask the user for another approach, as Requirement 19.5 states.

### Requirement 38: Procedural handprint and drag-mark decals

**User Story:** As the project owner, I want our own generated blood handprint and drag-mark decals, so that the horror dressing needs no third-party decal and every mark is repeatable.

#### Acceptance Criteria

1. THE Decal_Generator SHALL live at `tools/gen-decals.mjs` and SHALL write to the git-ignored folder `tools/cache/generated/decals/` only.
2. THE Decal_Generator SHALL produce at least 3 variants of a handprint decal and at least 3 variants of a drag-mark decal.
3. THE Decal_Generator SHALL draw each variant with a seeded pseudo-random number generator whose seed is derived from the decal type and the variant index, and SHALL NOT read the clock, `Math.random` or the environment.
4. WHEN the Decal_Generator runs twice with the same seed, THE Decal_Generator SHALL write PNG files with the same SHA-256 hashes.
5. THE Decal_Generator SHALL write each variant as a 512 by 512 pixel RGBA PNG with a transparent background, so that the alpha channel contains at least one pixel with alpha 0 and at least one pixel with alpha above 0.
6. THE Decal_Generator SHALL give every pixel with alpha above 0 a dark, wet, low-saturation red colour, defined as hue within 15 degrees of red, saturation from 0.45 to 0.75, and value from 0.12 to 0.45.
7. THE Decal_Generator SHALL give the 3 or more variants of one decal type pairwise different pixel data.
8. WHERE the pipeline converts textures to WebP, THE Fetch_Script SHALL convert each generated PNG to a WebP file that keeps the alpha channel, with its longest side at most 1024 pixels.
9. THE Fetch_Script SHALL write for each generated decal a Credits_File row and a Manifest entry with the author "Zombie Firm Radar team", the license "Own work" and a non-empty "Changes we made" text that states the decal is procedurally generated.

### Requirement 39: Cracked headstone derived from the intact scan

**User Story:** As the project owner, I want the cracked headstone made by our own script from the intact scan, so that all three headstone states match in style and the cracked state is repeatable.

#### Acceptance Criteria

1. THE Cracked_Headstone_Script SHALL live at `tools/make-cracked-headstone.mjs` and SHALL read the Intact_Headstone_Scan from the Manual_Cache after the `decimate` Edit_Operation of the intact pick has been applied.
2. THE Cracked_Headstone_Script SHALL add a displaced crack normal map to the stone material, generated procedurally from a seeded pseudo-random number generator, and SHALL add a chipped edge by moving vertices near the top and side edges of the stone, using only the seed from the pick.
3. WHEN the Cracked_Headstone_Script runs twice on the same input with the same seed, THE Cracked_Headstone_Script SHALL write GLB files with the same SHA-256 hashes.
4. THE Cracked_Headstone_Script SHALL produce a model with at most 20,000 triangles, and WHEN the chipped edge would add triangles beyond that limit, THE Cracked_Headstone_Script SHALL decimate the result to the limit.
5. THE Cracked_Headstone_Script SHALL keep the face of the stone free of readable inscriptions.
6. THE Fetch_Script SHALL write for the cracked headstone a Credits_File row whose Author column names the author of the Intact_Headstone_Scan (drydoctoregg), whose License column is "CC BY" and whose "Changes we made" column states that the cracked state was derived by our script from the intact scan with a displaced crack normal map and a chipped edge.
7. IF the Intact_Headstone_Scan is missing from the Manual_Cache, THEN THE Fetch_Script SHALL skip the cracked headstone, report the expected file name of the intact scan, and exit with a non-zero code after all picks are processed.
8. WHERE the cracked headstone is not produced, THE Asset_Pipeline SHALL leave the procedural headstones as the fallback and SHALL state this in the final report.

### Requirement 40: Manual-pick README completeness

**User Story:** As the project owner, I want exact download instructions for every manual pick, so that I can fetch each file on the first try and drop it in the right folder.

#### Acceptance Criteria

1. THE Manual_README SHALL contain one entry for every pick whose `manual` field is true, and no entry for any other pick.
2. THE Manual_README SHALL state in each entry the Candidate name, the source page URL, the exact download option to choose on the site (for example the Sketchfab "glTF" autoconverted zip or the original format, or the Freesound original file), the exact expected file name, the exact target path `tools/cache/manual/<id>/<expectedFile>`, the credit line, and any note such as "grey variant" for the knife switch.
3. THE Manual_README SHALL state the Freesound author in the credit line of every sound entry.
4. WHEN the Manual_README is written, THE Scout_Agent SHALL verify with `git check-ignore` that `tools/cache/manual/README.md` is not ignored and that a file under `tools/cache/manual/<id>/` is ignored.
5. WHEN the Fetch_Script runs, THE Fetch_Script SHALL regenerate the Manual_README from the Picks_File so that the file content depends only on the picks.
6. THE Manual_README SHALL NOT contain an entry for `sketchfab-butchers-hook-chain-proop` unless the check in Requirement 33 passed.

### Requirement 41: Phase 2 execution order, audit and stop gate

**User Story:** As the project owner, I want Phase 2 to install only what I approved, finish with an audit and a report, and then stop, so that nothing is committed or kept without my say.

#### Acceptance Criteria

1. THE Scout_Agent SHALL run `git pull --no-edit` as the first command of every Phase 2 task that changes files.
2. WHEN the tools package is ready for its first install, THE Scout_Agent SHALL list the Prebuilt_Binary_Packages (sharp, ffmpeg-static, fbx2gltf) with their pinned versions and note that meshoptimizer is WebAssembly, SHALL stop, and SHALL wait for the user's approval before running any install command.
3. WHILE the user has not approved the install, THE Scout_Agent SHALL run no install command and no script that needs the packages.
4. WHEN the Fetch_Script has run with exit code 0, THE Scout_Agent SHALL print a size report with the size of every output file and the used size and limit of the Graveyard_Budget, Lab_Budget and Total_Budget.
5. WHEN the size report is complete, THE Scout_Agent SHALL invoke the Asset_Auditor and repeat fixes and audits as Requirement 20 states until the Asset_Auditor reports no findings.
6. IF the same Asset_Auditor finding remains after two fixes, THEN THE Scout_Agent SHALL stop and ask the user instead of repeating the fix.
7. WHEN the audit reports no findings, THE Scout_Agent SHALL write a final report that lists the converted assets, the Manual_Picks that are still missing from the Manual_Cache, the picks that were dropped or stopped, the budgets and the packages installed, and SHALL then stop.
8. THE Scout_Agent SHALL run `git commit` in Phase 2 only WHEN the user asks for it in the current request, and SHALL stage only files inside the Owned_Paths by explicit path.
9. THE Scout_Agent SHALL leave every file outside the Owned_Paths, including `web/src`, `/pipeline`, `/data` and `DEVLOG.md`, unchanged and unstaged.

### Requirement 42: Cracked headstone silhouette (amends Requirement 39)

**User Story:** As the project owner, I want the cracked headstone to look different from the intact stone at graveyard distance, so that the player reads the state from the outline and not only from a texture.

#### Acceptance Criteria

1. THE Cracked_Headstone_Script SHALL cut a diagonal fracture through the slab of the Intact_Headstone_Scan so that the outline of the resulting model contains a real gap or step along the fracture, and not only a texture change.
2. THE Cracked_Headstone_Script SHALL remove one upper corner of the slab as a chip that changes the outline.
3. THE Cracked_Headstone_Script SHALL offset the top piece of the fractured slab by 2 to 4 cm relative to the real height of the stone, converted to model units of the scan, where the scale assumption (assumed real height of the stone in metres and the resulting offset in model units) is recorded in the Manifest entry and in the "Changes we made" cell of the Credits_File row.
4. THE Cracked_Headstone_Script SHALL paint a darker crack line along the fracture in the stone texture.
5. THE Cracked_Headstone_Script SHALL produce a model with at most 20,000 triangles.
6. WHEN the Cracked_Headstone_Script runs twice on the same input with the same seed, THE Cracked_Headstone_Script SHALL write GLB files with the same SHA-256 hashes.
7. WHEN the Cracked_Headstone_Script runs on its own output, THE Cracked_Headstone_Script SHALL leave the model unchanged (idempotence).
8. THE Cracked_Headstone_Script SHALL keep the face of the stone free of readable inscriptions and SHALL NOT draw any glyph-like mark on the face.
9. THE Cracked_Headstone_Script SHALL locate the fracture and the chipped corner by geometry it creates itself and SHALL NOT treat the pre-existing notch on the face of the intact scan as a crack, a chip or a fracture line.
10. WHEN the silhouette of `own-headstone-cracked` and the silhouette of the intact headstone are rendered at 200 px height from the graveyard viewing direction, THE Asset_Pipeline SHALL measure the difference and SHALL require a silhouette XOR area of at least 3 percent of the intact silhouette area, equivalent to an intersection over union of 0.97 or lower.
11. IF the measured silhouette difference is below the threshold in criterion 10, THEN THE Asset_Pipeline SHALL report the measured XOR percent and IoU and SHALL NOT accept the cracked headstone.

### Requirement 43: Ruella hand without sleeve, dead skin tone

**User Story:** As the project owner, I want the Ruella hand to be a bare, dead-looking hand without the blue sleeve, so that the hand reading from the screen edge looks like a zombie hand and does not glow under the lamp.

#### Acceptance Criteria

1. THE Fetch_Script SHALL delete the blue sleeve geometry of `sketchfab-zombie-hand-ruella` and SHALL NOT merely recolour it.
2. THE Fetch_Script SHALL give the cut at the wrist a ragged edge drawn from the seed of the pick, using only that seed.
3. THE Fetch_Script SHALL cap or close the cut at the wrist so that no open boundary edge at the cut shows the interior of the mesh.
4. THE Fetch_Script SHALL grade the remaining skin to a grey-green dead tone whose mean HSV value over the skin pixels is from 0.45 to 0.55.
5. WHEN the Fetch_Script applies the Edit_List of `sketchfab-zombie-hand-ruella` to its own output, THE Fetch_Script SHALL leave the geometry unchanged and SHALL change no 8-bit texture channel by more than 1.
6. THE Fetch_Script SHALL produce a model with at most 30,000 triangles for `sketchfab-zombie-hand-ruella`.
7. THE Fetch_Script SHALL support these additional Edit_Operations, defined in the edit-operations table of the design and accepted by the Picks_File schema: `removeByVertexColor` (delete the triangles whose vertex colour matches a colour range, with a ragged cut line and a cap), `raggedCut` (cut the mesh by a seeded ragged plane and close the cut) and `tint` (grade the named texture to a target hue, saturation cap and mean value).
8. IF an added Edit_Operation names a node, mesh, material or texture that does not exist in the model, THEN THE Fetch_Script SHALL fail that pick as Requirement 36.8 states.
9. THE Fetch_Script SHALL perform the added Edit_Operations with gltf-transform, meshoptimizer and plain JavaScript only, and SHALL NOT call Blender or any executable outside npm.

### Requirement 44: Visual verification of the fixed assets

**User Story:** As the project owner, I want before and after renders of the two fixed assets, so that I can see the fixes and the silhouette difference instead of trusting the numbers.

#### Acceptance Criteria

1. THE Asset_Pipeline SHALL provide a static preview page under `tools/preview/` that loads a `.glb` file with the Meshopt decoder and WebP textures, with a fixed camera and fixed lighting.
2. THE preview page SHALL use the `three` package installed under `web/node_modules` WHERE that package is present, and SHALL otherwise use a pinned dev dependency declared in `tools/package.json` only after the Scout_Agent has told the user and the user has agreed.
3. WHERE the query parameter `silhouette=1` is present, THE preview page SHALL render the model as flat black on white at 200 px height.
4. THE Asset_Pipeline SHALL serve the preview page with a local static server script that uses only Node built-ins, that the Scout_Agent starts and stops itself, and that makes no network request and binds only to `127.0.0.1`.
5. WHEN the fixed assets are verified, THE Scout_Agent SHALL render the cracked headstone, the intact headstone and the Ruella hand before and after the fixes with the Playwright_Server, and SHALL save the PNG files to `reference/progress/` with lowercase letters, digits and hyphens in the names, each under 1 MB, including the 200 px silhouette pair of the headstone.
6. THE Scout_Agent SHALL treat `reference/progress/` as outside the Owned_Paths, SHALL NOT stage or commit the PNG files unless the user asks, and SHALL report this to the user.
7. IF the render shows that a fix fails its measurable criterion in Requirement 42 or 43, THEN THE Scout_Agent SHALL change the edit and render again, up to 3 rounds, and SHALL stop and report to the user when the third round still fails.
8. WHEN the visual fixes pass, THE Scout_Agent SHALL run the full tools tests, SHALL run the pipeline twice and require equal SHA-256 hashes, SHALL regenerate the Credits_File and the Manifest with the script, and SHALL run the Asset_Auditor until it reports no findings, as Requirement 41.5 states.

### Requirement 45: Drop rocketbox-female-adult-06 and prune removed picks

**User Story:** As the project owner, I want the Rocketbox Female_Adult_06 avatar removed from the project and the pipeline to clean up after any removed pick, so that no asset remains that could read as targeting a real group and the repository holds only what `tools/picks.json` lists.

#### Acceptance Criteria

1. THE Picks_File SHALL contain no pick with the id `rocketbox-female-adult-06`.
2. WHEN the Fetch_Script runs, THE Fetch_Script SHALL prune every Asset_Root folder `web/public/assets/<typeDir>/<id>/` whose `<id>` is recorded in the Manifest or the Credits_File as owned by a pick that is no longer in the Picks_File.
3. WHEN the Fetch_Script prunes a removed pick, THE Fetch_Script SHALL delete the Manifest entries and the Credits_File rows whose Path lies inside that pick's folder.
4. THE Fetch_Script SHALL delete files only inside Asset_Root folders owned by removed pick ids, and SHALL leave every other file, including files in sibling folders, in the folder of a pick that remains, and files outside Asset_Root, unchanged.
5. IF a removed pick's folder path resolves outside Asset_Root or is not a direct `<typeDir>/<id>` folder, THEN THE Fetch_Script SHALL skip that folder, SHALL report the path as an error and SHALL exit with a non-zero status.
6. WHEN the Fetch_Script runs with `--dry-run`, THE Fetch_Script SHALL print the folders, Manifest entries and Credits_File rows it would prune and SHALL delete nothing.
7. WHEN the Fetch_Script runs a second time after pruning, THE Fetch_Script SHALL prune nothing and SHALL leave the Asset_Root, the Manifest and the Credits_File byte-identical.
8. WHEN `rocketbox-female-adult-06` is dropped, THE Asset_Pipeline SHALL remove `web/public/assets/avatars/rocketbox-female-adult-06/`, including its `.glb` file and its LICENSE file, through the pruning in criteria 2 and 3 and not by hand.
9. THE Candidates_README SHALL list `rocketbox-female-adult-06` under Picks/Rejected in `reference/candidates/README.md` with the reason "Religious head covering would be shown rotting and attacking the camera in the horror sequences, which could read as targeting a real group."
10. THE Candidates_README SHALL state that seven Rocketbox avatars remain, SHALL update every avatar count in the README and in the sector-mapping notes, and SHALL state that Female_Adult_06 was suggested for Retail Trade and that Retail Trade is now unassigned.

### Requirement 46: Face box on rocketbox-construction-male-01

**User Story:** As the project owner, I want the box that covers the face of the construction worker avatar found and fixed at its real cause, so that the avatar shows a face and the fix is explained and repeatable.

#### Acceptance Criteria

1. WHEN investigating the face box, THE Scout_Agent SHALL inspect the source FBX and the converted glTF of `rocketbox-construction-male-01` and SHALL list every mesh, node and material that covers the face, with its name, material alphaMode, alphaCutoff, texture and UV range.
2. THE Scout_Agent SHALL record the finding as one of "mesh" (a separate visor or helmet-shield mesh or node) or "texture" (an opaque rendering caused by alpha, material or UV handling) and SHALL record the evidence and the fix in `reference/candidates/README.md` and in the report.
3. IF the finding is "mesh", THEN THE Picks_File SHALL contain a `removeNode` edit in the recipe of `rocketbox-construction-male-01` that removes the visor or shield node or mesh by name.
4. IF the finding is "texture", THEN THE Fetch_Script SHALL preserve the alphaMode (`MASK` or `BLEND`) and the alphaCutoff of the source material in its converted output, or SHALL correct the affected material or UV mapping, and a unit test SHALL fail without the fix and pass with it.
5. WHEN the Fetch_Script converts `rocketbox-construction-male-01` after the fix, THE converted model SHALL keep every `Bip01` bone name of the Bip01_Skeleton.
6. THE fix SHALL leave the output of every other pick byte-identical, apart from picks whose source materials use alpha, and SHALL record any such pick in the report.
7. WHEN the fix is applied to its own output, THE Fetch_Script SHALL produce the same model, as Requirement 36.5 states for Edit_Operations.
8. WHEN the fix is verified, THE Scout_Agent SHALL render a head close-up of `rocketbox-construction-male-01` before and after the fix with the preview page and the Playwright_Server, SHALL save the PNG files to `reference/progress/` with lowercase letters, digits and hyphens in the names, each under 1 MB, and SHALL NOT stage or commit them unless the user asks.
