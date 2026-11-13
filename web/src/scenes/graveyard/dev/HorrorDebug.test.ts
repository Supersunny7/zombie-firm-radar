import { describe, expect, it } from 'vitest';
import { computeLayout } from '../layout/layout';
import { parseHorrorParams, pickPlotFor } from './HorrorDebug';

const firms = Array.from({ length: 60 }, (_, i) => ({
  cik: String(i).padStart(10, '0'),
  sector: 'Services',
  status: (i % 2 === 0 ? 'zombie' : 'healthy') as 'zombie' | 'healthy',
  total_debt_usd: 1,
}));

describe('HorrorDebug helper', () => {
  it('parses the case and a shock in percentage points', () => {
    expect(parseHorrorParams('?horror=fallen&shock=2.5')).toEqual({
      horror: 'fallen',
      shockPp: 2.5,
    });
    expect(parseHorrorParams('?horror=x&shock=9')).toEqual({ horror: null, shockPp: null });
    expect(parseHorrorParams('')).toEqual({ horror: null, shockPp: null });
  });

  it('picks a plot that holds a zombie firm', () => {
    const layout = computeLayout(firms);
    const plot = pickPlotFor('zombies', layout, firms);
    expect(plot).not.toBeNull();
    expect(layout.plots[plot!]!.stones.some((i) => firms[i]!.status === 'zombie')).toBe(true);
  });
});
