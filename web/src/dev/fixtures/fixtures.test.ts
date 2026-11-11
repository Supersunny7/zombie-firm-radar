import { describe, expect, it } from 'vitest';
import { guardFirm, guardFirmsIndex, guardMacro } from '../../data/guards';
import {
  ashgroveWorks,
  fixtureBundle,
  fixtureFirms,
  fixtureIndex,
  fixtureMacro,
  indexEntryFrom,
} from '.';

describe('dev fixture', () => {
  it('passes the data guards after a JSON round trip', () => {
    const rt = <T>(v: T): unknown => JSON.parse(JSON.stringify(v));
    expect(guardFirmsIndex(rt(fixtureIndex)).ok).toBe(true);
    expect(guardMacro(rt(fixtureMacro)).ok).toBe(true);
    for (const f of fixtureFirms) expect(guardFirm(rt(f)).ok).toBe(true);
  });

  it('has three fictional firms with the three statuses and fictional CIKs', () => {
    expect(fixtureFirms.map((f) => f.status).sort()).toEqual(['endangered', 'healthy', 'zombie']);
    expect(fixtureFirms.map((f) => f.cik)).toEqual(['9000000001', '9000000002', '9000000003']);
    expect(fixtureIndex.firms.every((f) => f.rescue_eligible)).toBe(true);
  });

  it('has the Ashgrove Works numbers', () => {
    const latest = ashgroveWorks.years[ashgroveWorks.years.length - 1]!;
    expect(ashgroveWorks.name).toBe('Ashgrove Works');
    expect(latest).toMatchObject({
      fy: 2024,
      revenue_usd: 1.2e9,
      ebit_usd: 38e6,
      interest_expense_usd: 61e6,
      total_debt_usd: 1.05e9,
      total_assets_usd: 1.6e9,
      equity_usd: 140e6,
    });
    expect(latest.icr).toBeCloseTo(38 / 61, 10);
    expect(ashgroveWorks.years.map((y) => y.fy)).toEqual([2020, 2021, 2022, 2023, 2024]);
    expect(ashgroveWorks.years.filter((y) => y.fy >= 2022).every((y) => (y.icr ?? 1) < 1)).toBe(
      true,
    );
    expect(ashgroveWorks.rescue_inputs).toMatchObject({
      margin_mean: 0.035,
      margin_change_sd: 0.018,
      revenue_growth_median: 0.01,
    });
    expect(
      fixtureIndex.firms.find((f) => f.cik === ashgroveWorks.cik)!.age_years,
    ).toBeGreaterThanOrEqual(10);
  });

  it('has dgs10 of 0.042', () => {
    expect(fixtureMacro.dgs10.value).toBe(0.042);
  });

  it('keeps index entries consistent with firm files', () => {
    for (const f of fixtureFirms) {
      const entry = fixtureIndex.firms.find((e) => e.cik === f.cik)!;
      expect(entry).toEqual(indexEntryFrom(f, fixtureIndex.meta));
      expect(entry.status).toBe(f.status);
      expect(entry.latest_icr).toBe(f.years[f.years.length - 1]!.icr);
      expect(fixtureBundle.firms[f.cik]).toBe(f);
    }
    expect(fixtureIndex.meta.counts).toEqual({
      zombie: 1,
      endangered: 1,
      healthy: 1,
      insufficient_data: 0,
    });
  });

  it('matches the stated status per the zombie definition', () => {
    const icrs = (f: (typeof fixtureFirms)[number]) => f.years.slice(-3).map((y) => y.icr!);
    const [z, e, h] = fixtureFirms.map(icrs) as [number[], number[], number[]];
    expect(z.every((v) => v < 1)).toBe(true);
    expect(e[2]! < 1 && !e.every((v) => v < 1)).toBe(true);
    expect(h.every((v) => v >= 1)).toBe(true);
  });
});
