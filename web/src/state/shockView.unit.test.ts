import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { computeShockView, useShockView } from './shockView';
import { useStore } from './store';
import type { FirmIndexEntry } from '../types/data';

const firm = {
  cik: '0000000001',
  status: 'healthy',
  age_years: 20,
  latest_icr: 1.2,
  total_debt_usd: 100_000_000,
  implied_rate: 0.05,
  shock_eligible: true,
} as unknown as FirmIndexEntry;

describe('shock view', () => {
  it('counts a newly undead firm at +1.25 pp', () => {
    const v = computeShockView([firm], 0.0125);
    expect(v.error).toBeNull();
    expect(v.batch.counts.risen).toBe(1);
  });

  it('returns an error and an empty batch for an invalid delta', () => {
    const v = computeShockView([firm], 0.5);
    expect(v.error?.code).toBe('delta_out_of_range');
    expect(v.batch.newlyUndead.length).toBe(0);
  });

  it('handles no data loaded', () => {
    useStore.setState({ data: null });
    const { result } = renderHook(() => useShockView());
    expect(result.current.firms).toEqual([]);
    expect(result.current.batch.counts).toEqual({ risen: 0, alreadyUndead: 0, notEligible: 0 });
    expect(result.current.error).toBeNull();
  });
});
