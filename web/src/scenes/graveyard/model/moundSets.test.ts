import { describe, expect, it } from 'vitest';
import { planDressing } from './dressing';
import { moundSets } from './moundSets';

const firms = [
  { cik: '0000000001', status: 'zombie' as const },
  { cik: '0000000002', status: 'healthy' as const },
  { cik: '0000000003', status: 'endangered' as const },
  { cik: '0000000004', status: 'healthy' as const },
];

describe('moundSets', () => {
  const plan = planDressing(firms, { newlyUndead: Uint8Array.from([0, 0, 1, 0]) }, 'on');

  it('splits firms into torn and closed, covering each exactly once', () => {
    const s = moundSets(firms, plan, new Set());
    expect(s.torn).toEqual([0, 2]);
    expect(s.closed).toEqual([1, 3]);
  });

  it('keeps a mound torn while its character is active (7.5)', () => {
    const s = moundSets(firms, plan, new Set(['0000000004']));
    expect(s.torn).toEqual([0, 2, 3]);
    expect(s.closed).toEqual([1]);
  });

  it('an active cik of a still-torn firm changes nothing', () => {
    expect(moundSets(firms, plan, new Set(['0000000001']))).toEqual(
      moundSets(firms, plan, new Set()),
    );
  });
});
