/**
 * Dev fixture firms. Entirely fictional: names and CIKs (9000000001 to 9000000003)
 * match no listed company. DEV only; never import outside an `import.meta.env.DEV` branch.
 */
import type { Firm, FirmYear } from '../../types/data';

/** Interest coverage = EBIT / interest expense; null when either is missing or interest <= 0. */
const icr = (ebit: number | null, interest: number | null): number | null =>
  ebit === null || interest === null || interest <= 0 ? null : ebit / interest;

interface YearSpec {
  fy: number;
  revenue: number;
  ebit: number;
  interest: number;
  debt: number;
  assets: number;
  equity: number;
}

function year(s: YearSpec): FirmYear {
  return {
    fy: s.fy,
    revenue_usd: s.revenue,
    ebit_usd: s.ebit,
    interest_expense_usd: s.interest,
    total_debt_usd: s.debt,
    total_assets_usd: s.assets,
    equity_usd: s.equity,
    icr: icr(s.ebit, s.interest),
    ebit_tag: 'OperatingIncomeLoss',
    revenue_tag: 'Revenues',
    debt_tags: ['LongTermDebtNoncurrent', 'LongTermDebtCurrent'],
  };
}

export const ashgroveWorks: Firm = {
  cik: '9000000001',
  name: 'Ashgrove Works',
  ticker: 'ASHW',
  sector: 'Manufacturing',
  status: 'zombie',
  reasons: ['ICR below 1 in FY2022, FY2023, FY2024', 'Firm age 24 years (first filing 2001)'],
  as_of_filing: { fiscal_year: 2024, filed: '2025-02-20', form: '10-K' },
  years: [
    year({
      fy: 2020,
      revenue: 1.14e9,
      ebit: 92e6,
      interest: 58e6,
      debt: 1.0e9,
      assets: 1.55e9,
      equity: 260e6,
    }),
    year({
      fy: 2021,
      revenue: 1.16e9,
      ebit: 70e6,
      interest: 59e6,
      debt: 1.02e9,
      assets: 1.56e9,
      equity: 235e6,
    }),
    year({
      fy: 2022,
      revenue: 1.17e9,
      ebit: 52e6,
      interest: 60e6,
      debt: 1.03e9,
      assets: 1.58e9,
      equity: 195e6,
    }),
    year({
      fy: 2023,
      revenue: 1.18e9,
      ebit: 45e6,
      interest: 60.5e6,
      debt: 1.04e9,
      assets: 1.59e9,
      equity: 165e6,
    }),
    year({
      fy: 2024,
      revenue: 1.2e9,
      ebit: 38e6,
      interest: 61e6,
      debt: 1.05e9,
      assets: 1.6e9,
      equity: 140e6,
    }),
  ],
  rescue_inputs: {
    margin_mean: 0.035,
    margin_change_mean: -0.004,
    margin_change_sd: 0.018,
    revenue_growth_median: 0.01,
    history_years: 5,
    used_sector_fallback: false,
  },
};

export const larkmoorTextiles: Firm = {
  cik: '9000000002',
  name: 'Larkmoor Textiles',
  ticker: 'LKMT',
  sector: 'Manufacturing',
  status: 'endangered',
  reasons: ['ICR below 1 in FY2023, FY2024', 'Not a zombie: ICR was 1.30 in FY2022'],
  as_of_filing: { fiscal_year: 2024, filed: '2025-03-06', form: '10-K' },
  years: [
    year({
      fy: 2020,
      revenue: 640e6,
      ebit: 60e6,
      interest: 30e6,
      debt: 480e6,
      assets: 820e6,
      equity: 210e6,
    }),
    year({
      fy: 2021,
      revenue: 655e6,
      ebit: 52e6,
      interest: 31e6,
      debt: 490e6,
      assets: 830e6,
      equity: 205e6,
    }),
    year({
      fy: 2022,
      revenue: 660e6,
      ebit: 40.3e6,
      interest: 31e6,
      debt: 495e6,
      assets: 835e6,
      equity: 195e6,
    }),
    year({
      fy: 2023,
      revenue: 662e6,
      ebit: 25e6,
      interest: 32e6,
      debt: 500e6,
      assets: 838e6,
      equity: 180e6,
    }),
    year({
      fy: 2024,
      revenue: 668e6,
      ebit: 28e6,
      interest: 32.5e6,
      debt: 505e6,
      assets: 840e6,
      equity: 170e6,
    }),
  ],
  rescue_inputs: {
    margin_mean: 0.05,
    margin_change_mean: -0.005,
    margin_change_sd: 0.015,
    revenue_growth_median: 0.008,
    history_years: 5,
    used_sector_fallback: false,
  },
};

export const brindlemereFoods: Firm = {
  cik: '9000000003',
  name: 'Brindlemere Foods',
  ticker: 'BRMF',
  sector: 'Manufacturing',
  status: 'healthy',
  reasons: ['ICR at or above 1 in FY2024 (6.00)', 'ICR at or above 1 in every year on file'],
  as_of_filing: { fiscal_year: 2024, filed: '2025-02-27', form: '10-K' },
  years: [
    year({
      fy: 2020,
      revenue: 900e6,
      ebit: 110e6,
      interest: 20e6,
      debt: 380e6,
      assets: 1.1e9,
      equity: 520e6,
    }),
    year({
      fy: 2021,
      revenue: 930e6,
      ebit: 118e6,
      interest: 20e6,
      debt: 375e6,
      assets: 1.12e9,
      equity: 550e6,
    }),
    year({
      fy: 2022,
      revenue: 960e6,
      ebit: 120e6,
      interest: 21e6,
      debt: 370e6,
      assets: 1.14e9,
      equity: 580e6,
    }),
    year({
      fy: 2023,
      revenue: 985e6,
      ebit: 126e6,
      interest: 21e6,
      debt: 365e6,
      assets: 1.16e9,
      equity: 615e6,
    }),
    year({
      fy: 2024,
      revenue: 1.01e9,
      ebit: 132e6,
      interest: 22e6,
      debt: 360e6,
      assets: 1.18e9,
      equity: 650e6,
    }),
  ],
  rescue_inputs: {
    margin_mean: 0.125,
    margin_change_mean: 0.002,
    margin_change_sd: 0.01,
    revenue_growth_median: 0.03,
    history_years: 5,
    used_sector_fallback: false,
  },
};

export const fixtureFirms: Firm[] = [ashgroveWorks, larkmoorTextiles, brindlemereFoods];

/** First SEC filing year per fixture CIK (fictional); age is derived from it. */
export const fixtureFirstFilingYear: Record<string, number> = {
  '9000000001': 2001,
  '9000000002': 1996,
  '9000000003': 1999,
};
