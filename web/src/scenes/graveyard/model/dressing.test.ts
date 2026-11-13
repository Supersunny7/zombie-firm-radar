import { describe, expect, it } from 'vitest';
import { planDressing } from './dressing';
import type { DressingInput } from './dressing';

const firms: DressingInput[] = [
  { cik: '0000000001', status: 'zombie' },
  { cik: '0000000002', status: 'healthy' },
  { cik: '0000000003', status: 'endangered' },
  { cik: '0000000004', status: 'insufficient_data' },
  { cik: '0000000005', status: 'zombie' },
];
const batch = { newlyUndead: Uint8Array.from([0, 0, 1, 0, 0]) };

describe('planDressing', () => {
  it('mounds are the zombie or newly undead set', () => {
    const p = planDressing(firms, batch, 'on');
    expect(p.undead).toEqual([0, 2, 4]);
    expect(p.mounds).toEqual(p.undead);
  });

  it('lights on has no blood', () => {
    expect(planDressing(firms, batch, 'on').blood).toEqual([]);
  });

  it('lights off gives 1 to 5 quads to each undead stone only', () => {
    const p = planDressing(firms, batch, 'off');
    expect(p.blood.map((b) => b.firm)).toEqual([0, 2, 4]);
    for (const b of p.blood) {
      expect(b.count).toBeGreaterThanOrEqual(1);
      expect(b.count).toBeLessThanOrEqual(5);
      expect(b.seeds).toHaveLength(b.count);
    }
  });

  it('is deterministic per CIK, independent of position', () => {
    const a = planDressing(firms, batch, 'off');
    const b = planDressing(firms, batch, 'off');
    expect(b).toEqual(a);
    const moved = planDressing(
      [
        { cik: '0000000005', status: 'zombie' },
        { cik: '0000000001', status: 'zombie' },
      ],
      { newlyUndead: new Uint8Array(2) },
      'off',
    );
    expect(moved.blood[0]?.seeds).toEqual(a.blood[2]?.seeds);
    expect(moved.blood[1]?.count).toBe(a.blood[0]?.count);
  });

  it('handles an empty list', () => {
    const p = planDressing([], { newlyUndead: new Uint8Array(0) }, 'off');
    expect(p).toEqual({ undead: [], mounds: [], blood: [] });
  });
});
