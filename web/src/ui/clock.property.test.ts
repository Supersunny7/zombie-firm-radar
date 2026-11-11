// Feature: app-shell, Property 13: HUD timestamp format
// **Validates: Requirements 10.2**
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { formatTimestamp } from './Clock';

describe('Property 13: HUD timestamp format', () => {
  it('matches YYYY-MM-DD HH:mm:ss and equals the local date components', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date(1000, 0, 2), max: new Date(9998, 11, 30), noInvalidDate: true }),
        (d) => {
          const out = formatTimestamp(d);
          const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(out);
          expect(m).not.toBeNull();
          const [, y, mo, da, h, mi, s] = (m as RegExpExecArray).map(Number);
          expect(y).toBe(d.getFullYear());
          expect(mo).toBe(d.getMonth() + 1);
          expect(da).toBe(d.getDate());
          expect(h).toBe(d.getHours());
          expect(mi).toBe(d.getMinutes());
          expect(s).toBe(d.getSeconds());
        },
      ),
      { numRuns: 200 },
    );
  });
});
