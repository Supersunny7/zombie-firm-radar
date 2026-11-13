/** Pure CCTV pass values (design section 11, scene-reference.md). No three.js or React. */
export interface CctvParams {
  /** Film grain opacity. */
  grain: number;
  /** Desaturation amount, 0 to 1. */
  desaturation: number;
  /** Vignette darkness. */
  vignette: number;
  /** Chromatic aberration offset; 0 means the effect is off. */
  chromaticAberration: number;
  /** Bloom settings; null means bloom is off. */
  bloom: { intensity: number; radius: number; luminanceThreshold: number } | null;
  /** Scanline opacity, at most 0.15. */
  scanlineOpacity: number;
  /** Whether the tracking glitch may run (lights off only; Reduced_Motion is checked by the caller). */
  glitch: boolean;
}

export const CHROMATIC_ABERRATION = 0.0022;
export const SCANLINE_OPACITY = 0.12;
export const BLOOM = { intensity: 0.55, radius: 0.6, luminanceThreshold: 0.82 } as const;

export function cctvParams(lights: 'off' | 'on', lowQuality: boolean): CctvParams {
  const off = lights === 'off';
  return {
    grain: off ? 0.11 : 0.05,
    desaturation: off ? 0.45 : 0.3,
    vignette: off ? 1.15 : 0.95,
    chromaticAberration: lowQuality ? 0 : CHROMATIC_ABERRATION,
    bloom: lowQuality ? null : { ...BLOOM },
    scanlineOpacity: SCANLINE_OPACITY,
    glitch: off,
  };
}
