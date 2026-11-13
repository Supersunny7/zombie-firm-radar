// Pure Ground_Fog visibility for the framed-plot look (Batch 2b, Requirement 23.19, design section 6).
// No react or three imports.

/**
 * Opacity multiplier for the Ground_Fog layers: 1 - plotLook, clamped to [0, 1]. plotLook is the
 * lights-off framed-plot weight from `sceneParams` / `blendParams` (1 in a lights-off framed Plot,
 * 0 in the overview and in lights on, the camera-move and lights-ease weight in between), so the
 * layers fade out over the same camera move as the fog and are gone when the move ends (23.18).
 *
 * The volumetric Flashlight cone of Base_Spec 10.6 has no mesh any more (removed at user request,
 * see `r3f/Flashlight.tsx`); a re-added cone must use this same predicate.
 */
export function groundFogScale(plotLook: number): number {
  if (!(plotLook > 0)) return 1;
  if (plotLook >= 1) return 0;
  return 1 - plotLook;
}

/** True when the Ground_Fog layers are drawn at all; false in a lights-off framed Plot (23.19). */
export function groundFogDrawn(plotLook: number): boolean {
  return groundFogScale(plotLook) > 0;
}
