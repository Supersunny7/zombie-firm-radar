/** Pure types for the game-flow machine. No React or three.js imports. */

/** 10-digit zero-padded CIK. Create only through parseCik. */
export type Cik = string & { readonly __brand: 'Cik' };
/** Decimal rate change, finite, 0 to 0.05 inclusive. Create only through parseRateShock. */
export type RateShock = number & { readonly __brand: 'RateShock' };

export type Result = 'revived' | 'undead' | 'liquidated';

/** Canonical tool types come from the rescue-engine (0 to 3 tools, enforced by parseTreatment). */
export type { ToolChoice, Treatment } from '../engine/types';

import type { Treatment } from '../engine/types';

export interface GameContext {
  cik: Cik | null;
  treatment: Treatment;
  rateShock: RateShock;
  result: Result | null;
}

export type GameState = 'graveyard' | 'capture' | 'lab' | 'outcome';

/** Raw payloads are unknown on purpose: the parsers run inside transition. */
export type GameEvent =
  | { type: 'selectFirm'; cik: unknown }
  | { type: 'captureDone' }
  | { type: 'pullSwitch'; treatment: unknown; result: unknown }
  | { type: 'continue' }
  | { type: 'cancel' }
  | { type: 'setRateShock'; value: unknown }
  | { type: 'setTreatment'; treatment: unknown }
  | { type: 'setResult'; result: unknown };

export type GameEventType = GameEvent['type'];

export interface Machine {
  readonly state: GameState;
  readonly ctx: GameContext;
  /** Completed outcomes per firm, written only by `continue`. */
  readonly history: ReadonlyMap<Cik, Result>;
}

export interface Rejection {
  event: GameEventType;
  state: GameState;
  reason: string;
  value?: unknown;
}

export type TransitionOutcome =
  { ok: true; machine: Machine } | { ok: false; machine: Machine; rejected: Rejection };
