# Asset candidates (Phase 1, scouting)

Status: Final picks recorded; Phase 2 tasks written; nothing downloaded yet.

Totals: Categories 1-7: 47 distinct candidates (35 visual + 12 sound), counting the task 6.2 replacement hand (picked; sketchfab-zombie-hand-greenall stays listed but is Rejected as unconfirmed). Per category: 1 ground and stone 5, 2 night sky 3, 3 graveyard props 14, 4 lab props 5, 5 avatars 3, 6 zombie and hands 5, 7 sound 12. Packs and files covering several Sub_Items are listed once. Limit 35, hard max 38 for the visual categories. Category 8 (horror dressing), counted separately and outside the cap: 23 distinct candidates in 24 rows (22 new; 1 shared with Category 3), 0 for the bloody handprint. Category 9 (lab and finale, round 3, separate, outside the cap): 8 distinct (knife switch 2, heavy door 2, lab wall 2, lab floor 2). Category 10 (sounds, round 3, separate, outside the cap): 12 distinct. Overall: 89 distinct (47 + 22 + 8 + 12). The 6 extra Rocketbox avatars (round 3) are listed separately and are not counted as scouted candidates.

Decision: the 35/38 cap was raised for Category 7 (sound) only. Categories 1 to 6 now total 35 with the task 6.2 replacement, within the hard max of 38. Sound adds 12 for a final total of 47. The cap does not apply to Categories 8, 9 and 10.

Provenance result (task 6.1, details under Category 6): Greenall corpse CONFIRMED and picked (provenance accepted on the author's statement). Greenall hand UNCONFIRMED and rejected. Replacement hand sketchfab-zombie-hand-craggle: picked.

## Decisions needed (rounds 2 and 3)

Resolved. Your final picks for rounds 2 and 3 are recorded under "Picks", "Rejected" and "Not picked" below. No open decisions remain in Phase 1; Phase 2 tasks are written. Nothing has been downloaded.

How each earlier question was settled:

- Round 3 A to F: knife switch sketchfab-knife-switch-type-d (grey variant); door polyhaven-large-castle-door; lab wall polyhaven-dark-brick-wall; lab floor polyhaven-slate-floor; one sound per pair (sting qubodup, digging guyburns, shambling indieground, cloth zazz, hum smice-6, crows giddster); all six extra Rocketbox avatars kept after the preview check.
- Round 2 items 1 to 5: Category 8 choices recorded in Picks. Replacement hand craggle taken. Procedural handprint and drag-mark generated in `tools/` as our own work. Cracked headstone derived by our script from the intact drydoctoregg scan. Bones: none.
- Checks run in this step: the Proop/ALTEREGO AI-account check FAILED (hook dropped, see Rejected); the Rocketbox preview logo check found no logo or readable text on any of the six avatars (see "Extra Rocketbox avatars").

## Legend

- Night-read rating (advisory only, 1 to 3): how well the asset should read in the near-black scene with one warm flashlight pool, a cold moon rim light and a surgical lamp pool. 1 = likely to read poorly, 2 = acceptable, 3 = likely to read well. It is a judgement from preview pages, not a render test. Category 7 uses n/a.
- (Fallback): the candidate named in the task as the default. Fallback rows come first in each Sub_Item group.
- Manual pick: the file cannot be fetched by the script (Sketchfab and Freesound need a login). You download it yourself in Phase 2 into `tools/cache/manual/<name>/`.
- Size basis: every size is an estimate of the converted web file (Meshopt for geometry, 1k WebP for textures, .ogg or .mp3 for audio), not a measured download. The basis is given in each cell. Sketchfab archive sizes are not public without login, so those are unverified and computed from vertex counts. Confirm at conversion. Every estimate is under 5 MB per file.
- Licenses: exact name on the candidate's own page plus the license URL. CC BY rows name the author with a link.
- Poly Haven and ambientCG rows are CC0 (no credit needed, but we still list them in CREDITS.md). Poly counts for Poly Haven are the "tris" figure on the page. Sketchfab counts are the face counts in the model info panel.
- n/a = the column does not apply.

## Comparison with /reference

[`../graveyard/graveyard-rate-shock-3pp.png`](../graveyard/graveyard-rate-shock-3pp.png): the graveyard at +3 pp. A near-black field with a few arched tombstones lit by one warm flashlight pool, a wrought-iron double gate silhouetted on the horizon, a low grey horizon haze, grain and a vignette. A hand claws out beside a tombstone. The ground and stone are dark and matte.

[`../lab/lab-default.png`](../lab/lab-default.png): the lab default camera. A patient in grey clothes lies on a thin-legged table with a copper edge. The lamp pool lights the body only, the walls are dark, and docked panels sit on the sides and bottom.

[`../lab/lab-failure.png`](../lab/lab-failure.png): the failure outcome. A red flood closes in from the screen edges, pale hands push in from the left and right edges, and the dark centre keeps the table and body readable.

[`../lab/lab-closeup.png`](../lab/lab-closeup.png): the free camera pushed in on the body. The surface detail of the clothing and table edge stays readable, nothing is overexposed, and a small warm lantern sits on a wet, dark floor at the right.

How the candidates compare:

- Ground and stone: lichen_rock, excavated_soil_wall (rated 3) match the dark matte stones and earth of the graveyard shot. Bright moss, grass or sand (mossy_rock, brown_mud_leaves_01, ground054) would glow under the flashlight and need darkening.
- Sky: moonlit_golf is the closest to the dim haze above the graveyard horizon. All three HDRIs need much lower intensity than their previews suggest, and kloppenheim_02_puresky reads like a pale daylight sky.
- Graveyard props: large_iron_gate is the double gate in the reference. gothic_statue and the dead trees are dark and matte. Pale or pastel scans (angel statue, sandstone gate, rusty-oil-lantern) need desaturating and darkening. The Poly Haven Lantern_01 matches the warm lantern in the close-up.
- Lab props: the autopsy-lab pack and the worn metal cart are the darkest and fit the crypt mood of the lab shots. The daonware set is clean and white and would need a re-texture. The reference table is a plain thin-legged slab, so any table here is more detailed than the reference.
- Avatars: the reference patient is the Rocketbox Business_Male_02 (credited in the footer), so the Fallback matches it exactly. The beige-vest Male_Adult_05 is a variation on the same rig. The Sketchfab option is stylized and does not match.
- Zombie and hands: the reference hands are pale and clawing. Greenall's hand and Ruella's hand are pale grey and hold under red light. The raw red mutant would merge with the red flood.
- Sound: the reference images carry no audio, so there is nothing to compare against; the sounds follow the product brief (ECG, heartbeat, drone, gate, zap, wind).

## How to pick

Reply with the candidate names you want for each Sub_Item, for example: "ground: polyhaven-excavated-soil-wall; stone: polyhaven-lichen-rock; ...". You can pick more than one per Sub_Item or none. For a pack, name it once and say which of its Sub_Items you want it for. Manual picks (all of Category 6 and Category 7, plus every Sketchfab row elsewhere) will have their expected file placed by you in `tools/cache/manual/<name>/` in Phase 2. Phase 2 tasks are written only after your picks arrive.

## Category 1: ground and stone textures

Sub_Items: ground, stone. Poly count: n/a. Resolutions column lists the available sets. All PBR sets also include AO and displacement (not needed). 2k estimates for ground are about 4x the 1k set.

### Ground

| Name | Preview | Source URL | Author | License | File size (estimate, basis) | Poly count | PBR maps | Resolutions | Night-read | Night-read reason | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| polyhaven-brown-mud-leaves-01 (Fallback) | [png](01-ground-stone/polyhaven-brown-mud-leaves-01.png) | https://polyhaven.com/a/brown_mud_leaves_01 | Rob Tuytel | CC0, https://polyhaven.com/license | ~1.7 MB at 1k, ~6 MB at 2k (WebP set; 1k JPG color 1.21 + normal 1.49 + rough 0.64 MB x ~0.5) | n/a | color, normal (GL and DX), roughness, AO, displacement, ARM | 1k, 2k, 4k, 8k | 2 | Mid-dark rough mud, but bright green grass flecks would pop in moonlight. | Muddy graveyard ground with leaf litter; grass can be desaturated or dimmed. |
| polyhaven-excavated-soil-wall (Fallback) | [png](01-ground-stone/polyhaven-excavated-soil-wall.png) | https://polyhaven.com/a/excavated_soil_wall | Amal Kumar | CC0, https://polyhaven.com/license | ~1.1 MB at 1k, ~4.5 MB at 2k (WebP set; 1k JPG color 0.64 + normal 1.32 + rough 0.31 MB x ~0.5) | n/a | color, normal (GL and DX), roughness, AO, displacement, ARM | 1k, 2k, 4k, 8k, 16k | 3 | Matte dark-brown dry soil with deep furrows and strong normal detail, no bright patches. | Reads as freshly dug earth around a grave; smallest size of the ground options. |
| ambientcg-ground054 | [png](01-ground-stone/ambientcg-ground054.png) | https://ambientcg.com/view?id=Ground054 | ambientCG (Lennart Demes) | CC0 (Creative Commons CC0), https://docs.ambientcg.com/license/ | ~1.5 MB at 1k, ~5 MB at 2k (1K-JPG zip is 8 MB for about 6 maps, ~1.3 MB each; 3 maps x ~0.5; 2k zip is 31 MB) | n/a | color, normal (GL and DX), roughness, AO, displacement (per ambientCG convention; zip not opened) | 1k to 16k (JPG and PNG zips) | 1 | Pale sand albedo, craters read as beach; would glow brightly under the torch. | Photogrammetry mud/sand with strong relief; only usable if heavily darkened and tinted. |

### Stone

| Name | Preview | Source URL | Author | License | File size (estimate, basis) | Poly count | PBR maps | Resolutions | Night-read | Night-read reason | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| polyhaven-lichen-rock (Fallback) | [png](01-ground-stone/polyhaven-lichen-rock.png) | https://polyhaven.com/a/lichen_rock | Rico Cilliers | CC0, https://polyhaven.com/license | ~1.4 MB (1k WebP set; JPG 1k color 1.07 + normal 1.26 + rough 0.57 MB x ~0.5) | n/a | color, normal (GL and DX), roughness, AO, displacement, ARM | 1k, 2k, 4k, 8k | 3 | Dark brown-grey rock with pale lichen speckle, matte and rough, strong layered normal detail. | Weathered pitted tombstone surface; dark albedo keeps the flashlight pool and moon rim readable. |
| polyhaven-mossy-rock (Fallback) | [png](01-ground-stone/polyhaven-mossy-rock.png) | https://polyhaven.com/a/mossy_rock | Rob Tuytel | CC0, https://polyhaven.com/license | ~1.4 MB (1k WebP set; JPG 1k color 1.12 + normal 1.00 + rough 0.78 MB x ~0.5) | n/a | color, normal (GL and DX), roughness, AO, displacement, ARM | 1k, 2k, 4k, 8k | 2 | Rough with deep cracks, but green-yellow moss is fairly bright and saturated, may glow under the torch. | Mossy cracked stone suits old graves; could be darkened in the shader. |

## Category 2: night sky HDRIs

Sub_Items: background sky (ships at 2k), environment lighting (ships at 1k). All three candidates cover both Sub_Items, so each appears once. Poly count and PBR maps: n/a. Poly Haven previews are auto-exposed, so the night HDRIs look brighter than they will in the scene; the rating judges the real light level and colour. All three need exposure reduction (`environmentIntensity` and `backgroundIntensity` well below 1), the puresky one the most. Shipping plan: a 2k background (about 6.8 to 7.0 MB .hdr) plus a 1k environment (about 1.7 MB) is about 8.5 MB before conversion, which fits the 25 MB initial budget but is a large share. Consider one HDRI at 1k for both roles if the budget gets tight.

| Name | Covers | Role | Preview | Source URL | Author | License | File size (exact .hdr, from the Poly Haven files API) | 1k / 2k and role | Night-read | Night-read reason | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| polyhaven-rogland-moonlit-night (Fallback) | background sky, environment lighting | Primary sky: 2k as background, 1k as environment | [png](02-night-sky/polyhaven-rogland-moonlit-night.png) | https://polyhaven.com/a/rogland_moonlit_night | Greg Zaal | CC0, https://polyhaven.com/license | 1k 1.72 MB (1,723,744 B); 2k 6.76 MB (6,762,142 B) | 1k and 2k exist (also 4k and higher) | 2 | Real moonlit sky with stars and a small moon, cool blue-white light, but a bright desert horizon and 20 EVs of contrast; the sandy ground is too pale for near-black, so it needs a low intensity and the horizon hidden by fog or the graveyard ground. | Genuine moon and stars with cold blue light for the moon rim; the horizon can be masked by the scene. |
| polyhaven-kloppenheim-02-puresky (Fallback) | background sky, environment lighting | Fallback sky-only: low-detail dome, 1k environment or flat background | [png](02-night-sky/polyhaven-kloppenheim-02-puresky.png) | https://polyhaven.com/a/kloppenheim_02_puresky | Greg Zaal (original), Jarod Guest (sky edits) | CC0, https://polyhaven.com/license | 1k 1.39 MB (1,393,622 B); 2k 5.56 MB (5,563,538 B) | 1k and 2k exist (also 4k and higher) | 1 | Page tags it Night, but it is a pale blue-grey daylight-like sky with a bright sun and glowing horizon; needs very heavy exposure reduction and tint to reach a dark grey-brown night, and the sun disc would read as a hot light, not a low-contrast moon. | Sky only with no ground or landmarks, so it never competes with the graveyard; usable as a hazy fog backdrop after darkening. |
| polyhaven-moonlit-golf | background sky, environment lighting | Added alternative: 2k background, 1k environment | [png](02-night-sky/polyhaven-moonlit-golf.png) | https://polyhaven.com/a/moonlit_golf | Greg Zaal | CC0, https://polyhaven.com/license | 1k 1.73 MB (1,725,527 B); 2k 6.98 MB (6,981,963 B) | 1k and 2k exist (also 4k and higher) | 3 | Dark indigo sky with a clean, soft moon and dark green field horizon, the darkest and lowest-contrast of the three; cool moon light suits the rim light. The sky is blue-purple rather than grey-brown, fixable with a warm-grey fog. | Closest to the reference mood: dim sky, faint horizon, cold moon, near-black ground; the field horizon blends into the graveyard ground. |

## Category 3: graveyard props

Sub_Items: gate, statue, dead trees, stumps, lantern, fence, broken stones (2 candidates each, 14 in total, 5 Fallbacks).

Size basis: Poly Haven rows use the glTF 1k set from `api.polyhaven.com/files/<id>`: estimate = `.bin` x 0.3 (Meshopt) + JPGs x 0.5 (WebP). Sketchfab rows are unverified: the archive size is not public without login, so the estimate is about 14 bytes per vertex of Meshopt geometry (after decimating anything above about 100k triangles) plus about 0.5 MB for a 1k WebP set resized from the 4K or 8K bakes. Confirm at conversion. Sketchfab rows are Manual picks (login needed). Sketchfab licence: "CC Attribution", https://creativecommons.org/licenses/by/4.0/ (CC BY 4.0), author link given in each row.

Raw Sketchfab meshes above about 100K triangles must be decimated before use.

### Gate

| Name | Preview | Source URL | Author | License | File size (estimate, basis) | Poly count | PBR maps | Resolutions | Night-read | Night-read reason | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| polyhaven-large-iron-gate (Fallback) | [png](03-graveyard-props/polyhaven-large-iron-gate.png) | https://polyhaven.com/a/large_iron_gate | Josh Dean | CC0, https://polyhaven.com/license | ~1.3 MB (.bin 0.93 MB x 0.3 + JPG 2.05 MB x 0.5) | 38K tris | diffuse, normal, ARM | 1k, 2k, 4k, 8k | 3 | Near-black rusted cast iron, matte, thin bars give the wrought-iron silhouette against the moon rim. | Exactly the double gate in the reference graveyard; smallest geometry of the gate options. |
| sketchfab-fredericksburg-cemetery-gate (Manual pick) | [png](03-graveyard-props/sketchfab-fredericksburg-cemetery-gate.png) | https://sketchfab.com/3d-models/fredericksburg-cemetery-gate-william-street-1c22908983c64b3b8b1abef4de5318ce | [mspen1bi](https://sketchfab.com/mspen1bi) | CC Attribution (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ | ~1.2 MB after decimation to ~100k tris (unverified; 481k verts raw, decimate then ~14 B/vert + 0.5 MB 1k WebP) | 952K faces raw (decimate to ~100K) | baked base color only; normal needs baking from the raw mesh | baked texture (resize to 1k) | 2 | Sandstone gate with iron grille, mid-tone and weathered, but the scan has holes in the ironwork and the pale stone is brighter than the near-black target. | Real 1844 cemetery gate with Gothic Revival pillars; grave-appropriate second option, needs mesh cleanup of the grille. |

### Statue

| Name | Preview | Source URL | Author | License | File size (estimate, basis) | Poly count | PBR maps | Resolutions | Night-read | Night-read reason | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| polyhaven-gothic-statue (Fallback) | [png](03-graveyard-props/polyhaven-gothic-statue.png) | https://polyhaven.com/a/gothic_statue | Benny Weimer | CC0, https://polyhaven.com/license | ~1.7 MB (.bin 0.87 MB x 0.3 + JPG 2.92 MB x 0.5) | 28K tris | diffuse, normal, ARM | 1k, 2k, 4k | 3 | Dark bronze-brown weathered figure, matte with deep carved detail, low albedo. | Crowned figure with a book and chain reads as a ghoulish guardian; made for Poly Haven's Project Lighthouse. |
| sketchfab-broken-wing-angel-statue (Manual pick) | [png](03-graveyard-props/sketchfab-broken-wing-angel-statue.png) | https://sketchfab.com/3d-models/broken-wing-angel-statue-3d-scan-ee2dfa611cb84ef5816036277a818477 | [TowerDweller.com 3D-Scans](https://sketchfab.com/towerdweller) | CC Attribution (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ | ~1.2 MB after decimation to ~100k tris (unverified; 204k verts raw, ~14 B/vert + 0.5 MB 1k WebP) | 408K faces raw (decimate to ~100K) | baked color; no separate PBR maps seen | baked texture (resize to 1k) | 2 | Scanned resin angel with a cracked wing and good form, but the baked color is pastel pink and teal; needs desaturating and darkening. | Classic cemetery angel with a broken wing, the most graveyard-typical statue found. |

### Dead trees

| Name | Preview | Source URL | Author | License | File size (estimate, basis) | Poly count | PBR maps | Resolutions | Night-read | Night-read reason | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| polyhaven-dead-tree-trunk (Fallback) | [png](03-graveyard-props/polyhaven-dead-tree-trunk.png) | https://polyhaven.com/a/dead_tree_trunk | Rob Tuytel | CC0, https://polyhaven.com/license | ~1.8 MB (.bin 2.19 MB x 0.3 + JPG 2.38 MB x 0.5) | 102K tris | diffuse, normal, ARM | 1k, 2k, 4k, 8k | 3 | Grey-brown dry bark, matte and rough, strong relief that catches a single flashlight. | Bare dead trunk silhouette for the graveyard edge; 102K tris should be decimated for instancing. |
| polyhaven-dead-tree-trunk-02 | [png](03-graveyard-props/polyhaven-dead-tree-trunk-02.png) | https://polyhaven.com/a/dead_tree_trunk_02 | Jenelle van Heerden (photography), Rico Cilliers (processing) | CC0, https://polyhaven.com/license | ~2.0 MB (.bin 1.88 MB x 0.3 + JPG 2.79 MB x 0.5) | 156K tris | diffuse, normal, ARM | 1k, 2k, 4k, 8k | 2 | Fallen branch with pale wood and lichen patches, brighter than the other trees. It is a fallen log, not a standing tree. | A second dead-wood shape for ground clutter; needs decimation (156K tris). |

### Stumps

| Name | Preview | Source URL | Author | License | File size (estimate, basis) | Poly count | PBR maps | Resolutions | Night-read | Night-read reason | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| polyhaven-tree-stump-01 (Fallback) | [png](03-graveyard-props/polyhaven-tree-stump-01.png) | https://polyhaven.com/a/tree_stump_01 | Rob Tuytel | CC0, https://polyhaven.com/license | ~1.7 MB (.bin 0.92 MB x 0.3 + JPG 2.83 MB x 0.5) | 41K tris | diffuse, normal, ARM | 1k, 2k, 4k, 8k | 2 | Rough dark-brown bark with some green moss that could glow under the torch. | Mossy decayed stump with roots, fits a neglected graveyard. |
| polyhaven-tree-stump-02 | [png](03-graveyard-props/polyhaven-tree-stump-02.png) | https://polyhaven.com/a/tree_stump_02 | Rob Tuytel | CC0, https://polyhaven.com/license | ~1.9 MB (.bin 1.37 MB x 0.3 + JPG 2.89 MB x 0.5) | 62K tris | diffuse, normal, ARM | 1k, 2k, 4k, 8k | 2 | Dry weathered wood, matte, mid-tone; less moss than stump 01 but some pale cut surface. | Same author and style as stump 01 and the dead tree trunk, so the three sit together. |

### Lantern

| Name | Preview | Source URL | Author | License | File size (estimate, basis) | Poly count | PBR maps | Resolutions | Night-read | Night-read reason | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| polyhaven-lantern-01 (Fallback) | [png](03-graveyard-props/polyhaven-lantern-01.png) | https://polyhaven.com/a/Lantern_01 | Rajil Jose Macatangay | CC0, https://polyhaven.com/license | ~0.5 MB (.bin 0.82 MB x 0.3 + JPG 0.53 MB x 0.5) | 34K tris | diffuse, normal, ARM (one brass material set) | 1k, 2k, 4k, 8k | 2 | Aged brass and glass, metallic so it catches light, but the smallest and darkest of the lantern options. | Old hurricane lantern as a hand prop or hanging light; pairs with the warm flashlight pool. |
| sketchfab-rusty-oil-lantern (Manual pick) | [png](03-graveyard-props/sketchfab-rusty-oil-lantern.png) | https://sketchfab.com/3d-models/rusty-oil-lanter-game-ready-asset-29ad0bc1b38f4896848e41f662f3d71f | [krishna_0420](https://sketchfab.com/krishna_0420) | CC Attribution (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ | ~1.1 MB (unverified; 43k verts x ~14 B + 0.5 MB 1k WebP) | 85K faces | PBR textures per page description (maps not opened) | likely 2k to 4k (not confirmed) | 1 | Saturated orange-yellow rust and grey glass, bright and somewhat hand-painted; it would need a heavy darken. Tagged photogrammetry but looks authored. | Rusty kerosene lantern adds worn-metal variety; weakest fit, listed to give a second option. |

### Fence

| Name | Preview | Source URL | Author | License | File size (estimate, basis) | Poly count | PBR maps | Resolutions | Night-read | Night-read reason | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sketchfab-rusty-iron-fence (Manual pick) | [png](03-graveyard-props/sketchfab-rusty-iron-fence.png) | https://sketchfab.com/3d-models/rusty-iron-fence-4dfb2256f18442e7a523883bd262b633 | [SibeYu](https://sketchfab.com/SibeYu) | CC Attribution (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ | ~1.0 MB (unverified; 37k verts x ~14 B + 0.5 MB 1k WebP) | 73K faces | baked color (one 8K UV), no separate PBR maps | one 8K texture (resize to 1k) | 2 | Drone-scanned rusty corrugated sheet-metal fence with peeling paint; matte, but pale-blue paint patches are bright and it is a solid panel fence, not wrought-iron pickets. The scan includes a ground patch and some shrub noise. | Photoreal scan of a corroded iron fence panel; tagged noai; usable as a perimeter wall if the silhouette is acceptable. |
| polyhaven-modular-chainlink-fence | [png](03-graveyard-props/polyhaven-modular-chainlink-fence.png) | https://polyhaven.com/a/modular_chainlink_fence | James Ray Cock, Amal Kumar | CC0, https://polyhaven.com/license | ~2.9 MB (.bin 3.02 MB x 0.3 + JPG 3.89 MB x 0.5) | 89K tris | diffuse, normal, ARM (posts and wire sets) | 1k, 2k, 4k, 8k | 2 | Thin galvanised wire is dull and see-through, low albedo; reads as a modern fence, not a Victorian one. | Safe CC0, modular and tileable; fits a neglected modern cemetery boundary. |

### Broken stones

| Name | Preview | Source URL | Author | License | File size (estimate, basis) | Poly count | PBR maps | Resolutions | Night-read | Night-read reason | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sketchfab-small-destroyed-tombstone-04 (Manual pick) | [png](03-graveyard-props/sketchfab-small-destroyed-tombstone-04.png) | https://sketchfab.com/3d-models/small-destroyed-tombstone-04-ba7786989b414adf91a5763e71e9854c | [archiwum_xyz](https://sketchfab.com/archiwum_xyz) | CC Attribution (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ | ~1.3 MB (unverified; 55k verts x ~14 B + 0.5 MB 1k WebP; page says 2 x 8192 textures, resize to 1k) | 100K faces | baked color (and likely normal; page says 2 x 8K) | 8K (resize to 1k) | 2 | Mossy cracked gravestone with green moss that is a little saturated; dark stone body, rough and matte. Tagged noai. | Photoscan of a destroyed tombstone made for game use, under 100K tris. |
| sketchfab-broken-headstone (Manual pick) | [png](03-graveyard-props/sketchfab-broken-headstone.png) | https://sketchfab.com/3d-models/broken-headstone-af5256bcf12e42ce8c718d8331c77936 | [jerryfisher](https://sketchfab.com/jerryfisher) | CC Attribution (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ | ~1.2 MB after decimation to ~100k tris (unverified; 193k verts raw, ~14 B/vert + 0.5 MB 1k WebP) | 382K faces raw (decimate to ~100K) | baked color | baked texture (resize to 1k) | 2 | Weathered grey headstone with readable inscription and a pale broken fragment; the scan includes a ground patch and a colour card that must be cropped out. | Two-piece broken headstone, real cemetery scan. |

Category 3 notes: rejected while scouting were the Sketchfab "ornate wrought iron gate" (tagged createdwithai, forbidden), "Wrought Iron Gate" (TeenWolf, stylized low-poly), the "Halloween graveyard pack" and other stylized graveyard packs; searches of CC0 Sketchfab models returned nothing. Trimming order if the total must drop: sketchfab-rusty-oil-lantern (rating 1), then polyhaven-dead-tree-trunk-02, although cutting the lantern would leave one lantern candidate.

## Category 4: lab props

Sub_Items: operating table, surgical lamp, IV stand, medical cart, instruments. No Fallbacks. All five are Sketchfab, CC BY (page label "CC Attribution", https://creativecommons.org/licenses/by/4.0/), Manual picks. Two packs cover three Sub_Items each and appear once. Size basis (unverified, no public archive size): Meshopt geometry at ~14 bytes per vertex plus ~0.5 MB for a 1k WebP set; confirm at conversion.

### Packs

| Name | Covers | Preview | Source URL | Author | License | File size (estimate, basis) | Poly count | PBR maps | Resolutions | Night-read | Night-read reason | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sketchfab-autopsy-lab-assets (PACK, Manual pick) | operating table, surgical lamp, instruments | [png](04-lab-props/sketchfab-autopsy-lab-assets.png) | https://sketchfab.com/3d-models/autopsy-lab-assets-5ceaaa4482a84774b9922366cfb228e7 | [Evan Petrov](https://sketchfab.com/EvanPetrov) | CC Attribution (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ | ~0.85 MB (24.4K verts x 14 B = 0.34 MB + 0.5 MB 1k WebP) | 46.7K faces (whole pack) | PBR textures per preview look (maps not opened) | not confirmed | 3 | Dark worn steel dissection table with metal edge highlights, articulated lamp, instrument tray with vials, all mid-to-low albedo; the preview is already near-black, same mood as the reference lab. | One consistent grimy style covering table, lamp and tray items; tags list lamp, dissection table, vial, microscope, folding screen. Caveat: the instruments are small tray items (vials, trays), not a clear scalpel set. Confirm after download. |
| sketchfab-daonware-medical-equipment-set (PACK, Manual pick) | operating table, surgical lamp, medical cart | [png](04-lab-props/sketchfab-daonware-medical-equipment-set.png) | https://sketchfab.com/3d-models/realistic-medical-equipment-and-accessories-set-5460fb2767c6468eb88466d2555d273b | [daonware](https://sketchfab.com/daonware) | CC Attribution (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ | ~1.0 MB (36.0K verts x 14 B = 0.50 MB + 0.5 MB 1k WebP) | 70.9K faces (whole set) | basic materials seen, no PBR maps confirmed | not confirmed | 1 | Clean modern hospital look: white mattress, flat grey-white metal, simple shapes; needs a full re-texture to read as dark steel. | Only pack found with a real double-arm surgical light, an operating table and a tiered utility cart in one style; also has a monitor console. Despite the title it is simple-looking, not photoreal. |

### Singles

| Name | Sub_Item | Preview | Source URL | Author | License | File size (estimate, basis) | Poly count | PBR maps | Resolutions | Night-read | Night-read reason | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sketchfab-medical-props-cart (Manual pick) | medical cart, instruments | [png](04-lab-props/sketchfab-medical-props-cart.png) | https://sketchfab.com/3d-models/medical-props-4b2e1a4c3f13432b9a0bc15355b27632 | [coa white](https://sketchfab.com/coawhite) | CC Attribution (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ | ~1.2 MB (51.7K verts x 14 B = 0.72 MB + 0.5 MB 1k WebP) | 102K faces (decimate to about 60K) | PBR look (metal, roughness) | not confirmed | 3 | Scuffed, dull stainless steel on a black ground, tarnished tray surfaces with bottles; worn metal that would catch a warm lantern edge. | Three-tier trolley loaded with trays, bowls, scissors and bottles, authored as horror-ready and "not perfectly clean". A loaded cart and loose instruments in one object (two Sub_Items, so not a pack row). |
| sketchfab-iv-device-with-stand (Manual pick) | IV stand | [png](04-lab-props/sketchfab-iv-device-with-stand.png) | https://sketchfab.com/3d-models/iv-device-with-stand-dae36203625e414db3b0c8fff858f830 | [The Center for Digital Humanities UArizona](https://sketchfab.com/UofA-CDH) | CC Attribution (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ | ~1.5 MB (72.8K verts x 14 B = 1.02 MB + 0.5 MB 1k WebP, single baked texture) | 144.7K faces (decimate to about 60K) | baked color only; normal must be baked | baked texture (resize to 1k) | 2 | Photoscan of a real IV pole and pump with grey, scuffed tones that suit a dark lab, but the scan is blobby around the pump and tubing and the pole base is thin. | The only photoreal IV stand with a pump found; geometry cleanup needed. |
| sketchfab-crutch-and-iv-drip (Manual pick) | IV stand | [png](04-lab-props/sketchfab-crutch-and-iv-drip.png) | https://sketchfab.com/3d-models/crutch-and-iv-drip-5cc65c6aed374220b67f7d60e679153e | [Matt LeMoine](https://sketchfab.com/Matt_LeMoine) | CC Attribution (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ | ~0.55 MB (2.8K verts x 14 B = 0.04 MB + 0.5 MB 1k WebP) | 5.6K faces | PBR (Substance Painter) per tags | not confirmed | 2 | Dark, scuffed metal pole with a faded saline bag, low albedo and a good silhouette; hand-painted detail is modest and the crutch must be deleted. Tagged noai. | Cleanest worn IV pole and the lightest option; the crutch can serve as a spare ground prop or be removed. |

Category 4 notes: per Sub_Item, operating table has 2 (autopsy pack fits the night read; the daonware table needs a re-texture), surgical lamp has 2 (autopsy gooseneck lamp; daonware true ceiling-mounted surgical light), medical cart has 2 (medical-props-cart, daonware), IV stand has 2, instruments has 2 (both are tray items inside larger models; no standalone scalpel set was added, nearest seen: "Basic surgical instruments" by lsirabella, 38.6K faces, CC BY, not previewed). Spare outside the list: Poly Haven `tool_cart` (CC0, 29K tris, worn green workshop cart). Rejected: sci-fi "Operating Table" models, stylized IV drips, low-poly surgical tool sets, and a 1.2M-face instrument scan. Trimming order: sketchfab-daonware-medical-equipment-set first.

## Category 5: patient avatars and animations

Sub_Item: patient avatar and animations (one group). The Rocketbox repo `microsoft/microsoft-rocketbox` was archived (read-only) by the owner on Oct 2, 2026. The files and MIT license remain available, so the Phase 2 script should pin a commit SHA. License text: `LICENSE.md` in the repo, MIT, https://github.com/microsoft/microsoft-rocketbox/blob/master/LICENSE.md. Include its LICENSE file next to the avatars.

Verified in the repo (read-only through the GitHub git-tree API):

- Business_Male_02: `Assets/Avatars/Professions/Business_Male_02/Export/Business_Male_02.fbx` (521,088 B) and `Business_Male_02_facial.fbx` (1,919,088 B, adds facial blendshapes). Textures are 2048-class uncompressed TGA, 12.6 MB each (body and head color, normal, specular) plus `m008_opacity_color.tga` (16.8 MB). The repo has no .glb, so conversion from FBX is needed.
- Animations are FBX files under `Assets/Animations/all_animations_max_motextr_xy/`: `m_walk_neutral_01.max.fbx` (994,336 B), `m_walk_drunk.max.fbx` (1,342,864 B), `m_walk_bruised.max.fbx` (1,352,016 B). Idle options in `..._static/`: `m_idle_breathe_01.max.fbx` (1,397,280 B), `_02`, `_03`.
- No lying-down or dead-body animation exists in the library (searched the whole tree for `lie` and `laying`). The patient on the table will be a static pose or a posed idle.
- Skeleton: 3ds Max Biped (Bip01), shared by every Rocketbox avatar and animation, so the animations apply to any Rocketbox avatar with no retargeting.
- Poly count is unverified: the FBX was not opened. The repo and paper describe four levels (hipoly, midpoly, lowpoly, ultralowpoly) inside each FBX, on the order of 10k triangles at the high level. Confirm at conversion.
- Size basis (computed, no .glb exists): mesh at Meshopt about 0.35 MB plus a 1k WebP set (body color, head color, two normals, about 0.15 MB each, 0.6 to 0.7 MB). Each animation FBX of 1.0 to 1.4 MB is expected to be 0.1 to 0.2 MB as a Meshopt-compressed glTF clip.

| Name | Preview | Source URL | Author | License | File size (estimate, basis) | Poly count | Maps | Skeleton | Retargeting effort | Night-read | Night-read reason | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| rocketbox-business-male-02 (Fallback; avatar plus walk_neutral_01, walk_drunk, walk_bruised) | [png](05-avatars/rocketbox-business-male-02.png) | https://github.com/microsoft/microsoft-rocketbox/tree/master/Assets/Avatars/Professions/Business_Male_02 (animations: .../Assets/Animations/all_animations_max_motextr_xy) | Microsoft (Rocketbox, (c) 2020 Microsoft) | MIT, https://github.com/microsoft/microsoft-rocketbox/blob/master/LICENSE.md | ~1.1 MB avatar + ~0.5 MB for 3 clips (mesh 0.35 MB + 1k WebP set 0.7 MB; clips 0.1 to 0.2 MB each) | not confirmed (about 10k tris at the high level) | color, normal, specular (TGA 2048), opacity; 1k planned | 3ds Max Biped (Bip01) | none | 2 | Navy suit and white shirt are low-saturation and desaturate to grey well; baked textures are soft, so skin and cloth stay quiet in close-up with no specular blow-out risk, but fine weave detail is weak. | The stated Fallback and the skeleton reference: the animations are authored for this rig, so walk_bruised and walk_drunk apply directly. A suit reads as "company executive", fitting a firm-as-patient. |
| rocketbox-male-adult-05 | [png](05-avatars/rocketbox-male-adult-05.png) | https://github.com/microsoft/microsoft-rocketbox/tree/master/Assets/Avatars/Adults/Male_Adult_05 | Microsoft (Rocketbox, (c) 2020 Microsoft) | MIT, https://github.com/microsoft/microsoft-rocketbox/blob/master/LICENSE.md | ~1.1 MB (Export FBX 536,496 B for the mesh share, same 1k WebP set) | not confirmed (same library tiers) | color, normal, specular (assumed, same pipeline; not opened) | 3ds Max Biped (Bip01), same as the Fallback | none | 2 | Beige work vest, green sweater and brown trousers are mid-value and more saturated than the suit, so the cloth needs a stronger desaturation grade, but it gives better cloth variation under the cool lamp; skin is the same soft baked quality. | Plain-clothes option; reuses the Fallback's animations and pipeline unchanged. Counts as a separate candidate because the file and look differ. |
| sketchfab-old-fat-man-full-rig (Manual pick) | [png](05-avatars/sketchfab-old-fat-man-full-rig.png) | https://sketchfab.com/3d-models/old-fat-man-character-full-rig-d4138985fb2f4a7e8751ca744eac49ea | [David Glynch](https://sketchfab.com/yaveselyigolovastic) | CC Attribution (CC BY 4.0), http://creativecommons.org/licenses/by/4.0/ | ~1.9 MB (unverified; 12.7K verts x 14 B = 0.18 MB + 0.5 MB 1k WebP + about 1 MB rough allowance for 2 bundled animations and skin data) | 25.1K faces | PBR "game ready" per tags; maps not opened | custom rig described as "full rig" (not confirmed; likely a Blender or Maya humanoid, not Biped) | high | 1 | The preview shows a stylized, caricature old man seated in a chair with saturated tags (redneck, beer); detail is hand-painted rather than photographic, which clashes with the realistic reference. | Only CC BY rigged adult with real clothes and a beard found that is neither a real-person scan nor Mixamo/AI. The two bundled clips are sit and drink, not walks, and Rocketbox animations would need a full bone remap. The model page did not finish loading in the screenshot (tiny seated figure). |

Category 5 notes: Sketchfab returned no CC0 rigged humans. Animations exist only in the Rocketbox row (Mixamo is forbidden); a lying or dead pose does not exist, so use a static pose of the T-pose or a frame of `m_walk_bruised`. Rejected: Renderpeople "Eric Rigged 001" (scan of a real person), "Casual Man -RIGGED-" (Ready Player Me, tagged createdwithai), a MetaHuman clothing item, a Mixamo bot, stylized infected patients, and two 80K to 97K face models (too heavy). Not searched: Quaternius, Kenney (stylized), Poly Haven (no humans), OpenGameArt. Trimming order: sketchfab-old-fat-man-full-rig first.

## Category 6: zombie and grabbing-hand scans (find only)

Sub_Items: grabbing hand, zombie. Provenance result (task 6.1/6.2): Greenall corpse CONFIRMED and picked; Greenall hand UNCONFIRMED and rejected; craggle hand replacement picked (details under "Provenance check" below). Every row is a Manual pick: you download the file from the model page (Sketchfab login needed) and then it is converted. Nothing was downloaded. All five are Sketchfab, CC Attribution (CC BY 4.0), license page link http://creativecommons.org/licenses/by/4.0/. None is rigged. Triangle and vertex counts are from the model page. Size basis (unverified, no public archive size): Meshopt geometry at ~14 bytes per vertex plus ~0.5 MB for a 1k WebP set.

### Grabbing hand

| Name | Preview | Source URL | Author | License | File size (estimate, basis) | Poly count | PBR maps | Resolutions | Rigged | Manual pick | Night-read | Night-read reason | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sketchfab-zombie-hand-greenall | [png](06-zombie-hands/sketchfab-zombie-hand-greenall.png) | https://sketchfab.com/3d-models/zombie-hand-66ca5bfb6aeb421a8cbccd6db0ae1458 | [Colin.Greenall](https://sketchfab.com/Colin.Greenall) | CC Attribution (CC BY 4.0), http://creativecommons.org/licenses/by/4.0/ | ~0.6 MB (8.5K verts x 14 B = 0.12 MB + 0.5 MB 1k WebP) | 16.9K tris | Substance Painter skin and nails (PBR set per description) | not confirmed | no (static pose) | Manual pick | 3 | Clawing hand and full forearm, veined grey-tan rotten skin with dark nails; light enough albedo to hold under a red flood and enough relief to read large near the camera. | The pose already matches "hands reaching in from the edges"; mirror it for the second side. Provenance caveat: the author says he retopologised and textured "a sculpt i love", so the base sculpt may be someone else's. Confirm provenance before adopting. |
| sketchfab-zombie-hand-ruella | [png](06-zombie-hands/sketchfab-zombie-hand-ruella.png) | https://sketchfab.com/3d-models/zombie-hand-79755114a2334af4b712c3b11741d738 | [Agustin Ruella](https://sketchfab.com/agustinruella) | CC Attribution (CC BY 4.0), http://creativecommons.org/licenses/by/4.0/ | ~0.75 MB after decimation (~2.8 MB as is; 162.3K verts, decimate to ~30K tris = ~15K verts x 14 B = 0.21 MB + 0.5 MB 1k WebP baked from the sculpt) | 319.5K tris (decimate) | ZBrush upload tagged handpainted; likely polypaint, maps must be baked | not confirmed | no | Manual pick | 2 | Pale grey-white skin with raised veins and red wounds holds up well under red light; the blue sleeve must be removed or re-colored, and the pose is an open hand rather than a claw. | Palest skin found; high sculpt detail gives a good normal bake for close-ups. |
| sketchfab-zombie-hand-craggle | [png](06-zombie-hands/sketchfab-zombie-hand-craggle.png) | https://sketchfab.com/3d-models/zombie-hand-4c8b6ca93ab04d0699523d3a9ef80c67 | [craggle](https://sketchfab.com/craggle) | CC Attribution (CC BY 4.0), http://creativecommons.org/licenses/by/4.0/ (shown on the model page and by the Sketchfab API) | ~0.65 MB (12.0K verts x 14 B = 0.17 MB + 0.5 MB 1k WebP; unverified, no public archive size) | 23.5K tris, 12.0K verts | one baked colour texture (1 texture, 1 material); no separate normal map listed, so relief is baked into the colour and the mesh | not confirmed | no (static pose) | Manual pick. Replacement for sketchfab-zombie-hand-greenall (picked) | 2 | Sickly yellow-green skin with pink-purple sores and wrinkled knuckles; mid-light albedo, so it holds up under a red flood (turns warm brown-orange, detail stays), but the saturated green may need desaturating toward pale grey; the splayed, downward-reaching pose reads as a claw close to the camera. | Realistic photogrammetry capture of a hand only (no face, no identifiable person; looks like a prop hand, page does not say). Provenance: description reads "Zombie hand captured with photogrammetry", i.e. own capture, no mention of reworking another artist's sculpt. Published 18 Apr 2022, uploaded with Blender, 288 downloads, not AI-tagged (tags dead, scary, halloween, hand, zombie). Weak points: lit-in shadows may be baked into the colour texture (check at conversion), and the wrist ends in a cut-off, so hide it in the grave soil or at the screen edge. |

### Zombie

| Name | Preview | Source URL | Author | License | File size (estimate, basis) | Poly count | PBR maps | Resolutions | Rigged | Manual pick | Night-read | Night-read reason | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sketchfab-zombie-corpse-greenall | [png](06-zombie-hands/sketchfab-zombie-corpse-greenall.png) | https://sketchfab.com/3d-models/zombie-corpse-bb2ebca80471423a93a60a6552928abe | [Colin.Greenall](https://sketchfab.com/Colin.Greenall) | CC Attribution (CC BY 4.0), http://creativecommons.org/licenses/by/4.0/ | ~0.55 MB (3.9K verts x 14 B = 0.05 MB + 0.5 MB 1k WebP) | 7.7K tris | Substance Painter, normals baked from a ZBrush high poly | not confirmed | no ("intended to be rigged", A-pose); needs a rig (own rig or Rocketbox skeleton retarget, not Mixamo) | Manual pick | 2 | Emaciated desiccated corpse with tan-grey skin over ribs; reads as undead from a distance, but low poly up close (relies on the normal map). | Full body; same author and texture style as the Greenall hand. Provenance caveat as for the Greenall hand (the base sculpt may not be the author's); confirm before adopting. |
| sketchfab-zombie-mutant | [png](06-zombie-hands/sketchfab-zombie-mutant.png) | https://sketchfab.com/3d-models/zombie-mutant-795f6432ebcb4c39a2aa5039752be92a | [Regulator](https://sketchfab.com/A2555) | CC Attribution (CC BY 4.0), http://creativecommons.org/licenses/by/4.0/ | ~0.7 MB (13.1K verts x 14 B = 0.18 MB + 0.5 MB 1k WebP) | 26.1K tris | PBR (tag pbr) | not confirmed | no (T-pose) | Manual pick | 1 | Raw red, wet flesh all over; under the red flood it will merge with the background and lose shape, and it reads more mutant than corpse. | Muscular, detailed ZBrush body with a strong silhouette; usable if re-tinted paler. The page says no credit is needed, but the CC BY label applies, so credit anyway. |

Category 6 notes: no CC BY or CC0 realistic zombie scan without a real face, Mixamo rig or franchise link was found, and neither zombie candidate is rigged (the corpse is the better fit). No CC0 result fit. Rejected: "Realistic Zombie Hitman" (possible real-person likeness, undead look barely reads), "ZOMBIE SOLDIER" (376.8K tris, origin unclear, possibly AI-generated), "Zombie (Male 1)" (rig made for Mixamo, forbidden), "Zombie-Mummy Arm" (near-black), "Hand-arm" (3.1M tris real hand scan), franchise-titled models (Minecraft, Roblox, Plants vs Zombies, Fallout, FNAF, Resident Evil), "Zombie Hand - Severed/Cut Fingers" (derived from Greenall's hand), and stylized packs. Trimming order: sketchfab-zombie-mutant first.

### Provenance check (task 6.1)

Checked 2026 (read-only, no login, no download, nobody contacted). Sources searched: both model pages (descriptions and all comments), the author's profile https://sketchfab.com/Colin.Greenall (23 models, no bio links to ArtStation, Instagram or a portfolio), and a web search for the author plus "zombie hand sculpt" (no hit tying either model to another artist).

**sketchfab-zombie-corpse-greenall: CONFIRMED (own work, CC BY 4.0).**
- Page: https://sketchfab.com/3d-models/zombie-corpse-bb2ebca80471423a93a60a6552928abe
- Quote: "A Zombie corpse i made and textured... Initially i sculpted a highpoly source in Zbrush, then baked the normal maps."
- License shown on the page: CC Attribution. Credit Colin.Greenall with link.
- Residual risk: the claim is the author's own statement; no outside corroboration found.

**sketchfab-zombie-hand-greenall: UNCONFIRMED (stays Rejected: sculpt provenance not confirmed).**
- Page: https://sketchfab.com/3d-models/zombie-hand-66ca5bfb6aeb421a8cbccd6db0ae1458
- Quote: "I retopologised and textured a sculpt i love... Retopology and Texturing by me."
- The author claims only retopology and texture work, so the base sculpt is by someone else, and neither the page, the comments nor the profile name that artist or license. A CC BY label on a derivative does not grant rights over the original. A commenter's question "did U retopologe or make this model also?" went unanswered.
- Other models found derive from this hand ("Zombie Hand - Severed/Cut Fingers", skfb.ly/oqzy8), so they inherit the same problem.
- Needs a replacement (task 6.2).

**Replacement found (task 6.2, now picked): sketchfab-zombie-hand-craggle.**
- Page: https://sketchfab.com/3d-models/zombie-hand-4c8b6ca93ab04d0699523d3a9ef80c67 by [craggle](https://sketchfab.com/craggle), CC Attribution (CC BY 4.0), downloadable, 23.5K tris, night-read 2, Manual pick.
- Description says only "Zombie hand captured with photogrammetry." No reworked or unnamed sculpt is mentioned. Residual risk: a one-line description, no comments, and no outside corroboration.
- Found with the public Sketchfab search API (downloadable, CC BY or CC0, queries on zombie, undead, dead, rotten, corpse and clawing hands). Other hits were rejected: theniloart "Zombie Hand" (1.6K tris, too coarse), joudni "Radioactive Mutant Human Hand" (stylized hand-painted, Fallout tag), mangocitrus "Hand" (2.8K tris, untextured look), "Zombie - Hand Holder" (322K tris, unclear origin), Mahosway "reaching out" (funny animated prop, no zombie look).
- Preview: [06-zombie-hands/sketchfab-zombie-hand-craggle.png](06-zombie-hands/sketchfab-zombie-hand-craggle.png) (1024x640, 177 KB). Picked in the final picks (hands clawing out of graves; desaturate the green slightly).

## Category 7: sound effects

Sub_Items: ECG beep, ECG flatline, heartbeat, low drone, iron gate, electric zap, wind. No Fallbacks. All 12 are Freesound, license shown on each page as "Creative Commons 0" (https://creativecommons.org/publicdomain/zero/1.0/); the pages say you can copy, modify, distribute and perform the sound, even for commercial purposes, without asking the author. Every row is a Manual pick (Freesound login needed for the download). Night-read is n/a for all sound rows. Poly count: n/a.

Size basis: duration x bitrate. .ogg at about 64 kbps mono or 112 kbps stereo (Vorbis q3 to q4); .mp3 at about 96 kbps mono or 128 kbps stereo. Estimates only, confirm at conversion. Every estimate is under 5 MB (largest about 2.5 MB, reducible by mono or a trim); some original files are over 5 MB but the converted output is not.

Packs (one file covering several Sub_Items) appear once, in the first group they cover. No copyrighted music, film, game or TV rips or identifiable patient voices were chosen. OpenGameArt was not searched (Freesound had enough CC0 hits).

Columns: duration and format are the original file; "Why it fits" includes the cut or loop notes.

### ECG beep (also covered by the packs listed here)

| Name | Covers | Preview | Source URL | Author | License | Duration | Original format | File size (original; est. .ogg / .mp3; basis) | Loopable | Manual pick | Night-read | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| freesound-sidequesting-steady-heart-rate-monitor-loop | ECG beep | [png](07-sound/freesound-sidequesting-steady-heart-rate-monitor-loop.png) | https://freesound.org/people/sidequesting/sounds/534998/ | [sidequesting](https://freesound.org/people/sidequesting/) | Creative Commons 0, https://creativecommons.org/publicdomain/zero/1.0/ | 1:00.9 | WAV, 44.1 kHz, 16-bit, mono | 5.1 MB; ~0.49 MB / ~0.73 MB (61 s x 64 kbps ogg, x 96 kbps mp3; trim to a few beats and loop to go lower) | yes ("loopable" on the page) | Manual pick | n/a | Steady, calm monitor beep made to loop; the lab's vital-signs beep while the patient is alive. Only pure loopable beep of the three ECG beep options. |
| freesound-thegreatperson-heart-rate-cardiac-arrest-flatline (PACK) | ECG beep, ECG flatline | [png](07-sound/freesound-thegreatperson-heart-rate-cardiac-arrest-flatline.png) | https://freesound.org/people/thegreatperson/sounds/210793/ | [thegreatperson](https://freesound.org/people/thegreatperson/) | Creative Commons 0, https://creativecommons.org/publicdomain/zero/1.0/ | 0:47.7 | MP3, 44.1 kHz, 128 kbps, mono | 747 KB; ~0.38 MB / ~0.75 MB (47.7 s x 64 kbps ogg; source is already 128 kbps mono mp3) | no (cut sections) | Manual pick | n/a | One take with normal rate, increased rate, cardiac arrest and flatline; the beep and the flatline tone must be cut from it (the flatline is cut from a longer recording). 21K downloads, 161 ratings. |
| freesound-b-train-heartbeat-with-beep (PACK) | ECG beep, ECG flatline, heartbeat | [png](07-sound/freesound-b-train-heartbeat-with-beep.png) | https://freesound.org/people/b-train/sounds/410379/ | [b-train](https://freesound.org/people/b-train/) | Creative Commons 0, https://creativecommons.org/publicdomain/zero/1.0/ | 0:12.1 | WAV, 44.1 kHz, 24-bit, stereo | 3.0 MB; ~0.17 MB / ~0.19 MB (12.1 s x 112 kbps ogg, x 128 kbps mp3) | no (author says it can be cut into the parts you want) | Manual pick | n/a | Synthesized heartbeat plus monitor beep that slows to dead and then speeds up; one short file gives all three heart sounds. The flatline is cut from the longer recording. |

### ECG flatline

No dedicated flatline-only file was kept. Both options are the packs above (thegreatperson, b-train), each cut from a longer recording. A dedicated "flat lining beeps" file (melnjay87, 1:09) was seen but not previewed.

### Heartbeat

| Name | Covers | Preview | Source URL | Author | License | Duration | Original format | File size (original; est. .ogg / .mp3; basis) | Loopable | Manual pick | Night-read | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| freesound-zhro-heartbeat-loopable | heartbeat | [png](07-sound/freesound-zhro-heartbeat-loopable.png) | https://freesound.org/people/ZHR%C3%98/sounds/551437/ | [ZHRØ](https://freesound.org/people/ZHR%C3%98/) | Creative Commons 0, https://creativecommons.org/publicdomain/zero/1.0/ | 0:03.6 | MP3, 44.1 kHz, 325 kbps | 143 KB; ~0.05 MB / ~0.06 MB (3.6 s x 112 kbps; source already 143 KB) | yes ("stable loopable heartbeat") | Manual pick | n/a | Recorded with a Zoom H5, not synthesized, so it has a real thump; the 3.6 s loop keeps the file tiny. The second heartbeat option is the b-train pack above. |

### Low drone

| Name | Covers | Preview | Source URL | Author | License | Duration | Original format | File size (original; est. .ogg / .mp3; basis) | Loopable | Manual pick | Night-read | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| freesound-kkenny101-dark-atmospheric-drone-seamless | low drone | [png](07-sound/freesound-kkenny101-dark-atmospheric-drone-seamless.png) | https://freesound.org/people/kkenny101/sounds/865550/ | [kkenny101](https://freesound.org/people/kkenny101/) | Creative Commons 0, https://creativecommons.org/publicdomain/zero/1.0/ | 2:38.4 | FLAC, 48 kHz, 16-bit, stereo | 13.1 MB; ~2.2 MB / ~2.5 MB (158 s x 112 kbps ogg, x 128 kbps mp3; mono or a 60 s cut gives under 0.9 MB) | yes ("Seamless Loop" in the title and description) | Manual pick | n/a | Dark, slow, eerie background drone, band-limited so it sits under the other sounds. The source is over 5 MB but the converted output is not. Caveat: the page calls it a "lightly processed audio source" and does not identify the source; no voice in it (the voice-based "Dark Voice Drone" files by the same author were skipped). |
| freesound-lennartgreen-low-rumble-loopable | low drone | [png](07-sound/freesound-lennartgreen-low-rumble-loopable.png) | https://freesound.org/people/lennartgreen/sounds/638914/ | [lennartgreen](https://freesound.org/people/lennartgreen/) | Creative Commons 0, https://creativecommons.org/publicdomain/zero/1.0/ | 0:59.8 | WAV, 44.1 kHz, 16-bit, stereo | 10.1 MB; ~0.84 MB / ~0.96 MB (59.8 s x 112 kbps ogg, x 128 kbps mp3) | yes ("loopable ambiance" in the title) | Manual pick | n/a | Deep, filtered low rumble for the lab hum; tags dark, deep, suspense. Original over 5 MB, converted file well under. |

### Iron gate

| Name | Covers | Preview | Source URL | Author | License | Duration | Original format | File size (original; est. .ogg / .mp3; basis) | Loopable | Manual pick | Night-read | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| freesound-launemax-open-close-iron-gate | iron gate | [png](07-sound/freesound-launemax-open-close-iron-gate.png) | https://freesound.org/people/launemax/sounds/274767/ | [launemax](https://freesound.org/people/launemax/) | Creative Commons 0, https://creativecommons.org/publicdomain/zero/1.0/ | 0:11.7 | WAV, 48 kHz, 24-bit, stereo | 3.2 MB; ~0.16 MB / ~0.19 MB (11.7 s x 112 kbps ogg, x 128 kbps mp3) | no | Manual pick | n/a | The page says it is the metal gate of a cemetery, opened and closed twice with squeak and clang; fits the graveyard entrance exactly. |
| freesound-nickmaysoundmusic-iron-gate-abbey-gardens | iron gate | [png](07-sound/freesound-nickmaysoundmusic-iron-gate-abbey-gardens.png) | https://freesound.org/people/nickmaysoundmusic/sounds/460556/ | [nickmaysoundmusic](https://freesound.org/people/nickmaysoundmusic/) | Creative Commons 0, https://creativecommons.org/publicdomain/zero/1.0/ | 0:28.0 | WAV, 44.1 kHz, 16-bit, mono | 2.4 MB; ~0.22 MB / ~0.34 MB (28 s x 64 kbps ogg, x 96 kbps mp3) | no | Manual pick | n/a | Mono shotgun recording of a cast iron garden gate with latch, open and close; the page notes distant traffic and light wind in the background, so trim a clean section. |

### Electric zap

| Name | Covers | Preview | Source URL | Author | License | Duration | Original format | File size (original; est. .ogg / .mp3; basis) | Loopable | Manual pick | Night-read | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| freesound-joelaudio-electric-zap-001 | electric zap | [png](07-sound/freesound-joelaudio-electric-zap-001.png) | https://freesound.org/people/JoelAudio/sounds/136542/ | [JoelAudio](https://freesound.org/people/JoelAudio/) | Creative Commons 0, https://creativecommons.org/publicdomain/zero/1.0/ | 0:00.75 | WAV, 44.1 kHz, 32-bit, mono | 130.8 KB; ~0.01 MB / ~0.01 MB (0.75 s x 64 kbps ogg, x 96 kbps mp3) | no | Manual pick | n/a | Short sharp zap for the switch-pull; 37.7K downloads and 251 ratings. |
| freesound-bigkahuna360-electrical-shock-zap | electric zap | [png](07-sound/freesound-bigkahuna360-electrical-shock-zap.png) | https://freesound.org/people/BigKahuna360/sounds/160421/ | [BigKahuna360](https://freesound.org/people/BigKahuna360/) | Creative Commons 0, https://creativecommons.org/publicdomain/zero/1.0/ | 0:03.6 | WAV, 48 kHz, 16-bit, mono | 345.7 KB; ~0.03 MB / ~0.04 MB (3.6 s x 64 kbps ogg, x 96 kbps mp3) | no | Manual pick | n/a | Longer shock with a charge-up before the hit, which suits a dramatic revival moment. |

### Wind

| Name | Covers | Preview | Source URL | Author | License | Duration | Original format | File size (original; est. .ogg / .mp3; basis) | Loopable | Manual pick | Night-read | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| freesound-qvantor-wind-howling-synthesized | wind | [png](07-sound/freesound-qvantor-wind-howling-synthesized.png) | https://freesound.org/people/Qvantor/sounds/877970/ | [Qvantor](https://freesound.org/people/Qvantor/) | Creative Commons 0, https://creativecommons.org/publicdomain/zero/1.0/ | 0:32.8 | WAV, 48 kHz, 24-bit, stereo | 9.0 MB; ~0.46 MB / ~0.52 MB (32.8 s x 112 kbps ogg, x 128 kbps mp3) | not stated (about 30 s; a crossfade loop is needed) | Manual pick | n/a | Synthesized eerie howling wind, tagged for horror and haunted houses; clean, no birds or traffic. Original over 5 MB, converted file well under. |
| freesound-tomhannen-howling-wind-tower | wind | [png](07-sound/freesound-tomhannen-howling-wind-tower.png) | https://freesound.org/people/tomhannen/sounds/486599/ | [tomhannen](https://freesound.org/people/tomhannen/) | Creative Commons 0, https://creativecommons.org/publicdomain/zero/1.0/ | 0:31.1 | M4A, 48 kHz, 64 kbps, stereo | 245.4 KB; ~0.44 MB / ~0.50 MB (31.1 s x 112 kbps ogg, x 128 kbps mp3; the source is already low bitrate, so a mono encode would be half that) | not stated (a crossfade loop is needed) | Manual pick | n/a | Real recording of wind howling in a tower window; the natural counterpart to the synthesized option. |

Category 7 notes: rejected were the voice-based "Dark Voice Drone" series by kkenny101, ibrizie iron gate files (wind and cars in the background, not an open/close), a 10-minute "Wind.wav" (too long to convert under budget), and a Lifepak 12 defibrillator grab (includes voice prompts). Trimming order if ever needed: the thegreatperson pack (swap rather than cut, since it leaves ECG flatline with one candidate), or the sidequesting loop (ECG beep keeps two).

## Category 8: horror dressing

Round 2, added at the user's request. Sub_Items: human skull and bones, body bag, morgue drawer or cold chamber, rusty chains and hooks, leather restraint straps, blood splatter, bloody handprint, drag-mark decal, cobwebs, rotten cloth or sheet, blank headstone in three states (intact, cracked, broken). Exactly 2 Candidates per Sub_Item, no Fallbacks, except where a gap is stated. The 35/38 cap does NOT apply to Category 8 (user-requested round, Req 25.6); its candidates are counted separately in Totals.

Rules applied: no real remains (skulls are a sculpt and a scan of a plastic teaching replica), decals are CC0 only, headstones have a blank face with no readable inscription. Nothing was downloaded and no login was used. Every license was read on the candidate's own page.

Size basis (unverified): Meshopt geometry at about 14 bytes per vertex plus about 0.5 MB for one 1k WebP set (about 1 MB where the model has 5 to 9 textures). Sketchfab archive sizes are not public without login, so all Sketchfab estimates are computed from vertex counts. Poly Haven, ambientCG and OpenGameArt sizes come from the file lists or page figures and are also estimates of the converted web file. Every estimate is under 5 MB. Sketchfab license label: "CC Attribution", https://creativecommons.org/licenses/by/4.0/ (CC BY 4.0). All Sketchfab rows are Manual picks.

Previews: Sketchfab pages were captured with the viewer (12 to 15 s wait); the viewer backgrounds (grey, dark red, blue) belong to the authors and will not appear in the scene. Night-read ratings are judgements from preview pages, not render tests.

Honest limits of this round (read before picking):

- Sources were not searched page by page everywhere. Sketchfab was searched through its public search API (metadata only); Poly Haven and ambientCG were checked through their APIs. Kenney, Quaternius and most of OpenGameArt were not searched page by page.
- File size estimates are unverified.
- Mr.Nein tombstone sets are hand-textured (painted look), not scanned.
- The emarshall cobweb page describes the pack as "stylised" (the alpha texture itself looks photographic).
- The Proop studio account (butcher's hook) publishes many horror props; check its other uploads are not AI-assisted before picking.

### Human skull and bones

Gap: neither candidate has bones, only a skull. Loose bone models found were CT scans or specimen scans of real people, rejected under Req 25.3. The "Bones" pack by Joshua Fox (https://sketchfab.com/3d-models/bones-925518d5d7ef4c7c94aa89c4b57ab394, CC BY, 29.7K faces, 15 textures, "made for a team project") was left out because the page does not say whether it is a sculpt or a scan of real bones. It is an option for the bones half only if you want it checked first.

| Name | Sub_Item | Preview | Source URL | Author | License | File size (estimate, basis) | Poly count | PBR maps | Resolutions | Manual pick | Night-read | Night-read reason | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sketchfab-human-skull-danieledefilippis | human skull and bones (skull only) | [png](08-horror-dressing/sketchfab-human-skull-danieledefilippis.png) | https://sketchfab.com/3d-models/human-skull-0f46e7f845a145208e4922e94cd0c1b6 | [danieledefilippis](https://sketchfab.com/danieledefilippis) | CC Attribution (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ | ~0.7 MB (14.9K verts x 14 B = 0.21 MB + 0.5 MB 1k WebP; source archive 34.5 MB with 4k textures) | 29.6K faces | 5 textures (PBR set per page, 4k) | 4k source, resize to 1k | Manual pick | 2 | Hand-sculpted, plausible aged bone with a glossy, wet-looking sheen; the albedo is pale cream so it will glow in the flashlight pool unless darkened or dirtied, but the deep sockets and teeth give a strong silhouette in the moon rim. | ORIGINAL SCULPT: description says "Handculpted in ZBrush as anatomy practice", so no real remains. Skull only, no bones. Provenance: no flag, the author states it is their own sculpt. |
| sketchfab-human-skull-plastic-model | human skull and bones (skull only) | [png](08-horror-dressing/sketchfab-human-skull-plastic-model.png) | https://sketchfab.com/3d-models/human-skull-model-plastic-017c6f4a760f40a0a03de8fae29b306b | [FFT_kedar](https://sketchfab.com/FFT_kedar) | CC Attribution (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ | ~0.6 MB (7.3K verts x 14 B = 0.10 MB + 0.5 MB 1k WebP; source archive 24.4 MB) | 14.6K faces | 4 textures (baked, from a scan) | resize to 1k | Manual pick | 2 | Photoscan colour with orange-brown staining and a visibly plastic glossy finish; mid-bright yellowish albedo, so it needs darkening and dirt to sit in a near-black crypt, but the staining gives a lived-in look. | SCAN OF A PLASTIC TEACHING REPLICA ("Anatomical Human Skull Models For Teaching"), retopologised and baked. Not a real skull. Skull only, no bones. Provenance: no flag. |

### Body bag

| Name | Sub_Item | Preview | Source URL | Author | License | File size (estimate, basis) | Poly count | PBR maps | Resolutions | Manual pick | Night-read | Night-read reason | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sketchfab-smartinius-body-bag | body bag | [png](08-horror-dressing/sketchfab-smartinius-body-bag.png) | https://sketchfab.com/3d-models/smartinius-body-bag-3d-asset-48d33832605545828f8297b64ddf599d | [smartinius](https://sketchfab.com/smartinius) | CC Attribution (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ | ~0.65 MB (10.7K verts x 14 B = 0.15 MB + 0.5 MB 1k WebP) | 20.5K faces | 4 textures, tagged pbr (page shows no pbr type flag) | not stated | Manual pick | 3 | Near-black glossy plastic with soft folds; very low albedo, and the specular streaks catch a surgical lamp or moon rim without lighting the room. | Realistic sculpted folds and zip seam, shown as five bags of different body sizes (pick one in the file). No body inside is modelled. Provenance: no flag. |
| sketchfab-body-bag-surgical-table | body bag | [png](08-horror-dressing/sketchfab-body-bag-surgical-table.png) | https://sketchfab.com/3d-models/body-bag-surgical-table-12-mb-5e8ffc65c2d645eab4df67fd5c9955b2 | [Mehdi Shahsavan (ahmagh2e)](https://sketchfab.com/ahmagh2e) | CC Attribution (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ | ~1.0 MB (3.0K verts x 14 B = 0.04 MB + about 1 MB for 8 textures at 1k WebP) | 5.7K faces | PBR (metalness), 8 textures, 2 materials | not stated | Manual pick | 2 | The dark grey bag with red zipper is fine, but the pack also holds a bright white table covered in saturated red blood, which would glow under the lamp; the bag has a printed "body bag" label that looks cartoonish. | CAVEAT: the red-blood table in the pack must be deleted (or darkened) before use; the bag can be extracted alone. Small and cheap. Provenance: no flag. |

### Morgue drawer or cold chamber

| Name | Sub_Item | Preview | Source URL | Author | License | File size (estimate, basis) | Poly count | PBR maps | Resolutions | Manual pick | Night-read | Night-read reason | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sketchfab-morgue-refrigerator-porteous | morgue drawer or cold chamber | [png](08-horror-dressing/sketchfab-morgue-refrigerator-porteous.png) | https://sketchfab.com/3d-models/morgue-refrigerator-d895d249fbda465faa22958ab1a63158 | [RyanPorteous](https://sketchfab.com/RyanPorteous) | CC Attribution (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ ("please give me credit" in the description) | ~0.8 MB (19.8K verts x 14 B = 0.28 MB + 0.5 MB 1k WebP; source archive 2.3 MB) | 51.2K faces (decimate to about 30K) | PBR (metalness), 3 textures, 5 materials | not stated | Manual pick | 3 | Worn blue-grey steel with chrome latches and mirror-like doors; the worn-steel look of the lab reference, and the reflective latches catch a single lamp pool. | Nine-door cooler (3 x 3) with sliding trays, made for the author's horror game. The bright reflection in the doors comes from the viewer environment and will not appear in the scene. Provenance: no flag. |
| sketchfab-morgue-refrigerator-12mb | morgue drawer or cold chamber | [png](08-horror-dressing/sketchfab-morgue-refrigerator-12mb.png) | https://sketchfab.com/3d-models/morgue-refrigerator-12mb-3d582d8eabed42619ace30ab639c6e66 | [Mehdi Shahsavan (ahmagh2e)](https://sketchfab.com/ahmagh2e) | CC Attribution (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ | ~1.2 MB (15.2K verts x 14 B = 0.21 MB + about 1 MB for 8 textures at 1k WebP; source archive 5.4 MB) | 26.4K faces | PBR (metalness), 8 textures, 2 materials | not stated | Manual pick | 2 | Near-black doors on a 12-door unit with one open tray, very low albedo, but the dark fronts lose all detail in a dark scene and only the open tray catches light. | A 3 x 4 cabinet with one open slide-out tray, which fits "drawer" better than sealed doors. The scene also contains an unrelated flat black panel to delete. Provenance: no flag. |

### Rusty chains and hooks

| Name | Sub_Item | Preview | Source URL | Author | License | File size (estimate, basis) | Poly count | PBR maps | Resolutions | Manual pick | Night-read | Night-read reason | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sketchfab-rusty-chains-amanda98 | rusty chains | [png](08-horror-dressing/sketchfab-rusty-chains-amanda98.png) | https://sketchfab.com/3d-models/rusty-chains-be9648f8e0324bbd967c10b44007bee1 | [amanda_98](https://sketchfab.com/amanda_98) | CC Attribution (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ | ~1.4 MB (28.8K verts x 14 B = 0.40 MB + ~1 MB for 5 textures at 1k WebP) | 57.6K faces (decimate to about 25K) | PBR (metalness), 5 textures, 1 material | not stated | Manual pick | 2 | Orange-red rust over grey steel with real mottling; the orange rust is fairly saturated and will read warm in the flashlight pool and flat in the cold moon rim unless desaturated. | Loose tangled chain to drape over the table or hang from a tombstone. "Modelled on Blender 2.8. Textured on Substance Painter". No hook in this model, so pair it with the hook below. Provenance: no flag. |
| sketchfab-butchers-hook-chain-proop | chains and hooks | [png](08-horror-dressing/sketchfab-butchers-hook-chain-proop.png) | https://sketchfab.com/3d-models/butchers-hook-chain-proop-24a906f1992743ac900679d9d4adf9f0 | [ALTEREGO (v.a.c.u.u.m.)](https://sketchfab.com/v.a.c.u.u.m.) | CC Attribution (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ | ~1.0 MB (38.9K verts x 14 B = 0.54 MB + 0.5 MB 1k WebP) | 77.9K faces (decimate to about 20K) | 1 texture, page shows no PBR type flag | not stated | Manual pick | 3 | Dark pitted grey steel with thin chain links; low albedo and a hanging silhouette that catches a lamp pool as a few bright specular glints. | A butcher's hook on a short chain with a top ring, for hanging from the lab ceiling. CAVEAT: the author is a studio account (Proop) that publishes many horror props; check its other uploads are not AI-assisted before picking. No AI tag on this model. |

### Leather restraint straps

Gap: no photoreal asylum gurney strap or true leather limb restraint was found. Both candidates are neutral belt and webbing pieces that can be set on a table as patient straps. Many strap, collar and harness models were skipped as fashion or adult-themed.

| Name | Sub_Item | Preview | Source URL | Author | License | File size (estimate, basis) | Poly count | PBR maps | Resolutions | Manual pick | Night-read | Night-read reason | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sketchfab-leather-belt-cuv | leather strap | [png](08-horror-dressing/sketchfab-leather-belt-cuv.png) | https://sketchfab.com/3d-models/leather-belt-78b2b486c65e4fc59498bc17038eef78 | [C.U.V](https://sketchfab.com/C.U.V) | CC Attribution (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ | ~1.5 MB (32.9K verts x 14 B = 0.46 MB + ~1 MB for 9 textures at 1k WebP) | 65.3K faces (decimate to about 20K) | PBR (metalness), 9 textures, 2 materials | not stated | Manual pick | 2 | Dark brown-black leather is ideal near-black albedo, but the buckle is shiny near-white chrome and will bloom in the lamp pool; it needs a darker, rusted metal material. | An ordinary belt (description: "Ordinary leather belt"), not an asylum strap; reads as a worn leather strap once the buckle is aged. Provenance: no flag. |
| sketchfab-strap-buckles-kit-dmigul | restraint straps | [png](08-horror-dressing/sketchfab-strap-buckles-kit-dmigul.png) | https://sketchfab.com/3d-models/strap-buckles-kit-86c045c8ba854e0da825ac8324495b28 | [dmigul](https://sketchfab.com/dmigul) | CC Attribution (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ | ~1.1 MB (8.7K verts x 14 B = 0.12 MB + ~1 MB for 8 textures at 1k WebP) | 17.0K faces | PBR (metalness), 8 textures, 2 materials | not stated | Manual pick | 3 | Matte black woven webbing with plastic buckles, very low albedo; almost invisible in shadow but a fine fabric texture and buckle edges show in a single lamp pool. | Webbing straps with side-release and slide buckles in many lengths; reads as stretcher or patient straps, no adult framing. Neutral webbing, not a photoreal asylum strap. "Modeled from physical reference in Blender", tag `noai`. Provenance: no flag. |

### Blood splatter

| Name | Sub_Item | Preview | Source URL | Author | License | File size (estimate, basis) | Poly count | PBR maps | Resolutions | Manual pick | Night-read | Night-read reason | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| oga-blood-splatter-exilegl | blood splatter | [png](08-horror-dressing/oga-blood-splatter-exilegl.png) | https://opengameart.org/content/blood-splatter | [ExileGL](https://opengameart.org/users/exilegl) | CC0, http://creativecommons.org/publicdomain/zero/1.0/ | ~0.3 MB (source blood.png is 2.6 MB at 1600x1200; 1k WebP with alpha) | n/a (texture) | Color with alpha only (no normal, roughness) | 1600x1200 | no | 3 | Fine dark-red to near-black droplets and speckle, low saturation and no bright highlights, so it reads as dried spray on stone without glowing in the dark. | A wide field of speckle for drei Decal; crop it into several small patches. Provenance: tags "blood, splatter, effect, high resolution", no AI mention. |
| oga-blood-splat-tobiasm | blood splatter | [png](08-horror-dressing/oga-blood-splat-tobiasm.png) | https://opengameart.org/content/blood-splat | [TobiasM](https://opengameart.org/users/tobiasm) | CC0, http://creativecommons.org/publicdomain/zero/1.0/ | ~0.04 MB (source blood_splat.png 87.9 KB at 256x256) | n/a (texture) | Color with alpha only | 256x256 | no | 2 | A single radial burst with soft edges and brighter saturated red cores; 256 px is soft at close range and the red is brighter than the graveyard palette unless darkened. | Single hit-splat sprite for one decal on a wall or floor. Attribution not required but appreciated. Provenance: author gives a name and a social link, no AI mention. |

### Bloody handprint

**No suitable candidate found.** Searched: OpenGameArt (keyword search for "handprint" returned nothing; web searches for hand, handprint, blood hand, smear), ambientCG (all 127 Decal assets listed through the API: none is blood or a handprint), Poly Haven (no blood or decal textures), itch.io and web search. Rejected on the way: "PSX Decals Free" by heyheythere (CC BY and AI-assisted), "Blood Splatter Decal Pack" by Strideh (paid, restricted), "Splatter pack" by johndh (CC BY 3.0), "Blood Effect Sprite Sheet" (derived from CC BY 3.0), "Blood Splatters" by AntumDeluge (CC0 but 32x32 px), "140+ Liquid Textures" (tiling surfaces, not decals). Rotating a splatter does not make a handprint.

Suggested fallback (a suggestion only, NOT created): a procedural handprint and smear generator in `tools/` (canvas or Python: stamp a hand silhouette from a simple vector path, blur the edges, add drip streaks, output a 512 px alpha PNG in dark wet red). It would be our own work, which `asset-licensing.md` allows. Needs your decision.

### Drag-mark (smear)

Gap: no true blood drag or smear decal exists under CC0 in the places searched. The two below are the closest CC0 options: ambientCG "Leaking" decals (smear and streak tags, opacity map). They are grey-green moisture stains, not blood, and need a red tint in the shader (multiply with dark red, about 0.3 to 0.4 value). Both are weak fits and stand-ins until you decide on the own-work fallback (a procedural smear in `tools/`, not created).

| Name | Sub_Item | Preview | Source URL | Author | License | File size (estimate, basis) | Poly count | PBR maps | Resolutions | Manual pick | Night-read | Night-read reason | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ambientcg-leaking004 | drag-mark (smear) | [png](08-horror-dressing/ambientcg-leaking004.png) | https://ambientcg.com/view?id=Leaking004 | [ambientCG (Lennart Demes)](https://ambientcg.com) | CC0, https://docs.ambientcg.com/license/ | ~0.4 MB color + opacity at 1k WebP (1K-JPG zip is 4 MB with all maps, from the API) | n/a (texture) | Color, Displacement, Normal, Roughness, Opacity; Decal type | 1K to 8K (JPG and PNG) | no | 1 | Green-grey moss tint and pale streaks, no red at all; after re-tinting the long vertical streaks read as a wet smear, but the mossy mottling stays visible and the pale parts glow in the lamp pool. | Tags "smear, smudge, streaks, wet", with a ready opacity map for drei Decal. Streaks run down from a solid top edge (a smear down a wall or tombstone). CAVEAT: grey-green leaking decal, needs a red tint. |
| ambientcg-leaking001 | drag-mark (smear) | [png](08-horror-dressing/ambientcg-leaking001.png) | https://ambientcg.com/view?id=Leaking001 | [ambientCG (Lennart Demes)](https://ambientcg.com) | CC0, https://docs.ambientcg.com/license/ | ~0.4 MB color + opacity at 1k WebP (1K-JPG zip is 4 MB with all maps) | n/a (texture) | Color, Opacity and the other Decal-type PBR maps (map list read from the API for 004 only) | 1K to 8K (JPG and PNG) | no | 2 | Greyer and less green than Leaking004, soft streaks with a transparent fade at the bottom; once darkened to a wet red-brown it is low contrast and subtle in the near-black scene. | Same family, lighter and more grey; the pair gives two shapes of drip or drag. CAVEAT: grey leaking decal, needs a red tint. |

### Cobwebs

Both are alpha-card models (flat cards, 127 to 286 vertices) with a cobweb alpha texture; place cards in corners, over tombstones and in lab corners with an alpha material.

| Name | Sub_Item | Preview | Source URL | Author | License | File size (estimate, basis) | Poly count | PBR maps | Resolutions | Manual pick | Night-read | Night-read reason | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sketchfab-cobwebs-asset-pack-emarshall | cobwebs (model with alpha cards) | [png](08-horror-dressing/sketchfab-cobwebs-asset-pack-emarshall.png) | https://sketchfab.com/3d-models/cobwebs-asset-pack-2dd4798676d84bc7af5d2a8f5834563a | [Em Marshall (emarshall)](https://sketchfab.com/emarshall) | CC Attribution (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ | ~0.6 MB (286 verts, negligible; 6 textures at 1k WebP with alpha about 0.6 MB) | 419 faces | 6 textures, 3 materials, alpha | not stated | Manual pick | 3 | Sharp white strands with fine radial detail on transparent cards; a few bright lines against black read clearly in a lamp pool and cold moon rim without lighting the room. | About 11 varied web shapes (corner, funnel, radial) in one file. CAVEAT: the page text says "Simple, stylised cobwebs", although the alpha looks photographic. Provenance: no flag. |
| sketchfab-cobwebs-bumstrum | cobwebs (model with alpha cards) | [png](08-horror-dressing/sketchfab-cobwebs-bumstrum.png) | https://sketchfab.com/3d-models/cobwebs-941c92fcf27b44caafbf6d690ba9593f | [DJMaesen (bumstrum)](https://sketchfab.com/bumstrum) | CC Attribution (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ | ~0.5 MB (127 verts, negligible; 1 texture at 1k WebP about 0.5 MB) | 163 faces | 1 texture (alpha), no PBR | not stated | Manual pick | 2 | Softer, blurrier strands with a dusty glow; low contrast, so it is lost in a near-black scene unless lit directly, but it looks like dense old dust webs. | Seven web cards in one file; description is only "low poly cobwebs", tag `spiderweb`, texture is a soft photo-like web. Provenance: no flag. |

### Rotten cloth or sheet

Both are CC0 PBR fabric textures from Poly Haven (processing Rico Cilliers, photography colormass), script-fetchable. Neither is rotten as shipped: apply to a plane or a draped cloth mesh, darken the albedo (multiply to about 0.15 to 0.3) and add stain and tear alpha in the decay shader.

| Name | Sub_Item | Preview | Source URL | Author | License | File size (estimate, basis) | Poly count | PBR maps | Resolutions | Manual pick | Night-read | Night-read reason | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| polyhaven-hessian-230 | rotten cloth (sackcloth) | [png](08-horror-dressing/polyhaven-hessian-230.png) | https://polyhaven.com/a/hessian_230 | [Rico Cilliers and colormass](https://polyhaven.com/a/hessian_230) | CC0, https://polyhaven.com/license | ~1.2 MB (API 1k JPG diffuse 1.06 MB; WebP diffuse + normal + ARM at 1k) | n/a (texture) | diffuse, normal, ARM, displacement, AO, roughness | 1k to 8k (use 1k) | no | 3 | Open-weave brown burlap with strong holes and fold depth; mid-low albedo and a coarse weave that shows in raking light. | Burlap with holes already looks torn and old; best fit for a body shroud. CAVEAT: not rotten as shipped, needs decay-shader staining. |
| polyhaven-rough-linen | rotten cloth or sheet (linen) | [png](08-horror-dressing/polyhaven-rough-linen.png) | https://polyhaven.com/a/rough_linen | [Rico Cilliers and colormass](https://polyhaven.com/a/rough_linen) | CC0, https://polyhaven.com/license | ~1.1 MB (API 1k JPG diffuse 0.84 MB; WebP diffuse + normal + ARM at 1k) | n/a (texture) | diffuse, normal, ARM, displacement, AO, roughness | 1k to 8k (use 1k) | no | 2 | Pale blue-grey linen; reads clean, and the high albedo would glow in the lamp unless darkened and stained, though the fine weave suits a mortuary sheet. | Closest to a hospital or morgue sheet. CAVEAT: clean as shipped, needs decay-shader staining. |

### Blank headstones: intact, cracked, broken

Extra columns for headstones: State, Source triangles (Poly count column), Decimation needed to reach at most 20,000 triangles, Blank face, Silhouette readability. All five photo/hand-made stones are under 20,000 triangles except sketchfab-small-destroyed-tombstone-04 (100K, decimate 5x). Triangle counts are the "Triangles" figure on each page. Honest summary: the best match is the pair of photoscans by drydoctoregg (same author, same capture session, Edinburgh): Small Gravestone (intact) and Damaged Tombstone (broken). No second set covers all three states. The cracked state has one stylised candidate and one loose fit, so it is only partly filled. Viewer backgrounds will not appear in the scene.

**Intact**

| Name | Sub_Item | State | Preview | Source URL | Author | License | File size (estimate, basis) | Poly count (source tris) | Decimation to <= 20,000 | Blank face | Silhouette readability | PBR maps | Resolutions | Manual pick | Night-read | Night-read reason | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sketchfab-small-gravestone-drydoctoregg | blank headstone intact | intact | [png](08-horror-dressing/sketchfab-small-gravestone-drydoctoregg.png) | https://sketchfab.com/3d-models/small-gravestone-a6b9ef8756bf453e9d8b22a40d1e905a | [Peter Tilley (drydoctoregg)](https://sketchfab.com/drydoctoregg) | CC Attribution (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ | ~0.5 MB (202 verts x 14 B = 3 KB + 0.5 MB 1k WebP) | 378 | no | yes, plain pitted face, no inscription ("identifying names have been removed") | Strong: pointed-arch rounded top, full outline, small base block | not stated on page (Substance Painter textures) | not stated | Manual pick | 3 | Mid-grey pitted stone with light lichen patches; albedo is a little bright and needs darkening (multiply to about 0.3), but the pitting catches a single warm flashlight well and the arched top rim-lights in cold moonlight. | Photogrammetry, retopologised to 378 tris, flat enough face for a decal. Same author and capture as the broken stone below. Provenance: no AI tag, Edinburgh capture. |
| sketchfab-tombstone-set-2-mr-nein | blank headstone intact | intact | [png](08-horror-dressing/sketchfab-tombstone-set-2-mr-nein.png) | https://sketchfab.com/3d-models/tombstone-set--2-255508642ddc414caf2da269af7a11f8 | [Mr.Nein](https://sketchfab.com/Mr.Nein) | CC Attribution (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ | ~0.55 MB (1.7K verts x 14 B = 24 KB + 0.5 MB; page says 4K texture, resize to 1k) | 3,400 (whole set of 10 stones; each stone a few hundred) | no | yes on the rounded slabs and the plain upright; the cross-topped stones carry no text | Strong: round-top slabs, flat-top slab, cross tops, clear outlines | 4K texture, uv packed, map types not stated | 4K (resize to 1k) | Manual pick | 2 | Dark grey mottled stone with correct low albedo, but the texture is a painted look rather than scanned pitting; flat faces take a decal well. | One file with about 10 blank stones; pick the round-top ones. CAVEAT: hand-textured, not photoreal (a style compromise). Set 1 (https://sketchfab.com/3d-models/tombstone-set--1-ac1b142c32274a6794cc3cde69672af1, 1.9K tris, same author and style, CC BY; preview [png](08-horror-dressing/sketchfab-tombstone-set-1-mr-nein.png)) is an equal alternative. No cracked or broken stones in either set. Provenance: no AI tag. |

**Cracked**

| Name | Sub_Item | State | Preview | Source URL | Author | License | File size (estimate, basis) | Poly count (source tris) | Decimation to <= 20,000 | Blank face | Silhouette readability | PBR maps | Resolutions | Manual pick | Night-read | Night-read reason | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sketchfab-cross-and-broken-gravestones-rbg | blank headstone cracked | cracked | [png](08-horror-dressing/sketchfab-cross-and-broken-gravestones-rbg.png) | https://sketchfab.com/3d-models/cross-and-broken-gravstones-409b154c632148508458f09a7ca3b493 | [RBG_illustrations](https://sketchfab.com/RBG_illustrations) | CC Attribution (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ | ~0.55 MB (3K verts x 14 B = 42 KB + 0.5 MB 1k WebP) | 5,900 (3 stones, about 2K each) | no | yes, no text on any of the three | Strong on the slab on the right (chipped corner, cracks through face and base); the two crosses are cracked but their outline is intact | not stated | not stated | Manual pick | 3 | Near-black stone with pale hairline cracks; the lowest albedo of all candidates and the cracks glint in a flashlight pool. | CAVEAT: the page says "created for the Stylized Graveyard", so it is stylised, not scanned (outside the photoreal-only rule). Use only the right slab. The cracks run across the face, so the decal must avoid them. Provenance: no flag. |
| sketchfab-small-destroyed-tombstone-04 (already a Category 3 pick for broken stones) | blank headstone cracked (marginal) | cracked | [png](08-horror-dressing/sketchfab-small-destroyed-tombstone-04-state-check.png) | https://sketchfab.com/3d-models/small-destroyed-tombstone-04-ba7786989b414adf91a5763e71e9854c | [archiwum_xyz](https://sketchfab.com/archiwum_xyz) | CC Attribution (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ | ~1.3 MB (54.6K verts x 14 B = 0.76 MB + 0.5 MB 1k WebP; page says 2 x 8192 textures) | 100,000 | yes, 100K to 20K (5x) | yes, a recessed blank panel with no text | Weak: a squat block with a chipped, worn top edge; reads as weathered more than cracked | baked color, likely normal | 8K (resize to 1k) | Manual pick | 2 | Heavy saturated green moss over dark stone; moss needs desaturating. Stone and pits read well. | LOOSE FIT for cracked. Photoscan (RealityCapture, 138 photos), tag noai. Listed because it is already a Category 3 pick. |

**Broken**

| Name | Sub_Item | State | Preview | Source URL | Author | License | File size (estimate, basis) | Poly count (source tris) | Decimation to <= 20,000 | Blank face | Silhouette readability | PBR maps | Resolutions | Manual pick | Night-read | Night-read reason | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sketchfab-damaged-tombstone-drydoctoregg | blank headstone broken | broken | [png](08-horror-dressing/sketchfab-damaged-tombstone-drydoctoregg.png) | https://sketchfab.com/3d-models/damaged-tombstone-0cefd7412d36424c844b64cca189aba5 | [Peter Tilley (drydoctoregg)](https://sketchfab.com/drydoctoregg) | CC Attribution (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ | ~0.5 MB (414 verts x 14 B = 6 KB + 0.5 MB 1k WebP) | 816 | no | yes, four plain flat faces on the shaft; only a faint carved band on the cornice (no text); "identifying names have been removed" | Strong: tall shaft whose cap is missing, with a hollow stepped top | not stated (Substance Painter) | not stated | Manual pick | 3 | Mid-grey granular stone with a weathered cornice; the missing top makes a distinctive dark notch against the moon rim. Darken albedo. | Photogrammetry, retopologised. Same author and capture as the intact Small Gravestone, so the style matches. The shaft is a tall obelisk pedestal rather than a round slab, so its proportions differ from the intact pick. |
| sketchfab-small-destroyed-tombstone-04 (already a Category 3 pick for broken stones) | blank headstone broken (marginal) | broken | [png](08-horror-dressing/sketchfab-small-destroyed-tombstone-04-state-check.png) | https://sketchfab.com/3d-models/small-destroyed-tombstone-04-ba7786989b414adf91a5763e71e9854c | [archiwum_xyz](https://sketchfab.com/archiwum_xyz) | CC Attribution (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ | ~1.3 MB (see above) | 100,000 | yes, 100K to 20K | yes (blank recessed panel) | Weak to medium: titled "destroyed", but the screenshot shows a mostly intact block with a mossy chipped top | baked color, likely normal | 8K (resize to 1k) | Manual pick | 2 | See the cracked row. | Second broken option. Fits only if viewed from an angle that shows the damaged top; check the model in the viewer before picking. |

Headstone gaps and fallbacks:

- Cracked has only one clear candidate and it is stylised. Suggested fallback (not created): crack or break the intact drydoctoregg scan (378 tris) in Blender as our own work (boolean or a displaced crack normal map; the same method gives a chipped top). Making all three states (full, cracked, top snapped off) from that one scan would give one consistent style and a flat decal face; the source is CC BY, so the credit stays.
- Decimation: only sketchfab-small-destroyed-tombstone-04 needs it (100K to 20K). All other candidates are far under 20,000 triangles.

Rejected headstones (Req 26.8):

- Unique Gravestone Scans (thats_cool_jack, https://sketchfab.com/3d-models/unique-gravestone-scans-0c46ee29b59a459fae3e2e821e28da17, CC BY): real 19th-century graves with legible text (a surname on the obelisk). Screenshot deleted.
- Implosion of a Tombstone (kwaredesign, CC BY): a mausoleum with a door, not a headstone, 87K tris. Screenshot deleted.
- Rejected from page metadata without opening: Badly broken family gravestone titanic victim (real person's grave), Gravestone of Thomas Buck / Renold Marvin (NoDerivs and real names), Gravestone of Deliverance Warner, Bonaventure Cemetery Tombstone Scans 1 and 2, Charles C. Imus Tombstone, Tombstone Familie Laurenz and Richter (real family graves), Old tombstone ottoman (inscriptions), Gravestone and Old Gravestone sv.stats (carved text), Tombstone Old Cemetery Freiburg and Gravestone of Fidel and Beatrix Rombach (Free Standard license, real names), Ottoman gravestone (NonCommercial), Gothic Tombstone umbravisio (AI-generated), and the many stylised or hand-painted packs.
- sketchfab-broken-headstone: rejected earlier by the user (legible text).

### Category 8 rejected while scouting, by Sub_Item

- Skull: CT or medical-imaging reconstructions (real people), museum specimen scans, scans of unstated origin, NonCommercial or NoDerivs skulls, animal skulls, stylised packs, a 682K-face fossil cast.
- Body bag: alienkatgames (CC BY-NC), "Corpse in a black body bag with ropes" (contains a corpse), very low-poly bags, handbags and luggage.
- Morgue: "Morgue Body Storage" (PS1 style), "Morgue Freezer" (92 faces), "Morgue Refrigerator. Dead - 16MB" (includes a body), whole-room scenes, paid listings.
- Chains, straps, cobwebs: NonCommercial or ShareAlike items (Hook & Chain Jacob, NHMW strap distributors, SUNLU3D Spider Web, Inside The Spider), Roadhog/Overwatch chain hook (game character), "Leather collar" (adult-themed framing), a straitjacket on a character, a 687K-face bandage, stylised or cartoon cobweb packs.
- Decals: see the handprint and drag-mark sections above.

Category 8 candidate count: 24 rows, 23 distinct (skulls 2, body bags 2, morgue 2, chains and hooks 2, straps 2, blood splatter 2, handprint 0, drag-mark 2, cobwebs 2, cloth 2, headstones 6 rows with sketchfab-small-destroyed-tombstone-04 listed twice). 22 of the 23 are new; sketchfab-small-destroyed-tombstone-04 is already counted in Category 3 and is a Category 3 pick.

## Category 9: lab and finale (round 3)

Round 3, added at the user's request. Sub_Items: knife switch (finale), heavy door (lab exit), lab wall texture, lab floor texture. Exactly 2 Candidates per Sub_Item, no Fallbacks. The 35/38 cap does NOT apply to Category 9 (Req 29.7); its candidates are counted separately in Totals. Nothing was downloaded and no login was used. Every license was read on the candidate's own page.

Size basis (unverified): Meshopt geometry at about 14 bytes per vertex plus about 0.5 MB per 1k WebP set (about 1 MB for several texture variants); Poly Haven rows are computed from the files API (.bin x 0.3 plus 1k JPG x 0.5). Sketchfab archive sizes are not public without login. Every estimate is under 5 MB. Sketchfab license label: "CC Attribution", http://creativecommons.org/licenses/by/4.0/ (CC BY 4.0). Night-read ratings are judgements from preview pages and albedo colour, not render tests. Sketchfab viewer backgrounds belong to the authors and will not appear in the scene. Some Poly Haven captures show a Chinese-language popup from the site and author avatar photos; neither is part of the asset. Lab reference for night-read: a single cool lamp pool, a pitch-black crypt, worn steel with copper and brass highlights, a wet dark stone floor.

Caveats (read before picking):

- Knife switch: neither Mad Lobster model is rigged. Both show open and closed poses, so the handle is probably modelled in each pose. Whether handle and blade are separate nodes is NOT verified; expect to split the handle and blade from the base in Blender after download. Avoid the red and yellow-striped variants (too bright for a pitch-black crypt); use the grey.
- Heavy door: polyhaven-large-castle-door has separate leaves (glTF nodes `large_castle_door_frame`, `large_castle_door_right`, `large_castle_door_left`, verified in the 1k gltf), so each leaf can swing. sketchfab-iron-door-olkaad is one fused scan including the frame, so it needs cutting in Blender, and the back of the door is likely baked or missing.
- Lab wall: polyhaven-castle-brick-07 is orange-red and mid-bright; it needs an albedo multiply of about 0.4 and desaturation.
- Lab floor: polyhaven-slate-floor-02 is too warm and bright for a cool-lit black crypt and would compete with the lantern; usable only with a heavy albedo multiply.
- Sources were not searched page by page everywhere: Sketchfab through its public search API (downloadable only; queries: knife switch, frankenstein lever, big switch lever laboratory, large lever switch industrial, electrical lever switch vintage, old heavy door, dungeon iron door scan), Poly Haven through its API. ambientCG, Kenney, Quaternius (stylised, excluded) and OpenGameArt were not searched page by page.
- Spares seen but not opened on their pages, not counted as candidates: CurlyFryWhy "Heavy Metal Door / Submarine Door" and "Photoreal Heavy Steel Door" (steel, not the wood and iron crypt style); walls `castle_brick_broken_06`, `medieval_blocks_02`, `stone_wall_04`; floors `slate_floor_03`, `cobblestone_floor_09`, `mossy_cobblestone`.

### Knife switch

| Name | Sub_Item | Preview | Source URL | Author | License | File size (estimate, basis) | Poly count | PBR maps | Resolutions | Manual pick | Night-read | Night-read reason | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sketchfab-knife-switch-type-c | Knife switch | [png](09-round-3/sketchfab-knife-switch-type-c.png) | https://sketchfab.com/3d-models/early-1900s-knife-switches-type-c-033dd717e4b04e46b6da85195085b8f3 | [Mad_Lobster_Workshop](https://sketchfab.com/Mad_Lobster_Workshop) | CC Attribution (CC BY 4.0), http://creativecommons.org/licenses/by/4.0/ | ~1.4 MB (unverified; 27,176 verts x ~14 B = 0.4 MB + ~1 MB 1k WebP for texture variants) | 51,712 faces | PBR-textured per page and preview (maps not listed; check after download) | not stated (Blender, Substance-style textures; resize to 1k) | Yes | 3 | Dark slate base with worn brass blades and contacts and a black wooden handle: the brass catches a single cool lamp and reads against black; a red variant exists to avoid (use the grey). | Double-bladed early-1900s knife switch, open and closed pose included, "not rigged, but easy to animate". Handle/blade are posed as separate parts in the open and closed models (visible in the preview); whether they are separate nodes/meshes is NOT verified, so it may need splitting in Blender. |
| sketchfab-knife-switch-type-d | Knife switch | [png](09-round-3/sketchfab-knife-switch-type-d.png) | https://sketchfab.com/3d-models/early-1900s-knife-switches-type-d-dba93ad080ee4f8ca922e0df84ec9b4b | [Mad_Lobster_Workshop](https://sketchfab.com/Mad_Lobster_Workshop) | CC Attribution (CC BY 4.0), http://creativecommons.org/licenses/by/4.0/ | ~1.2 MB (unverified; 11,775 verts x ~14 B = 0.17 MB + ~1 MB 1k WebP for variants) | 22,656 faces | PBR-textured per page and preview (maps not listed; check after download) | not stated (resize to 1k) | Yes | 3 | Black slate panel, dark handle, copper/brass blade straps: matches worn steel with copper/brass highlights; grey variant is darkest. Red and yellow-striped variants are too bright for a pitch-black crypt. | Single-bladed, tall black handle makes a clear "pull the switch" silhouette; lighter than Type C. Open and closed pose shown (handle tilts with the blade bridge); "not rigged". Handle separate node: NOT verified, likely a separate part per pose, may need splitting. |

### Heavy door

| Name | Sub_Item | Preview | Source URL | Author | License | File size (estimate, basis) | Poly count | PBR maps | Resolutions | Manual pick | Night-read | Night-read reason | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| polyhaven-large-castle-door | Heavy door | [png](09-round-3/polyhaven-large-castle-door.png) | https://polyhaven.com/a/large_castle_door | [Tina](https://polyhaven.com/all?a=Tina) | CC0, https://polyhaven.com/license | ~1.6 MB (.bin 0.42 MB x 0.3 + 1k JPG diffuse 0.80 + normal 1.02 + ARM 1.02 MB x 0.5) | 12,640 tris (page: 13K) | diffuse, normal (GL), ARM | 1k, 2k, 4k (download shown 4K) | No (Poly Haven, fetchable by script) | 2 | Weathered mid-brown wood with black iron straps and rivets; matte and warm brown, so it needs a dim lamp to avoid looking lit; iron straps give the dark edge. | Arched medieval double wooden door, 3 m tall. Frame and leaves ARE separate: glTF nodes `large_castle_door_frame`, `large_castle_door_right`, `large_castle_door_left` (verified in the 1k gltf), so each leaf can swing. Clean game-ready mesh; CC0. |
| sketchfab-iron-door-olkaad | Heavy door | [png](09-round-3/sketchfab-iron-door-olkaad.png) | https://sketchfab.com/3d-models/iron-door-e8d18cc2db694241b16a083e6632c8ba | [olkaad](https://sketchfab.com/olkaad) | CC Attribution (CC BY 4.0), http://creativecommons.org/licenses/by/4.0/ | ~0.7 MB (unverified; 10,964 verts x ~14 B = 0.15 MB + 0.5 MB 1k WebP) | 20,000 faces | baked color (photoscan, no separate PBR maps stated) | not stated (resize to 1k) | Yes | 3 | Very dark brown timber with rusty iron bands, near-black overall: reads as a heavy door lit by a cool lamp and disappears into a black crypt wall. | Photoscan of a hand-built iron-and-wood double door from Old Nicosia, tagged noai, photoreal. Leaf is NOT separate from the frame: it is one scanned mesh including the frame, so it would need cutting in Blender (and the back of the door is likely baked or missing). Provenance: real scan of a building door in a venue, no people or branding visible. |

### Lab wall texture

All lab wall and floor sets are Poly Haven and fetchable by the script (Manual pick: No). All four provide PBR maps: color, normal (GL and DX), roughness, AO, displacement and ARM; the planned 1k set ships as color + normal (GL) + ARM. Separate AO, roughness and displacement maps add about 1.1 to 1.9 MB of JPG per set before WebP.

| Name | Sub_Item | Preview | Source URL | Author | License | File size (estimate, basis) | PBR maps | Resolutions | Manual pick | Night-read | Night-read reason | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| polyhaven-dark-brick-wall | Lab wall | [png](09-round-3/polyhaven-dark-brick-wall.png) | https://polyhaven.com/a/dark_brick_wall | Dario Barresi (processing), Dimitrios Savva (photography) | CC0, https://polyhaven.com/license | ~1.55 MB (1k JPG color 0.92 + normal 1.33 + ARM 0.86 = 3.11 MB x 0.5) | color, normal (GL and DX), roughness, AO, displacement, ARM | 1k, 2k, 4k, 8k | No (Poly Haven, fetchable by script) | 3 | Near-black charcoal bricks with pale mortar lines; rough and matte. Mortar is the only bright part and will fall into black outside the lamp pool; reads as a pitch-black crypt wall. | Brick running bond, rough and uneven (tags rough, uneven, dark), 1 m tall tile, so it needs tiling. Dark albedo matches the "dark, rough walls" preference. |
| polyhaven-castle-brick-07 | Lab wall | [png](09-round-3/polyhaven-castle-brick-07.png) | https://polyhaven.com/a/castle_brick_07 | Rob Tuytel | CC0, https://polyhaven.com/license | ~0.96 MB (1k JPG color 0.66 + normal 1.00 + ARM 0.27 = 1.93 MB x 0.5) | color, normal (GL and DX), roughness, AO, displacement, ARM, rough_ao | 1k, 2k, 4k, 8k | No (Poly Haven, fetchable by script) | 2 | Old brick with gaps and loose bricks, but the albedo is orange-red and mid-bright; under a cool lamp it looks rusty and busy. Needs an albedo multiply of about 0.4 and desaturation to sit in a black crypt. | Strongest relief (damaged, loose bricks, deep gaps) so a lamp pool rakes across it well; castle/old look. Indoor or outdoor, 2.5 m wide tile. |

### Lab floor texture

| Name | Sub_Item | Preview | Source URL | Author | License | File size (estimate, basis) | PBR maps | Resolutions | Manual pick | Night-read | Night-read reason | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| polyhaven-slate-floor | Lab floor | [png](09-round-3/polyhaven-slate-floor.png) | https://polyhaven.com/a/slate_floor | Dimitrios Savva | CC0, https://polyhaven.com/license | ~1.24 MB (1k JPG color 0.71 + normal 0.81 + ARM 0.97 = 2.49 MB x 0.5) | color, normal (GL and DX), roughness, AO, displacement, ARM | 1k, 2k, 4k, 8k | No (Poly Haven, fetchable by script) | 3 | Very dark purple-black slate slabs with pale cracks between them; tagged shiny, coated, polished, reflective. The roughness map (0.80 MB at 1k JPG, large detail) should give the wet sheen variation under one cool lamp. | Matches "wet dark stone floor with reflections" best: dark albedo, polished/coated by tag, 2.3 m tile with irregular flagstones. |
| polyhaven-slate-floor-02 | Lab floor | [png](09-round-3/polyhaven-slate-floor-02.png) | https://polyhaven.com/a/slate_floor_02 | Dimitrios Savva | CC0, https://polyhaven.com/license | ~0.80 MB (1k JPG color 0.61 + normal 0.34 + ARM 0.65 = 1.60 MB x 0.5) | color, normal (GL and DX), roughness, AO, displacement, ARM | 1k, 2k, 4k, 8k | No (Poly Haven, fetchable by script) | 1 | Warm brown/orange worn slate with beige grout; much too bright and warm for a cool-lit black crypt, would compete with the lantern. Usable only with a heavy albedo multiply. | Old weathered stone floor with the lightest download; worn and rustic (tags old, weathered, worn). Weaker fit than slate_floor and listed as the second candidate for comparison. |

Category 9 rejected while scouting: Sketchfab "Switch knife" and other pocket knives (weapons, not switches); "Simple Industrial ON/OFF Switch" (Free Standard license, 196 faces); Poly Haven `power_box_01` (modern breaker box, not a lever); NonCommercial or NoDerivs doors ("Wooden Door - Vintage" by olkaad, "Traditional Door - Medina of Tunis"); AI-tagged ("createdwithai") props by Unreal_Joelab; "Old Medieval Church Door" (3DHelga, 108k faces, too heavy); lidar scans by ffedo (160k to 425k faces).

Category 9 candidate count: 8 rows, 8 distinct (knife switch 2, heavy door 2, lab wall 2, lab floor 2), 0 Fallbacks, outside the 35/38 cap.

## Category 10: sounds (round 3)

Round 3, added at the user's request. Sub_Items: jump-scare sting, digging in dirt, shambling footsteps, cloth rustle, electrical hum before a zap, crows (optional). 12 rows, 12 distinct sounds, all Freesound, 2 per Sub_Item. The 35/38 cap does NOT apply to Category 10 (Req 29.7); counted separately in Totals. Every row is a Manual pick (Freesound login needed to download). Night-read: n/a for every row. Poly count: n/a. Nothing was downloaded.

License on every page: "Creative Commons 0", http://creativecommons.org/publicdomain/zero/1.0/ . The pages say you can copy, modify, distribute and perform the sound, even for commercial purposes, without asking the author. Each URL was opened in Playwright and the license text read from the page.

Size basis: duration x bitrate. .ogg about 64 kbps mono or 112 kbps stereo; .mp3 about 96 kbps mono or 128 kbps stereo. Estimates only, confirm at conversion. All converted estimates are under 5 MB, but several originals are over 5 MB.

No overlap with Category 7 (checked against its 12 Freesound IDs). No copyrighted music, film, game or TV rips, or identifiable voices.

Caveats:

- freesound-trp-digging-dirt-shovel-05 is 4:23 (39.4 MB FLAC) and freesound-etienne-leplumey-crows-over-nests is 4:28 at 96 kHz (147.3 MB WAV). Both must be trimmed (to about 20 s and 40 s) before converting, or they cost 3.7 MB or more.
- freesound-tairblenn-old-electrometer-humming has 3 parts (noise with the hum removed, then the hum): pick the hum part.
- freesound-za-games-metal-spring-pluck-sting is by Za-Games (mono, 4.8 s, heavy reverb); it can be layered with the qubodup sting for the lights-off outcome.
- freesound-smice-6-hum-loop: check the loop seam at conversion; mono would halve the size.
- freesound-guyburns-digging-with-shovel, freesound-zazz-cloth-rustle-8, freesound-khenshom-cotton-clothes-rustling and freesound-giddster-crows-cawing are not loopable as is; cut a clean section or crossfade.
- freesound-starvolt-shuffling-1-rear is one of six matching Front/Rear files (Shuffling 1 to 3) and zazz cloth-rustle-8 is one of Cloth Rustle 1 to 8; each series is counted once.
- Crows are optional (see Decisions needed).
- OpenGameArt was not searched; Freesound had enough CC0 hits.

### Jump-scare sting

| Name | Covers | Preview | Source URL | Author | License | Duration | Original format | Size | Loopable | Manual pick | Night-read | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| freesound-qubodup-vibrating-jumpscare | jump-scare sting | [png](09-round-3/freesound-qubodup-vibrating-jumpscare.png) | https://freesound.org/people/qubodup/sounds/814056/ | [qubodup](https://freesound.org/people/qubodup/) | Creative Commons 0, http://creativecommons.org/publicdomain/zero/1.0/ | 0:08.307 | WAV, 44.1 kHz, 16-bit, stereo | 1.4 MB; ~0.12 MB / ~0.13 MB (8.3 s stereo x 112 / 128 kbps) | No (one-shot, decaying) | Manual pick | n/a | Original layered piano and drums run through a plugin, made by the author; sharp attack with a long decay suits a once-per-outcome scare. 21 ratings. |
| freesound-za-games-metal-spring-pluck-sting | jump-scare sting | [png](09-round-3/freesound-za-games-metal-spring-pluck-sting.png) | https://freesound.org/people/Za-Games/sounds/540213/ | [Za-Games](https://freesound.org/people/Za-Games/) | Creative Commons 0, http://creativecommons.org/publicdomain/zero/1.0/ | 0:04.768 | WAV, 44.1 kHz, 16-bit, mono | 410.8 KB; ~0.04 MB / ~0.06 MB (4.8 s mono x 64 / 96 kbps) | No (one-shot) | Manual pick | n/a | Plucked metal spring with heavy reverb, tagged horror sting; short, so it can be layered with the first for the lights-off outcome. |

### Digging in dirt

| Name | Covers | Preview | Source URL | Author | License | Duration | Original format | Size | Loopable | Manual pick | Night-read | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| freesound-guyburns-digging-with-shovel | digging in dirt | [png](09-round-3/freesound-guyburns-digging-with-shovel.png) | https://freesound.org/people/guyburns/sounds/558413/ | [guyburns](https://freesound.org/people/guyburns/) | Creative Commons 0, http://creativecommons.org/publicdomain/zero/1.0/ | 0:18.139 | M4A, 44.1 kHz, 678 kbps, stereo | 1.5 MB; ~0.25 MB / ~0.29 MB (18.1 s stereo x 112 / 128 kbps) | Not as is (cut a clean section and crossfade) | Manual pick | n/a | Field recording of a shovel in gravel and dirt at night, a believable grave-digging bed for a zombie clawing out. |
| freesound-trp-digging-dirt-shovel-05 | digging in dirt | [png](09-round-3/freesound-trp-digging-dirt-shovel-05.png) | https://freesound.org/people/TRP/sounds/574859/ | [TRP](https://freesound.org/people/TRP/) | Creative Commons 0, http://creativecommons.org/publicdomain/zero/1.0/ | 4:23.000 | FLAC, 48 kHz, 24-bit, stereo | 39.4 MB; ~3.7 MB / ~4.2 MB if kept whole (263 s stereo x 112 / 128 kbps); a 20 s trim is about 0.3 MB | Not as is (trim to a few seconds) | Manual pick | n/a | Long clean shovel recording from a Sony MiniDisc rig; gives many shovel strokes to choose from. Trim before converting; the original is over 5 MB. |

### Shambling footsteps

| Name | Covers | Preview | Source URL | Author | License | Duration | Original format | Size | Loopable | Manual pick | Night-read | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| freesound-starvolt-shuffling-1-rear (PACK) | shambling footsteps | [png](09-round-3/freesound-starvolt-shuffling-1-rear.png) | https://freesound.org/people/Starvolt/sounds/189225/ | [Starvolt](https://freesound.org/people/Starvolt/) | Creative Commons 0, http://creativecommons.org/publicdomain/zero/1.0/ | 0:08.598 | WAV, 44.1 kHz, 16-bit, stereo | 1.4 MB; ~0.12 MB / ~0.14 MB (8.6 s stereo x 112 / 128 kbps) | Possible with a crossfade (idle shuffling, no rhythm hits) | Manual pick | n/a | Page says a small group shuffling to replicate idling zombies. One of six matching Front/Rear files (Shuffling 1 to 3), counted once. Group of people, no voices noted on the page. |
| freesound-indieground-pas-zombie-route | shambling footsteps | [png](09-round-3/freesound-indieground-pas-zombie-route.png) | https://freesound.org/people/indieground/sounds/223815/ | [indieground](https://freesound.org/people/indieground/) | Creative Commons 0, http://creativecommons.org/publicdomain/zero/1.0/ | 0:28.325 | WAV, 44.1 kHz, 16-bit, stereo | 4.8 MB; ~0.40 MB / ~0.45 MB (28.3 s stereo x 112 / 128 kbps) | Not as is | Manual pick | n/a | Slow gravel footsteps tagged zombie, recorded on a Zoom H2n; gravel matches a graveyard path. |

### Cloth rustle

| Name | Covers | Preview | Source URL | Author | License | Duration | Original format | Size | Loopable | Manual pick | Night-read | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| freesound-zazz-cloth-rustle-8 (PACK) | cloth rustle | [png](09-round-3/freesound-zazz-cloth-rustle-8.png) | https://freesound.org/people/zazz.sound.design/sounds/435296/ | [zazz.sound.design](https://freesound.org/people/zazz.sound.design/) | Creative Commons 0, http://creativecommons.org/publicdomain/zero/1.0/ | 1:33.765 | WAV, 48 kHz, 24-bit, mono | 12.9 MB; ~0.75 MB / ~1.1 MB (93.8 s mono x 64 / 96 kbps) | No (many separate rustles; cut one) | Manual pick | n/a | Clean mono foley, 25 ratings. Part of a series Cloth Rustle 1 to 8 (same author), counted once. |
| freesound-khenshom-cotton-clothes-rustling | cloth rustle | [png](09-round-3/freesound-khenshom-cotton-clothes-rustling.png) | https://freesound.org/people/khenshom/sounds/481075/ | [khenshom](https://freesound.org/people/khenshom/) | Creative Commons 0, http://creativecommons.org/publicdomain/zero/1.0/ | 0:38.452 | WAV, 48 kHz, 32-bit, stereo | 14.1 MB; ~0.54 MB / ~0.62 MB (38.5 s stereo x 112 / 128 kbps) | No (cut one movement) | Manual pick | n/a | Cotton clothing movement, boom mic, 46 ratings; softer than the first, for a slumped body shifting. |

### Electrical hum before a zap

| Name | Covers | Preview | Source URL | Author | License | Duration | Original format | Size | Loopable | Manual pick | Night-read | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| freesound-smice-6-hum-loop | electrical hum before a zap | [png](09-round-3/freesound-smice-6-hum-loop.png) | https://freesound.org/people/Smice_6/sounds/536527/ | [Smice_6](https://freesound.org/people/Smice_6/) | Creative Commons 0, http://creativecommons.org/publicdomain/zero/1.0/ | 0:37.359 | WAV, 48 kHz, 24-bit, stereo | 10.3 MB; ~0.52 MB / ~0.60 MB (37.4 s stereo x 112 / 128 kbps); mono would halve it | Yes, titled Hum Loop and tagged Loop (check the seam at conversion) | Manual pick | n/a | Steady electric tone for a hum bed that rises before the switch is pulled. |
| freesound-tairblenn-old-electrometer-humming | electrical hum before a zap | [png](09-round-3/freesound-tairblenn-old-electrometer-humming.png) | https://freesound.org/people/Tairblenn/sounds/540305/ | [Tairblenn](https://freesound.org/people/Tairblenn/) | Creative Commons 0, http://creativecommons.org/publicdomain/zero/1.0/ | 0:27.108 | MP3, 44.1 kHz, 120 kbps, stereo | 398.4 KB; ~0.38 MB / ~0.43 MB (27.1 s stereo x 112 / 128 kbps) | Yes, titled Loopable; the page lists 3 parts (noise with hum removed, then the hum), so pick the hum part | Manual pick | n/a | Old electrometer disc hum, an analog, period-fitting buzz for the lab. |

### Crows (optional)

| Name | Covers | Preview | Source URL | Author | License | Duration | Original format | Size | Loopable | Manual pick | Night-read | Why it fits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| freesound-giddster-crows-cawing | crows | [png](09-round-3/freesound-giddster-crows-cawing.png) | https://freesound.org/people/giddster/sounds/437345/ | [giddster](https://freesound.org/people/giddster/) | Creative Commons 0, http://creativecommons.org/publicdomain/zero/1.0/ | 0:38.237 | WAV, 44.1 kHz, 32-bit, stereo | 12.9 MB; ~0.54 MB / ~0.61 MB (38.2 s stereo x 112 / 128 kbps) | Possible with a crossfade (ambient) | Manual pick | n/a | Crows in trees on a cold day, Zoom H1, 24 ratings; clear cawing for the graveyard bed. |
| freesound-etienne-leplumey-crows-over-nests | crows | [png](09-round-3/freesound-etienne-leplumey-crows-over-nests.png) | https://freesound.org/people/etienne.leplumey/sounds/534322/ | [etienne.leplumey](https://freesound.org/people/etienne.leplumey/) | Creative Commons 0, http://creativecommons.org/publicdomain/zero/1.0/ | 4:28.187 | WAV, 96 kHz, 24-bit, stereo | 147.3 MB; ~3.7 MB / ~4.3 MB if kept whole (268 s stereo x 112 / 128 kbps); a 40 s trim is about 0.6 MB | Possible after a trim | Manual pick | n/a | Crows flying and cawing over nests with wind, a fuller flock for a wide shot. Trim before converting. |

Category 10 rejected while scouting: DeqstersLab 819593 "Spooky Sting from VT Lair" (a third-party sample pack, origin unclear); JeffPearson 849840 "shoveling-dirt" (0.65 s, self-described low quality, credits a game name); maurolupo 330811 "Zombie on the leaves" (6:20, 128 MB, human voices and Walking Dead tags).

Category 10 candidate count: 12 rows, 12 distinct (sting 2, digging 2, footsteps 2, cloth rustle 2, electrical hum 2, crows 2), 0 Fallbacks, outside the 35/38 cap.

## Extra Rocketbox avatars (round 3)

Six more Rocketbox avatars on the same library, so patients can vary by sector and age. They are listed separately and are NOT counted as scouted candidates. Nothing was downloaded or cloned; the listings come from the read-only GitHub git-tree API at the pinned SHA `0943055db6ec570bcef9f2c8b41c9e5467c808f9` (repo `microsoft/Microsoft-Rocketbox`). Already in use and not repeated: `Business_Male_02`, `Male_Adult_05`. Excluded: Children, Police, Military, Security, Fire, Pilot, Delivery (clothing may carry a brand), Party. All 6 folders and main FBXs were verified present at the SHA; no replacements were needed.

License: MIT, [LICENSE.md at the pinned SHA](https://github.com/microsoft/Microsoft-Rocketbox/blob/0943055db6ec570bcef9f2c8b41c9e5467c808f9/LICENSE.md) (file exists, 1066 bytes). Rocketbox avatars are synthetic characters, so there is no real person. Include the LICENSE file next to the avatars.

Preview check (2026-11-12): all six repository preview PNGs (1280x720, T-pose on a plain grey background, pinned SHA) were opened and looked at. None shows a logo, brand mark, readable text or insignia, so none is dropped. The clothing and age/gender columns below now describe what the previews show, replacing the earlier folder-name guesses. Small caveat: Construction_Female_01 has a tiny red woven tab on the trouser pocket and Gardener_Male_01 has tiny blue tags on the jacket and trouser leg; at preview resolution they carry no legible text or mark. Look at the 1k textures at conversion and blank the tab if it turns out to be a brand label. Rocketbox has no explicit age labels, so ages are visual estimates. No preview image is kept in the repository.

Skeleton: assumed, same library (3ds Max Biped, Bip01). The repo README at the SHA has no "Bip01" or "skeleton" text, and bone names can only be confirmed by opening an FBX, which was not done. The two avatars already picked come from the same folder families, so the same rig is expected. Check the bone names after the first retarget.

Textures: each folder has `Textures/*.tga` of about 4 to 16 MB each (12 MB typical). Phase 2 resizes them to 1k WebP in the script, and at that size they are not a budget problem. KTX2 is skipped for v1. Each folder also holds a `_facial.fbx` (about 1.9 to 2.3 MB); only the plain FBX is the main file.

| Name | Repo path (at SHA) | Main FBX (size) | License | Clothing (seen in preview) | Age group / gender (seen in preview) | Suggested sector | Preview (repo) | Skeleton |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| rocketbox-medical-female-01 (Medical_Female_01) | `Assets/Avatars/Professions/Medical_Female_01` | `Export/Medical_Female_01.fbx` (583,200 B) | [MIT](https://github.com/microsoft/Microsoft-Rocketbox/blob/0943055db6ec570bcef9f2c8b41c9e5467c808f9/LICENSE.md) | white short-sleeved scrub tunic and trousers over a blue undershirt, white shoes; no logo | young adult woman, dark hair in a bun | Services (health care) | [png](https://github.com/microsoft/Microsoft-Rocketbox/blob/0943055db6ec570bcef9f2c8b41c9e5467c808f9/Assets/Avatars/Professions/Medical_Female_01/Medical_Female_01.png) | assumed, same library (Bip01) |
| rocketbox-construction-male-01 (Construction_Male_01) | `Assets/Avatars/Professions/Construction_Male_01` | `Export/Construction_Male_01.fbx` (676,496 B) | [MIT](https://github.com/microsoft/Microsoft-Rocketbox/blob/0943055db6ec570bcef9f2c8b41c9e5467c808f9/LICENSE.md) | blue plaid shirt, jeans, tan tool belt with tools, white hard hat with visor and ear defenders, black shoes; no logo | middle-aged man, grey stubble | Construction | [png](https://github.com/microsoft/Microsoft-Rocketbox/blob/0943055db6ec570bcef9f2c8b41c9e5467c808f9/Assets/Avatars/Professions/Construction_Male_01/Construction_Male_01.png) | assumed, same library (Bip01) |
| rocketbox-construction-female-01 (Construction_Female_01) | `Assets/Avatars/Professions/Construction_Female_01` | `Export/Construction_Female_01.fbx` (603,248 B) | [MIT](https://github.com/microsoft/Microsoft-Rocketbox/blob/0943055db6ec570bcef9f2c8b41c9e5467c808f9/LICENSE.md) | blue coveralls, yellow hi-vis vest with reflective bands, white hard hat, yellow work gloves, tan boots, shoulder radio; tiny red pocket tab, no legible text | adult woman, short fair hair | Manufacturing | [png](https://github.com/microsoft/Microsoft-Rocketbox/blob/0943055db6ec570bcef9f2c8b41c9e5467c808f9/Assets/Avatars/Professions/Construction_Female_01/Construction_Female_01.png) | assumed, same library (Bip01) |
| rocketbox-business-female-01 (Business_Female_01) | `Assets/Avatars/Professions/Business_Female_01` | `Export/Business_Female_01.fbx` (616,576 B) | [MIT](https://github.com/microsoft/Microsoft-Rocketbox/blob/0943055db6ec570bcef9f2c8b41c9e5467c808f9/LICENSE.md) | dark trouser suit, white blouse, open-toe heels; no logo | adult woman, short dark hair | Finance | [png](https://github.com/microsoft/Microsoft-Rocketbox/blob/0943055db6ec570bcef9f2c8b41c9e5467c808f9/Assets/Avatars/Professions/Business_Female_01/Business_Female_01.png) | assumed, same library (Bip01) |
| rocketbox-gardener-male-01 (Gardener_Male_01) | `Assets/Avatars/Professions/Gardener_Male_01` | `Export/Gardener_Male_01.fbx` (517,152 B) | [MIT](https://github.com/microsoft/Microsoft-Rocketbox/blob/0943055db6ec570bcef9f2c8b41c9e5467c808f9/LICENSE.md) | brown work jacket and trousers, yellow rubber boots, green gloves; tiny blue tags, no legible text | older man, grey beard and dark hair | Agriculture or Services | [png](https://github.com/microsoft/Microsoft-Rocketbox/blob/0943055db6ec570bcef9f2c8b41c9e5467c808f9/Assets/Avatars/Professions/Gardener_Male_01/Gardener_Male_01.png) | assumed, same library (Bip01) |
| rocketbox-female-adult-06 (Female_Adult_06) | `Assets/Avatars/Adults/Female_Adult_06` | `Export/Female_Adult_06.fbx` (529,632 B) | [MIT](https://github.com/microsoft/Microsoft-Rocketbox/blob/0943055db6ec570bcef9f2c8b41c9e5467c808f9/LICENSE.md) | olive knee-length tunic and trousers, white fringed headscarf, black flats; no logo | adult woman | Retail Trade | [png](https://github.com/microsoft/Microsoft-Rocketbox/blob/0943055db6ec570bcef9f2c8b41c9e5467c808f9/Assets/Avatars/Adults/Female_Adult_06/Female_Adult_06.png) | assumed, same library (Bip01) |

Mix (from the previews): 4 female, 2 male; young adult to older adult; sectors Services, Construction, Manufacturing, Finance, Agriculture or Services, Retail Trade. All six are kept in Picks. Bip01 bone names are confirmed at conversion (task 18.4).

## Sub_Items with no suitable candidate

| Sub_Item | Category | Sources searched | Note |
| --- | --- | --- | --- |
| bloody handprint | 8 | OpenGameArt, ambientCG (127 Decal assets), Poly Haven, itch.io, web search | No suitable candidate found: no CC0 bloody handprint exists in the places searched. Own-work procedural fallback suggested in Category 8, not created. |
| none (Categories 1-7) | 1-7 | Poly Haven, ambientCG, Sketchfab (downloadable, CC BY and CC0), Freesound (CC0 filter), Rocketbox repo | Every Sub_Item has 2 or 3 candidates. Weak spots: no CC0 Sketchfab model fit any prop, hand, zombie or avatar search; instruments (Category 4) are tray items inside larger models; there is no lying-down patient animation; no zombie is rigged; ECG flatline has no dedicated file. Not searched: Kenney and Quaternius (stylized, excluded), OpenGameArt. |

## Totals

Distinct candidates, Categories 1-7: 47 (limit 35, hard max 38 for the visual categories; the cap was raised for Category 7 (sound) only, at the user's decision). Visual 35 (Category 1: 5, 2: 3, 3: 14, 4: 5, 5: 3, 6: 5, counting the task 6.2 replacement hand) plus sound 12 (Category 7).

Category 8 (horror dressing, counted separately, outside the 35/38 cap): 23 distinct candidates in 24 rows (sketchfab-small-destroyed-tombstone-04 appears under both cracked and broken and is already a Category 3 pick), so 22 are new. Per Sub_Item: skull 2, body bag 2, morgue 2, chains and hooks 2, straps 2, blood splatter 2, handprint 0 (none found), drag-mark 2, cobwebs 2, rotten cloth 2, headstones 6 rows (intact 2, cracked 2, broken 2). Overall distinct across all categories: 69 (47 + 22). Category 8 Fallbacks: 0.

Category 9 (lab and finale, round 3, counted separately, outside the 35/38 cap): 8 distinct candidates in 8 rows. Per Sub_Item: knife switch 2, heavy door 2, lab wall 2, lab floor 2. Fallbacks: 0.

Category 10 (sounds, round 3, counted separately, outside the 35/38 cap): 12 distinct candidates in 12 rows. Per Sub_Item: jump-scare sting 2, digging 2, shambling footsteps 2, cloth rustle 2, electrical hum 2, crows 2 (optional). Fallbacks: 0. Packs counted once: 2 (starvolt shuffling series, zazz cloth rustle series).

Extra Rocketbox avatars (round 3): 6 listed, none missing, listed separately and not counted as scouted candidates.

Round 3 scouted total: 20 (8 + 12). Overall distinct across Categories 1-10: 89 (47 + 22 + 20). The 35/38 cap does not apply to Categories 8, 9 and 10.

Earlier Categories 1-7 detail: Fallbacks: 12 (4 in Category 1, 2 in Category 2, 5 in Category 3, 1 Rocketbox row in Category 5 counting the avatar and its three animations as one). Packs counted once: 2 in Category 4, 2 in Category 7.

## Picks

Recorded from the user's picks for rounds 1 to 3. Format: name, scene, role; then processing notes. "(Manual pick)" marks files you download yourself into `tools/cache/manual/<name>/` in Phase 2 (all Sketchfab and Freesound rows). Poly Haven and Rocketbox rows are fetched by the script. Category 8, 9 and 10 picks and the extra avatars are recorded below (final, 2026-11-12). Totals: 30 candidate picks in rounds 2 and 3 (14 in round 2: 4 zombie and hands, 10 horror dressing; 16 in round 3: 4 lab and finale, 6 sounds, 6 avatars), of which 2 (sketchfab-zombie-hand-ruella, sketchfab-zombie-mutant) were already picked earlier, plus 2 own-work decal generators and 1 derived cracked headstone that are not candidates. The Proop butcher's hook was picked and then dropped by the AI-account check, so it is not counted.

### Category 1: ground and stone

- polyhaven-excavated-soil-wall: graveyard, main ground. Ship at 2k.
- polyhaven-lichen-rock: graveyard, stone (tombstone surface). Ship at 1k.

### Category 2: night sky

- polyhaven-moonlit-golf: graveyard, sky. Use the 2k as background and the 1k as environment lighting. Lower `backgroundIntensity` and `environmentIntensity`; use a warm-grey fog against the blue-purple sky. The other two HDRIs are dropped.
  - Accepted size exception: the 2k sky is 6,981,963 B (over 5 MB). The user accepted it ("User accepted 2k background sky; lazy-load after first frame"); recorded as `sizeException` (maxBytes 7,340,032) in `tools/picks.json`.

### Category 3: graveyard props

- polyhaven-large-iron-gate: graveyard, gate on the horizon.
- polyhaven-gothic-statue: graveyard, statue.
- polyhaven-dead-tree-trunk: graveyard, dead trees. Decimate (102K tris source).
- polyhaven-tree-stump-01: graveyard, stump.
- polyhaven-tree-stump-02: graveyard, stump.
- polyhaven-lantern-01: graveyard, lantern.
- sketchfab-small-destroyed-tombstone-04 (Manual pick): graveyard, broken stones. Resize the 8K textures to 1k.
- Fence: none for now.

### Category 4: lab props

- sketchfab-autopsy-lab-assets (PACK, Manual pick): lab, operating table, surgical lamp and instruments.
- sketchfab-medical-props-cart (Manual pick): lab, medical cart. Decimate to about 60K faces.
- sketchfab-crutch-and-iv-drip (Manual pick): lab, IV stand. Delete the crutch from the model.

### Category 5: patient avatars and animations

- rocketbox-business-male-02: lab, patient avatar (the reference patient). Convert FBX to glb.
- rocketbox-male-adult-05: lab, second patient avatar. Same rig and pipeline.
- Animations (shared Bip01 skeleton, no retargeting), all from `microsoft/microsoft-rocketbox`:
  - m_walk_neutral_01: `Assets/Animations/all_animations_max_motextr_xy/m_walk_neutral_01.max.fbx`
  - m_walk_drunk: `Assets/Animations/all_animations_max_motextr_xy/m_walk_drunk.max.fbx`
  - m_walk_bruised: `Assets/Animations/all_animations_max_motextr_xy/m_walk_bruised.max.fbx`
  - m_idle_breathe_01: `Assets/Animations/all_animations_max_motextr_static/m_idle_breathe_01.max.fbx` (1,397,280 B)
- Scene and role of the animations: lab, patient motion (walk clips for the capture or approach, idle breathing for the patient on the table). Roles are my reading of the README notes; adjust if you meant otherwise.
- Pinned commit SHA (HEAD of `master` when checked, read-only through the GitHub API): `0943055db6ec570bcef9f2c8b41c9e5467c808f9`, committed 2022-10-02T19:20:56Z. At this SHA the two avatar Export FBX files and all four animation files above exist; `m_idle_breathe_01` exists, so no alternative is needed (its siblings `m_idle_breathe_02` and `_03` also exist). The repo reports `archived: true`.

### Category 6: zombie and hands

- sketchfab-zombie-corpse-greenall (Manual pick): static graveyard/lab horror prop (no rig, A-pose). Provenance accepted on the author's statement (task 6.1 found the author's own ZBrush sculpt; to be recorded in CREDITS.md). License is CC Attribution (CC BY 4.0), so credit is required and it gets a `CREDITS.md` row. Author: Colin.Greenall (https://sketchfab.com/Colin.Greenall).

- sketchfab-zombie-hand-craggle (Manual pick): graveyard, hands clawing out of graves. Desaturate the green slightly. License CC BY, credit required.
- sketchfab-zombie-hand-ruella (Manual pick): lab failure overlay, hands reaching in from the screen edges (also usable in the graveyard). Decimate from 319.5K tris to about 30K, bake normals from the sculpt, remove the blue sleeve.
- sketchfab-zombie-mutant (Manual pick, kept): graveyard and a second lab table, static horror prop (no rig, T-pose). Re-tint paler so it does not merge with the red flood. License is CC Attribution (CC BY 4.0), shown in its row, so credit is required and it gets a `CREDITS.md` row even though the model page says credit is optional. Author: Regulator (https://sketchfab.com/A2555).

### Category 7: sound

- freesound-sidequesting-steady-heart-rate-monitor-loop (Manual pick): lab, ECG beep (loop while the patient is alive).
- freesound-thegreatperson-heart-rate-cardiac-arrest-flatline (PACK, Manual pick): lab, ECG sequence and ECG flatline. Cut the arrest sequence and the flatline tone from the one take.
- freesound-zhro-heartbeat-loopable (Manual pick): lab, heartbeat loop.
- freesound-lennartgreen-low-rumble-loopable (Manual pick): lab, low drone loop.
- freesound-launemax-open-close-iron-gate (Manual pick): graveyard, iron gate open and close.
- freesound-bigkahuna360-electrical-shock-zap (Manual pick): lab, electric zap with charge-up for the switch-pull.
- freesound-joelaudio-electric-zap-001 (Manual pick): lab, short electric zap.
- freesound-tomhannen-howling-wind-tower (Manual pick): graveyard, wind. Needs a crossfade loop.


### Category 8: horror dressing (final, round 2)

- sketchfab-human-skull-danieledefilippis (Manual pick): lab and graveyard, human skull. Darken and add grime. Bones: none.
- sketchfab-smartinius-body-bag (Manual pick): lab, body bag.
- sketchfab-morgue-refrigerator-porteous (Manual pick): lab, morgue drawer. Decimate to ~39K (user accepted; 30K unreachable without distortion).
- sketchfab-rusty-chains-amanda98 (Manual pick): lab, rusty chains.
- sketchfab-strap-buckles-kit-dmigul (Manual pick): lab, restraint straps. Black webbing.
- oga-blood-splatter-exilegl (Manual pick): lab and graveyard, blood splatter decals (lights-off mode only).
- Bloody handprint decal: own procedural generator in `tools/`, 512 px alpha PNG, dark wet red, several variants. Own work, listed in CREDITS.md as our own work. Not a Candidate row (no CC0 source exists).
- Drag-mark (smear) decal: same own generator, 512 px alpha PNG, dark wet red, several variants. Own work. The two ambientCG leaking decals are not used.
- sketchfab-cobwebs-asset-pack-emarshall (Manual pick): lab and graveyard, cobwebs.
- polyhaven-hessian-230: lab, rotten cloth or sheet. Stained in the decay shader. Fetched by the script.
- sketchfab-small-gravestone-drydoctoregg (Manual pick): graveyard, intact headstone.
- sketchfab-damaged-tombstone-drydoctoregg (Manual pick): graveyard, broken headstone.
- Cracked headstone: no download. Our script derives it from the intact sketchfab-small-gravestone-drydoctoregg scan (displaced crack normal map and chipped edge), recorded as a modified CC BY work with the drydoctoregg credit. The procedural headstones remain the fallback if it is not produced.

### Category 9: lab and finale (final, round 3)

- sketchfab-knife-switch-type-d (Manual pick): lab, finale knife switch. Grey variant. Split the handle and blade from the base so the pull can be animated.
- polyhaven-large-castle-door: lab, heavy exit door. Fetched by the script (separate leaves).
- polyhaven-dark-brick-wall: lab, wall texture. Fetched by the script.
- polyhaven-slate-floor: lab, floor texture. Fetched by the script.

### Category 10: sounds (final, round 3)

- freesound-qubodup-vibrating-jumpscare (Manual pick): lights-off jump scare, one per outcome.
- freesound-guyburns-digging-with-shovel (Manual pick): graveyard, zombie claws out of the grave.
- freesound-indieground-pas-zombie-route (Manual pick): graveyard and lab, shambling footsteps.
- freesound-zazz-cloth-rustle-8 (PACK, Manual pick): lab, cloth rustle.
- freesound-smice-6-hum-loop (Manual pick): lab, electrical hum before the zap.
- freesound-giddster-crows-cawing (Manual pick): graveyard, crows (optional ambience).

### Extra Rocketbox avatars (final, round 3)

All six kept after the preview check (no logo, brand mark or readable text; see "Extra Rocketbox avatars"). Fetched by the script at the pinned SHA, converted FBX to glb. Bip01 bone names are confirmed at conversion (task 18.4).

- rocketbox-medical-female-01: lab, patient variant (white scrubs, young adult woman).
- rocketbox-construction-male-01: lab, patient variant (plaid shirt, tool belt, hard hat; middle-aged man).
- rocketbox-construction-female-01: lab, patient variant (blue coveralls, hi-vis vest, hard hat; adult woman).
- rocketbox-business-female-01: lab, patient variant (dark suit; adult woman).
- rocketbox-gardener-male-01: lab, patient variant (brown work clothes, yellow boots; older man).
- rocketbox-female-adult-06: lab, patient variant (olive tunic, white headscarf; adult woman).

## Rejected

- sketchfab-broken-headstone: readable inscription of a real person's grave.
- sketchfab-zombie-hand-greenall: provenance UNCONFIRMED (task 6.1, see "Provenance check" under Category 6). The author only retopologised and textured someone else's sculpt, so it stays rejected. The Greenall corpse, by contrast, is CONFIRMED and picked. The replacement sketchfab-zombie-hand-craggle is picked.
- sketchfab-butchers-hook-chain-proop: uploader publishes AI-generated models. AI-account check on 2026-11-12 (Req 33): the uploader ALTEREGO (v.a.c.u.u.m.) has 173 public uploads (189 listing entries including pagination duplicates). 3 carry the tag "rodin" (the Hyper3D Rodin AI generator): "skeleton head with hanging rope (skull)" (https://sketchfab.com/3d-models/skeleton-head-with-hanging-rope-skull-624e3f511c7048a4a1f3c3cc46430a77, published 2025-02-20, description "This model is created for free using ..."), "Rusty Mechanical Spider V2" (uid 05a46dcbb6244460adf26aaa7ffe89a8) and "demonic helmet with horns and red gem" (uid ee9cdd6b485b4ec8a4319192d9bfc7dd). No upload carries the createdwithai tag or the words AI generated, text-to-3D, image-to-3D, Meshy, Tripo or Luma. The hook itself has tags hook, chain, butchers, proop and no AI statement, but the rule drops it on any AI-generation tag in the account. It is left out of the Manual README and `tools/picks.json`. Method: the Sketchfab public search API listing for the user, read through a Playwright page (title, tags, description, categories of every upload; no login, no download, no form input), plus one upload page opened and its snapshot checked.
- Category 8 headstones (Req 26.8): Unique Gravestone Scans (legible text of real graves), Implosion of a Tombstone (a mausoleum, not a headstone) and others, listed under "Rejected headstones" in Category 8. The other Category 8 candidates are either picked or listed under "Not picked".

### Not picked

Dropped, not rejected. Rows and previews stay in the tables above.

- Category 1: polyhaven-brown-mud-leaves-01, polyhaven-mossy-rock, ambientcg-ground054.
- Category 2: polyhaven-rogland-moonlit-night, polyhaven-kloppenheim-02-puresky.
- Category 3: sketchfab-fredericksburg-cemetery-gate, sketchfab-broken-wing-angel-statue, polyhaven-dead-tree-trunk-02, sketchfab-rusty-oil-lantern, sketchfab-rusty-iron-fence, polyhaven-modular-chainlink-fence.
- Category 4: sketchfab-daonware-medical-equipment-set, sketchfab-iv-device-with-stand.
- Category 5: sketchfab-old-fat-man-full-rig.
- Category 7: freesound-kkenny101-dark-atmospheric-drone-seamless, freesound-b-train-heartbeat-with-beep, freesound-nickmaysoundmusic-iron-gate-abbey-gardens, freesound-qvantor-wind-howling-synthesized.
- Category 8: sketchfab-leather-belt-cuv, sketchfab-human-skull-plastic-model, polyhaven-rough-linen, sketchfab-tombstone-set-2-mr-nein (and Mr.Nein set 1, which has no row of its own and is described in the set 2 row), sketchfab-cross-and-broken-gravestones-rbg, ambientcg-leaking004, ambientcg-leaking001, sketchfab-body-bag-surgical-table, sketchfab-morgue-refrigerator-12mb, oga-blood-splat-tobiasm, sketchfab-cobwebs-bumstrum. Reason for all: not picked by the user.
- Category 9: sketchfab-knife-switch-type-c, sketchfab-iron-door-olkaad, polyhaven-castle-brick-07, polyhaven-slate-floor-02. Reason: not picked by the user.
- Category 10: freesound-za-games-metal-spring-pluck-sting, freesound-trp-digging-dirt-shovel-05, freesound-starvolt-shuffling-1-rear, freesound-khenshom-cotton-clothes-rustling, freesound-tairblenn-old-electrometer-humming, freesound-etienne-leplumey-crows-over-nests. Reason: not picked by the user (the second Candidate in each pair).
- Extra Rocketbox avatars: none dropped. The logo check found no logo or brand mark in any of the six previews.