/**
 * Dev fixture bundle. DEV only: import behind `import.meta.env.DEV`.
 */
import type {
  Firm,
  FirmIndexEntry,
  FirmsIndex,
  FirmsIndexMeta,
  FirmStatus,
  Macro,
} from '../../types/data';
import { fixtureFirms, fixtureFirstFilingYear } from './firms';
import { fixtureMacro } from './macro';

export { ashgroveWorks, brindlemereFoods, larkmoorTextiles, fixtureFirms } from './firms';
export { fixtureMacro } from './macro';

export interface FixtureBundle {
  index: FirmsIndex;
  macro: Macro;
  firms: Record<string, Firm>;
}

/** Build the index entry for a firm from its firm file, so the two agree by construction. */
export function indexEntryFrom(
  firm: Firm,
  meta: Pick<FirmsIndexMeta, 'fiscal_years'>,
): FirmIndexEntry {
  const latest = firm.years[firm.years.length - 1];
  const firstFilingYear = fixtureFirstFilingYear[firm.cik] ?? firm.years[0]?.fy ?? 0;
  const latestFy = meta.fiscal_years[meta.fiscal_years.length - 1] ?? firm.as_of_filing.fiscal_year;
  const debt = latest?.total_debt_usd ?? null;
  const interest = latest?.interest_expense_usd ?? null;
  const impliedRate = debt !== null && interest !== null && debt > 0 ? interest / debt : null;
  return {
    cik: firm.cik,
    ticker: firm.ticker,
    name: firm.name,
    sector: firm.sector,
    sic: '2000',
    first_filing_year: firstFilingYear,
    age_years: latestFy - firstFilingYear,
    status: firm.status,
    latest_icr: latest?.icr ?? null,
    total_debt_usd: debt,
    implied_rate: impliedRate,
    shock_eligible: impliedRate !== null && impliedRate > 0,
    rescue_eligible: true,
  };
}

function buildIndex(firms: Firm[]): FirmsIndex {
  const counts: Record<FirmStatus, number> = {
    zombie: 0,
    endangered: 0,
    healthy: 0,
    insufficient_data: 0,
  };
  for (const f of firms) counts[f.status] += 1;
  const meta: FirmsIndexMeta = {
    generated_at: '2025-03-10T00:00:00Z',
    source: 'Dev fixture (fictional)',
    definition_version: '2.0',
    fiscal_years: [2020, 2021, 2022, 2023, 2024],
    counts,
  };
  return { meta, firms: firms.map((f) => indexEntryFrom(f, meta)) };
}

export const fixtureIndex: FirmsIndex = buildIndex(fixtureFirms);

export const fixtureBundle: FixtureBundle = {
  index: fixtureIndex,
  macro: fixtureMacro,
  firms: Object.fromEntries(fixtureFirms.map((f) => [f.cik, f])),
};
