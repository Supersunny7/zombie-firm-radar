/** Game-flow state machine. Pure; no React or three.js imports. */
import type {
  Cik,
  GameContext,
  GameEvent,
  GameEventType,
  GameState,
  Machine,
  RateShock,
  Rejection,
  Result,
  ToolChoice,
  Treatment,
  TransitionOutcome,
} from './types';

export const MAX_TOOLS = 3;
export const MAX_RATE_SHOCK = 0.05;

/**
 * Every allowed transition: state -> event -> next state.
 * Context-only events keep the same state.
 */
export interface Allowed {
  graveyard: { selectFirm: 'capture'; setRateShock: 'graveyard' };
  capture: { captureDone: 'lab'; cancel: 'graveyard'; setRateShock: 'capture' };
  lab: {
    pullSwitch: 'outcome';
    cancel: 'graveyard';
    setRateShock: 'lab';
    setTreatment: 'lab';
    setResult: 'lab';
  };
  outcome: { continue: 'graveyard'; setRateShock: 'outcome'; setResult: 'outcome' };
}

/** Next state for a state and event pair; `never` when the pair is not listed. */
export type NextState<S extends GameState, E extends GameEventType> = E extends keyof Allowed[S]
  ? Allowed[S][E]
  : never;

// ---------- parsers ----------

export type Parsed<T> = { ok: true; value: T } | { ok: false; reason: string };

const CIK_RE = /^\d{10}$/;
const RESULTS: readonly Result[] = ['revived', 'undead', 'liquidated'];

export function parseCik(v: unknown): Parsed<Cik> {
  if (typeof v !== 'string' || !CIK_RE.test(v)) {
    return { ok: false, reason: 'CIK must be a 10-digit zero-padded string' };
  }
  return { ok: true, value: v as Cik };
}

export function parseRateShock(v: unknown): Parsed<RateShock> {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    return { ok: false, reason: 'Rate shock must be a finite number' };
  }
  if (v < 0 || v > MAX_RATE_SHOCK) {
    return { ok: false, reason: `Rate shock must be between 0 and ${MAX_RATE_SHOCK}` };
  }
  return { ok: true, value: v as RateShock };
}

export function parseResult(v: unknown): Parsed<Result> {
  if (typeof v === 'string' && (RESULTS as readonly string[]).includes(v)) {
    return { ok: true, value: v as Result };
  }
  return { ok: false, reason: 'Result must be revived, undead or liquidated' };
}

export function parseTreatment(v: unknown): Parsed<Treatment> {
  if (!Array.isArray(v)) return { ok: false, reason: 'Treatment must be an array of tools' };
  if (v.length > MAX_TOOLS) {
    return { ok: false, reason: `Treatment can hold at most ${MAX_TOOLS} tools` };
  }
  const tools: ToolChoice[] = [];
  for (const raw of v as unknown[]) {
    if (typeof raw !== 'object' || raw === null) {
      return { ok: false, reason: 'Each tool must be an object' };
    }
    const { name, params } = raw as { name?: unknown; params?: unknown };
    if (typeof name !== 'string' || name.length === 0) {
      return { ok: false, reason: 'Each tool needs a non-empty name' };
    }
    if (typeof params !== 'object' || params === null || Array.isArray(params)) {
      return { ok: false, reason: 'Each tool needs a params record' };
    }
    const out: Record<string, number | boolean> = {};
    for (const [k, p] of Object.entries(params)) {
      if (typeof p === 'boolean' || (typeof p === 'number' && Number.isFinite(p))) out[k] = p;
      else return { ok: false, reason: `Tool param "${k}" must be a finite number or boolean` };
    }
    tools.push({ name, params: out });
  }
  return { ok: true, value: tools };
}

// ---------- machine ----------

const ZERO_SHOCK = 0 as RateShock;

function emptyContext(rateShock: RateShock): GameContext {
  return { cik: null, treatment: [], rateShock, result: null };
}

export function initialMachine(): Machine {
  return { state: 'graveyard', ctx: emptyContext(ZERO_SHOCK), history: new Map() };
}

function reject(m: Machine, event: GameEvent, reason: string, value?: unknown): TransitionOutcome {
  const rejected: Rejection = { event: event.type, state: m.state, reason };
  if (value !== undefined) rejected.value = value;
  return { ok: false, machine: m, rejected };
}

/** Builds the next machine; `to` must be listed in Allowed for the current state S. */
function step<S extends GameState>(
  m: Machine & { state: S },
  to: Allowed[S][keyof Allowed[S]],
  ctx: GameContext,
  history: ReadonlyMap<Cik, Result> = m.history,
): TransitionOutcome {
  return { ok: true, machine: { state: to as GameState, ctx, history } };
}

function assertNever(x: never): never {
  throw new Error(`Unhandled event: ${JSON.stringify(x)}`);
}

export function transition(m: Machine, e: GameEvent): TransitionOutcome {
  // setRateShock is valid in every state and only changes the context.
  const invalid = (): TransitionOutcome =>
    reject(m, e, `Event "${e.type}" is not valid in state "${m.state}"`);

  switch (e.type) {
    case 'setRateShock': {
      const p = parseRateShock(e.value);
      if (!p.ok) return reject(m, e, p.reason, e.value);
      return { ok: true, machine: { ...m, ctx: { ...m.ctx, rateShock: p.value } } };
    }
    case 'selectFirm': {
      if (m.state !== 'graveyard') return invalid();
      const p = parseCik(e.cik);
      if (!p.ok) return reject(m, e, p.reason, e.cik);
      return step(m, 'capture', { ...m.ctx, cik: p.value });
    }
    case 'captureDone':
      if (m.state !== 'capture') return invalid();
      return step(m, 'lab', m.ctx);
    case 'pullSwitch': {
      if (m.state !== 'lab') return invalid();
      const t = parseTreatment(e.treatment);
      if (!t.ok) return reject(m, e, t.reason, e.treatment);
      const r = parseResult(e.result);
      if (!r.ok) return reject(m, e, r.reason, e.result);
      return step(m, 'outcome', { ...m.ctx, treatment: t.value, result: r.value });
    }
    case 'continue': {
      if (m.state !== 'outcome') return invalid();
      const { cik, result } = m.ctx;
      let history = m.history;
      if (cik !== null && result !== null) {
        const next = new Map(m.history);
        next.set(cik, result);
        history = next;
      }
      return step(m, 'graveyard', emptyContext(m.ctx.rateShock), history);
    }
    case 'cancel':
      if (m.state !== 'capture' && m.state !== 'lab') return invalid();
      return step(m, 'graveyard', { ...emptyContext(m.ctx.rateShock) });
    case 'setTreatment': {
      if (m.state !== 'lab') return invalid();
      const t = parseTreatment(e.treatment);
      if (!t.ok) return reject(m, e, t.reason, e.treatment);
      return step(m, 'lab', { ...m.ctx, treatment: t.value });
    }
    case 'setResult': {
      if (m.state !== 'lab' && m.state !== 'outcome') return invalid();
      const r = parseResult(e.result);
      if (!r.ok) return reject(m, e, r.reason, e.result);
      return { ok: true, machine: { ...m, ctx: { ...m.ctx, result: r.value } } };
    }
    default:
      return assertNever(e);
  }
}
