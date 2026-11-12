// @vitest-environment node
// Requirements 1.6, 1.7, 1.9: shared ICR golden cases (partner-owned, optional file).
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { icr } from './icr';
import { parseGoldenCases } from './test/goldenCases';

const goldenPath = fileURLToPath(new URL('../../../data/fixtures/icr_cases.json', import.meta.url));

describe('icr golden cases', () => {
  it.skipIf(!existsSync(goldenPath))(
    'matches every case in data/fixtures/icr_cases.json within 1e-9',
    () => {
      const cases = parseGoldenCases(readFileSync(goldenPath, 'utf8'), goldenPath);
      cases.forEach((c, index) => {
        const actual = icr(c.ebit, c.interest);
        const label = `${goldenPath} case ${index}`;
        if (c.expected === null) {
          expect(actual, label).toBeNull();
        } else {
          expect(actual, label).not.toBeNull();
          expect(Math.abs((actual as number) - c.expected), label).toBeLessThanOrEqual(1e-9);
        }
      });
    },
  );
});
