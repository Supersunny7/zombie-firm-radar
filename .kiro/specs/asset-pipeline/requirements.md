# Requirements Document

## Introduction

The asset-pipeline feature supplies the licensed 3D models, textures, HDRIs, avatars, animations and sounds for the graveyard and lab scenes of Zombie Firm Radar. It runs in two phases.

Phase 1 (Scouting) finds, verifies and documents 2-3 candidates per sub-item in 7 categories, then stops and waits for the user's picks. Phase 2 (Download and Convert) downloads the picked assets with a reproducible script, converts them to web formats, enforces size budgets, and records licenses in `CREDITS.md` and `web/public/assets/manifest.json`.

The tasks document lists Phase 1 only. Phase 2 tasks are added when the user asks after picking. The visual targets are the images in `/reference` (near-black night scene with one warm flashlight pool and cold moon rim light in the graveyard; surgical lamp pool on the patient in a dark crypt in the lab). Licensing rules come from `.kiro/steering/asset-licensing.md`. The tech stack and budgets come from `.kiro/steering/tech.md`.

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
8. IF a converted file is larger than 5 MB (5,242,880 bytes), THEN THE Fetch_Script SHALL print the file path, its size in MB rounded to 2 decimals, and a compression suggestion, and SHALL keep the file and continue processing the remaining assets.
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
