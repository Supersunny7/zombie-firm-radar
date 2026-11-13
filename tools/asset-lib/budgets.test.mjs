import { describe, expect, it } from 'vitest';
import { account, accountBudgets, formatReport, LIMITS } from './budgets.mjs';

describe('budgets', () => {
  it('has the exact limits', () => {
    expect(LIMITS).toEqual({ graveyard: 40000000, lab: 26214400, total: 62914560 });
    expect(accountBudgets).toBe(account);
  });

  it('reports an oversize file with a sizeException as an accepted exception, not a warning', () => {
    const sizeException = { maxBytes: 7_340_032, reason: 'User accepted 2k background sky' };
    const r = account([{ path: 'hdri/sky.hdr', bytes: 6_981_963, group: 'graveyard', sizeException }]);
    expect(r.oversizeFiles).toEqual([]);
    expect(r.acceptedExceptions).toHaveLength(1);
    expect(r.exitCode).toBe(0);
    const text = formatReport(r);
    expect(text).toContain('accepted exception: hdri/sky.hdr');
    expect(text).toContain('User accepted 2k background sky');
    expect(text).not.toContain('warning: hdri/sky.hdr');
  });

  it('still warns when the file exceeds its sizeException maxBytes', () => {
    const sizeException = { maxBytes: 6_000_000, reason: 'r' };
    const r = account([{ path: 'hdri/sky.hdr', bytes: 6_981_963, group: 'graveyard', sizeException }]);
    expect(r.acceptedExceptions).toEqual([]);
    expect(r.oversizeFiles).toHaveLength(1);
    expect(formatReport(r)).toContain('warning: hdri/sky.hdr');
  });

  it('sums groups, counts unassigned in total only with a warning', () => {
    const r = account([
      { path: 'a.webp', bytes: 100, group: 'graveyard' },
      { path: 'b.glb', bytes: 200 },
      { path: 'manifest.json', bytes: 5 },
      { path: 'x/LICENSE.txt', bytes: 7 },
    ], { 'b.glb': 'lab' });
    expect(r.used).toEqual({ graveyard: 100, lab: 200, total: 312 });
    expect(r.unassigned).toEqual([]);
    const r2 = account([{ path: 'c.png', bytes: 9 }, { path: 'manifest.json', bytes: 1 }]);
    expect(r2.used).toEqual({ graveyard: 0, lab: 0, total: 10 });
    expect(r2.unassigned).toEqual(['c.png']);
    expect(formatReport(r2)).toContain('warning: c.png');
    expect(r2.exitCode).toBe(0);
  });

  it('equality passes, one over fails with top 3 largest', () => {
    const ok = account([{ path: 'a', bytes: LIMITS.graveyard, group: 'graveyard' }]);
    expect(ok.exceeded).toEqual([]);
    expect(ok.exitCode).toBe(0);
    expect(formatReport(ok)).toContain(`graveyard ${LIMITS.graveyard} / 40000000`);

    const bad = account([
      { path: 'a', bytes: 10, group: 'graveyard' },
      { path: 'b', bytes: 40, group: 'graveyard' },
      { path: 'c', bytes: 30, group: 'graveyard' },
      { path: 'd', bytes: 20, group: 'graveyard' },
      { path: 'e', bytes: LIMITS.graveyard, group: 'graveyard' },
    ]);
    expect(bad.exceeded).toEqual(['graveyard']);
    expect(bad.largest.graveyard.map((f) => f.path)).toEqual(['e', 'b', 'c']);
    expect(bad.largest.lab).toEqual([]);
    expect(bad.exitCode).toBe(1);
    const text = formatReport(bad);
    expect(text).toContain('budget exceeded: graveyard');
    expect(text).toContain('limit 40000000');
  });

  it('lists files over 5 MiB with MB and suggestion by kind', () => {
    const r = account([
      { path: 'm.glb', bytes: 5_242_881, group: 'lab' },
      { path: 'h.hdr', bytes: 6 * 1048576, group: 'lab' },
      { path: 's.ogg', bytes: 7 * 1048576, group: 'lab' },
      { path: 'edge.glb', bytes: 5_242_880, group: 'lab' },
    ]);
    expect(r.oversizeFiles.map((o) => o.path)).toEqual(['m.glb', 'h.hdr', 's.ogg']);
    expect(r.oversizeFiles[0].mb).toBe('5.00');
    expect(r.oversizeFiles[0].suggestion).toContain('Meshopt');
    expect(r.oversizeFiles[1].suggestion).toBe('use the 1k HDRI');
    expect(r.oversizeFiles[2].suggestion).toBe('lower -q:a');
    expect(r.exitCode).toBe(0);
  });

  it('reports unreadable sizes with path and reason and fails', () => {
    const r = account([
      { path: 'ok', bytes: 1, group: 'lab' },
      { path: 'bad.bin', error: 'EACCES: permission denied' },
    ]);
    expect(r.unreadable).toEqual([{ path: 'bad.bin', reason: 'EACCES: permission denied' }]);
    expect(r.used.total).toBe(1);
    expect(r.exitCode).toBe(1);
    expect(formatReport(r)).toContain('bad.bin: EACCES: permission denied');
  });
});
