import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { EngineErrorCode } from './errors';
import { applyTreatment } from './apply';
import { drawOutcome } from './outcome';
import { simulate } from './simulate';
import { parseTreatment } from './treatment';
import type { Treatment } from './types';
import {
  arbBadTreatment,
  arbDelta,
  arbMacroValid,
  arbSeed,
  arbValidFirm,
} from './test/engineArbitraries';

// Feature: rescue-engine, Property 3: The parser rejects invalid treatments with one deterministic error
// **Validates: Requirements 2.6, 3.3, 3.4, 3.5, 3.6, 3.8, 3.11, 3.15, 4.12, 6.10, 9.10**

interface Expected {
  readonly code: EngineErrorCode;
  readonly tool?: string;
  readonly param?: string;
  readonly index?: number;
}

/** Independent reference tables (deliberately not imported from the engine). */
const V1: Readonly<Record<string, { key?: string; max?: number }>> = {
  cut_costs: { key: 'c', max: 0.08 },
  sell_assets: { key: 's', max: 0.3 },
  debt_for_equity: { key: 'w', max: 0.6 },
  refinance: {},
};

const isObj = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);

/** Req 3.11 order, written straight from the design text. */
function classify(value: unknown): Expected {
  if (!Array.isArray(value)) return { code: 'invalid_treatment' };
  const list = value as unknown[];
  if (list.length > 3) return { code: 'too_many_tools' };

  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (!isObj(e) || typeof e.name !== 'string') return { code: 'invalid_treatment', index: i };
    if (!Object.hasOwn(V1, e.name)) return { code: 'unknown_tool', tool: e.name, index: i };
  }

  const names = list.map((e) => (e as { name: string }).name);
  for (let i = 0; i < names.length; i++) {
    if (names.indexOf(names[i] as string) !== i) {
      return { code: 'duplicate_tool', tool: names[i] as string };
    }
  }

  for (const e of list as { name: string; params?: unknown }[]) {
    const spec = V1[e.name] as { key?: string; max?: number };
    if (e.params !== undefined && !isObj(e.params)) {
      return { code: 'param_out_of_range', tool: e.name, param: 'params' };
    }
    const given = (e.params ?? {}) as Record<string, unknown>;
    if (spec.key !== undefined && !Object.hasOwn(given, spec.key)) {
      return { code: 'param_out_of_range', tool: e.name, param: spec.key };
    }
    const extra = Object.keys(given).find((k) => k !== spec.key);
    if (extra !== undefined) return { code: 'param_out_of_range', tool: e.name, param: extra };
    if (spec.key !== undefined) {
      const v = given[spec.key];
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > (spec.max as number)) {
        return { code: 'param_out_of_range', tool: e.name, param: spec.key };
      }
    }
  }
  throw new Error('classifier found no defect in a corrupted treatment');
}

describe('parseTreatment rejection (Property 3)', () => {
  it('rejects every corrupted treatment with one deterministic error', () => {
    fc.assert(
      fc.property(
        arbBadTreatment,
        arbValidFirm,
        arbMacroValid,
        arbDelta,
        arbSeed,
        fc.integer({ min: 1, max: 20 }),
        ({ value }, firm, macro, delta, seed, paths) => {
          const before = structuredClone(value);
          const firmBefore = structuredClone(firm);
          const macroBefore = structuredClone(macro);
          const expected = classify(value);

          const first = parseTreatment(value);
          const second = parseTreatment(value);

          expect(first.ok).toBe(false);
          if (first.ok) return;
          expect(first.error.code).toBe(expected.code);
          expect(first.error.detail?.tool).toBe(expected.tool);
          expect(first.error.detail?.param).toBe(expected.param);
          expect(first.error.detail?.index).toBe(expected.index);

          expect(second).toStrictEqual(first);
          expect(value).toStrictEqual(before);

          const bad = value as Treatment;
          const applied = applyTreatment(firm, bad, delta, macro);
          const simulated = simulate(firm, bad, delta, macro, { paths, seed });
          const drawn = drawOutcome(firm, bad, delta, macro, seed);
          for (const r of [applied, simulated, drawn]) {
            expect(r.ok).toBe(false);
            if (r.ok) return;
            expect(r.error).toStrictEqual(first.error);
          }
          expect(firm).toStrictEqual(firmBefore);
          expect(macro).toStrictEqual(macroBefore);
          expect(value).toStrictEqual(before);
        },
      ),
      { numRuns: 200 },
    );
  });
});
