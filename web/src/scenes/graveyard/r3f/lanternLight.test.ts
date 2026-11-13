import { describe, expect, it } from 'vitest';
import { lanternIntensity } from './lanternLight';

describe('lanternIntensity (23.10)', () => {
  it('is 1.2 x 0.85 = 1.02 at t = 0', () => {
    expect(lanternIntensity(0, false)).toBeCloseTo(1.02, 12);
  });

  it('stays at the constant 1.2 while Reduced_Motion is true', () => {
    for (const t of [0, 0.1, 1.7, 42, 3600.25]) expect(lanternIntensity(t, true)).toBe(1.2);
  });

  it('stays within 1.2 x [0.7, 1.0] and actually flickers', () => {
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i <= 20000; i++) {
      const v = lanternIntensity(i * 0.001, false);
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    expect(lo).toBeGreaterThanOrEqual(1.2 * 0.7 - 1e-12);
    expect(hi).toBeLessThanOrEqual(1.2 * 1.0 + 1e-12);
    expect(hi - lo).toBeGreaterThan(0.2);
  });

  it('matches the formula at a sample time', () => {
    const t = 0.37;
    const expected = 1.2 * (0.85 + 0.15 * Math.sin(13 * t) * Math.sin(7.3 * t));
    expect(lanternIntensity(t, false)).toBeCloseTo(expected, 12);
  });
});
