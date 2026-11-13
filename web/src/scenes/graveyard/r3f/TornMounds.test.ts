import { describe, expect, it } from 'vitest';
import { buildTornHeapGeometry } from './TornMounds';

describe('buildTornHeapGeometry', () => {
  const g = buildTornHeapGeometry();
  const pos = g.getAttribute('position');

  it('leaves the Pit open: no vertex inside the rim wall foot (7.3)', () => {
    for (let i = 0; i < pos.count; i++) {
      expect(Math.hypot(pos.getX(i), pos.getZ(i))).toBeGreaterThanOrEqual(0.97 - 1e-6);
    }
  });

  it('is a raised, bounded heap that ends on the ground', () => {
    let max = 0;
    let outerMax = 0;
    for (let i = 0; i < pos.count; i++) {
      max = Math.max(max, pos.getY(i));
      if (Math.hypot(pos.getX(i), pos.getZ(i)) > 2.39) outerMax = Math.max(outerMax, pos.getY(i));
      expect(pos.getY(i)).toBeGreaterThanOrEqual(0);
    }
    expect(max).toBeGreaterThan(0.25);
    expect(max).toBeLessThan(0.45);
    expect(outerMax).toBe(0);
  });
});
