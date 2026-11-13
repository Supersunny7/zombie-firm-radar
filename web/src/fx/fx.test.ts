import { describe, expect, it } from 'vitest';
import { EffectAttribute } from 'postprocessing';
import type { Uniform, Vector3 } from 'three';
import { LOOK_CCTV_GRADE, LOOK_TONE_MAPPING } from '../scenes/graveyard/look';
import { CctvGradeEffect } from './CctvGradeEffect';
import { BASE_TONE_MAPPING, cctvChain, cctvParams, cctvToneMapping } from './cctvParams';
import { createGlitchScheduler } from './glitchScheduler';
import { TRACKING_GLITCH_SHIFT_GLSL, TrackingGlitchEffect } from './TrackingGlitchEffect';

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe('cctvParams', () => {
  it('lights off, normal quality', () => {
    const p = cctvParams('off', false);
    expect(p).toMatchObject({
      grain: 0.11,
      desaturation: 0.45,
      vignette: 1.15,
      chromaticAberration: 0.0022,
      bloom: { intensity: 0.55, radius: 0.6, luminanceThreshold: 0.82 },
      glitch: true,
    });
    expect(p.scanlineOpacity).toBeLessThanOrEqual(0.15);
  });

  it('lights on has no glitch and softer values', () => {
    const p = cctvParams('on', false);
    expect(p).toMatchObject({ grain: 0.05, desaturation: 0.3, vignette: 0.95, glitch: false });
  });

  it('low quality drops only bloom and aberration', () => {
    for (const l of ['off', 'on'] as const) {
      const n = cctvParams(l, false);
      const q = cctvParams(l, true);
      expect(q.bloom).toBeNull();
      expect(q.chromaticAberration).toBe(0);
      expect({ ...q, bloom: n.bloom, chromaticAberration: n.chromaticAberration }).toEqual(n);
    }
  });
});

describe('glitch scheduler', () => {
  it('first glitch starts 20 to 60 s after enabling and lasts at most 0.4 s', () => {
    for (let seed = 1; seed <= 15; seed++) {
      const g = createGlitchScheduler(seeded(seed));
      const t0 = 100;
      let start: number | null = null;
      let end: number | null = null;
      for (let t = t0; t < t0 + 70; t += 0.02) {
        const a = g.update(t, true);
        expect(a).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThanOrEqual(1);
        if (a > 0 && start === null) start = t;
        if (a === 0 && start !== null && end === null) end = t;
      }
      expect(start).not.toBeNull();
      expect(start! - t0).toBeGreaterThanOrEqual(20 - 0.02);
      expect(start! - t0).toBeLessThanOrEqual(60 + 0.02);
      expect(end! - start!).toBeLessThanOrEqual(0.43);
    }
  });

  it('never glitches while disabled, and disabling mid-glitch returns 0 at once', () => {
    const g = createGlitchScheduler(() => 0);
    expect(g.update(0, false)).toBe(0);
    expect(g.update(1, true)).toBe(0); // nextAt = 21
    expect(g.update(21, true)).toBeGreaterThan(0);
    expect(g.update(21.05, false)).toBe(0);
    expect(g.update(21.1, false)).toBe(0);
    // re-enable schedules a fresh 20 s+ wait
    expect(g.update(30, true)).toBe(0);
    expect(g.update(49.9, true)).toBe(0);
    expect(g.update(50, true)).toBeGreaterThan(0);
  });

  it('reset clears the schedule', () => {
    const g = createGlitchScheduler(() => 0);
    g.update(0, true);
    g.reset(5);
    expect(g.update(25, true)).toBe(0); // rescheduled from 25
    expect(g.update(45, true)).toBeGreaterThan(0);
  });
});

describe('CctvGradeEffect (23.11, 23.13)', () => {
  const value = <T>(e: CctvGradeEffect, name: string) => (e.uniforms.get(name) as Uniform<T>).value;

  it('builds as a convolution effect with the look.ts values', () => {
    const e = new CctvGradeEffect();
    expect(e.getAttributes() & EffectAttribute.CONVOLUTION).toBe(EffectAttribute.CONVOLUTION);
    // Convolution effects cannot transform uvs in the same pass.
    expect(e.getFragmentShader()).toMatch(/void mainImage\(/);
    expect(e.getFragmentShader()).not.toMatch(/mainUv/);
    const g = LOOK_CCTV_GRADE;
    expect(value<number>(e, 'uSaturation')).toBe(g.saturation);
    expect(value<Vector3>(e, 'uLumaWeights').toArray()).toEqual([...g.lumaWeights]);
    expect(value<number>(e, 'uGain')).toBe(g.gain);
    expect(value<number>(e, 'uLift')).toBe(g.lift);
    expect(value<number>(e, 'uGamma')).toBe(g.gamma);
    expect(value<number>(e, 'uVignetteStrength')).toBe(g.vignetteStrength);
    expect(value<number>(e, 'uVignettePower')).toBe(g.vignettePower);
    expect(value<number>(e, 'uGrainSigma')).toBe(g.grainSigma);
    expect(value<number>(e, 'uScanlinePeriod')).toBe(g.scanlinePeriod);
    expect(value<number>(e, 'uScanlineFactor')).toBe(g.scanlineFactor);
    expect(value<number>(e, 'uRedGhostMix')).toBe(g.redGhostMix);
    expect(value<number>(e, 'uRedGhostOffsetPx')).toBe(g.redGhostOffsetPx);
    e.dispose();
  });

  it('applies the tracking-glitch band shift to both samples, with no RGB split (23.12)', () => {
    const e = new CctvGradeEffect();
    const fs = e.getFragmentShader();
    expect(fs).toContain(TRACKING_GLITCH_SHIFT_GLSL);
    expect(fs).toMatch(/uniform float uGlitchAmount;/);
    expect(fs).toMatch(/uniform float uGlitchSeed;/);
    expect(fs).toContain('trackingGlitchShift(uv, uGlitchAmount, uGlitchSeed)');
    expect(fs).toContain('texture2D(inputBuffer, sampleUv)');
    expect(fs).toContain('ghostUv = sampleUv -');
    // Only the main and the red-ghost samples read inputBuffer; no blue sample, no split.
    expect(fs.match(/texture2D\(inputBuffer/g)).toHaveLength(2);
    expect(fs).not.toMatch(/\.b\b/);
    expect(value<number>(e, 'uGlitchAmount')).toBe(0);
    e.dispose();
  });

  it('drives the glitch uniforms like TrackingGlitchEffect', () => {
    const e = new CctvGradeEffect();
    const ref = new TrackingGlitchEffect();
    const seedOf = (t: TrackingGlitchEffect) => (t.uniforms.get('uSeed') as Uniform<number>).value;
    const steps: [number, number][] = [
      [0, 10],
      [0.5, 21.3],
      [1, 21.42],
      [1, 21.5],
      [0.35, 21.6],
      [0, 21.7],
      [1.7, 30],
      [-0.2, 31],
    ];
    for (const [amount, t] of steps) {
      e.driveGlitch(amount, t);
      ref.drive(amount, t);
      expect(e.glitchAmount).toBe(ref.amount);
      expect(e.glitchSeed).toBe(seedOf(ref));
      expect(e.glitchAmount).toBeGreaterThanOrEqual(0);
      expect(e.glitchAmount).toBeLessThanOrEqual(1);
    }
    e.dispose();
    ref.dispose();
  });

  it('keeps no glitch under Reduced_Motion (scheduler disabled gives amount 0)', () => {
    const e = new CctvGradeEffect();
    const g = createGlitchScheduler(() => 0);
    for (let t = 0; t < 120; t += 0.05) e.driveGlitch(g.update(t, false), t);
    expect(e.glitchAmount).toBe(0);
    e.dispose();
  });

  it('uses the gradeColour vignette radius', () => {
    expect(new CctvGradeEffect().getFragmentShader()).toContain('length(uv * 2.0 - 1.0)');
  });

  it('changes the grain seed every frame and keeps it while frozen', () => {
    const e = new CctvGradeEffect();
    e.update();
    const a = e.grainSeed;
    e.update();
    expect(e.grainSeed).not.toBe(a);
    e.setFrozen(true);
    expect(e.frozen).toBe(true);
    const b = e.grainSeed;
    e.update();
    e.update();
    expect(e.grainSeed).toBe(b);
  });
});

describe('cctvChain (23.12, 23.13, 23.16)', () => {
  it('lights off is ToneMapping then the grade in separate passes, in every quality', () => {
    for (const low of [false, true]) {
      for (const reduced of [false, true]) {
        const c = cctvChain('off', low, reduced);
        // Two passes: the tracking glitch runs inside the grade, so no RGB-split effect (23.12).
        expect(c.effects).toEqual(['toneMapping', 'grade']);
        expect(c.effects).not.toContain('trackingGlitch');
        expect(c.effects).not.toContain('bloom');
        expect(c.effects).not.toContain('chromaticAberration');
        expect(c.mergeMode).toBe('none');
        expect(c.grainFrozen).toBe(reduced);
      }
    }
  });

  it('lights on keeps the Base_Spec chain without the grade', () => {
    expect(cctvChain('on', false, false).effects).toEqual([
      'bloom',
      'chromaticAberration',
      'hueSaturation',
      'toneMapping',
      'vignette',
      'noise',
      'scanline',
      'trackingGlitch',
    ]);
    expect(cctvChain('on', true, false).effects).toEqual([
      'hueSaturation',
      'toneMapping',
      'vignette',
      'noise',
      'scanline',
      'trackingGlitch',
    ]);
    expect(cctvChain('on', false, true).mergeMode).toBe('auto');
    expect(cctvChain('on', false, true).effects).not.toContain('grade');
  });
});

describe('cctvToneMapping (23.15, 23.16)', () => {
  it('lights off is ACES filmic with exposure 1.0 from look.ts', () => {
    expect(cctvToneMapping('off')).toEqual({ mode: 'ACESFilmic', exposure: 1 });
    expect(cctvToneMapping('off')).toEqual(LOOK_TONE_MAPPING);
  });

  it('lights on keeps the Base_Spec ACES with the renderer default exposure', () => {
    expect(cctvToneMapping('on')).toEqual(BASE_TONE_MAPPING);
    expect(BASE_TONE_MAPPING).toEqual({ mode: 'ACESFilmic', exposure: 1 });
  });
});
