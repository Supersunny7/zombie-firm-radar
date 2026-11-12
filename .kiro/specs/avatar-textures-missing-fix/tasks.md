# Implementation Plan

Commands run from `tools` (PowerShell, chain with `;`). Before starting, run `git pull`. Look up any `@gltf-transform/functions` option (for example `pruneSolidTextures`) before using it.

- [x] 1. Write bug condition exploration test (failing first)
  - **Property 1: Bug Condition** - Avatars Carry Their Textures and Neutral Factors
  - **CRITICAL**: This test MUST FAIL on unfixed code. Failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: The test encodes the expected behavior and validates the fix when it passes later
  - **Scoped PBT Approach**: Scope to the 8 committed avatar `.glb` files, plus the cached `Business_Female_01.fbx` re-conversion
  - Create `tools/asset-lib/avatar-textures.test.mjs`. Read each of the 8 `.glb` files in `web/public/assets/avatars` with `NodeIO` and `MeshoptDecoder`
  - For every material assert: real `baseColorTexture` (not the 1x1 `[255, 255, 0, 127]` placeholder), `baseColorFactor` `[1, 1, 1, 1]`, `metallicFactor` 0, `alphaMode` `MASK` only on the `*_opacity` material, textures are `image/webp` and at most 1024 px
  - Add a second test that runs the real `convertModel` on the cached Rocketbox FBX with staged TGAs and asserts the same (skip when `tools/cache/downloads` is empty)
  - Add a synthetic GLB test: a 1x1 `[255, 255, 0, 127]` texture must be rejected by the guard
  - Run `pnpm test avatar-textures` on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this proves the bug exists)
  - Document counterexamples (expected: `[1, 1, 0, 0.5]` factors, metallic 0.4, no base colour texture, 137272 byte output for `rocketbox-business-female-01`)
  - If a counterexample contradicts the root cause in `design.md`, stop and re-hypothesise
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.5_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Avatar and Non-Buggy Conversions Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe on UNFIXED code: `convertModel` output SHA-256 for a Poly Haven style model pick and a Rocketbox animation pick (`m_walk_*`, no textures)
  - Observe on UNFIXED code: avatar skeleton joint names (Bip01 check), mesh and primitive counts, node names, file names and `LICENSE` copy for the 8 committed avatars
  - Observe on UNFIXED code: transform order via a spy (Edit_List, dedup, prune, resample, textureCompress, meshopt) and the `.glb`/`.gltf` avatar source path
  - Write property-based tests (`fast-check`, `*.property.test.mjs` style) over non-avatar picks and option combinations asserting the observed bytes, file lists and order
  - Run on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms the baseline to preserve)
  - Also run the existing `convert-model`, `run-fetch`, `budgets`, `credits` and `manifest` tests and record that they pass
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for avatars converted without their textures

  - [x] 3.1 Add the TGA decoder
    - Create `tools/asset-lib/tga.mjs` with `decodeTga(buffer)` returning `{ width, height, channels, data }`
    - Support types 2 (true colour), 10 (RLE) and 3 (greyscale) at 8, 24 and 32 bpp; honour the origin bit and ID length
    - Throw typed `TgaError` (`UnsupportedTga`, `TruncatedTga`) otherwise; add no new dependency
    - PNG helper using `sharp(raw, { raw })`, resized to `LIMIT_DEFAULT` (1024)
    - Unit tests: 24 and 32 bpp, both origins, RLE, ID field, truncated data, unsupported type
    - Property test: random TGA images (size, bpp, origin, RLE) round-trip pixel values
    - _Bug_Condition: isBugCondition(X) where FBX2glTF cannot load TGA and writes the 1x1 placeholder_
    - _Expected_Behavior: expectedBehavior(glb) from design, real textures_
    - _Preservation: no change for non-avatar conversions_
    - _Requirements: 2.2_

  - [x] 3.2 Add FBX texture staging
    - Create `tools/asset-lib/fbx-textures.mjs` with `stageFbxTextures({ avatarId, fbxPath, textureFiles, stageDir })`
    - Scan the FBX (latin1) for referenced `*.tga` base names; throw `AvatarTextureError` naming avatar and texture when a referenced file is missing
    - Decode referenced TGAs to `<stageDir>/<name>.png`; convert only referenced files
    - Write `<stageDir>/<id>.fbx` as a copy with `.tga` replaced by `.png` inside path strings (same length). Never modify the cached source FBX
    - Unit tests: same-length rewrite, PNGs at most 1024 px, missing texture error names avatar and texture, source bytes untouched
    - Property test: random FBX-like byte strings change only `.tga` to `.png` inside path strings and keep length and other bytes
    - _Bug_Condition: isBugCondition(X) from design_
    - _Expected_Behavior: expectedBehavior(glb) from design_
    - _Preservation: cached download and its SHA unchanged_
    - _Requirements: 2.2, 2.4_

  - [x] 3.3 Use the new staging in `resolveModelInput`
    - In `tools/asset-lib/run-fetch.mjs`, call `stageFbxTextures` in the `.fbx` plus `Textures/` branch; fix the misleading "stage them flat" comment
    - Keep the zip branch and the no-texture branch unchanged; `input.path` keeps its meaning and the `convertModel` signature does not change
    - Update `resolveModelInput` unit tests
    - _Bug_Condition: isBugCondition(X) from design_
    - _Preservation: zip, no-texture and `.glb`/`.gltf` branches unchanged_
    - _Requirements: 2.2, 2.4, 3.2, 3.3_

  - [x] 3.4 Change `convertModel` for avatars
    - In `tools/asset-lib/convert-model.mjs`, for `pick.kind === 'avatar'` only
    - Pre-transform guard right after `io.read`: every material has a `baseColorTexture` that is not the 1x1 placeholder (`sharp(...).metadata()`); throw `AvatarTextureError` naming `pick.id`, material and texture
    - Call `prune({ pruneSolidTextures: false })`; confirm the option name and default in `@gltf-transform/functions` 4.5.1 first. Non-avatar kinds keep `prune()` unchanged
    - Normalise materials: `baseColorFactor [1, 1, 1, 1]`, `metallicFactor 0`, `alphaMode MASK` with `alphaCutoff 0.5` on `*_opacity` only, `OPAQUE` elsewhere
    - Check on a real avatar that the opacity colour map has a non-uniform alpha channel. If not, ask the user before shipping
    - Post-transform guard before `writeBinary`: textures present, factors, metallic, alpha mode, WebP, at most 1024 px. On failure the existing `created` clean-up removes temp files and no `.glb` is written
    - Support optional `pick.textureExceptions: string[]` (empty by default)
    - Material guard unit tests (placeholder, missing texture, non-white factor, metallic above 0, declared exception) and a property test that the guard accepts a material set iff Property 1 holds
    - _Bug_Condition: isBugCondition(X) where a material has no real baseColorTexture, a non-white factor or metallic above 0_
    - _Expected_Behavior: expectedBehavior(glb) from design_
    - _Preservation: pipeline order Edit_List, dedup, prune, resample, textureCompress, meshopt; non-avatar output byte-identical_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2_

  - [x] 3.5 Bump the model recipe version
    - In `tools/fetch-assets.mjs`, add a staging marker (for example `avatar-textures/v2`) to `recipeVersions.model` so `canSkip` re-converts the avatars
    - Add or adjust a test that a changed recipe version defeats the skip while `inputsSha256` is unchanged
    - Check that non-avatar model entries are not forced to change in a way that alters their output bytes. If the shared `model` version re-runs them, confirm output is identical (Property 2)
    - _Requirements: 2.2, 3.1_

  - [x] 3.6 Verify bug condition exploration test now passes (source level)
    - **Property 1: Expected Behavior** - Avatars Carry Their Textures and Neutral Factors
    - **IMPORTANT**: Re-run the SAME test from task 1. Do NOT write a new test
    - Run the cached FBX re-conversion test and the synthetic placeholder test from task 1
    - **EXPECTED OUTCOME**: Those tests PASS. The committed-`.glb` test passes after task 3.7 re-runs the avatars
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.7 Re-run all 8 avatars and report sizes vs budget
    - Run `Set-Location tools; pnpm fetch-assets --only <the 8 avatar ids>`. This rewrites the `.glb` files, `manifest.json` and the size report
    - Confirm the `LICENSE` file is still next to each avatar, `CREDITS.md` rows are unchanged and manifest SHA and size are updated
    - Report a table: avatar id, old bytes, new bytes, per-file budget, status, plus the lab group total against the 25 MB (26,214,400 byte) budget in `budgets.mjs`. Flag any file over 5 MB with a Meshopt/KTX2 suggestion
    - Run `pnpm fetch-assets` again and confirm the avatars are reported unchanged (idempotence)
    - If any file or the group exceeds budget, stop and ask the user. Do not raise budgets silently
    - _Requirements: 2.2, 2.3, 2.7, 3.3, 3.4_

  - [x] 3.8 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Avatar and Non-Buggy Conversions Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2. Do NOT write new tests
    - Run the preservation tests and the full tools suite (`pnpm test`)
    - **EXPECTED OUTCOME**: Tests PASS (no regressions), including skeleton, mesh counts, file names and `LICENSE` copies of the re-converted avatars
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Update the asset-auditor checklist
  - Edit `.kiro/agents/asset-auditor.md`: for every `.glb` under `avatars/`, read materials with `@gltf-transform/core` in `tools` and report each material with no `baseColorTexture` and no declared exception, a `baseColorFactor` other than `[1, 1, 1, 1]`, or `metallicFactor` other than 0
  - Keep all existing checks (CREDITS.md rows, forbidden licenses, attribution, files over 5 MB) unchanged
  - Run the asset-auditor agent once on the re-converted avatars and confirm it reports no avatar material findings
  - _Requirements: 1.6, 2.6, 3.6_

- [x] 5. Capture the Playwright screenshot
  - Build a small test page that loads one avatar with `GLTFLoader` and `MeshoptDecoder`, lit and framed on the whole body
  - Use the Playwright MCP server to open it and save the screenshot to `reference/progress/avatar-textures-fixed.png`
  - Confirm visually that the avatar is textured and opaque (eyelashes and hair cards masked), not flat yellow
  - Remove the temporary test page afterwards, and stop any dev server started for it
  - Note: `reference/progress/` is in the commit scope in task 7, so the screenshot is committed
  - _Requirements: 2.1, 2.8_

- [x] 6. Checkpoint - Ensure all tests pass
  - Run from `tools`: the full `pnpm test`, and the repo checks (`pnpm typecheck; pnpm lint; pnpm format` if defined for `tools`)
  - Ensure all tests pass, ask the user if questions arise
  - _Requirements: 2.5, 3.5_

- [x] 7. Commit
  - Run `git status` and confirm that only these paths changed for this fix: `tools/`, `web/public/assets/avatars`, `.kiro/agents/asset-auditor.md`, `.kiro/specs/avatar-textures-missing-fix/`, `reference/progress/`
  - Do not stage anything else. Do not use `git add -A` or `git add .`. In particular, leave `.playwright-mcp/` and any `tools/cache` output out of the commit. Keep `tools/cache` out of git if it is not already ignored
  - Stage: `git add tools web/public/assets/avatars .kiro/agents/asset-auditor.md .kiro/specs/avatar-textures-missing-fix reference/progress/avatar-textures-fixed.png`
  - Check `git diff --cached --name-only` lists only those paths, and that no secrets are included
  - Commit with a conventional message, for example `fix(avatar-textures-missing-fix): convert Rocketbox TGA textures and guard avatar materials`
  - Do not push unless asked
  - _Requirements: 3.3, 3.4_

## Notes

- Tasks 1 and 2 run on UNFIXED code. Task 1 must fail, task 2 must pass
- Only `tools/`, `web/public/assets/avatars`, `.kiro/agents/asset-auditor.md` the spec folder and `reference/progress/avatar-textures-fixed.png` are committed
- Never edit `/pipeline` or `/data` generation code
- Money for the budget report: sizes are bytes; the lab group budget is 26,214,400 bytes

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2"] },
    { "id": 1, "tasks": ["3.1"] },
    { "id": 2, "tasks": ["3.2"] },
    { "id": 3, "tasks": ["3.3", "3.4", "3.5"] },
    { "id": 4, "tasks": ["3.6"] },
    { "id": 5, "tasks": ["3.7"] },
    { "id": 6, "tasks": ["3.8", "4", "5"] },
    { "id": 7, "tasks": ["6"] },
    { "id": 8, "tasks": ["7"] }
  ]
}
```
