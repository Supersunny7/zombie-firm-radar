# Avatar Textures Missing Fix Bugfix Design

## Overview

All 8 Rocketbox avatar `.glb` files render flat yellow and half transparent because they leave the conversion with no `baseColorTexture`. The suspected cause in `bugfix.md` (FBX2glTF not finding the TGA files because they were not staged beside the FBX) is wrong. Staging already works. The real cause is a chain of three facts, each reproduced on `rocketbox-business-female-01`:

1. FBX2glTF 0.9.7-p1 (the `fbx2gltf` npm package) only picks up image files it can load as PNG or JPG. With the seven TGAs sitting next to the FBX, it prints `could not find a image file for texture: Map #88` (and the same for the other six) and emits a 1x1 RGBA placeholder, bytes `[255, 255, 0, 127]`, for each. A run with no staged TGAs gives byte-identical output, so the staging has no effect on the result.
2. `dedup()` merges the five identical placeholders into one texture, and the head material into the body material.
3. `prune()` has `pruneSolidTextures` on by default. It sees a solid-colour 1x1 texture and bakes it into the material: `baseColorTexture` is removed and `baseColorFactor` becomes `[1, 1, 0, 0.5]`. That is the flat yellow, half transparent look. The normal texture survives only because its placeholder is not treated as a solid base colour.

Nothing in the pipeline fails or warns, which is why 1.4, 1.5 and 1.6 went unnoticed. The fix converts the TGAs to PNG itself, points a staged copy of the FBX at the PNGs, and adds guards that fail the conversion when any avatar material would end up without a real base colour texture.

## Glossary

- **Bug_Condition (C)**: An avatar `.glb` has a material with no `baseColorTexture` (and no declared exception), or `baseColorFactor` other than `[1, 1, 1, 1]`, or `metallicFactor` other than 0.
- **Property (P)**: Every avatar material has a real base colour texture, white opaque factor, metallic 0, and `alphaMode` `MASK` only on the opacity material.
- **Preservation**: Behaviour of non-avatar conversions, the pipeline step order, file names, folder layout, skeleton, meshes, `LICENSE` files, `CREDITS.md` rows and manifest entries that must not change.
- **FBX2glTF placeholder**: The 1x1 RGBA `[255, 255, 0, 127]` PNG that FBX2glTF writes for any texture it cannot load.
- **pruneSolidTextures**: Option of `prune()` in `@gltf-transform/functions` (default on) that replaces a solid-colour texture with a material factor.
- **Staging**: Copying the FBX and its textures into `<work>/src` before conversion (`resolveModelInput` in `tools/asset-lib/run-fetch.mjs`).
- **convertModel**: Function in `tools/asset-lib/convert-model.mjs` that runs FBX2glTF, Edit_List, dedup, prune, resample, textureCompress, Meshopt.
- **Opacity material**: The material named `*_opacity` (eyelashes and hair cards) whose colour map carries the alpha mask.

## Bug Details

### Bug Condition

The bug manifests on every Rocketbox avatar conversion. `resolveModelInput` stages `Textures/*.tga` flat beside the FBX, but FBX2glTF does not load TGA, so `convertModel` receives a GLB whose textures are placeholders. `dedup()` and `prune()` then turn the placeholders into a yellow factor. No step checks the result.

**Formal Specification:**
```
FUNCTION isBugCondition(X)
  INPUT: X of type AvatarGlb { materials: list of Material }
  OUTPUT: boolean

  RETURN EXISTS m IN X.materials WHERE
           (m.baseColorTexture = null AND NOT m.intentionalException)
        OR m.baseColorFactor != [1, 1, 1, 1]
        OR m.metallicFactor != 0
END FUNCTION
```

### Examples

Evidence gathered by running the real tools on `tools/cache/downloads/rocketbox-business-female-01`:

- Current `rocketbox-business-female-01.glb` (137272 bytes): materials `f014_body` and `f014_opacity`, both `baseColorFactor [1, 1, 0, 0.498]`, `metallicFactor 0.4`, no base colour texture, one 94 byte WebP normal texture. There is no `f014_head` material.
- `fbx2gltf` output before any gltf-transform step: three materials with white factors and five 70 byte PNGs, each 1x1 `[255, 255, 0, 127]`. After `dedup()`: two materials, one texture. After `prune()`: yellow factors, no base colour texture. `convertModel` re-run on the cached source reproduces the 137272 byte file exactly.
- FBX2glTF run directly with `--verbose`, TGAs beside the FBX: `Warning: could not find a image file for texture: Map #1` for every texture. Replacing `\` with `/` in the stored paths changes nothing, so the Windows paths inside the FBX (`D:\temp\Humans\with_opacity_version\f014\textures\f014_body_color.tga`) are not the problem.
- Same FBX with the TGAs decoded to PNG and the FBX path strings changed from `.tga` to `.png` (same length, so the binary FBX stays valid): `Found texture 'Map #88' at ...f014_body_normal.png` for all texture slots, three materials, five real PNGs. This confirms the cause is the image format, not the location.
- All 8 cached Rocketbox sources: every texture the FBX references is present under `Textures/` (0 missing). All TGAs are uncompressed true colour (type 2), 24 or 32 bpp, 512 to 2048 px. `rocketbox-construction-male-01` references 15 textures with mixed sizes.
- Edge case: the opacity material gets its colour map and a TransparentColor texture that FBX2glTF discards (`Can't handle texture for TransparentColor; discarding`). Its alpha mask must be set explicitly (`alphaMode MASK`), because FBX2glTF emits `OPAQUE`.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Non-avatar conversions (models, textures, HDRIs, audio, animations) produce the same output as before.
- Avatar pipeline order stays Edit_List, dedup, prune, resample, WebP at 1024, Meshopt, and the result is one self-contained `.glb`.
- File names, folder layout, skeleton (Bip01 check), meshes and the Rocketbox `LICENSE` next to each avatar stay the same.
- `CREDITS.md` rows and `manifest.json` entries stay accurate and license-compliant for every avatar file.
- Existing tools tests (conversion, fetch, budgets, credits) keep passing.
- The asset-auditor agent keeps its existing checks.

**Scope:**
All inputs that are not Rocketbox FBX avatars with TGA textures are unaffected. This includes:
- Poly Haven models and textures, own generated assets, derived headstones.
- Rocketbox animation GLBs (`m_walk_*`, `m_idle_*`), which have no textures.
- Avatars that arrive as `.glb` or `.gltf` (no FBX step).

**Note:** The correct behaviour for buggy inputs is defined in Correctness Properties, Property 1.

## Hypothesized Root Cause

The investigation confirmed cause 1 and cause 2 and refuted the one in `bugfix.md`.

1. **FBX2glTF does not load TGA (confirmed)**: The converter ignores the staged TGAs and writes 1x1 placeholders. The staging code in `resolveModelInput` is correct but ineffective, and its comment ("FBX2glTF looks beside the FBX, so stage them flat") is wrong for TGA.
2. **Placeholders folded into factors (confirmed)**: `dedup()` merges identical placeholders and `prune()` with the default `pruneSolidTextures` bakes `[255, 255, 0, 127]` into `baseColorFactor [1, 1, 0, 0.5]`. This is the visible symptom.
3. **No guard (confirmed)**: `convertModel` never inspects materials, and `fbx2gltf` returns success when textures are missing. The FBX2glTF warnings go to its own output and are not read.
4. **Refuted: staging or path problem**: Textures are staged before conversion (the TGAs are dated before the `.glb`), the FBX references match the staged file names in all 8 avatars, and backslash paths are not the blocker.
5. **Side issue**: FBX2glTF defaults `metallicFactor` to 0.4 and leaves `alphaMode` `OPAQUE` on the opacity material. These need an explicit post-step even once textures load.

## Correctness Properties

Property 1: Bug Condition - Avatars carry their textures and neutral factors

_For any_ avatar source where the bug condition holds (isBugCondition returns true for the current conversion), the fixed conversion SHALL produce a `.glb` in which every material has a real (not 1x1 placeholder) `baseColorTexture` or a declared exception, `baseColorFactor` is `[1, 1, 1, 1]`, `metallicFactor` is 0, `alphaMode` is `MASK` only on the opacity material, and the body, head, normal and opacity textures are embedded as WebP no larger than 1024 px. If a texture referenced by the FBX cannot be decoded or embedded, the conversion SHALL fail with an error naming the avatar and the texture and write no `.glb`.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8**

Property 2: Preservation - Non-buggy conversions unchanged

_For any_ input where the bug condition does NOT hold (non-avatar models, textures, HDRIs, audio, animations, and `.glb` or `.gltf` avatar sources), the fixed code SHALL produce the same result as the original code, preserving step order, file names, folder layout, skeleton, meshes, `LICENSE` files, `CREDITS.md` rows and manifest entries.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming the root cause analysis above is correct. All changes are under `/tools` (user-owned) plus the regression test and the auditor agent.

**File**: `tools/asset-lib/tga.mjs` (new)

**Function**: `decodeTga(buffer)`

**Specific Changes**:
1. **TGA decoder**: Decode uncompressed (type 2) and, for safety, RLE (type 10) and greyscale (type 3) images at 8, 24 and 32 bpp. Honour the origin bit in the descriptor byte and the ID length. Return `{ width, height, channels, data }` as raw RGB or RGBA. Throw a typed `TgaError` (`UnsupportedTga`, `TruncatedTga`) otherwise. `sharp` cannot read TGA (`unsupported image format`), and a small decoder avoids a new dependency (dependencies are pinned and need a licence check).
2. **PNG output**: A helper uses `sharp(raw, { raw })` to write a PNG, resized to `LIMIT_DEFAULT` (1024) so the intermediate files stay small. `textureCompress` still produces the final WebP.

**File**: `tools/asset-lib/fbx-textures.mjs` (new)

**Function**: `stageFbxTextures({ avatarId, fbxPath, textureFiles, stageDir })`

**Specific Changes**:
3. **Reference scan**: Read the FBX as latin1 and collect the base names of every `*.tga` string it contains (the FBX stores each path twice: absolute and relative).
4. **Missing-texture error**: If a referenced base name is not among `textureFiles`, throw `AvatarTextureError` with the avatar id and texture name (2.4).
5. **Convert and rewrite**: Decode each staged TGA to `<stageDir>/<name>.png`. Write `<stageDir>/<id>.fbx` as a copy of the FBX in which each `.tga` extension inside a path string becomes `.png`. The replacement is the same length, so binary FBX string lengths and offsets stay valid (verified with FBX2glTF on the Business_Female_01 file). Only the staged copy is patched; the cached download and its SHA stay untouched.
6. **Unused textures**: TGAs the FBX does not reference (specular maps are referenced but unused by glTF) are converted only if referenced, to keep conversion time low.

**File**: `tools/asset-lib/run-fetch.mjs`

**Function**: `resolveModelInput`

**Specific Changes**:
7. **Use the new staging**: In the `.fbx` plus `Textures/` branch, call `stageFbxTextures` instead of the flat TGA copy, and fix the misleading comment. The zip branch and the no-texture branch stay as they are.
8. **Pass avatar id**: `input.path` keeps the same meaning, so `convertModel`'s signature does not change.

**File**: `tools/asset-lib/convert-model.mjs`

**Function**: `convertModel`

**Specific Changes**:
9. **Pre-transform check (avatars only, `pick.kind === 'avatar'`)**: Immediately after `io.read`, for every material check that `baseColorTexture` exists and its image is not the 1x1 placeholder (read size with `sharp(...).metadata()`). Throw `AvatarTextureError` naming `pick.id` and the material and texture. This turns the silent failure into a loud one (2.4) and catches any future FBX2glTF regression.
10. **Keep real textures through prune**: For avatars call `prune({ pruneSolidTextures: false })` as defence in depth. Confirm the option name and default in `@gltf-transform/functions` 4.5.1 before using it (context7 or the package source). Non-avatar kinds keep `prune()` unchanged.
11. **Material normalisation (avatars only)**: Set `baseColorFactor [1, 1, 1, 1]` and `metallicFactor 0` on every material. Set `alphaMode MASK` with `alphaCutoff 0.5` on the opacity material only (name ends in `_opacity`), `OPAQUE` elsewhere. Check on a real avatar that the opacity colour map has a non-uniform alpha channel; if not, this becomes an open question for the user before shipping.
12. **Post-transform check**: After the pipeline, before `writeBinary`, run the same material assertions on the final document (textures present, factors, metallic, alpha mode, WebP, at most 1024 px). A failure removes temp files through the existing `created` clean-up.
13. **Declared exceptions**: Optional `pick.textureExceptions: string[]` (material names) lets a pick opt out of the texture check. No current avatar needs one. The list is empty by default.

**File**: `tools/fetch-assets.mjs`

**Specific Changes**:
14. **Recipe version**: Add a texture-staging marker to `recipeVersions.model` (for example `avatar-textures/v2`) so `canSkip` sees a changed recipe and re-converts the 8 avatars even though `inputsSha256` is unchanged. Without this, a normal `fetch-assets` run would skip them as "unchanged".

**File**: `.kiro/agents/asset-auditor.md`

**Specific Changes**:
15. **Auditor check (2.6)**: For every `.glb` under `avatars/`, read the materials (via `@gltf-transform/core` in `tools`) and report each material with no `baseColorTexture` and no declared exception, a `baseColorFactor` other than `[1, 1, 1, 1]`, or `metallicFactor` other than 0. Existing checks stay as they are.

**Outputs**:
16. Re-run `pnpm fetch-assets --only <8 avatar ids>` from `tools`, which rewrites the `.glb` files, `manifest.json` and size report. `CREDITS.md` rows stay the same (their "Changes we made" text already says textures resized to 1k WebP). Check the lab group size against its 25 MB (26,214,400 byte) budget in `budgets.mjs` and report the new sizes (2.7).
17. Render one avatar on a small test page with the Playwright MCP server and save the screenshot as `reference/progress/avatar-textures-fixed.png` (2.8).

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behaviour. Tests run with `vitest` in `tools` (`pnpm test`); property tests use `fast-check`, as in the existing `*.property.test.mjs` files.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix, and confirm the revised root cause.

**Test Plan**: Add `tools/asset-lib/avatar-textures.test.mjs`. It reads each of the 8 committed avatar `.glb` files with `NodeIO` plus `MeshoptDecoder` and asserts the Property 1 conditions per material. Add a second test that runs the real `convertModel` on a cached Rocketbox FBX (skipped when `tools/cache/downloads` is empty) and asserts the same. Run both on the UNFIXED code.

**Test Cases**:
1. **Committed avatars**: For each of the 8 `.glb` files, every material has a `baseColorTexture` (will fail on unfixed code; materials show `[1, 1, 0, 0.5]`).
2. **Neutral factors**: `baseColorFactor` is `[1, 1, 1, 1]` and `metallicFactor` is 0 (will fail on unfixed code; 0.4 metallic).
3. **Re-conversion**: `convertModel` on `Business_Female_01.fbx` plus staged TGAs yields textured materials (will fail on unfixed code; 137272 byte output reproduced).
4. **Placeholder detection**: A synthetic GLB with a 1x1 `[255, 255, 0, 127]` texture is rejected by the new guard (will fail on unfixed code, which accepts it).

**Expected Counterexamples**:
- Every avatar shows 2 to 3 materials with yellow half alpha factors, `metallicFactor 0.4`, no base colour texture.
- Cause confirmed by: FBX2glTF warning `could not find a image file for texture`, placeholder `[255, 255, 0, 127]`, and prune baking it into the factor. If a re-converted avatar still fails after PNG staging, re-hypothesise (for example the opacity material alpha channel).

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed conversion produces the expected behaviour.

**Pseudocode:**
```
FOR ALL X WHERE isBugCondition(X) DO
  glb := convertAvatar'(X.source)
  ASSERT expectedBehavior(glb)
END FOR

FUNCTION expectedBehavior(glb)
  RETURN FOR ALL m IN glb.materials:
           m.baseColorTexture != null AND NOT isPlaceholder(m.baseColorTexture)
       AND m.baseColorFactor = [1, 1, 1, 1]
       AND m.metallicFactor = 0
       AND (m.alphaMode = "MASK" IFF m IS the opacity material)
       AND textureMime(m) = "image/webp" AND textureSize(m) <= 1024
END FUNCTION
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed conversion produces the same result as the original.

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT convertModel(X) = convertModel'(X)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because it generates many inputs automatically, catches edge cases in kind and option combinations, and gives strong guarantees that non-avatar paths are unchanged.

**Test Plan**: Observe `convertModel` and `resolveModelInput` on UNFIXED code for model and animation picks and for `.glb` avatar sources, then write tests capturing the output bytes (or SHA-256) and file lists.

**Test Cases**:
1. **Model and animation preservation**: A Poly Haven style model pick and a Rocketbox animation pick give the same bytes before and after (prune and material steps are avatar-only).
2. **Avatar structure preservation**: Skeleton joint names, mesh and primitive counts, node names, file names and the `LICENSE` copy match the committed avatars.
3. **Pipeline order**: A spy on the transform list shows Edit_List, dedup, prune, resample, textureCompress, meshopt in that order.
4. **Existing suites**: `convert-model`, `run-fetch`, `budgets`, `credits` and `manifest` tests pass unchanged (3.5).

### Unit Tests

- `decodeTga`: 24 and 32 bpp, bottom-left and top-left origin, RLE, ID field, truncated data, unsupported type (typed errors).
- `stageFbxTextures`: rewrites every `.tga` reference to `.png` with identical length, produces PNGs of at most 1024 px, throws `AvatarTextureError` naming the avatar and texture when a referenced file is missing, leaves the source FBX bytes untouched.
- Material guard: rejects a placeholder texture, a missing base colour texture, a non-white factor, metallic above 0; accepts a declared exception.
- Normalisation: only the `_opacity` material becomes `MASK`.
- `resolveModelInput`: uses the new staging for FBX plus `Textures/`, zip and no-texture branches unchanged.

### Property-Based Tests

- Random TGA images (size, bpp, origin, RLE on or off): `decodeTga` then PNG round-trips pixel values.
- Random FBX-like byte strings with `.tga` path strings: the rewrite changes only `.tga` to `.png` inside path strings and preserves length and all other bytes.
- Random material sets (with and without textures, factors, names): the guard accepts a set if and only if the Property 1 conditions hold.
- Random non-avatar picks: output file list and bytes match the original path.

### Integration Tests

- Full run of `runFetch` with `--only` on one cached avatar: output `.glb` passes the Property 1 assertions, `manifest.json` has the new SHA and size, `CREDITS.md` row is unchanged, the `LICENSE` file is present.
- Re-convert all 8 avatars, assert the regression test passes for all of them, and check each file and the lab group against the size budget; report the new sizes.
- Idempotence: a second `fetch-assets` run reports the avatars as unchanged.
- Visual: render one avatar with `GLTFLoader` and `MeshoptDecoder` on a test page with Playwright, save `reference/progress/avatar-textures-fixed.png`, and confirm a textured opaque avatar.
