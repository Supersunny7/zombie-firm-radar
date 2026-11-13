/** Pure quality decisions (design Section 17, requirement 21.9). */

export interface QualityParams {
  /** Canvas pixel ratio. */
  readonly dpr: number;
  readonly flashlightShadow: boolean;
  readonly moonShadowMapSize: number;
  /** Ground fog layers rendered (the base layer at y = 0.1 comes first). */
  readonly fogLayers: 1 | 3;
  readonly bloom: boolean;
  readonly aberration: boolean;
}

export const DPR_CAP = 1.5;
export const DPR_LOW_FACTOR = 0.75;
export const DPR_LOW_FLOOR = 0.75;

export function qualityParams(lowQuality: boolean, devicePixelRatio: number): QualityParams {
  const raw = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const normal = Math.min(raw, DPR_CAP);
  return {
    dpr: lowQuality ? Math.max(DPR_LOW_FLOOR, DPR_LOW_FACTOR * normal) : normal,
    flashlightShadow: !lowQuality,
    moonShadowMapSize: lowQuality ? 1024 : 2048,
    fogLayers: lowQuality ? 1 : 3,
    bloom: !lowQuality,
    aberration: !lowQuality,
  };
}
