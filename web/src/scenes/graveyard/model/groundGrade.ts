// Ground_Texture tiling and night grade (horror-pass 6.1). Pure: no react or three imports.

/** One ground tile is 4 m; the ground follows the camera in whole tiles. */
export const TILE_M = 4;
/** The Ground_Texture is a 1k set (1024 x 1024 texels). */
export const GROUND_TEXTURE_PX = 1024;
/** Texel density on the ground: 256 texels per metre, at least 128 (6.1). */
export const GROUND_TEXELS_PER_M = GROUND_TEXTURE_PX / TILE_M;

/**
 * Colour multipliers on the diffuse map (linear RGB). Lights off is darker and redder than the
 * raw preview, which read too bright and green (Batch 1 review); lights on keeps the map close to
 * its own colour so the brighter mode shows the real floor.
 */
export const GROUND_TINT_OFF: readonly [number, number, number] = [0.5, 0.34, 0.3];
export const GROUND_TINT_ON: readonly [number, number, number] = [0.9, 0.82, 0.78];

/** Tint for the eased lights value `lb` (0 = lights off, 1 = lights on), clamped to [0, 1]. */
export function groundTint(lb: number): [number, number, number] {
  const t = Math.min(1, Math.max(0, Number.isFinite(lb) ? lb : 0));
  return [0, 1, 2].map(
    (i) => GROUND_TINT_OFF[i]! + (GROUND_TINT_ON[i]! - GROUND_TINT_OFF[i]!) * t,
  ) as [number, number, number];
}
