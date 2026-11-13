import { describe, expect, it } from 'vitest';
import {
  PIT_R_MAX,
  RIM_HEIGHT,
  clodsFor,
  pitRadius,
  tornMoundProfile,
  tornMoundSet,
} from './tornMound';

describe('tornMound', () => {
  it('keeps Pit width within 0.5 to 0.9 m and clods in range', () => {
    for (let i = 0; i < 200; i++) {
      const cik = String(i).padStart(10, '0');
      const r = pitRadius(cik);
      expect(r).toBeGreaterThanOrEqual(0.25);
      expect(r).toBeLessThanOrEqual(PIT_R_MAX);
      const clods = clodsFor(cik);
      expect(clods.length).toBeGreaterThanOrEqual(6);
      expect(clods.length).toBeLessThanOrEqual(14);
      for (const c of clods) {
        const d = Math.hypot(c.dx, c.dz);
        expect(d).toBeGreaterThanOrEqual(r + 0.05 - 1e-9);
        expect(d).toBeLessThanOrEqual(1.2 + 1e-9);
      }
    }
    expect(clodsFor('0000000001')).toEqual(clodsFor('0000000001'));
  });

  it('profile: crater below ground, crest 0.30 at 1.15 pit radius, zero at the edge', () => {
    const p = 0.35;
    expect(tornMoundProfile(0, p)).toBeLessThan(0);
    expect(tornMoundProfile(p * 1.15, p)).toBeCloseTo(RIM_HEIGHT, 9);
    expect(tornMoundProfile(p * 2.4, p)).toBe(0);
  });

  it('set keeps active ciks', () => {
    const s = tornMoundSet(['a'], ['b']);
    expect([...s].sort()).toEqual(['a', 'b']);
  });
});
