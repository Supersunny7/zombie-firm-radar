import { describe, expect, expectTypeOf, it } from 'vitest';
import { initialMachine, transition } from './machine';
import type { Allowed, NextState } from './machine';
import type { Cik, GameEvent, GameEventType, GameState, Machine, RateShock, Result } from './types';

const CIK = '9000000001';
const TREATMENT = [{ name: 'cut_costs', params: { c: 0.05 } }];

const EVENTS: Record<GameEventType, GameEvent> = {
  selectFirm: { type: 'selectFirm', cik: CIK },
  captureDone: { type: 'captureDone' },
  pullSwitch: { type: 'pullSwitch', treatment: TREATMENT, result: 'revived' },
  continue: { type: 'continue' },
  cancel: { type: 'cancel' },
  setRateShock: { type: 'setRateShock', value: 0.02 },
  setTreatment: { type: 'setTreatment', treatment: TREATMENT },
  setResult: { type: 'setResult', result: 'undead' },
};

const STATES: GameState[] = ['graveyard', 'capture', 'lab', 'outcome'];
const EVENT_TYPES = Object.keys(EVENTS) as GameEventType[];

function apply(m: Machine, ...events: GameEvent[]): Machine {
  let cur = m;
  for (const e of events) {
    const out = transition(cur, e);
    if (!out.ok) throw new Error(`setup rejected ${e.type}: ${out.rejected.reason}`);
    cur = out.machine;
  }
  return cur;
}

function machineIn(state: GameState): Machine {
  const path: Record<GameState, GameEvent[]> = {
    graveyard: [],
    capture: [EVENTS.selectFirm],
    lab: [EVENTS.selectFirm, EVENTS.captureDone],
    outcome: [EVENTS.selectFirm, EVENTS.captureDone, EVENTS.pullSwitch],
  };
  return apply(initialMachine(), ...path[state]);
}

// [from, event, expected next state]
const VALID: [GameState, GameEventType, GameState][] = [
  ['graveyard', 'selectFirm', 'capture'],
  ['graveyard', 'setRateShock', 'graveyard'],
  ['capture', 'captureDone', 'lab'],
  ['capture', 'cancel', 'graveyard'],
  ['capture', 'setRateShock', 'capture'],
  ['lab', 'pullSwitch', 'outcome'],
  ['lab', 'cancel', 'graveyard'],
  ['lab', 'setRateShock', 'lab'],
  ['lab', 'setTreatment', 'lab'],
  ['lab', 'setResult', 'lab'],
  ['outcome', 'continue', 'graveyard'],
  ['outcome', 'setRateShock', 'outcome'],
  ['outcome', 'setResult', 'outcome'],
];

const INVALID: [GameState, GameEventType][] = STATES.flatMap((s) =>
  EVENT_TYPES.filter((e) => !VALID.some(([from, ev]) => from === s && ev === e)).map(
    (e): [GameState, GameEventType] => [s, e],
  ),
);

describe('machine valid transitions', () => {
  it.each(VALID)('%s + %s -> %s', (from, event, to) => {
    const m = machineIn(from);
    const out = transition(m, EVENTS[event]);
    expect(out.ok).toBe(true);
    expect(out.machine.state).toBe(to);
  });

  it('selectFirm stores the cik; pullSwitch stores treatment and result', () => {
    const lab = machineIn('lab');
    expect(lab.ctx.cik).toBe(CIK);
    const outcome = machineIn('outcome');
    expect(outcome.ctx.treatment).toEqual(TREATMENT);
    expect(outcome.ctx.result).toBe('revived');
  });

  it('setRateShock updates the context and survives continue', () => {
    const m = apply(initialMachine(), EVENTS.setRateShock);
    expect(m.ctx.rateShock).toBe(0.02);
    const after = apply(machineIn('outcome'), EVENTS.setRateShock, EVENTS.continue);
    expect(after.ctx.rateShock).toBe(0.02);
    expect(after.ctx.cik).toBeNull();
    expect(after.ctx.result).toBeNull();
  });

  it('cancel clears the firm and treatment', () => {
    const m = apply(machineIn('lab'), EVENTS.setTreatment, EVENTS.cancel);
    expect(m.state).toBe('graveyard');
    expect(m.ctx.cik).toBeNull();
    expect(m.ctx.treatment).toEqual([]);
  });
});

describe('machine invalid state and event pairs', () => {
  it('covers every pair not in the valid table', () => {
    expect(INVALID.length).toBe(STATES.length * EVENT_TYPES.length - VALID.length);
  });

  it.each(INVALID)('%s + %s is rejected without change', (state, event) => {
    const m = machineIn(state);
    const out = transition(m, EVENTS[event]);
    expect(out.ok).toBe(false);
    expect(out.machine).toBe(m);
    if (!out.ok) {
      expect(out.rejected.event).toBe(event);
      expect(out.rejected.state).toBe(state);
      expect(out.rejected.reason.length).toBeGreaterThan(0);
    }
  });
});

describe('machine history', () => {
  it('starts empty', () => {
    expect(initialMachine().history.size).toBe(0);
  });

  it('continue records the result for the firm without mutating the old map', () => {
    const outcome = machineIn('outcome');
    const before = outcome.history;
    const after = apply(outcome, EVENTS.continue);
    expect(after.history.get(CIK as Cik)).toBe('revived');
    expect(after.history).not.toBe(before);
    expect(before.size).toBe(0);
  });

  it('a later outcome overwrites the earlier one for the same firm', () => {
    const second = apply(
      machineIn('outcome'),
      EVENTS.continue,
      EVENTS.selectFirm,
      EVENTS.captureDone,
      { type: 'pullSwitch', treatment: [], result: 'liquidated' },
      EVENTS.continue,
    );
    expect(second.history.get(CIK as Cik)).toBe('liquidated' satisfies Result);
    expect(second.history.size).toBe(1);
  });

  it('other events leave history untouched', () => {
    const m = machineIn('outcome');
    const after = apply(m, EVENTS.setResult, EVENTS.setRateShock);
    expect(after.history).toBe(m.history);
  });
});

describe('machine types', () => {
  it('captureDone from graveyard is never', () => {
    expectTypeOf<NextState<'graveyard', 'captureDone'>>().toBeNever();
  });

  it('listed transitions resolve to their target state', () => {
    expectTypeOf<NextState<'graveyard', 'selectFirm'>>().toEqualTypeOf<'capture'>();
    expectTypeOf<NextState<'lab', 'pullSwitch'>>().toEqualTypeOf<'outcome'>();
    expectTypeOf<NextState<'outcome', 'continue'>>().toEqualTypeOf<'graveyard'>();
    expectTypeOf<keyof Allowed>().toEqualTypeOf<GameState>();
  });

  it('RateShock is branded', () => {
    expectTypeOf<number>().not.toEqualTypeOf<RateShock>();
  });
});
