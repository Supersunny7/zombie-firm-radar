import { useMemo } from 'react';
import { shockBatch } from '../engine';
import type { EngineError, ShockBatch } from '../engine';
import type { FirmIndexEntry } from '../types/data';
import { useStore } from './store';

export interface ShockView {
  readonly firms: readonly FirmIndexEntry[];
  /** Always present; empty when no data is loaded or the delta is invalid. */
  readonly batch: ShockBatch;
  readonly error: EngineError | null;
}

const NO_FIRMS: readonly FirmIndexEntry[] = Object.freeze([]);

function emptyBatch(delta: number): ShockBatch {
  const r = shockBatch([], 0);
  if (!r.ok) throw new Error('shockBatch rejected an empty list');
  return { ...r.value, delta };
}

/** Pure core of useShockView, exported for tests. */
export function computeShockView(firms: readonly FirmIndexEntry[], delta: number): ShockView {
  const r = shockBatch(firms, delta);
  if (r.ok) return { firms, batch: r.value, error: null };
  // Invalid delta: no counts are shown, the error is surfaced.
  return { firms, batch: emptyBatch(0), error: r.error };
}

/**
 * Shared source of shock results for the scene, HUD counters and Table_View
 * (requirement 19.5 holds by construction). Recomputes only when firms or delta change.
 */
export function useShockView(): ShockView {
  const firms = useStore((s) => s.data?.index.firms) ?? NO_FIRMS;
  const delta = useStore((s) => s.machine.ctx.rateShock);
  return useMemo(() => computeShockView(firms, delta), [firms, delta]);
}
