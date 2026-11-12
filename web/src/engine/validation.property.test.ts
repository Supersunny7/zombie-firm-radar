import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Firm, Macro } from '../types/data';
import { applyTreatment } from './apply';
import { diagnose } from './diagnose';
import type { EngineError, EngineResult } from './errors';
import { drawOutcome } from './outcome';
import { simulate, simulateWith } from './simulate';
import { parseTreatment } from './treatment';
import type { Treatment } from './types';
import {
  arbBadDelta,
  arbBadFirm,
  arbBadMacro,
  arbBadPaths,
  arbBadSeed,
  arbBadTreatment,
  arbDelta,
  arbMacroValid,
  arbSeed,
  arbTreatment,
  arbValidFirm,
} from './test/engineArbitraries';

// Feature: rescue-engine, Property 7: Invalid inputs give one typed error in Validation_Order
// **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.12, 4.13, 4.14, 8.13, 8.16, 9.12, 14.8**

type Defect = 'delta' | 'treatment' | 'firm' | 'macro' | 'paths' | 'seed';

/** Validation_Order: delta, treatment, firm, b, paths, seed. */
const ORDER: readonly Defect[] = ['delta', 'treatment', 'firm', 'macro', 'paths', 'seed'];

const arbCase = fc.record({
  active: fc.record({
    delta: fc.boolean(),
    treatment: fc.boolean(),
    firm: fc.boolean(),
    macro: fc.boolean(),
    paths: fc.boolean(),
    seed: fc.boolean(),
  }),
  badDelta: arbBadDelta,
  goodDelta: arbDelta,
  badTreatment: arbBadTreatment,
  goodTreatment: arbTreatment,
  badFirm: arbBadFirm,
  goodFirm: arbValidFirm,
  badMacro: arbBadMacro,
  goodMacro: arbMacroValid,
  badPaths: arbBadPaths,
  goodPaths: fc.integer({ min: 1, max: 20 }),
  badSeed: arbBadSeed,
  goodSeed: arbSeed,
});

type Case = typeof arbCase extends fc.Arbitrary<infer T> ? T : never;

interface Args {
  readonly firm: Firm;
  readonly treatment: unknown;
  readonly delta: unknown;
  readonly macro: Macro;
  readonly paths: unknown;
  readonly seed: unknown;
}

function argsOf(c: Case): Args {
  return {
    delta: c.active.delta ? c.badDelta.delta : c.goodDelta,
    treatment: c.active.treatment ? c.badTreatment.value : c.goodTreatment,
    firm: c.active.firm ? c.badFirm.firm : c.goodFirm,
    macro: c.active.macro ? c.badMacro.macro : c.goodMacro,
    paths: c.active.paths ? c.badPaths.paths : c.goodPaths,
    seed: c.active.seed ? c.badSeed.seed : c.goodSeed,
  };
}

/** First active defect among the ones the function validates, or null. */
function firstDefect(c: Case, validates: readonly Defect[]): Defect | null {
  return ORDER.find((d) => validates.includes(d) && c.active[d]) ?? null;
}

function expectedError(
  c: Case,
  d: Defect,
): { code: string; inputs?: readonly string[]; value?: unknown } {
  switch (d) {
    case 'delta':
      return { code: 'delta_out_of_range', value: c.badDelta.delta };
    case 'treatment': {
      const p = parseTreatment(c.badTreatment.value);
      if (p.ok) throw new Error('arbBadTreatment produced a treatment the parser accepts');
      return { code: p.error.code };
    }
    case 'firm':
      return { code: 'not_rescuable', inputs: c.badFirm.inputs };
    case 'macro':
      return { code: 'not_rescuable', inputs: ['b'] };
    case 'paths':
      return { code: 'invalid_paths', value: c.badPaths.paths };
    case 'seed':
      return { code: 'invalid_seed', value: c.badSeed.seed };
  }
}

function checkError(c: Case, d: Defect, result: EngineResult<unknown>): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  const err: EngineError = result.error;
  const exp = expectedError(c, d);
  expect(err.code).toBe(exp.code);
  if (d === 'treatment') {
    const p = parseTreatment(c.badTreatment.value);
    if (!p.ok) expect(err).toEqual(p.error);
  }
  if (exp.inputs) expect(err.detail?.inputs).toEqual(exp.inputs);
  // No clamping or coercion: the offending value is reported as given.
  if (d === 'delta' || d === 'paths' || d === 'seed') {
    expect(Object.is(err.detail?.value, exp.value)).toBe(true);
  }
}

/** Runs one function on a case; asserts the shared contract. */
function run(
  c: Case,
  validates: readonly Defect[],
  call: (a: Args) => EngineResult<unknown>,
): void {
  const d = firstDefect(c, validates);
  fc.pre(d !== null);
  const args = argsOf(c);
  const firmClone = structuredClone(args.firm);
  const macroClone = structuredClone(args.macro);
  let result: EngineResult<unknown> | undefined;
  expect(() => {
    result = call(args);
  }).not.toThrow();
  checkError(c, d as Defect, result as EngineResult<unknown>);
  expect(args.firm).toEqual(firmClone);
  expect(args.macro).toEqual(macroClone);
}

const OPTS = { numRuns: 200 };

describe('Property 7: invalid inputs give one typed error in Validation_Order', () => {
  it('diagnose returns the first of delta, firm, b', () => {
    fc.assert(
      fc.property(arbCase, (c) =>
        run(c, ['delta', 'firm', 'macro'], (a) => diagnose(a.firm, a.delta as number, a.macro)),
      ),
      OPTS,
    );
  });

  it('applyTreatment returns the first of delta, treatment, firm, b', () => {
    fc.assert(
      fc.property(arbCase, (c) =>
        run(c, ['delta', 'treatment', 'firm', 'macro'], (a) =>
          applyTreatment(a.firm, a.treatment as Treatment, a.delta as number, a.macro),
        ),
      ),
      OPTS,
    );
  });

  it('simulate returns the first of delta, treatment, firm, b, paths, seed and runs no path', () => {
    fc.assert(
      fc.property(arbCase, (c) => {
        run(c, ORDER, (a) =>
          simulate(a.firm, a.treatment as Treatment, a.delta as number, a.macro, {
            paths: a.paths as number,
            seed: a.seed as number,
          }),
        );
        // Counting generator: an invalid call must consume zero uniforms.
        let made = 0;
        let uniforms = 0;
        const a = argsOf(c);
        const r = simulateWith(
          a.firm,
          a.treatment as Treatment,
          a.delta as number,
          a.macro,
          { paths: a.paths as number, seed: a.seed as number },
          (seed) => {
            made++;
            let s = seed >>> 0;
            return () => {
              uniforms++;
              s = (s + 0x6d2b79f5) >>> 0;
              return s / 4294967296;
            };
          },
        );
        expect(r.ok).toBe(false);
        expect(made).toBe(0);
        expect(uniforms).toBe(0);
      }),
      OPTS,
    );
  });

  it('drawOutcome returns the first of delta, treatment, firm, b, seed', () => {
    fc.assert(
      fc.property(arbCase, (c) =>
        run(c, ['delta', 'treatment', 'firm', 'macro', 'seed'], (a) =>
          drawOutcome(
            a.firm,
            a.treatment as Treatment,
            a.delta as number,
            a.macro,
            a.seed as number,
          ),
        ),
      ),
      OPTS,
    );
  });
});
