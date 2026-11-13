/**
 * Pure TypeScript mirror of the per-pixel colour steps (a) to (c) of the CCTV_Grade
 * (Requirement 23.11). `CctvGradeEffect` runs the same steps in GLSL; this module exists
 * so Property 47 can check them. Grain (d), scanlines (e) and the red ghost (f) are
 * shader-only and not mirrored here.
 * Colours are display-referred (sRGB-encoded) channels in [0, 1], as in the shader after
 * its linear-to-sRGB conversion. Every number comes from `LOOK_CCTV_GRADE`.
 * Pure: no React or three imports.
 */
import { LOOK_CCTV_GRADE } from '../scenes/graveyard/look';

/** An RGB colour with channels nominally in [0, 1]. */
export type Rgb = readonly [number, number, number];

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/** Luma with the CCTV_Grade weights (0.3, 0.59, 0.11). */
export function luma(rgb: Rgb): number {
  const [wr, wg, wb] = LOOK_CCTV_GRADE.lumaWeights;
  return wr * rgb[0] + wg * rgb[1] + wb * rgb[2];
}

/**
 * Step (a): saturation 0.6, i.e. mix(luma, colour, 0.6) = 40 % luma + 60 % colour.
 * GLSL: `mix(vec3(dot(c, W)), c, saturation)`.
 */
export function saturate(rgb: Rgb): Rgb {
  const s = LOOK_CCTV_GRADE.saturation;
  const y = luma(rgb);
  return [y + s * (rgb[0] - y), y + s * (rgb[1] - y), y + s * (rgb[2] - y)];
}

/**
 * Step (b) for one channel: clamp(c * 1.4 + 0.015, 0, 1) raised to the power 0.9.
 * GLSL: `pow(clamp(c * gain + lift, 0.0, 1.0), vec3(gamma))`.
 */
export function gainLiftGammaChannel(c: number): number {
  const { gain, lift, gamma } = LOOK_CCTV_GRADE;
  return Math.pow(clamp01(c * gain + lift), gamma);
}

/** Step (b) applied to each channel. */
export function gainLiftGamma(rgb: Rgb): Rgb {
  return [gainLiftGammaChannel(rgb[0]), gainLiftGammaChannel(rgb[1]), gainLiftGammaChannel(rgb[2])];
}

/**
 * Vignette radius for a screen uv in [0, 1]^2: r = |2 * (uv - 0.5)|, so r = 0 at the
 * centre and r = 1 at the four edge midpoints (sqrt 2 at the corners). No aspect correction.
 * GLSL: `length(uv * 2.0 - 1.0)`.
 */
export function vignetteRadius(u: number, v: number): number {
  return Math.hypot(2 * u - 1, 2 * v - 1);
}

/**
 * Step (c) factor for a screen uv: clamp(1 - 0.38 * r^2.5, 0, 1).
 * GLSL: `clamp(1.0 - strength * pow(r, power), 0.0, 1.0)`.
 */
export function vignetteFactor(u: number, v: number): number {
  const { vignetteStrength, vignettePower } = LOOK_CCTV_GRADE;
  const r = vignetteRadius(u, v);
  return clamp01(1 - vignetteStrength * Math.pow(r, vignettePower));
}

/** Step (c): multiply every channel by the vignette factor at uv. */
export function vignette(rgb: Rgb, u: number, v: number): Rgb {
  const f = vignetteFactor(u, v);
  return [rgb[0] * f, rgb[1] * f, rgb[2] * f];
}

/** Steps (a), (b) and (c) in order for one pixel at screen uv (u, v) in [0, 1]^2. */
export function gradeColour(rgb: Rgb, u: number, v: number): Rgb {
  return vignette(gainLiftGamma(saturate(rgb)), u, v);
}
