import { describe, expect, it } from 'vitest';
import { cctvParams } from './cctvParams';
import { createGlitchScheduler } from './glitchScheduler';

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
