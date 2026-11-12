# Bugfix Requirements Document

## Introduction

The first Vercel deploy fails during the install step with `ERR_PNPM_BROKEN_LOCKFILE`: "The lockfile at /vercel/path0/web/pnpm-lock.yaml is broken: expected a single document in the stream, but found more". No build runs and nothing is deployed.

Working hypothesis for the root cause: `web/pnpm-lock.yaml` is written by pnpm 12, which emits a multi-document YAML file. Vercel runs its bundled, older pnpm, which cannot parse it. `vercel.json` runs `corepack enable && pnpm --dir web install ...` at the repo root. Corepack reads the `packageManager` field from the current directory, and the repo root has no `package.json`, so the pinned version is never applied.

Confirmed locally:
- The repo root has no `package.json`.
- `packageManager` is `pnpm@12.18.0` and exists only in `web/package.json`.
- `web/pnpm-lock.yaml` contains two `---` separators.
- `pnpm@12.18.0` exists on npm.

Not verified: the pnpm version bundled on Vercel. The fix must not depend on it.

Current `vercel.json` commands:
- `installCommand`: `corepack enable && pnpm --dir web install --frozen-lockfile`
- `buildCommand`: `pnpm --dir web build`

The existing smoke test `web/src/config.smoke.test.ts` only asserts that the commands are truthy, so it cannot catch this class of bug.

Intended fix (to be detailed in design):
- `installCommand` becomes `npx --yes pnpm@12.18.0 --dir web install --frozen-lockfile`.
- `buildCommand` becomes `npx --yes pnpm@12.18.0 --dir web build`.
- The pnpm version stays defined in one place, the `packageManager` field of `web/package.json`. The smoke test reads it and asserts that `vercel.json` uses exactly that version.

Same-change updates required: requirements 16.1 and 16.7 in `.kiro/specs/app-shell/requirements.md`.

Follow-ups that quote the old command and must be updated or reviewed:
- `.kiro/specs/app-shell/design.md`, around line 448 and the paragraph after it.
- `.kiro/specs/app-shell/tasks.md`, task 15.2.
- `web/README.md`, Deploy section.

Out of scope: the unrelated uncommitted `table-caption-data-source-fix` changes (`TableView.tsx`, `TableView.test.tsx`) must not be touched.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN Vercel runs `installCommand` from the repo root and `web/pnpm-lock.yaml` is a pnpm 12 multi-document lockfile THEN the system fails with `ERR_PNPM_BROKEN_LOCKFILE` and the deploy stops before the build.

1.2 WHEN `corepack enable` runs at the repo root, which has no `package.json` THEN the system does not see `packageManager: pnpm@12.18.0` from `web/package.json` and falls back to the older pnpm that Vercel bundles.

1.3 WHEN `buildCommand` runs `pnpm --dir web build` THEN the system uses whichever pnpm is on `PATH`, not the version pinned in `web/package.json`.

1.4 WHEN the config smoke test runs against a `vercel.json` whose commands use an unpinned pnpm THEN the test passes, because it only asserts the commands are truthy.

1.5 WHEN the pnpm version in `web/package.json` changes THEN nothing checks that `vercel.json` still uses the same version.

### Expected Behavior (Correct)

2.1 WHEN Vercel runs `installCommand` from the repo root THEN the system SHALL run `npx --yes pnpm@12.18.0 --dir web install --frozen-lockfile`, parse the pnpm 12 lockfile, and complete the install successfully.

2.2 WHEN Vercel resolves the pnpm version THEN the system SHALL get it from an explicit `pnpm@<version>` in the command itself and SHALL NOT depend on `packageManager` lookup in the current directory or on the pnpm version bundled on Vercel.

2.3 WHEN Vercel runs `buildCommand` THEN the system SHALL run `npx --yes pnpm@12.18.0 --dir web build` with the same pinned version as the install step, and the build SHALL succeed and emit `web/dist`.

2.4 WHEN the config smoke test runs THEN the system SHALL read the version from the `packageManager` field of `web/package.json` and assert that both `installCommand` and `buildCommand` in `vercel.json` contain exactly `pnpm@<that version>`. This test SHALL FAIL against the current `vercel.json` and PASS after the fix.

2.5 WHEN the pnpm version in `web/package.json` and the version in `vercel.json` differ THEN the system SHALL fail the smoke test with a message naming both versions.

2.6 WHEN the fix is applied THEN requirements 16.1 and 16.7 in `.kiro/specs/app-shell/requirements.md` SHALL state the new commands, and the follow-up locations listed in the introduction SHALL be updated so no document quotes the old commands.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the build output is deployed THEN the system SHALL CONTINUE TO publish `web/dist` as `outputDirectory`.

3.2 WHEN `/assets/*` is requested THEN the system SHALL CONTINUE TO serve `Cache-Control: public, max-age=31536000, immutable`.

3.3 WHEN `/data/*` is requested THEN the system SHALL CONTINUE TO serve `Cache-Control: no-cache`.

3.4 WHEN `vercel.json` is read THEN the system SHALL CONTINUE TO define no serverless functions and no rewrites.

3.5 WHEN the repo is inspected THEN the system SHALL CONTINUE TO contain no secrets, tokens or keys, and no new environment variables SHALL be required.

3.6 WHEN the Vercel project is configured THEN the system SHALL CONTINUE TO use the repo root as the project root, with no root `package.json` added.

3.7 WHEN a developer runs `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm test` or other scripts locally from `web` THEN the system SHALL CONTINUE TO behave as before, with `packageManager` in `web/package.json` unchanged.

3.8 WHEN other config smoke test assertions run (for example headers and output directory) THEN the system SHALL CONTINUE TO pass.

3.9 WHEN the working tree contains uncommitted `table-caption-data-source-fix` changes THEN the system SHALL CONTINUE TO leave them untouched.
