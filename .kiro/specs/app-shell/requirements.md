# Requirements Document

## Introduction

The app-shell is the deployable skeleton of Zombie Firm Radar. It provides the Vite + React 19 + TypeScript project in `/web`, the Night feed design tokens, the game-flow state machine, the data loader, global settings, the HUD frame, an accessible Table view, lazy-loaded empty scene canvases, a debug bar and a static Vercel deploy. Every later spec (graveyard, lab, rescue-engine integration, cinematics) plugs into this shell. No 3D content exists beyond an empty canvas with a placeholder label.

Constraints from steering: the data contract is v2 draft and stays unchanged; `/pipeline` and data generation are out of scope; `/data` lives at the repository root and is never duplicated in git; dependency versions are pinned exactly; PowerShell is the developer shell.

## Glossary

- **App**: The React application in `/web`, built with Vite and deployed as static files.
- **Build_Tooling**: The set of pnpm scripts, TypeScript, ESLint, Prettier and Vitest configuration in `/web`.
- **Data_Plugin**: The Vite plugin or config in `/web` that serves `/data` in development and copies it into the build output.
- **Data_Loader**: The module that fetches, validates and returns `firms_index.json`, `firms/{cik}.json` and `macro.json`.
- **Data_Guards**: Hand-written runtime type guards that validate loaded JSON against the types in `web/src/types/data.ts`.
- **Data_Source**: One of `real` (files in `/data`), `mock` (files in `/data/mock`) or `fixture` (the built-in dev fixture in `web/src/dev/fixtures/`).
- **Dev_Fixture**: The built-in data set in `web/src/dev/fixtures/` with three fictional firms (one zombie, one endangered, one healthy), including "Ashgrove Works".
- **Ashgrove_Works**: The fictional fixture firm with revenue 1.20e9, EBIT 38e6, interest expense 61e6, total debt 1.05e9, total assets 1.60e9 and equity 140e6 (USD), margin_mean 0.035, margin_change_sd 0.018, revenue_growth_median 0.01.
- **Error_Screen**: The full-screen view that reports missing or invalid data.
- **Game_Machine**: The typed state machine with states `graveyard`, `capture`, `lab` and `outcome`.
- **Game_Context**: The data carried by the Game_Machine: chosen firm, treatment, rate shock and result.
- **Treatment**: A placeholder type holding up to 3 tools, each with its name and parameters. The rescue-engine spec later owns and refines it.
- **Rate_Shock**: A decimal from 0 to 0.05 representing the rate change delta.
- **Result**: One of `revived`, `undead` or `liquidated`.
- **Store**: The zustand store holding shared state (Game_Context, Settings, overlay mode, debug bar visibility).
- **Settings**: The global values `lights` (`off` or `on`), `sound` (on or off), `lowQuality` and `reducedMotion`.
- **Settings_Storage**: The module that persists Settings in `localStorage`.
- **HUD**: The heads-up frame around the stage: REC indicator, timestamp, Skip slot, settings menu, Table view button, Mock data label and footer.
- **Skip_Slot**: The HUD button position reserved for skipping cinematics.
- **Settings_Menu**: The HUD control that exposes the Settings.
- **Table_View**: The accessible HTML table overlay listing all firms.
- **Overlay_Mode**: The Store value that is either `none` or `table`; it is not a Game_Machine state.
- **Scene**: A full-screen React Three Fiber `<Canvas>` for one game state, lazy-loaded.
- **Debug_Bar**: The developer bar with buttons to pick a firm and move through the game flow.
- **Initial_JS**: The entry chunk and its static imports, excluding lazy Scene chunks, measured gzipped.
- **Design_Tokens**: The Tailwind theme values (colors, fonts, panel style) derived from `design-system.md`.
- **Status_Label**: The visible text and glyph that identifies a firm status, so color is never the only indicator.

## Requirements

### Requirement 1: Project scaffold and tooling

**User Story:** As a developer, I want a pinned, linted and tested Vite + React 19 + TypeScript project in `/web`, so that every later spec builds on a reproducible base.

#### Acceptance Criteria

1. THE Build_Tooling SHALL provide pnpm scripts named `dev`, `build`, `preview`, `test`, `lint`, `format` and `typecheck` in `web/package.json`.
2. THE Build_Tooling SHALL pin every dependency and devDependency in `web/package.json` to an exact version with no range prefix.
3. THE Build_Tooling SHALL use react 19, @react-three/fiber 9 and @react-three/drei 10, and SHALL NOT include fiber 8 or drei 9.
4. THE Build_Tooling SHALL set `"packageManager": "pnpm@12.18.0"` and `"engines": { "node": ">=22" }` in `web/package.json`.
5. THE Build_Tooling SHALL enable TypeScript strict mode.
6. WHEN `pnpm build` runs in `/web`, THE Build_Tooling SHALL complete with exit code 0 and zero TypeScript errors.
7. WHEN `pnpm test` runs in `/web`, THE Build_Tooling SHALL run Vitest once without watch mode and complete with exit code 0.
8. WHEN `pnpm lint` runs in `/web`, THE Build_Tooling SHALL report zero ESLint errors.
9. THE Build_Tooling SHALL provide a Prettier configuration and a `format` check script that reports zero differences on committed files.
10. THE Build_Tooling SHALL keep `web/src/engine` free of React and three.js imports by an ESLint restricted-imports rule.
11. THE Build_Tooling SHALL keep the `web/dist` folder, `node_modules` and local tool output out of git.

### Requirement 2: Design tokens and typography

**User Story:** As a developer, I want Tailwind tokens taken from the design system, so that every UI spec uses the same colors, fonts and panel style.

#### Acceptance Criteria

1. THE Design_Tokens SHALL define these colors: text `#E6E2D6`, secondary text `#A9B4BF`, REC and danger `#E0473B`, status healthy `#8CC2A5`, status endangered `#E8B85C`, status zombie `#E8665A` and status insufficient_data `#A9B4BF`.
2. THE Design_Tokens SHALL define the panel background `rgba(6,8,11,0.78)`, the panel border `1px solid rgba(230,226,214,0.2)` and the panel radius `6px`.
3. THE Design_Tokens SHALL define three font families: display (Cormorant Garamond 500 and 600), UI (Inter 400, 500 and 600) and mono (JetBrains Mono 400 and 500).
4. THE App SHALL self-host the three font families through pinned @fontsource packages with the latin subset only and `font-display: swap`.
5. THE App SHALL load the fonts without requests to third-party origins.
6. WHILE `lights` is `on`, THE App SHALL set a theme attribute on the root element and apply a brighter token set that keeps the same information.
7. WHEN `lights` changes, THE App SHALL update the root theme attribute within one animation frame.
8. THE App SHALL render all body text in sentence case.
9. THE Design_Tokens SHALL give every text and background pair used in the HUD and Table_View a contrast ratio of at least 4.5:1 for normal text, in both lights modes.

### Requirement 3: Game-flow state machine

**User Story:** As a developer, I want a typed state machine for the game flow, so that invalid transitions are impossible and later specs share one flow.

#### Acceptance Criteria

1. THE Game_Machine SHALL define exactly four states: `graveyard`, `capture`, `lab` and `outcome`.
2. THE Game_Machine SHALL start in `graveyard` with an empty Game_Context, where the chosen firm CIK is null, the Treatment holds 0 tools, the Rate_Shock is 0 and the Result is null.
3. WHEN a firm with a valid 10-digit CIK is selected in `graveyard`, THE Game_Machine SHALL transition to `capture` and store the chosen firm CIK in the Game_Context.
4. WHEN capture completes in `capture`, THE Game_Machine SHALL transition to `lab` and keep the chosen firm CIK unchanged.
5. WHEN the switch is pulled in `lab` with a Treatment of 0 to 3 tools and a Result, THE Game_Machine SHALL transition to `outcome` and store the Treatment and the Result in the Game_Context.
6. WHEN the player continues in `outcome`, THE Game_Machine SHALL transition to `graveyard`, keep the Result for the chosen firm available to the graveyard, and set the chosen firm CIK, the Treatment and the current Result in the Game_Context to their empty values.
7. WHEN the player cancels in `capture` or `lab`, THE Game_Machine SHALL transition to `graveyard`, clear the chosen firm CIK and the Treatment, and keep the Rate_Shock unchanged.
8. THE Game_Machine SHALL express its transitions as types, so that a transition not listed in criteria 3 to 7 fails to compile.
9. IF an event is sent that is not valid for the current state, THEN THE Game_Machine SHALL leave the state and the Game_Context unchanged and report the rejected event name and the current state name to the caller.
10. THE Game_Context SHALL carry the chosen firm CIK, the Treatment, the Rate_Shock and the Result, using the placeholder types in criteria 11 to 13.
11. THE Treatment type SHALL hold between 0 and 3 tools, each with a tool name and a parameter record.
12. THE Rate_Shock type SHALL accept a decimal from 0 to 0.05 inclusive.
13. THE Result type SHALL be one of `revived`, `undead` or `liquidated`.
14. IF a Rate_Shock outside 0 to 0.05 (including NaN and infinite values), a Treatment with more than 3 tools, or a CIK that is not a 10-digit zero-padded string is submitted, THEN THE Game_Machine SHALL reject the value, leave the state and the Game_Context unchanged, and report the rejected value and the reason to the caller.
15. THE Game_Machine SHALL contain no React and no three.js imports.
16. THE Game_Machine SHALL have unit tests covering every valid transition and every invalid state and event pair, asserting that the state and the Game_Context are unchanged after each invalid pair.
17. FOR ALL sequences of 0 to 100 events, THE Game_Machine SHALL end in one of the four defined states, keep a Treatment of at most 3 tools and keep a Rate_Shock from 0 to 0.05 (invariant property, tested with fast-check).

### Requirement 4: Zustand store

**User Story:** As a developer, I want one zustand store for shared state, so that scenes, HUD and tables read the same values.

#### Acceptance Criteria

1. THE Store SHALL expose the current Game_Machine state, the Game_Context, the Settings, the Overlay_Mode, the Debug_Bar visibility, the loaded data and the Skip_Slot handler.
2. THE Store SHALL change the game state only through the Game_Machine.
3. THE Store SHALL hold the Overlay_Mode as `none` or `table`, independent of the Game_Machine state.
4. WHEN the Overlay_Mode changes, THE Store SHALL keep the Game_Machine state and Game_Context unchanged.
5. THE Store SHALL expose actions to select a firm, set the Rate_Shock, set the Treatment, set the Result, toggle the Overlay_Mode and toggle the Debug_Bar.

### Requirement 5: Data plugin and data serving

**User Story:** As a developer, I want the repo-root `/data` folder served in development and copied into the build, so that the partner's JSON is used without duplicating files in git.

#### Acceptance Criteria

1. WHILE the dev server runs, THE Data_Plugin SHALL serve files from the repo-root `/data` folder under the URL path `/data/`.
2. WHEN `pnpm build` runs, THE Data_Plugin SHALL copy `/data` into `web/dist/data`, excluding `/data/schema`.
3. WHEN `pnpm build` runs, THE Data_Plugin SHALL exclude `/data/mock` from `web/dist/data`, whether or not `/data/firms_index.json` exists.
4. THE Data_Plugin SHALL read `/data` in place and SHALL NOT create a copy of `/data` under `/web` in git.
5. IF a requested path resolves outside the `/data` folder, THEN THE Data_Plugin SHALL respond with HTTP 404.
6. WHEN the copy completes, THE Data_Plugin SHALL log the number of files copied during the build.

### Requirement 6: Data loading and source selection

**User Story:** As a developer, I want a loader that picks the right data source and reports its origin, so that fictional data is never mistaken for real data.

#### Acceptance Criteria

1. WHEN the App starts, THE Data_Loader SHALL fetch `/data/firms_index.json` and `/data/macro.json` and validate both with the Data_Guards before the App renders any Scene.
2. WHEN a firm enters the `lab` state, THE Data_Loader SHALL fetch `/data/firms/{cik}.json` for the chosen 10-digit CIK and validate it with the Data_Guards.
3. WHILE the App runs in development (`import.meta.env.DEV`), THE Data_Loader SHALL request `/data/mock/firms_index.json` once at startup, and IF that request returns a 2xx status, THEN THE Data_Loader SHALL read `firms_index.json`, `macro.json` and `firms/{cik}.json` from `/data/mock/` and set the Data_Source to `mock`.
4. WHILE the App runs in development and the request for `/data/mock/firms_index.json` returns a non-2xx status or a network error, THE Data_Loader SHALL use the Dev_Fixture for all three file types and set the Data_Source to `fixture`.
5. WHILE the App runs in a production build, THE Data_Loader SHALL read only from `/data/`, SHALL NOT request any path under `/data/mock/`, and SHALL set the Data_Source to `real`.
6. IF `firms_index.json` is missing in a production build, THEN THE App SHALL show the Error_Screen and SHALL NOT use the Dev_Fixture or mock files.
7. THE Dev_Fixture SHALL be imported only behind an `import.meta.env.DEV` check, so that the production bundle contains no fixture content.
8. IF a fetch fails with a network error or a non-2xx status, THEN THE Data_Loader SHALL return an error that contains the file path and the HTTP status (or the text "network error" when no status exists), SHALL NOT cache the failure as a success, and SHALL leave previously cached files unchanged.
9. IF a fetched file is not valid JSON, THEN THE Data_Loader SHALL return an error that contains the file path and SHALL NOT pass the content to the Data_Guards.
10. WHEN a file has been fetched and validated successfully, THE Data_Loader SHALL cache it for the session, and WHEN the same file is requested again, THE Data_Loader SHALL return the cached value without a second network request.
11. THE Data_Loader SHALL fetch only `firms_index.json`, `macro.json` and `firms/{cik}.json` files and SHALL NOT fetch `keeper_log.json`.
12. IF a requested firm CIK is not a 10-digit zero-padded string or is not listed in the loaded `firms_index.json`, THEN THE Data_Loader SHALL return an error naming the CIK and SHALL NOT send a network request for it.
13. WHILE a required file request is pending, THE App SHALL show the text "Loading feed…" and SHALL NOT render the HUD "Mock data" label until the Data_Source is known.
14. THE tests SHALL cover the sources `mock`, `fixture` and `real`, the production missing-index case, the non-2xx and invalid-JSON errors, and the cache behavior, using a mocked `fetch` and no network access.

### Requirement 7: Runtime validation of loaded data

**User Story:** As a user, I want invalid data to stop the app with a clear message, so that I never see wrong financial figures.

#### Acceptance Criteria

1. THE Data_Guards SHALL provide one guard each for `FirmsIndex`, `Firm` and `Macro`, written by hand against `web/src/types/data.ts`.
2. THE Data_Guards SHALL check every field's presence, type, nullability, the `FirmStatus` enum, the 10-digit zero-padded CIK format and ascending order of `fiscal_years` and `years`.
3. THE Data_Guards SHALL treat a missing nullable field as invalid and `null` as valid.
4. IF a guard rejects a file, THEN THE Data_Guards SHALL return the file path and the JSON path of the first failing field with the expected and actual type.
5. IF any required file fails loading or validation, THEN THE App SHALL render the Error_Screen instead of any Scene.
6. THE Error_Screen SHALL show a title, the failing file path, the reason, and a Retry button that reloads the data.
7. THE Error_Screen SHALL be keyboard operable and expose the message in an element with `role="alert"`.
8. WHEN the Retry button is activated, THE Data_Loader SHALL discard cached failures and fetch the files again.
9. FOR ALL valid `FirmsIndex`, `Firm` and `Macro` values, passing the value through `JSON.stringify`, `JSON.parse` and the corresponding guard SHALL be accepted by the guard (round-trip property, tested with fast-check).
10. THE tests SHALL validate the Dev_Fixture against the JSON Schemas in `/data/schema` using ajv.
11. WHERE `/data/mock` exists, THE tests SHALL validate every file in it against the matching JSON Schema using ajv.
12. THE tests SHALL check that every file accepted by the JSON Schemas is also accepted by the Data_Guards, and that a set of invalid samples is rejected by both.

### Requirement 8: Dev fixture content

**User Story:** As a developer, I want a tiny fictional data set, so that I can build scenes before the pipeline delivers data.

#### Acceptance Criteria

1. THE Dev_Fixture SHALL contain exactly three fictional firms: one with status `zombie`, one with `endangered` and one with `healthy`.
2. THE Dev_Fixture SHALL include a firm named "Ashgrove Works" with the Ashgrove_Works values defined in the Glossary, in the latest fiscal year of its `years` array.
3. THE Dev_Fixture SHALL provide `rescue_inputs` for Ashgrove_Works with margin_mean 0.035, margin_change_sd 0.018 and revenue_growth_median 0.01.
4. THE Dev_Fixture SHALL provide a macro file with `dgs10.value` equal to 0.042.
5. THE Dev_Fixture SHALL mark all three firms as `rescue_eligible` and each firm's index entry SHALL be consistent with its firm file.
6. THE Dev_Fixture SHALL use only fictional names that match no listed company and use no real CIK.
7. THE tests SHALL assert the Ashgrove_Works numbers from criterion 2 and 3.

### Requirement 9: Global settings and persistence

**User Story:** As a player, I want lights, sound, quality and motion settings that survive a reload, so that the app stays the way I set it.

#### Acceptance Criteria

1. THE Store SHALL hold the Settings `lights`, `sound`, `lowQuality` and `reducedMotion`.
2. THE Settings SHALL default to `lights` = `off`, `sound` = off, `lowQuality` = false.
3. WHILE the player has not set `reducedMotion` explicitly, THE Store SHALL follow the `prefers-reduced-motion` media query, including changes made while the App runs.
4. WHEN the player sets `reducedMotion` explicitly, THE Store SHALL use the stored value and stop following the media query.
5. WHEN a Setting changes, THE Settings_Storage SHALL write the Settings to `localStorage` inside a try/catch block.
6. WHEN the App starts, THE Settings_Storage SHALL read the Settings from `localStorage` inside a try/catch block.
7. IF `localStorage` throws on read or write, THEN THE Settings_Storage SHALL keep the in-memory Settings working and the App SHALL continue without an error screen.
8. IF stored Settings are not valid JSON or contain values of the wrong type, THEN THE Settings_Storage SHALL ignore the invalid values and use the defaults for them.
9. THE `sound` Setting SHALL be a stored flag only and SHALL start no audio in this spec.
10. THE `lowQuality` and `reducedMotion` Settings SHALL be readable from the Store for later specs and SHALL change no rendering in this spec except the placeholder text in criterion 13 of Requirement 13.
11. FOR ALL valid Settings values, writing then reading the Settings SHALL return an equal value (round-trip property, tested with fast-check).
12. WHILE `reducedMotion` is true, THE App SHALL disable CSS transitions and animations that the shell defines, except the timestamp text update.

### Requirement 10: HUD frame

**User Story:** As a player, I want a security-camera HUD around the stage, so that the app looks like the Night feed and always shows the data disclaimer.

#### Acceptance Criteria

1. THE HUD SHALL show in its top-left corner the text "REC · CAM 03" with a red dot in the REC and danger color.
2. THE HUD SHALL show next to the REC text a timestamp of the real local clock in the format `YYYY-MM-DD HH:mm:ss` in the mono font.
3. WHILE the App is open, THE HUD SHALL update the timestamp once per second.
4. THE HUD SHALL show the footer text "Data: SEC EDGAR. Not investment advice." in every game state and while the Table_View is open.
5. THE HUD SHALL render a Skip_Slot button.
6. WHILE no cinematic has registered a skip handler, THE HUD SHALL render the Skip_Slot disabled with `aria-disabled="true"` or hidden.
7. WHEN a cinematic registers a skip handler, THE HUD SHALL enable the Skip_Slot with the visible label "Skip".
8. WHEN the Skip_Slot is activated or the Esc key is pressed while a skip handler is registered, THE HUD SHALL call the registered handler once.
9. WHILE the Data_Source is `mock` or `fixture`, THE HUD SHALL show a persistent label "Mock data" in a text color that meets AA contrast against its background.
10. WHILE the Data_Source is `real`, THE HUD SHALL NOT show the "Mock data" label.
11. THE HUD SHALL place panels on the right and bottom edges and SHALL NOT cover the center of the stage.
12. WHILE the viewport is narrower than 900px, THE HUD SHALL stack panels below the stage.
13. THE HUD SHALL expose the REC text, the timestamp and the footer as text readable by assistive technology and SHALL mark the red dot as decorative.
14. THE HUD SHALL use the panel background, border and radius from the Design_Tokens for all panels.

### Requirement 11: Settings menu

**User Story:** As a player, I want a settings menu in the HUD, so that I can change lights, sound, quality and motion at any time.

#### Acceptance Criteria

1. THE HUD SHALL show a Settings_Menu button with the visible or accessible name "Settings".
2. WHEN the Settings_Menu button is activated, THE Settings_Menu SHALL open a panel with one labelled control for each Setting.
3. THE Settings_Menu SHALL label the controls "Lights on", "Sound", "Low quality" and "Reduced motion".
4. WHEN a control is toggled, THE Store SHALL update the matching Setting and THE Settings_Storage SHALL persist it.
5. WHILE the Settings_Menu is open, THE Settings_Menu SHALL move focus into the panel and keep Tab focus inside it.
6. WHEN the Esc key is pressed while the Settings_Menu is open, THE Settings_Menu SHALL close and return focus to the Settings_Menu button.
7. THE Settings_Menu controls SHALL be operable with keyboard only and show a visible focus indicator.
8. THE Settings_Menu SHALL show each control's state as text ("On" or "Off") and not by color alone.
9. WHEN `lights` is set to `on`, THE App SHALL set the root theme attribute to its lights-on value, so that later specs can disable blood, jump scares and glitch effects.

### Requirement 12: Table view

**User Story:** As a keyboard or screen-reader user, I want an accessible table of all firms, so that I can use the app without the 3D scenes.

#### Acceptance Criteria

1. THE HUD SHALL show a button labelled "Table view" in every game state.
2. WHEN the "Table view" button is activated, THE Store SHALL set the Overlay_Mode to `table` and THE App SHALL show the Table_View within 100 ms.
3. WHILE the Table_View is open, THE Table_View SHALL render a native HTML `<table>` with a caption and columns "Name", "Sector", "Status", "ICR" and "Debt".
4. THE Table_View SHALL list every firm in `firms_index.json`, one row per firm, with no row limit and no pagination.
5. THE Table_View SHALL show the status as a Status_Label with text ("Zombie", "Endangered", "Healthy", "Not enough data") and a glyph, colored by the status token.
6. THE Table_View SHALL show ICR rounded to two decimals (for example 0.50 and -1.25) and SHALL show "n/a" when `latest_icr` is null.
7. THE Table_View SHALL show debt in USD with a "$" prefix, one decimal place and a unit suffix by magnitude (K for 1e3 to below 1e6, M for 1e6 to below 1e9, B for 1e9 to below 1e12, T for 1e12 and above), SHALL show values below 1e3 as whole dollars without a suffix, and SHALL show "n/a" when `total_debt_usd` is null.
8. THE Table_View SHALL render each column header as a `<button>` inside a `<th scope="col">`, so that the header is operable with Enter and Space.
9. WHEN a column header that is not the active sort column is activated, THE Table_View SHALL sort the rows by that column ascending.
10. WHEN the active column header is activated again, THE Table_View SHALL reverse the sort direction.
11. THE Table_View SHALL set `aria-sort` on the active column header to `ascending` or `descending` and SHALL omit `aria-sort` or set it to `none` on the other column headers.
12. THE Table_View SHALL sort null values after non-null values in both directions.
13. THE Table_View SHALL sort the Status column in the order zombie, endangered, healthy, insufficient_data ascending, and in the reverse order descending.
14. THE Table_View SHALL use a stable sort, break ties by name ascending (case-insensitive) in both directions, compare Sector and Name as case-insensitive text, and compare ICR and Debt numerically.
15. WHEN the Table_View opens, THE Table_View SHALL show rows in the order of `firms_index.json` with no active `aria-sort` column, and SHALL move focus to the first focusable element inside the overlay.
16. WHILE the Table_View is open, THE Table_View SHALL keep Tab and Shift+Tab focus inside the overlay and expose a "Close" button.
17. WHEN the Esc key or the "Close" button is activated, THE Table_View SHALL close, set the Overlay_Mode to `none` and return focus to the "Table view" button.
18. WHEN the Table_View opens, sorts or closes, THE Table_View SHALL make no change to the Game_Machine state or Game_Context.
19. WHERE a row represents a firm with `rescue_eligible` true, THE Table_View SHALL provide a "Select" button in that row with an accessible name that includes the firm name, sending the same firm-selection event as the graveyard.
20. WHERE a row represents a firm with `rescue_eligible` false, THE Table_View SHALL render the row without a "Select" button.
21. WHEN "Select" is activated while the Game_Machine state is `graveyard`, THE Table_View SHALL close, set the Overlay_Mode to `none` and let the Game_Machine transition to `capture` with the CIK stored.
22. IF "Select" is activated while the Game_Machine state is not `graveyard`, THEN THE Table_View SHALL leave the state, the Game_Context and the open overlay unchanged and show a text message that selection is only possible in the graveyard.
23. IF `firms_index.json` has zero firms, THEN THE Table_View SHALL render the table with its header and a single text row "No firms in the data set".
24. THE tests SHALL run vitest-axe on the open Table_View with the Dev_Fixture and report zero violations.
25. THE tests SHALL assert that header buttons are reachable with Tab and that sorting works with Enter and Space.
26. FOR ALL lists of firms and every sortable column, sorting SHALL return a permutation of the input rows, sorted per the column order (invariant property, tested with fast-check).

### Requirement 13: Scenes and lazy loading

**User Story:** As a developer, I want one lazy-loaded full-screen canvas per scene, so that later specs add content without bloating the first download.

#### Acceptance Criteria

1. WHILE the Game_Machine state is `graveyard` or `capture`, THE App SHALL render the graveyard Scene.
2. WHILE the Game_Machine state is `lab` or `outcome`, THE App SHALL render the lab Scene.
3. THE App SHALL render exactly one Scene `<Canvas>` at a time, filling the viewport behind the HUD.
4. THE App SHALL load each Scene module with `React.lazy` and a dynamic import, wrapped in a `Suspense` boundary with a text fallback "Loading feed…".
5. WHEN the App starts, THE App SHALL NOT download the lab Scene chunk.
6. WHEN the Game_Machine first enters `capture`, THE App SHALL start preloading the lab Scene chunk.
7. WHEN the Game_Machine first enters `lab`, THE App SHALL render the lab Scene as soon as its chunk is loaded.
8. THE Scene SHALL render a near-black background (`#05070A` or darker) and an empty `<Canvas>` with no meshes.
9. THE graveyard Scene SHALL show the placeholder label "Graveyard scene placeholder" and THE lab Scene SHALL show the placeholder label "Lab scene placeholder", as HTML text outside the canvas.
10. WHEN the Game_Machine state changes, THE App SHALL unmount the previous Scene canvas and release its WebGL context.
11. IF a Scene chunk fails to load, THEN THE App SHALL show an error message with a Retry button and keep the HUD operable.
12. IF WebGL is unavailable, THEN THE App SHALL show the placeholder label and a message "3D view unavailable. Use Table view." and keep the HUD and Table_View operable.
13. WHILE `lowQuality` is true, THE Scene placeholder label SHALL append the text "Low quality" so that later specs can verify the Setting reaches the Scene.
14. THE Scene SHALL read its data only from the Store.
15. THE App SHALL be usable by keyboard only: every HUD control SHALL be reachable with Tab and a skip link "Skip to table view" SHALL be the first focusable element.

### Requirement 14: Debug bar

**User Story:** As a developer, I want a debug bar, so that I can walk the game flow and test the deployed site before real scenes exist.

#### Acceptance Criteria

1. WHILE `import.meta.env.DEV` is true, THE Store SHALL set the Debug_Bar visibility to shown by default.
2. WHILE `import.meta.env.DEV` is false and the URL has the query parameter `debug=1`, THE Store SHALL set the Debug_Bar visibility to shown.
3. WHILE `import.meta.env.DEV` is false and the URL has no `debug=1`, THE Store SHALL set the Debug_Bar visibility to hidden.
4. THE Store SHALL hold the Debug_Bar visibility and expose an action to toggle it.
5. WHILE the Debug_Bar is shown, THE Debug_Bar SHALL provide a firm picker listing all firms from `firms_index.json`.
6. WHILE the Debug_Bar is shown, THE Debug_Bar SHALL provide buttons "Capture", "Lab", "Outcome" and "Graveyard" that send the valid Game_Machine events in order.
7. WHILE the Game_Machine state does not allow an event, THE Debug_Bar SHALL disable the matching button.
8. WHILE the Debug_Bar is shown, THE Debug_Bar SHALL provide a Rate_Shock input from 0 to 0.05 and a Result picker with `revived`, `undead` and `liquidated`.
9. THE Debug_Bar SHALL be keyboard operable and axe-clean.
10. THE Debug_Bar SHALL dock at the bottom edge and SHALL NOT cover the footer text.

### Requirement 15: Bundle budget

**User Story:** As a developer, I want a measured bundle size, so that later specs stay within the download budget.

#### Acceptance Criteria

1. THE App SHALL keep the Initial_JS at or below 400 KB gzipped.
2. WHEN `pnpm build` runs, THE Build_Tooling SHALL print the Initial_JS gzipped size in KB.
3. WHEN `pnpm build` runs, THE Build_Tooling SHALL print the total gzipped JS size after the graveyard Scene loads (Initial_JS plus the graveyard chunk and its dependencies).
4. IF the Initial_JS exceeds 400 KB gzipped, THEN THE Build_Tooling SHALL fail the size check with a non-zero exit code.
5. THE production bundle SHALL contain no Dev_Fixture, Debug_Bar development-only code, `@theatre/studio` or ajv.
6. THE Build_Tooling SHALL exclude the lab Scene chunk from the Initial_JS.
7. THE final report for this spec SHALL state the measured Initial_JS and total numbers.

### Requirement 16: Static deploy

**User Story:** As the owner, I want a static Vercel configuration, so that I can connect the repository and deploy.

#### Acceptance Criteria

1. THE repository SHALL contain a `vercel.json` that sets the install command to `pnpm install --frozen-lockfile`, the build command to `pnpm --filter ./web build` or an equivalent, and the output directory to `web/dist`.
2. THE `vercel.json` SHALL NOT define any server function or rewrite that requires a server runtime.
3. WHEN the build output is served by a static file server, THE App SHALL load `/data/macro.json` and `/data/firms_index.json` from the deployed `web/dist/data` folder.
4. THE Build_Tooling SHALL include `web/dist/data` in the output only from `/data` as defined in Requirement 5.
5. THE `vercel.json` SHALL set long-lived immutable cache headers for hashed files under `/assets/` and `no-cache` for `/data/*`.
6. THE repository SHALL contain no secrets, tokens or keys.

### Requirement 17: Verification and reporting

**User Story:** As the owner, I want automated checks and a documented manual contrast check, so that I can trust the skeleton.

#### Acceptance Criteria

1. WHEN `pnpm test` runs in `/web`, THE Build_Tooling SHALL run Vitest with jsdom and vitest-axe.
2. THE tests SHALL include: Game_Machine transitions, Data_Guards, ajv schema agreement, Settings persistence, Table_View behavior and axe checks, and the Ashgrove_Works fixture values.
3. THE tests SHALL assert that the HUD renders the footer text "Data: SEC EDGAR. Not investment advice." and, for `mock` and `fixture` sources, the "Mock data" label.
4. THE tests SHALL assert that the Error_Screen renders for an invalid file and for a missing `firms_index.json` in production mode.
5. THE tests SHALL run vitest-axe on the HUD with the Settings_Menu open and report zero violations.
6. WHERE jsdom cannot compute color contrast, THE contrast check SHALL be performed manually with Playwright MCP against the running app in both lights modes and recorded in `/docs`.
7. THE `pnpm test` command SHALL NOT depend on network access or a running dev server.
8. THE spec SHALL change none of `data-contract.md`, `/data/schema`, `/pipeline` or the data-generation code.
9. THE new `README` section or `web/README.md` SHALL document the pnpm commands, the `?debug=1` parameter and the data-source rules, and THE steering file `tech.md` "Common commands" SHALL be updated with them.
10. THE spec SHALL update `structure.md` if top-level folders change.
