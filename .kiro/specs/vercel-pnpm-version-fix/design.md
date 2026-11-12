# Vercel pnpm Version Fix Bugfix Design

## Overview

The first Vercel deploy fails at install with `ERR_PNPM_BROKEN_LOCKFILE`. `web/pnpm-lock.yaml` is written by pnpm 12 and contains more than one YAML document. Vercel's bundled pnpm cannot parse it. `vercel.json` runs `corepack enable && pnpm --dir web install ...` from the repo root. Corepack looks for `packageManager` in the current directory, the repo root has no `package.json`, so `pnpm@12.18.0` from `web/package.json` is never applied.

Fix approach: stop depending on corepack and on the pnpm that Vercel ships. Both commands in `vercel.json` name the pnpm version explicitly and run it through `npx --yes`. The version stays defined in one place, `packageManager` in `web/package.json`. The config smoke test reads it and asserts that `vercel.json` uses exactly that version in both commands, so drift fails in CI.

Scope of this phase: this document only. No source, test or app-shell file is edited here. The edits below are applied by the tasks phase.

Limits of what is known:
- Confirmed locally: no root `package.json`; `packageManager` is `pnpm@12.18.0` only in `web/package.json`; the lockfile has two `---` separators; `pnpm@12.18.0` exists on npm.
- Not verified: the pnpm version bundled on Vercel. The fix does not depend on it.
- Not verified: that `npx --yes pnpm@12.18.0` runs correctly in the Vercel build image (network access to npm, npx cache, Node version). The smoke test checks the config text only. A real Vercel deploy is the only end-to-end check, and it must be run by the owner after merge.

## Glossary

- **Bug_Condition (C)**: A deploy configuration where the lockfile was written by pnpm 12 and the install command does not name the `packageManager` version explicitly.
- **Property (P)**: Both `installCommand` and `buildCommand` contain exactly `pnpm@<packageManager version>` and `--dir web`, so install and build use the pinned pnpm.
- **Preservation**: Output directory, cache headers, absence of functions and rewrites, no secrets, repo root as Vercel project root, local `web` workflow.
- **`packageManager`**: Field in `web/package.json`, currently `pnpm@12.18.0`. Single source of truth for the version.
- **`vercel.json`**: Repo-root deploy config (`installCommand`, `buildCommand`, `outputDirectory`, `headers`).
- **`web/src/config.smoke.test.ts`**: Vitest file that checks `web/package.json` and `vercel.json` text.

## Bug Details

### Bug Condition

The bug manifests when Vercel runs the install command at the repo root against a pnpm 12 lockfile. Corepack finds no `packageManager` at the root, so the older bundled pnpm runs and rejects the lockfile. The build command has the same exposure: it calls whatever `pnpm` is on `PATH`.

**Formal Specification:**
```
FUNCTION isBugCondition(X)
  INPUT: X of type VercelDeployConfig  // vercel.json commands + web/package.json + lockfile
  OUTPUT: boolean

  RETURN X.lockfileWrittenBy = "pnpm 12"
     AND NOT explicitPnpmVersion(X.installCommand, X.packageManagerVersion)
END FUNCTION
```

```
FUNCTION expectedBehavior(result)
  INPUT: result of type DeployResult
  OUTPUT: boolean

  RETURN result.install = success
     AND result.build = success
     AND result.installCommand contains "pnpm@" + result.packageManagerVersion
     AND result.buildCommand contains "pnpm@" + result.packageManagerVersion
     AND result.installCommand contains "--dir web"
     AND result.buildCommand contains "--dir web"
END FUNCTION
```

`explicitPnpmVersion(cmd, v)` is true when `cmd` contains the token `pnpm@v` and no other `pnpm@` version.

The bug condition block was moved here from `bugfix.md`, because the bugfix workflow expects it in `design.md`. `bugfix.md` no longer contains it.

### Examples

- Current `installCommand` `corepack enable && pnpm --dir web install --frozen-lockfile`: no `pnpm@`, so C holds. Vercel's bundled pnpm fails with `ERR_PNPM_BROKEN_LOCKFILE`.
- Current `buildCommand` `pnpm --dir web build`: no `pnpm@`, so C holds. It uses whichever pnpm is on `PATH`.
- Fixed `installCommand` `npx --yes pnpm@12.18.0 --dir web install --frozen-lockfile`: C does not hold.
- Drift: `packageManager` bumped to `pnpm@12.19.0` while `vercel.json` still says `pnpm@12.18.0`. C holds again. The smoke test must fail with a message naming `12.18.0` and `12.19.0`.
- Edge: a command with two different versions, such as `npx --yes pnpm@12.18.0 ... && pnpm@11.0.0 ...`. Treated as a mismatch.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `outputDirectory` stays `web/dist`.
- `/assets/(.*)` keeps `Cache-Control: public, max-age=31536000, immutable`.
- `/data/(.*)` keeps `Cache-Control: no-cache`.
- `vercel.json` defines no `functions` and no `rewrites`.
- No secrets, tokens or keys, and no new environment variables.
- The Vercel project root stays the repo root; no root `package.json` is added.
- `packageManager` in `web/package.json` stays `pnpm@12.18.0`; local `pnpm install`, `dev`, `build`, `test` from `web` behave as before.
- All other assertions in `config.smoke.test.ts` keep passing.
- The uncommitted `table-caption-data-source-fix` changes (`TableView.tsx`, `TableView.test.tsx`) are not touched.

**Scope:**
Everything except the two command strings in `vercel.json`, the new smoke assertions, and the quoted-command text in documents is unaffected.

## Hypothesized Root Cause

1. **Corepack reads the wrong directory (most likely)**: `corepack enable` only registers shims. The version comes from `packageManager` in the current directory tree, which is the repo root with no `package.json`.
2. **Bundled pnpm too old**: Vercel's pnpm cannot read multi-document pnpm 12 lockfiles. Unverified, since the Vercel pnpm version is unknown.
3. **Build command unpinned**: `pnpm --dir web build` has no version, so it would hit the same wrong-version risk.
4. **Weak test**: the smoke test only asserts truthiness, so nothing catches an unpinned or drifting version.

Alternatives considered and rejected:
- Add a root `package.json` with `packageManager`: breaks preservation 3.6 and creates a second place for the version.
- Change the Vercel project root to `web`: breaks the `../data` copy.
- Set `ENABLE_EXPERIMENTAL_COREPACK` in Vercel: an environment setting outside the repo, not testable, and it reads `packageManager` from the project root.

## Correctness Properties

Property 1: Bug Condition - Commands pin the packageManager pnpm version

_For any_ deploy configuration where the bug condition holds (isBugCondition returns true), the fixed `vercel.json` SHALL have `installCommand` and `buildCommand` that each contain exactly `pnpm@<packageManager version>` and `--dir web`, so install and build run with the pinned pnpm and parse the pnpm 12 lockfile.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

Property 2: Preservation - Other deploy config and local workflow unchanged

_For any_ input where the bug condition does NOT hold (isBugCondition returns false), the fixed configuration SHALL produce the same result as the original, preserving `outputDirectory`, cache headers, no functions or rewrites, no secrets, repo-root project root, and the local `web` pnpm workflow.

**Validates: Requirements 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9**

## Fix Implementation

### Changes Required

**File 1**: `vercel.json`

Replace only these two values. Keep every other key and its order.

```json
"installCommand": "npx --yes pnpm@12.18.0 --dir web install --frozen-lockfile",
"buildCommand": "npx --yes pnpm@12.18.0 --dir web build",
```

`corepack enable` is dropped. `--yes` suppresses the npx install prompt on the non-interactive builder.

**File 2**: `web/src/config.smoke.test.ts` (inside the existing `describe('vercel.json', ...)`; the existing truthiness test stays)

1. Read the version from `pkg.packageManager` (already loaded). Parse with `/^pnpm@(\d+\.\d+\.\d+)$/`; fail with a clear message if the field has another shape.
2. For each of `installCommand` and `buildCommand`, extract all versions with `/\bpnpm@(\d+\.\d+\.\d+)(?![\w.-])/g`.
3. Assert exactly one distinct version is found and it equals the `packageManager` version. On mismatch or absence, the failure message names both versions, for example:
   `vercel.json installCommand uses pnpm@<found or "none"> but web/package.json packageManager is pnpm@12.18.0`
   Use `expect(found, message).toEqual([expected])` style so vitest prints the message.
4. Assert each command contains the exact substring `--dir web`.
5. Do not hardcode `12.18.0` in the new assertions. The existing `declares packageManager` test already pins `pnpm@12.18.0` and is left alone. Bumping the version later means editing that test, `package.json` and `vercel.json` together, which is intended.

Fail-before / pass-after procedure for the implementation task:
1. Add the new test first and run `pnpm test config.smoke` from `web` with the old `vercel.json`. Expect failures for both commands, with messages naming `none` and `12.18.0`. Record the output.
2. Edit `vercel.json`. Run again. Expect pass.
3. Temporarily set a different version in `vercel.json` (or a copy) to see the mismatch message naming both versions. Revert it.

**File 3**: `.kiro/specs/app-shell/requirements.md`, Requirement 16 (same change as the fix)

Replace 16.1 with:
> 1. THE repository SHALL contain a `vercel.json` that sets `installCommand` to `npx --yes pnpm@12.18.0 --dir web install --frozen-lockfile`, `buildCommand` to `npx --yes pnpm@12.18.0 --dir web build` and `outputDirectory` to `web/dist`.

Replace 16.7 with:
> 7. THE deploy SHALL run pnpm through an explicit `pnpm@<version>` in both `installCommand` and `buildCommand`, where `<version>` is the exact version in the `packageManager` field of `web/package.json`, and SHALL NOT rely on corepack or on the pnpm version bundled with Vercel, because the lockfile is written by pnpm 12 and the repo root has no `package.json`.

**File 4**: `.kiro/specs/app-shell/design.md`, `vercel.json` block at about line 448 and the paragraph after it (line 458)

- In the JSON block, replace the two command lines with the new commands from File 1.
- In the paragraph, replace the sentence "`corepack enable` makes pnpm resolve the version from `packageManager` (`pnpm@12.18.0`)." with: "Both commands run `npx --yes pnpm@12.18.0`, because corepack reads `packageManager` from the current directory and the repo root has no `package.json`. The smoke test checks that this version equals `packageManager` in `web/package.json`."
- Keep the sentences about no functions or rewrites, the standalone `/web` project, the repo-root build and the Vercel project root note.

**File 5**: `.kiro/specs/app-shell/tasks.md`, task 15.2

Replace the first sub-bullet text `installCommand` `corepack enable && pnpm --dir web install --frozen-lockfile`, `buildCommand` `pnpm --dir web build` with `installCommand` `npx --yes pnpm@12.18.0 --dir web install --frozen-lockfile`, `buildCommand` `npx --yes pnpm@12.18.0 --dir web build`. Leave the rest of the bullet and the `_Requirements_` line. Task 15.5 needs no text change.

**File 6**: `web/README.md`, Deploy (Vercel) section (line 42)

Replace "sets the install command, the build command (`pnpm --dir web build`) and the output directory (`web/dist`)" with "sets the install command, the build command and the output directory (`web/dist`). Both commands run `npx --yes pnpm@<version>`, where the version must equal `packageManager` in `web/package.json`; a test checks this. Bump all three together." Keep the sentence about the project root.

**Other quotes of the old command**: after the edits, run a repo search for `corepack enable` and `pnpm --dir web build` outside `.kiro/specs/vercel-pnpm-version-fix` to confirm no document still quotes them. `DEVLOG.md` entries are history and are left as written unless they present the old command as current.

## Testing Strategy

### Validation Approach

First show the new assertions fail on the current `vercel.json`, then show they pass after the fix, and that all existing assertions still pass.

### Exploratory Bug Condition Checking

**Goal**: Confirm the root cause is the missing explicit version. If the failure messages show something else, re-hypothesize.

**Test Plan**: Add the new smoke assertions and run them against the unchanged `vercel.json`.

**Test Cases**:
1. **Install pinned**: `installCommand` contains `pnpm@12.18.0` (will fail on unfixed code).
2. **Build pinned**: `buildCommand` contains `pnpm@12.18.0` (will fail on unfixed code).
3. **Dir flag**: both commands contain `--dir web` (passes on unfixed code; guards the fix).
4. **Mismatch message**: version in `vercel.json` differs from `packageManager` (temporary local check; message names both).

**Expected Counterexamples**:
- Both commands report "none" as the found version.
- Possible causes: corepack-only version resolution, unpinned build command.

### Fix Checking

**Goal**: For all configs where the bug condition holds, the fixed config meets the expected behavior.

```
FOR ALL X WHERE isBugCondition(X) DO
  result := vercelJson'(X)
  ASSERT expectedBehavior(result)
END FOR
```

### Preservation Checking

**Goal**: For configs where the bug condition does not hold, nothing changes.

```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT vercelJson(X) = vercelJson'(X)
END FOR
```

**Testing Approach**: The config is a single static file, so a property-based test adds little. Preservation is checked by a before/after comparison of every `vercel.json` key except the two commands, plus the existing smoke tests.

**Test Cases**:
1. **Output and headers**: parsed `outputDirectory` and `headers` are deep-equal before and after (compare against `git show HEAD:vercel.json`).
2. **No functions or rewrites**: existing assertion still passes.
3. **Package manager unchanged**: `web/package.json` has no diff.
4. **Untouched files**: `git status` shows no change to `TableView.tsx` or `TableView.test.tsx` from this work.

### Unit Tests

- The new smoke assertions in `config.smoke.test.ts` (version match for both commands, `--dir web`, mismatch message).
- Existing smoke tests unchanged and passing.

### Property-Based Tests

- None added. The input space is two strings, and a parser-level example test covers the match and mismatch cases. The existing fast-check suites are not affected.

### Integration Tests

- Local: from `web`, run `pnpm typecheck; pnpm lint; pnpm format; pnpm test; pnpm build`.
- Local optional: from the repo root, run the new `installCommand` and `buildCommand` strings in PowerShell to confirm `npx --yes pnpm@12.18.0` parses the lockfile and emits `web/dist`. This shows the command syntax works, not that Vercel's image behaves the same.
- Deploy: a real Vercel deploy is the only end-to-end check. The Vercel bundled pnpm version stays unverified, and npx availability and registry access on the builder are confirmed only by that deploy. If the deploy still fails at install, read the log's pnpm version line first and re-open this design.
