import { describe, expect, it } from 'vitest';
import { cctvParams } from '../../../fx/cctvParams';
import { qualityParams } from './quality';

describe('qualityParams', () => {
  it('normal quality caps dpr at 1.5 and keeps everything on', () => {
    expect(qualityParams(false, 3)).toEqual({
      dpr: 1.5,
      flashlightShadow: true,
      moonShadowMapSize: 2048,
      fogLayers: 3,
      bloom: true,
      aberration: true,
    });
    expect(qualityParams(false, 1).dpr).toBe(1);
  });

  it('low quality is 0.75 x normal with a floor of 0.75', () => {
    expect(qualityParams(true, 2).dpr).toBe(1.125);
    expect(qualityParams(true, 1).dpr).toBe(0.75);
    expect(qualityParams(true, 0.5).dpr).toBe(0.75);
    expect(qualityParams(true, Number.NaN).dpr).toBe(0.75);
  });

  it('low quality drops shadow, fog layers, bloom and aberration', () => {
    expect(qualityParams(true, 1)).toMatchObject({
      flashlightShadow: false,
      moonShadowMapSize: 1024,
      fogLayers: 1,
      bloom: false,
      aberration: false,
    });
  });

  it('agrees with the CCTV params and leaves other CCTV values unchanged', () => {
    for (const lights of ['off', 'on'] as const) {
      const lo = cctvParams(lights, true);
      const hi = cctvParams(lights, false);
      expect(lo.bloom === null).toBe(!qualityParams(true, 1).bloom);
      expect(lo.chromaticAberration === 0).toBe(!qualityParams(true, 1).aberration);
      expect({ ...lo, bloom: null, chromaticAberration: 0 }).toEqual({
        ...hi,
        bloom: null,
        chromaticAberration: 0,
      });
    }
  });
});
