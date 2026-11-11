import { describe, expect, it } from 'vitest';
import { guardFirm, guardFirmsIndex, guardMacro } from './guards';

const entry = {
  cik: '0000000001',
  ticker: null,
  name: 'Test Co',
  sector: 'Manufacturing',
  sic: '3000',
  first_filing_year: 2001,
  age_years: 24,
  status: 'zombie',
  latest_icr: 0.5,
  total_debt_usd: null,
  implied_rate: null,
  shock_eligible: false,
  rescue_eligible: false,
};
const index = () => ({
  meta: {
    generated_at: '2025-01-01T00:00:00Z',
    source: 'SEC EDGAR XBRL',
    definition_version: '2.0',
    fiscal_years: [2023, 2024],
    counts: { zombie: 1, endangered: 0, healthy: 0, insufficient_data: 0 },
  },
  firms: [structuredClone(entry)],
});
const firm = () => ({
  cik: '0000000001',
  name: 'Test Co',
  ticker: null,
  sector: 'Manufacturing',
  status: 'zombie',
  reasons: ['ICR below 1 in FY2023, FY2024'],
  as_of_filing: { fiscal_year: 2024, filed: '2025-02-01', form: '10-K' },
  years: [2023, 2024].map((fy) => ({
    fy,
    revenue_usd: 1,
    ebit_usd: null,
    interest_expense_usd: null,
    total_debt_usd: null,
    total_assets_usd: null,
    equity_usd: null,
    icr: null,
    ebit_tag: null,
    revenue_tag: null,
    debt_tags: [],
  })),
  rescue_inputs: {
    margin_mean: 0.03,
    margin_change_mean: 0,
    margin_change_sd: 0.01,
    revenue_growth_median: 0.01,
    history_years: 5,
    used_sector_fallback: false,
  },
});
const macro = () => ({
  dgs10: { value: 0.042, date: '2025-01-02', source: 'FRED DGS10' },
  sector_medians: {
    Manufacturing: {
      margin_mean: 0,
      margin_change_mean: 0,
      margin_change_sd: 0,
      revenue_growth_median: 0,
    },
  },
});

describe('data guards', () => {
  it('accept valid values with null in nullable fields', () => {
    expect(guardFirmsIndex(index()).ok).toBe(true);
    expect(guardFirm(firm()).ok).toBe(true);
    expect(guardMacro(macro()).ok).toBe(true);
  });

  it('reject a missing nullable key and report its path', () => {
    const v = index();
    delete (v.firms[0] as Partial<typeof entry>).latest_icr;
    expect(guardFirmsIndex(v)).toMatchObject({
      ok: false,
      path: '$.firms[0].latest_icr',
      actual: 'missing',
    });
  });

  it('reject non-finite numbers, bad CIK, bad status and unknown keys', () => {
    const a = index();
    a.firms[0]!.latest_icr = Number.NaN;
    expect(guardFirmsIndex(a)).toMatchObject({ ok: false, path: '$.firms[0].latest_icr' });
    const b = index();
    b.firms[0]!.cik = '123';
    expect(guardFirmsIndex(b)).toMatchObject({ ok: false, path: '$.firms[0].cik' });
    const c = index();
    c.firms[0]!.status = 'dead';
    expect(guardFirmsIndex(c)).toMatchObject({ ok: false, path: '$.firms[0].status' });
    expect(guardMacro({ ...macro(), extra: 1 })).toMatchObject({ ok: false, path: '$.extra' });
  });

  it('reject descending years', () => {
    const f = firm();
    f.years.reverse();
    expect(guardFirm(f)).toMatchObject({ ok: false, path: '$.years[1].fy' });
    const i = index();
    i.meta.fiscal_years = [2024, 2023];
    expect(guardFirmsIndex(i)).toMatchObject({ ok: false, path: '$.meta.fiscal_years[1]' });
  });
});
