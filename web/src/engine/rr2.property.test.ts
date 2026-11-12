import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applyCore } from './apply';
import { prepare } from './inputs';
import { projectPath } from './project';
import { arbRr2Case } from './test/engineArbitraries';
import { geq } from './test/geq';
import type { ToolChoice } from './types';

describe('RR-2: a larger cost cut never lowers year-1 coverage (property)', () => {
  // Feature: rescue-engine, Property 12: A larger cost cut never lowers year-1 coverage (RR-2, on the RR-2 domain)
  // **Validates: Requirements 13.3**
  it('keeps year-1 EBIT and coverage non-decreasing in the cut', () => {
    fc.assert(
      fc.property(
        arbRr2Case,
        fc.double({ min: 0, max: 0.08, noNaN: true }),
        fc.double({ min: 0, max: 0.08, noNaN: true }),
        (c, x, y) => {
          const c1 = Math.min(x, y);
          const c2 = Math.max(x, y);

          const prepared = prepare(c.firm, c.delta, c.macro);
          expect(prepared.ok).toBe(true);
          if (!prepared.ok) return;
          const inputs = prepared.value;

          const withCut = (cut: number): readonly ToolChoice[] => [
            ...c.baseTreatment,
            { name: 'cut_costs', params: { c: cut } },
          ];
          const run = (cut: number) => {
            const post = applyCore(inputs, withCut(cut), c.block.recovery);
            return projectPath(inputs, post, c.block);
          };

          // Precondition (asserted, never a filter).
          const mB = inputs.E / inputs.R;
          const m1AtMax = run(0.08).margin[0];
          expect(0.7 * (1 - mB) * (1 + inputs.g - 0.04) >= 0.5 * m1AtMax).toBe(true);

          const p1 = run(c1);
          const p2 = run(c2);
          const e1 = p1.ebit[0];
          const e2 = p2.ebit[0];
          expect(geq(e2, e1, 1e-12)).toBe(true);
          if (e1 >= 0) {
            expect(geq(p2.icr[0], p1.icr[0], 1e-12)).toBe(true);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
