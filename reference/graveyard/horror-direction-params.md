# Horror direction: exact values behind horror-direction.png

Reference only. These are the numbers used to render `horror-direction.png` and
`horror-direction-sequence.png` (source: `prototype/horror-direction.html`, three.js, never imported by app code).
Units: metres, radians. Camera looks down -Z. The hero grave is at (0.4, 0, -1.75).

## Camera (inside a plot)
- FOV 46. Position (-0.55, 1.2, 1.35), look-at (0.35, 0.6, -2.0): eye height 1.2 m, about 3.2 m from the hero grave.
- The hero grave sits in the lower-middle of the frame; the horizon is in the top third.

## Fog and tone
- FogExp2, colour #0a0d13, density 0.075. Scene background is the same colour (no visible horizon).
- ACES filmic tone mapping, exposure 1.0.

## Lights (lights off)
| Light | Colour | Intensity | Notes |
|---|---|---|---|
| Hemisphere | sky #3a4a66, ground #0a0806 | 0.18 | almost nothing; shapes outside the beam are near black |
| Moon (directional) | #7f9cd6 | 1.1 | from (-4, 9, -22): BEHIND the stones, so it only draws cool rim light on edges; casts shadows |
| Flashlight (spot) | #ffe7c4 | 55 | at the camera, distance 26, angle 0.36, penumbra 0.95, decay 2, casts shadows |
| Lantern (point) | #ff9a4a | 1.2 | distance 4, decay 2, 0.28 m above ground, 1.5 m left of the hero grave |
The picture has two warm pools (flashlight, lantern) in a cold, almost black field. Nothing else is lit.

## Stones
- Base colour multiplied by 0.55 (they must not blow out to white in the beam).
- Rows 2.6 m apart, columns 1.55 m, position jitter +/-0.35 m, 12% of cells empty.
- Height 0.75 to 1.25 m, yaw +/-0.35, tilt x -0.16..0.12, tilt z +/-0.14, 7% fallen, sunk 14%.
- The hero's own stone leans back over the open grave (tilt x -0.22).

## Torn mound
- Half-ellipsoid, radii 0.85 x 1.05 m, rim height 0.2 m, dark pit radius 0.5 m (#040302).
- 46 dirt clods (3 to 10 cm, #3b2c1f, flat shaded) thrown 0.5 to 1.5 m around the pit.

## Zombies (all scaled to 1.8 to 1.85 m; the Watcher 2.05 m)
- Material: base colour x0.9 (hero), x0.85 (walker), x0.75 (crawler), x0.6 (Watcher); roughness >= 0.75.
- Hero (possessed-undead), end of rise: root rotation (0.1, 0.3, 0.05); root y goes from -1.55 (hidden) to -0.95 (waist at ground level).
  Spine bends toward (0.05, 0.8, 0.6). Right arm: upper (-0.3, 0.15, 1), forearm (-0.15, -0.05, 1), finger curl 1.0.
  Left arm planted on the rim: upper (0.45, -0.2, 0.9), forearm (0.2, -0.85, 0.5), finger curl 1.25. Head looks toward (0.35, 0.55, 0.75).
  (Directions are world-space bone directions, camera at +Z.)
- Walker (pxltiger, Walk1_InPlace): 6 m from the camera, right of centre, facing the camera, outside the beam, rim-lit only.
- Watcher (hooded woman): 13 m back, left of centre, standing still, only just visible.

## CCTV grade (applied after tone mapping)
1. Saturation 0.6 (mix 40% luma).
2. Gain 1.4, lift +0.015, gamma 0.9.
3. Vignette: multiply by 1 - 0.38 * r^2.5 (r = 0 centre, 1 edge).
4. Grain: gaussian, sigma 0.035, new every frame.
5. Scanlines: every third row x0.88.
6. Red channel ghost: 40% of red shifted 2 px right.

## Sound for one rise (no shovel)
- t = -0.4 s: wind ducks by 6 dB; crows are not scheduled for 5 s.
- t = 0: soil crumble (freesound-abstraktgeneriert-crumble-9), pitch 0.85 to 1.1 at random, with a quiet low rumble under it (freesound-lennartgreen-low-rumble-loopable, 1.5 s, fade out).
- t = 0.9 to 2.2 s: wet mud squelch (freesound-ahill86-mudsquelch) as the torso hauls out, pitch 0.8 to 1.0.
- t = 3.0 s: growl (one of the two growl files), pitch 0.85 to 1.05, after 0.3 s of near silence.
- All positional: volume falls with distance from the camera, panned left/right by screen position, low-pass beyond 10 m.
- At most one full sequence per second; extra rises play only the crumble, quieter.
