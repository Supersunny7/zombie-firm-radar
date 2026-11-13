import { describe, expect, it } from 'vitest';
import { HAND_PRINCIPAL_AXIS, HAND_WRIST_END } from './handConstants';
import {
  HAND_BUDGET,
  activeCount,
  assignHands,
  createHandPool,
  slotProgress,
  stepHandPool,
  type HandPoolOptions,
} from './handPool';
import { alignYaw, fingerDirection, handPose } from './handPose';

const opts: HandPoolOptions = { reduced: false, riseSeconds: 1.4, lowerSeconds: 1.2 };

describe('assignHands', () => {
  it('takes the nearest eight', () => {
    const c = Array.from({ length: 12 }, (_, i) => ({
      cik: String(i).padStart(10, '0'),
      dist: 12 - i,
    }));
    const r = assignHands(c);
    expect(r).toHaveLength(HAND_BUDGET);
    expect(r[0]).toBe('0000000011');
  });
  it('breaks ties by CIK string order', () => {
    const r = assignHands(
      [
        { cik: '0000000010', dist: 5 },
        { cik: '0000000002', dist: 5 },
        { cik: '0000000100', dist: 5 },
      ],
      2,
    );
    expect(r).toEqual(['0000000002', '0000000010']);
  });
  it('handles empty input and does not mutate', () => {
    expect(assignHands([])).toEqual([]);
    const c = [
      { cik: 'b', dist: 2 },
      { cik: 'a', dist: 1 },
    ];
    assignHands(c);
    expect(c[0]?.cik).toBe('b');
  });
});

describe('stepHandPool', () => {
  it('starts each hand once and never exceeds 8 active', () => {
    let s = createHandPool();
    const desired = Array.from({ length: 12 }, (_, i) => `c${i}`);
    const r = stepHandPool(s, desired, 0.016, opts);
    expect(r.started).toEqual(desired.slice(0, 8));
    s = r.state;
    expect(activeCount(s)).toBe(8);
    const r2 = stepHandPool(s, desired, 0.016, opts);
    expect(r2.started).toEqual([]);
  });
  it('moves rising to up, then lowers and frees removed firms', () => {
    let s = stepHandPool(createHandPool(), ['a'], 0, opts).state;
    s = stepHandPool(s, ['a'], 1.5, opts).state;
    expect(s.slots[0]?.state).toBe('up');
    s = stepHandPool(s, [], 0.1, opts).state;
    expect(s.slots[0]?.state).toBe('lowering');
    s = stepHandPool(s, [], 1.3, opts).state;
    expect(s.slots[0]?.state).toBe('idle');
    expect(activeCount(s)).toBe(0);
  });
  it('gives a freed slot to a waiting firm after the lowering ends', () => {
    const first = Array.from({ length: 8 }, (_, i) => `a${i}`);
    let s = stepHandPool(createHandPool(), first, 2, opts).state;
    const next = [...first.slice(1), 'z'];
    let r = stepHandPool(s, next, 0.1, opts);
    expect(r.started).toEqual([]);
    s = r.state;
    r = stepHandPool(s, next, 1.3, opts);
    expect(r.started).toEqual(['z']);
    expect(activeCount(r.state)).toBe(8);
  });
  it('reduced motion enters up directly and still reports one start', () => {
    const r = stepHandPool(createHandPool(), ['a', 'b'], 0.016, { ...opts, reduced: true });
    expect(r.started).toEqual(['a', 'b']);
    expect(r.state.slots[0]?.state).toBe('up');
    expect(slotProgress(r.state.slots[0]!, opts)).toBe(1);
  });
  it('converges to the target assignment', () => {
    let s = createHandPool();
    const targets = [['a', 'b', 'c'], ['c', 'd'], ['e']];
    for (const t of targets)
      for (let i = 0; i < 400; i++) s = stepHandPool(s, t, 0.016, opts).state;
    const ciks = s.slots.filter((x) => x.state !== 'idle').map((x) => x.cik);
    expect(ciks).toEqual(['e']);
  });
});

describe('handPose', () => {
  it('is buried and flat at 0, raised at 1, monotone', () => {
    const a = handPose(0);
    const b = handPose(1);
    expect(a.tilt).toBe(0);
    expect(a.y).toBeLessThan(0);
    expect(b.tilt).toBeCloseTo((70 * Math.PI) / 180, 10);
    expect(b.y).toBe(0);
    let prev = handPose(0);
    for (let i = 1; i <= 20; i++) {
      const p = handPose(i / 20);
      expect(p.tilt).toBeGreaterThanOrEqual(prev.tilt);
      expect(p.y).toBeGreaterThanOrEqual(prev.y);
      prev = p;
    }
    expect(handPose(2).tilt).toBe(b.tilt);
    expect(handPose(Number.NaN).tilt).toBe(0);
  });
  it('turns the fingers (opposite the wrist) onto +z', () => {
    const [fx, fz] = fingerDirection();
    expect(fx * HAND_PRINCIPAL_AXIS[0] * HAND_WRIST_END).toBeLessThan(0);
    const a = alignYaw();
    expect(-fx * Math.sin(a) + fz * Math.cos(a)).toBeCloseTo(1, 10);
    expect(fx * Math.cos(a) + fz * Math.sin(a)).toBeCloseTo(0, 10);
    expect(handPose(0.5).rotation[1]).toBe(a);
  });
});
