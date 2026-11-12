import { describe, expect, it, vi } from 'vitest';
import { buildGrid } from '../layout/grid';
import { computeLayout, type LayoutInput } from '../layout/layout';
import {
  emitHoverChange,
  getLastPointerRay,
  isTap,
  ndcFromClient,
  pickFirmIndex,
  subscribeHoverChange,
} from './pointerPick';

const firms: LayoutInput[] = Array.from({ length: 6 }, (_, i) => ({
  cik: String(i).padStart(10, '0'),
  sector: 'Manufacturing',
  status: 'zombie',
  total_debt_usd: 1000 * (i + 1),
}));

describe('pointerPick', () => {
  it('maps client pixels to NDC', () => {
    const rect = { left: 10, top: 20, width: 200, height: 100 };
    expect(ndcFromClient(rect, 110, 70)).toEqual({ x: 0, y: 0 });
    expect(ndcFromClient(rect, 10, 20)).toEqual({ x: -1, y: 1 });
    expect(ndcFromClient({ ...rect, width: 0 }, 0, 0)).toBeNull();
  });

  it('picks the stone a ray aimed at it hits, and nothing for a ray into the sky', () => {
    const layout = computeLayout(firms);
    const grid = buildGrid(layout);
    const s = layout.stones[3]!;
    const oy = 1.5;
    const ray = { ox: s.x, oy, oz: s.z + 10, dx: 0, dy: (s.height / 2 - oy) / 10, dz: -1 };
    expect(pickFirmIndex(grid, layout, ray)).not.toBeNull();
    const sky = { ox: s.x, oy, oz: s.z + 10, dx: 0, dy: 1, dz: -1 };
    expect(pickFirmIndex(grid, layout, sky)).toBeNull();
  });

  it('treats small movement as a tap and large movement as a drag', () => {
    expect(isTap({ x: 0, y: 0 }, 3, 3)).toBe(true);
    expect(isTap({ x: 0, y: 0 }, 30, 0)).toBe(false);
  });

  it('notifies hover subscribers and remembers the ray', () => {
    const fn = vi.fn();
    const off = subscribeHoverChange(fn);
    const ray = { ox: 0, oy: 1, oz: 2, dx: 0, dy: 0, dz: -1 };
    emitHoverChange({ firm: 2, ray });
    off();
    emitHoverChange({ firm: null, ray });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(getLastPointerRay()).toEqual(ray);
  });
});
