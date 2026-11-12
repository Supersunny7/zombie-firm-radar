# Bugfix Requirements Document

## Introduction

All 8 Microsoft Rocketbox avatars in `web/public/assets/avatars` render as flat yellow. Each `.glb` is about 110 KB and contains a single normal texture. The body color, head color and opacity textures are missing, and the materials keep the FBX default `baseColorFactor` `[1, 1, 0, 0.5]` with `metallicFactor` 0.4. The avatars are the patients on the operating table and the people in the lab, so the defect makes every character look wrong and also makes them half transparent.

Reproduction: render any avatar `.glb` with three.js `GLTFLoader` and `MeshoptDecoder`.

Suspected cause (to be confirmed in the design phase): the FBX to glTF step did not find the external TGA files referenced by the FBX, so they were never embedded. The fetch step already stages `Textures/*.tga` beside the FBX, so the confirmation must check why they were still not picked up (for example file names or paths stored in the FBX not matching the staged files, or textures dropped later in the pipeline).

Expected result: each avatar has its body color, head color, normal and opacity textures (from the Rocketbox `Textures` folder, TGA converted to 1k WebP), `baseColorFactor` `[1, 1, 1, 1]`, `metallicFactor` 0, and alpha mask only on the opacity material (eyelashes and hair cards). The avatar size budget stays in force, and the new sizes are reported.

Bug condition (C): an avatar `.glb` contains a material that has no `baseColorTexture` and is not an intentional exception, or has `baseColorFactor` other than `[1, 1, 1, 1]`, or `metallicFactor` other than 0.

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type AvatarGlb { materials: list of Material }
  OUTPUT: boolean

  RETURN EXISTS m IN X.materials WHERE
           (m.baseColorTexture = null AND NOT m.intentionalException)
        OR m.baseColorFactor != [1, 1, 1, 1]
        OR m.metallicFactor != 0
END FUNCTION
```

```pascal
// Property: Fix Checking - avatars carry their textures and neutral factors
FOR ALL X WHERE isBugCondition(X) DO
  glb ← convertAvatar'(X.source)
  ASSERT FOR ALL m IN glb.materials:
           m.baseColorTexture != null
       AND m.baseColorFactor = [1, 1, 1, 1]
       AND m.metallicFactor = 0
       AND (m.alphaMode = "MASK" IFF m IS the opacity material)
END FOR
```

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT convertAvatar(X) = convertAvatar'(X)
END FOR
```

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN any of the 8 avatars is rendered with `GLTFLoader` and `MeshoptDecoder` THEN the system shows a flat yellow, half transparent character

1.2 WHEN the avatar `.glb` files are inspected THEN the system finds only one normal texture per file and no body color, head color or opacity texture, so materials have no `baseColorTexture`

1.3 WHEN the avatar materials are inspected THEN the system finds the FBX default `baseColorFactor` `[1, 1, 0, 0.5]` and `metallicFactor` 0.4 instead of white, opaque and non-metallic values

1.4 WHEN the avatar conversion step runs THEN the system does not embed the TGA textures referenced by the FBX and does not fail or warn about the missing textures

1.5 WHEN the test suite is run THEN the system has no check that every avatar material has a base color texture, so the defect goes unnoticed

1.6 WHEN the asset-auditor agent checks avatars THEN the system does not check that every material has a base color texture or an intentional exception

### Expected Behavior (Correct)

2.1 WHEN any of the 8 avatars is rendered with `GLTFLoader` and `MeshoptDecoder` THEN the system SHALL show the avatar with its body and head color textures, opaque except for eyelashes and hair cards

2.2 WHEN the avatar `.glb` files are inspected THEN the system SHALL find the body color, head color, normal and opacity textures embedded as 1k WebP, converted from the Rocketbox `Textures` folder TGA files

2.3 WHEN the avatar materials are inspected THEN the system SHALL find `baseColorFactor` `[1, 1, 1, 1]` and `metallicFactor` 0 on every material, and alpha mask mode only on the opacity material (eyelashes and hair cards)

2.4 WHEN the avatar conversion step runs and a texture referenced by the FBX cannot be found or embedded THEN the system SHALL fail with an error naming the avatar and the missing texture instead of writing a texture-less `.glb`

2.5 WHEN the avatar regression test is run against the original, unfixed `.glb` files or conversion THEN the test SHALL fail, and WHEN it is run against the re-converted files THEN it SHALL pass for all 8 avatars, asserting that every material has a `baseColorTexture`, `baseColorFactor` is `[1, 1, 1, 1]` and `metallicFactor` is 0

2.6 WHEN the asset-auditor agent checks avatars THEN the system SHALL check that every material has a base color texture or an intentional exception, and report any material that has neither

2.7 WHEN the 8 avatars are re-converted THEN the system SHALL keep each avatar and the total within the existing avatar size budget and report the new file sizes

2.8 WHEN one avatar is rendered on a small test page with the Playwright MCP server THEN the system SHALL produce a screenshot saved to `reference/progress/avatar-textures-fixed.png` that shows a textured, opaque avatar

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a non-avatar asset (model, texture, HDRI, audio) is converted THEN the system SHALL CONTINUE TO produce the same output as before

3.2 WHEN an avatar is converted THEN the system SHALL CONTINUE TO apply the existing pipeline steps in order (Edit_List, dedup, prune, resample, WebP texture compression at 1024, Meshopt) and write one self-contained `.glb`

3.3 WHEN the avatars are re-converted THEN the system SHALL CONTINUE TO keep the same file names, folder layout, skeleton, meshes, and the Rocketbox `LICENSE` file next to each avatar

3.4 WHEN the avatars are re-converted THEN the system SHALL CONTINUE TO have an accurate `CREDITS.md` row and manifest entry for every avatar file, with licenses allowed by `asset-licensing.md`

3.5 WHEN the existing tools tests (conversion, fetch, budgets, credits) are run THEN the system SHALL CONTINUE TO pass

3.6 WHEN the asset-auditor agent runs its existing checks (CREDITS.md rows, forbidden licenses, attribution, files over 5 MB) THEN the system SHALL CONTINUE TO perform them unchanged
