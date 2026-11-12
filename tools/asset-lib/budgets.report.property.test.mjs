import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { account, formatReport, LIMITS } from './budgets.mjs';

// Feature: asset-pipeline, Property 3: Budget report content and exit code
// **Validates: Requirements 16.8, 17.4, 17.5, 17.7**

const OVERSIZE = 5_242_880;

const sizeArb = fc.oneof(
  fc.integer({ min: 0, max: 1_000_000 }),
  fc.integer({ min: 0, max: 40_000_000 }),
  fc.constantFrom(0, OVERSIZE, OVERSIZE + 1, LIMITS.graveyard, LIMITS.graveyard + 1, LIMITS.total + 1),
);

const filesArb = fc
  .array(
    fc.record({
      bytes: sizeArb,
      group: fc.constantFrom('graveyard', 'lab', null),
      unreadable: fc.integer({ min: 0, max: 9 }).map((n) => n === 0),
    }),
    { maxLength: 25 },
  )
  .map((rows) =>
    rows.map((r, i) =>
      r.unreadable
        ? { path: `models/f${i}.glb`, group: r.group, error: 'EACCES' }
        : { path: `models/f${i}.glb`, bytes: r.bytes, group: r.group },
    ),
  );

describe('Property 3: Budget report content and exit code', () => {
  it('lists every file, top-3 per exceeded budget, exact oversize set, and exit code iff', () => {
    fc.assert(
      fc.property(filesArb, (files) => {
        const report = account(files);
        const readable = files.filter((f) => f.error === undefined);

        // Every readable file appears with its size, in the report and the text.
        expect(report.files.map((f) => f.path)).toEqual(readable.map((f) => f.path));
        const text = formatReport(report);
        for (const f of readable) expect(text).toContain(`${f.path}: ${f.bytes} B`);

        // Top three per exceeded budget, descending, or all if fewer.
        for (const n of report.exceeded) {
          const pool = readable.filter((f) => n === 'total' || f.group === n);
          const sizes = pool.map((f) => f.bytes).sort((a, b) => b - a).slice(0, 3);
          const got = report.largest[n];
          expect(got.map((f) => f.bytes)).toEqual(sizes);
          expect(got.length).toBe(Math.min(3, pool.length));
          for (const f of got) expect(text).toContain(`${f.path}: ${f.bytes} B`);
        }

        // Oversize: exactly the files above 5 MB, none dropped, mb to 2 decimals.
        const expected = readable.filter((f) => f.bytes > OVERSIZE).map((f) => f.path);
        expect(report.oversizeFiles.map((o) => o.path)).toEqual(expected);
        for (const o of report.oversizeFiles) {
          expect(o.mb).toBe((o.bytes / 1_048_576).toFixed(2));
          expect(report.files.some((f) => f.path === o.path)).toBe(true);
        }

        // Exit code 0 iff nothing exceeded and nothing unreadable.
        const unreadable = files.length - readable.length;
        expect(report.unreadable.length).toBe(unreadable);
        expect(report.exitCode === 0).toBe(report.exceeded.length === 0 && unreadable === 0);
      }),
      { numRuns: 200 },
    );
  });

  it('ties in size are ordered deterministically', () => {
    const files = [
      { path: 'b.glb', bytes: LIMITS.graveyard, group: 'graveyard' },
      { path: 'a.glb', bytes: LIMITS.graveyard, group: 'graveyard' },
      { path: 'c.glb', bytes: 5, group: 'graveyard' },
    ];
    const r = account(files);
    expect(r.exceeded).toContain('graveyard');
    expect(r.largest.graveyard.map((f) => f.path)).toEqual(['a.glb', 'b.glb', 'c.glb']);
    expect(r.exitCode).toBe(1);
  });
});
