# Implementation Plan

Note: a real Vercel deploy is the only end-to-end check for this fix. It must be run by the owner after merge and is out of scope for these tasks. Local checks cover the config text and the local build only. The Vercel bundled pnpm version, and npx and registry access on the Vercel builder, stay unverified until that deploy.

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Commands pin the packageManager pnpm version
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: The input space is two command strings, so scope the property to the concrete failing cases: `installCommand` and `buildCommand` in the current `vercel.json`
  - In `web/src/config.smoke.test.ts`, inside the existing `describe('vercel.json', ...)`, keep the existing truthiness test and add new tests (per design, File 2):
    - Read the version from `pkg.packageManager`; parse with `/^pnpm@(\d+\.\d+\.\d+)$/` and fail with a clear message for any other shape
    - For each of `installCommand` and `buildCommand`, extract versions with `/\bpnpm@(\d+\.\d+\.\d+)(?![\w.-])/g`
    - Assert exactly one distinct version is found and it equals the `packageManager` version, using `expect(found, message).toEqual([expected])`; the message names both, e.g. `vercel.json installCommand uses pnpm@<found or "none"> but web/package.json packageManager is pnpm@12.18.0`
    - Assert each command contains the exact substring `--dir web`
    - Do not hardcode `12.18.0` in the new assertions
  - Run from `web` against the current, unchanged `vercel.json`: `pnpm test config.smoke`
  - **EXPECTED OUTCOME**: Install pinned and build pinned tests FAIL, with messages reporting `none` as the found version; the `--dir web` test passes. This proves the bug exists
  - Do not edit `vercel.json` in this task
  - Document the counterexamples (e.g. `installCommand "corepack enable && pnpm --dir web install --frozen-lockfile"` has no `pnpm@` version). If the failure shows a different cause, re-hypothesize before continuing
  - Mark task complete when the test is written, run, and the failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.4, 2.5_

- [x] 2. Write preservation checks (BEFORE implementing fix)
  - **Property 2: Preservation** - Other deploy config and local workflow unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - The config is one static file, so no property-based test is added (see design, Testing Strategy). Preservation is checked by observation and a before/after comparison
  - Observe on UNFIXED code, from `web`: `pnpm test config.smoke`; all existing assertions pass (headers, output directory, no functions, `packageManager` declared as `pnpm@12.18.0`, and the rest), plus the `--dir web` assertion from task 1
  - Observe and record from the unfixed `vercel.json`: `outputDirectory` is `web/dist`; `/assets/(.*)` has `Cache-Control: public, max-age=31536000, immutable`; `/data/(.*)` has `Cache-Control: no-cache`; no `functions` key; no `rewrites` key; no secrets or new environment variables
  - Save a baseline for later comparison with `git show HEAD:vercel.json` (all keys other than `installCommand` and `buildCommand` must be deep-equal after the fix)
  - Confirm `web/package.json` has no diff and there is no root `package.json`
  - Record `git status` so the uncommitted `table-caption-data-source-fix` changes (`TableView.tsx`, `TableView.test.tsx`) can be shown untouched afterwards
  - **EXPECTED OUTCOME**: Existing assertions PASS on unfixed code (this confirms the baseline to preserve)
  - Mark task complete when the baseline is recorded and the existing assertions pass
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [x] 3. Fix for unpinned pnpm in vercel.json (ERR_PNPM_BROKEN_LOCKFILE on Vercel)

  - [x] 3.1 Implement the fix in vercel.json
    - Replace only these two values and keep every other key and its order:
      - `"installCommand": "npx --yes pnpm@12.18.0 --dir web install --frozen-lockfile"`
      - `"buildCommand": "npx --yes pnpm@12.18.0 --dir web build"`
    - `corepack enable` is dropped; `--yes` suppresses the npx prompt on the non-interactive builder
    - Do not add a root `package.json`, change the Vercel project root, or edit `web/package.json`
    - _Bug_Condition: isBugCondition(X) where X.lockfileWrittenBy = "pnpm 12" AND NOT explicitPnpmVersion(X.installCommand, X.packageManagerVersion)_
    - _Expected_Behavior: expectedBehavior(result) from design: both commands contain `pnpm@<packageManager version>` and `--dir web`_
    - _Preservation: Preservation Requirements from design (outputDirectory, headers, no functions or rewrites, no secrets, repo-root project root, local web workflow)_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 3.2 Update app-shell requirements 16.1 and 16.7
    - In `.kiro/specs/app-shell/requirements.md`, Requirement 16, replace 16.1 with: THE repository SHALL contain a `vercel.json` that sets `installCommand` to `npx --yes pnpm@12.18.0 --dir web install --frozen-lockfile`, `buildCommand` to `npx --yes pnpm@12.18.0 --dir web build` and `outputDirectory` to `web/dist`.
    - Replace 16.7 with: THE deploy SHALL run pnpm through an explicit `pnpm@<version>` in both `installCommand` and `buildCommand`, where `<version>` is the exact version in the `packageManager` field of `web/package.json`, and SHALL NOT rely on corepack or on the pnpm version bundled with Vercel, because the lockfile is written by pnpm 12 and the repo root has no `package.json`.
    - Keep the rest of Requirement 16 unchanged
    - _Requirements: 2.6_

  - [x] 3.3 Update app-shell design.md
    - In `.kiro/specs/app-shell/design.md`, in the `vercel.json` block at about line 448, replace the two command lines with the new commands from 3.1
    - In the paragraph after it (about line 458), replace the sentence "`corepack enable` makes pnpm resolve the version from `packageManager` (`pnpm@12.18.0`)." with: "Both commands run `npx --yes pnpm@12.18.0`, because corepack reads `packageManager` from the current directory and the repo root has no `package.json`. The smoke test checks that this version equals `packageManager` in `web/package.json`."
    - Keep the sentences about no functions or rewrites, the standalone `/web` project, the repo-root build and the Vercel project root note
    - _Requirements: 2.6_

  - [x] 3.4 Update app-shell tasks.md task 15.2
    - In `.kiro/specs/app-shell/tasks.md`, task 15.2, replace `installCommand` `corepack enable && pnpm --dir web install --frozen-lockfile`, `buildCommand` `pnpm --dir web build` with `installCommand` `npx --yes pnpm@12.18.0 --dir web install --frozen-lockfile`, `buildCommand` `npx --yes pnpm@12.18.0 --dir web build`
    - Leave the rest of the bullet and the `_Requirements_` line; task 15.5 needs no text change
    - _Requirements: 2.6_

  - [x] 3.5 Update web/README.md Deploy section
    - In the Deploy (Vercel) section (about line 42), replace "sets the install command, the build command (`pnpm --dir web build`) and the output directory (`web/dist`)" with "sets the install command, the build command and the output directory (`web/dist`). Both commands run `npx --yes pnpm@<version>`, where the version must equal `packageManager` in `web/package.json`; a test checks this. Bump all three together."
    - Keep the sentence about the project root
    - _Requirements: 2.6_

  - [x] 3.6 Search for leftover quotes of the old commands
    - Search the repo for `corepack enable` and `pnpm --dir web build` outside `.kiro/specs/vercel-pnpm-version-fix`
    - Update any document that still presents the old command as current
    - Leave `DEVLOG.md` history entries as written unless they present the old command as current
    - _Requirements: 2.6_

  - [x] 3.7 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Commands pin the packageManager pnpm version
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - Run from `web`: `pnpm test config.smoke`
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Mismatch check: temporarily set a different version (e.g. `pnpm@12.19.0`) in `vercel.json` and confirm the failure message names both versions, then revert it and re-run to confirm a pass
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.8 Verify preservation checks still pass
    - **Property 2: Preservation** - Other deploy config and local workflow unchanged
    - **IMPORTANT**: Re-run the SAME checks from task 2 - do NOT write new tests
    - Existing smoke assertions still pass
    - Compare against `git show HEAD:vercel.json`: every key except `installCommand` and `buildCommand` is deep-equal (`outputDirectory`, `headers`; still no `functions` or `rewrites`)
    - `web/package.json` has no diff and `packageManager` is still `pnpm@12.18.0`; no root `package.json` exists
    - `git status` shows no change to `TableView.tsx` or `TableView.test.tsx` from this work
    - Local syntax check from the repo root in PowerShell: run the new `installCommand` and `buildCommand` strings to confirm `npx --yes pnpm@12.18.0` parses the lockfile and emits `web/dist`. This shows the command syntax works, not that Vercel's image behaves the same
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [x] 3.9 Run the full check from web
    - Run: `Set-Location web; pnpm typecheck; pnpm lint; pnpm format; pnpm test; pnpm build`
    - **EXPECTED OUTCOME**: every step succeeds; fix any failure caused by this change (use `pnpm format:write` for formatting of files touched here)
    - _Requirements: 2.3, 3.7, 3.8_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Remind the owner that a real Vercel deploy after merge is the only end-to-end check and is out of scope here. If the deploy still fails at install, read the pnpm version line in the log first and re-open the design.

## Notes

- Tasks 1 and 2 run on the unfixed `vercel.json`; do not fix before the failure is documented and the baseline is recorded
- The edits to the test file happen in task 1 only; this phase writes `tasks.md` and edits no source or test file
- Each task references specific requirements for traceability
- A real Vercel deploy is the only end-to-end check and is out of scope
- The uncommitted `table-caption-data-source-fix` changes must stay untouched

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4", "3.5"] },
    { "id": 4, "tasks": ["3.6"] },
    { "id": 5, "tasks": ["3.7", "3.8"] },
    { "id": 6, "tasks": ["3.9"] },
    { "id": 7, "tasks": ["4"] }
  ]
}
```
