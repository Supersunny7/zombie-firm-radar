/**
 * Non-gating benchmark for `simulate` (rescue-engine task 14.5, Req 12.16).
 * Picked up only by `vitest bench`; `pnpm test` includes *.test / *.spec files only.
 */
import { describe, test } from 'vitest';
import { ashgroveWorks, fixtureMacro } from '../dev/fixtures';
import { simulate } from './simulate';
import type { ToolChoice, Treatment } from './types';

const DELTA = 0.01;
const SEED = 12345;
const PATHS = 1000;

const TOOLS: readonly ToolChoice[] = [
  { name: 'cut_costs', params: { c: 0.04 } },
  { name: 'sell_assets', params: { s: 0.15 } },
  { name: 'debt_for_equity', params: { w: 0.3 } },
  { name: 'refinance', params: {} },
] as ToolChoice[];

/** All subsets of the four v1 tools with at most 3 tools, in canonical order. */
function combinations(): { label: string; treatment: Treatment }[] {
  const out: { label: string; treatment: Treatment }[] = [];
  for (let mask = 0; mask < 1 << TOOLS.length; mask++) {
    const picked = TOOLS.filter((_, i) => (mask & (1 << i)) !== 0);
    if (picked.length > 3) continue;
    out.push({
      label: picked.length === 0 ? 'empty' : picked.map((t) => t.name).join(' + '),
      treatment: picked,
    });
  }
  return out;
}

describe('simulate, Ashgrove Works, 1000 paths', () => {
  for (const { label, treatment } of combinations()) {
    test(label, async ({ bench }) => {
      await bench(label, () => {
        const result = simulate(ashgroveWorks, treatment, DELTA, fixtureMacro, {
          paths: PATHS,
          seed: SEED,
        });
        if (!result.ok) throw new Error(result.error.message);
      }).run();
    });
  }
});
