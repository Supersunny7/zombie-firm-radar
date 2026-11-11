---
inclusion: manual
---

# Scene Reference

Values come from the design prototypes; screenshots will be in `/reference`. Treat them as starting points to match visually, not as final numbers. Lights are physically based (three.js r16x+ units). Where two values are given as "a / b", the first is lights off and the second is lights on.

## Graveyard

### Camera
- Perspective, FOV 52, position (0, 2.15, 9.4).
- Looks at (pointer.x * 3.2, 0.2 + pointer.y * 1.3, -2), smoothed.
- Handheld sway amplitude 0.035 / 0.02 m (off with reduced motion).

### Fog
- FogExp2 color `#171b21`, density 0.085 / 0.05.

### Sky and environment
- Background: night sky HDRI at intensity 0.045 / 0.12.
- Environment light from a moonlit HDRI at intensity 0.05 / 0.3.

### Moon and ambient
- Moon: directional `#8ea9d6`, intensity 0.12 / 0.7, from (-14, 18, -22), casts shadows.
- Hemisphere `#3a4a66` / `#0b0806` at 0.03 / 0.35.

### Flashlight
- Spot `#fff1d6`, intensity 240, distance 34, angle 0.32 rad, penumbra 0.5, decay 1.7.
- Attached to the camera at (0.28, -0.32, 0.1); aims at the pointer's ray hit; casts shadows.
- Subtle slow flicker (±6%), never strobing.
- A fake volumetric cone (additive, opacity 0.11) follows it.

### Ground fog
- 3 horizontal noise layers at y = 0.1, 0.38, 0.8 m.
- Color `#2b323c`, opacity 0.42 / 0.26 / 0.12.
- Thicker as the rate shock rises.

### Tombstones
- Extruded shapes: round, shouldered, flat; zombies are broken.
- Width 0.62 to 0.88 m; height 0.85 to 1.6 m by log of debt.
- Lean more when endangered or zombie; partly sunk in the ground.
- Lichen and mossy rock PBR materials.
- Engraving is a canvas texture decal: name, filing year, ICR, cross. Crack when endangered; blood drips when zombie in lights-off.
- Grave mound of excavated soil in front of each stone; the hand rises from it.

### Props
- Iron gate behind the last row.
- Gothic statue.
- Dead tree trunk and stumps.
- Lantern with a warm point light `#ff9a4a`.

### CCTV pass
- Grain 0.11 / 0.05.
- Desaturation 0.45 / 0.3.
- Vignette 1.15 / 0.95.
- Chromatic aberration 0.0022.
- Bloom: strength 0.55, radius 0.6, threshold 0.82.

## Lab

### Room
- Crypt turned into a lab: mossy rock walls, wet lichen stone floor (roughness 0.55).
- Fog `#07080a`, density 0.09.

### Camera
- Default: FOV 45, position (1.35, 2.1, 2.15), looks at (0, 0.95, -0.25).
- Free camera via CameraControls: distance 0.35 to 4 m, polar angle 15 to 85 degrees, damping on.

### Operating table
- Steel: metalness 0.85, roughness 0.38.
- Top at y = 0.86 m, size 0.82 x 2.15 m.
- Blood stains as decals (lights-off only).

### Lights
- Surgical lamp: spot `#eef4ff`, intensity 7, distance 8, angle 0.55, penumbra 0.6, from (0, 2.36, -0.1) straight down; emissive lamp glass.
- Red emergency bulb: point `#ff2a1a`, intensity 0.9, at (-3.2, 2.6, -3.4).
- Lantern on the floor: warm point light, intensity 0.8.

### Patient
- Rocketbox avatar (centimetres, scale 0.01), lying on its back along the table.
- Head toward -z, root at y = 0.955.
- Upper arms rotated down to the sides.

### Decay shader
- Blends from the avatar's texture to a grey-green corpse look with dark veins, blotches and wet wounds.
- Wounds and gloss only in lights-off.
- Driven by one uniform from 0 (alive) to 1 (undead).
- During a revive it recedes outward from the chest.

## Lessons from the prototypes

- An overexposed surgical lamp washed out the patient. Keep the lamp near intensity 7 and judge exposure on screenshots, not on numbers.
- A hard horizon line breaks the illusion. The fog color must match the sky at the horizon, and the ground must extend past the fog distance.
- Panels covering the stage hid the patient. Dock panels outside the canvas and resize the canvas instead.
