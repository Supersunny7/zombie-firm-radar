/**
 * Hand budget and slot manager for the Craggle hands (Requirement 14, design Section 9).
 * Pure: no timers, no React, no three.
 */

export const HAND_BUDGET = 8;

export interface HandCandidate {
  cik: string;
  dist: number;
}

function compareCandidates(a: HandCandidate, b: HandCandidate): number {
  if (a.dist !== b.dist) return a.dist < b.dist ? -1 : 1;
  if (a.cik === b.cik) return 0;
  return a.cik < b.cik ? -1 : 1; // plain string order, not locale order
}

/**
 * Which newly undead firms deserve a hand: nearest first, ties by lower CIK
 * (ascending string order). Duplicate CIKs are counted once. Input is not mutated.
 */
export function assignHands(
  candidates: readonly HandCandidate[],
  budget: number = HAND_BUDGET,
): string[] {
  const n = Number.isFinite(budget) ? Math.max(0, Math.floor(budget)) : 0;
  const seen = new Set<string>();
  const unique: HandCandidate[] = [];
  for (const c of [...candidates].sort(compareCandidates)) {
    if (seen.has(c.cik)) continue;
    seen.add(c.cik);
    unique.push(c);
  }
  return unique.slice(0, n).map((c) => c.cik);
}

export type SlotState = 'idle' | 'rising' | 'up' | 'lowering';

export interface HandSlot {
  cik: string | null;
  state: SlotState;
  /** Seconds spent in the current state. */
  t: number;
}

export interface HandPoolState {
  slots: HandSlot[];
}

export interface HandPoolOptions {
  reduced: boolean;
  riseSeconds: number;
  lowerSeconds: number;
}

export function createHandPool(): HandPoolState {
  return {
    slots: Array.from({ length: HAND_BUDGET }, () => ({ cik: null, state: 'idle' as const, t: 0 })),
  };
}

/** Number of slots that are rising, up or lowering (never above HAND_BUDGET). */
export function activeCount(s: HandPoolState): number {
  let n = 0;
  for (const slot of s.slots) if (slot.state !== 'idle') n++;
  return n;
}

/** Rise progress 0..1 of a slot (linear in time; handPose applies the easing). */
export function slotProgress(
  slot: HandSlot,
  opts: Pick<HandPoolOptions, 'riseSeconds' | 'lowerSeconds'>,
): number {
  switch (slot.state) {
    case 'idle':
      return 0;
    case 'up':
      return 1;
    case 'rising':
      return opts.riseSeconds <= 0 ? 1 : Math.min(1, Math.max(0, slot.t / opts.riseSeconds));
    case 'lowering':
      return opts.lowerSeconds <= 0 ? 0 : Math.min(1, Math.max(0, 1 - slot.t / opts.lowerSeconds));
  }
}

const IDLE_AT_ONCE_T = 0.1;

/**
 * Advance the pool by dt seconds toward the desired CIK list.
 * `started` lists the CIKs whose rise began in this step (one per transition into rising).
 */
export function stepHandPool(
  s: HandPoolState,
  desired: readonly string[],
  dt: number,
  opts: HandPoolOptions,
): { state: HandPoolState; started: string[] } {
  const step = Number.isFinite(dt) && dt > 0 ? dt : 0;
  const want = new Set(desired.slice(0, HAND_BUDGET));
  const slots: HandSlot[] = s.slots.map((slot) => ({ ...slot }));

  // 1. Advance time and finish transitions.
  for (const slot of slots) {
    if (slot.state === 'idle') continue;
    slot.t += step;
    if (slot.state === 'rising' && slot.t >= opts.riseSeconds) {
      slot.state = 'up';
      slot.t = 0;
    } else if (slot.state === 'lowering' && slot.t >= opts.lowerSeconds) {
      slot.cik = null;
      slot.state = 'idle';
      slot.t = 0;
    }
  }

  // 2. Release slots whose firm is no longer desired.
  for (const slot of slots) {
    if (slot.cik === null || want.has(slot.cik)) continue;
    if (slot.state === 'up' || slot.state === 'rising') {
      if (opts.reduced || (slot.state === 'rising' && slot.t < IDLE_AT_ONCE_T)) {
        slot.cik = null;
        slot.state = 'idle';
        slot.t = 0;
      } else {
        slot.state = 'lowering';
        // Continue from the current height so the hand does not jump.
        const p = slotProgress(slot, opts);
        slot.t = opts.lowerSeconds * (1 - p);
      }
    } else if (slot.state === 'lowering' && opts.reduced) {
      slot.cik = null;
      slot.state = 'idle';
      slot.t = 0;
    }
  }

  // 3. Give idle slots to desired firms that have no slot yet (a lowering slot still holds its firm).
  const held = new Set<string>();
  for (const slot of slots) if (slot.cik !== null) held.add(slot.cik);
  const started: string[] = [];
  let free = 0;
  for (const cik of desired.slice(0, HAND_BUDGET)) {
    if (held.has(cik)) continue;
    while (free < slots.length && slots[free]?.state !== 'idle') free++;
    const slot = slots[free];
    if (slot === undefined) break;
    slot.cik = cik;
    slot.state = opts.reduced ? 'up' : 'rising';
    slot.t = 0;
    held.add(cik);
    started.push(cik);
  }

  return { state: { slots }, started };
}
