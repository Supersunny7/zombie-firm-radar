/**
 * Dev-only sample firm generator (graveyard-scene, design section 1).
 * DEV only: import behind `import.meta.env.DEV`. Never written to disk.
 * Names are invented; no real tickers.
 */
import { icr } from '../../engine/icr';
import { mulberry32 } from '../../engine/rng';
import type {
  Firm,
  FirmIndexEntry,
  FirmsIndex,
  FirmStatus,
  FirmYear,
  Macro,
  SectorMedians,
} from '../../types/data';

/** Production bundle guard marker (task 4.6). Keep it the first statement. */
export const SAMPLE_GENERATOR_MARKER = '__zfr_sample_generator__';

export interface SampleBundle {
  index: FirmsIndex;
  macro: Macro;
  /** Firm files, built lazily on first access of each key and then cached. */
  firms: Record<string, Firm>;
}

const FISCAL_YEARS = [2020, 2021, 2022, 2023, 2024];
const LATEST_FY = 2024;
const FIRST_CIK = 9100000000;

const SECTORS: readonly { name: string; sic: string }[] = [
  { name: 'Agriculture, Forestry and Fishing', sic: '0100' },
  { name: 'Mining', sic: '1000' },
  { name: 'Construction', sic: '1500' },
  { name: 'Manufacturing', sic: '2000' },
  { name: 'Transportation and Public Utilities', sic: '4000' },
  { name: 'Wholesale Trade', sic: '5000' },
  { name: 'Retail Trade', sic: '5400' },
  { name: 'Finance, Insurance and Real Estate', sic: '6000' },
  { name: 'Services', sic: '7300' },
  { name: 'Public Administration', sic: '9100' },
];

const FIRST_WORDS = [
  'Larkspur',
  'Hollowmere',
  'Quillfeather',
  'Dunmarrow',
  'Wrenfield',
  'Ostler',
  'Thistledown',
  'Varnley',
  'Pellam',
  'Corbin Reach',
  'Marrowgate',
  'Fenwick Ridge',
];
const SECOND_WORDS = [
  'Holdings',
  'Industries',
  'Provisions',
  'Freight',
  'Mills',
  'Partners',
  'Energy',
  'Supply',
  'Foods',
  'Systems',
  'Metals',
  'Works',
];

const pad4 = (n: number): string => String(n).padStart(4, '0');

/** Per-firm seed: independent of count and of access order. */
function firmSeed(seed: number, i: number): number {
  let h = (seed | 0) ^ Math.imul(i + 1, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) | 0;
}

function pickStatus(u: number): FirmStatus {
  if (u < 0.1) return 'zombie';
  if (u < 0.25) return 'endangered';
  if (u < 0.9) return 'healthy';
  return 'insufficient_data';
}

interface Plan {
  entry: FirmIndexEntry;
  /** Extra draws for the firm file, continuing the same stream. */
  rng: () => number;
  revenueFactor: number;
  assetsFactor: number;
  interest: number | null;
  debt: number | null;
}

function plan(seed: number, i: number): Plan {
  const rng = mulberry32(firmSeed(seed, i));
  const range = (lo: number, hi: number): number => lo + (hi - lo) * rng();
  const status = pickStatus(rng());
  const sector = SECTORS[Math.floor(rng() * SECTORS.length)] ?? SECTORS[0]!;
  const name = `${FIRST_WORDS[Math.floor(rng() * FIRST_WORDS.length)]} ${
    SECOND_WORDS[Math.floor(rng() * SECOND_WORDS.length)]
  } ${pad4(i + 1)}`;
  const age = status === 'zombie' ? 10 + Math.floor(rng() * 31) : 3 + Math.floor(rng() * 38);
  const ticker = rng() < 0.08 ? `ZF${pad4(i + 1)}` : null;
  const rescueEligible = status !== 'insufficient_data' && rng() < 0.85 / 0.9;
  const revenueFactor = range(0.5, 3);
  const assetsFactor = range(1.2, 3);

  let debt: number | null = null;
  let interest: number | null = null;
  let impliedRate: number | null = null;
  let latestIcr: number | null = null;

  const missing = status === 'insufficient_data' || (status === 'endangered' && rng() < 0.05);
  if (!missing) {
    debt = Math.round(10 ** range(6, 10.7));
    interest = Math.max(1, Math.round(debt * range(0.02, 0.12)));
    impliedRate = interest / debt;
    let target: number;
    if (status === 'zombie') target = range(-1.5, 0.95);
    else if (status === 'endangered') target = range(0.4, 0.99);
    else target = rng() < 0.45 ? range(1.0, 1.6) : range(1.6, 8);
    latestIcr = icr(Math.round(target * interest), interest);
  }

  const entry: FirmIndexEntry = {
    cik: String(FIRST_CIK + i).padStart(10, '0'),
    ticker,
    name,
    sector: sector.name,
    sic: sector.sic,
    first_filing_year: LATEST_FY - age,
    age_years: age,
    status,
    latest_icr: latestIcr,
    total_debt_usd: debt,
    implied_rate: impliedRate,
    shock_eligible:
      impliedRate !== null && impliedRate > 0 && debt !== null && debt > 0 && latestIcr !== null,
    rescue_eligible: rescueEligible,
  };
  return { entry, rng, revenueFactor, assetsFactor, interest, debt };
}

function buildFirm(seed: number, i: number): Firm {
  const { entry, rng, revenueFactor, assetsFactor, interest, debt } = plan(seed, i);
  const range = (lo: number, hi: number): number => lo + (hi - lo) * rng();
  const hasData = interest !== null && debt !== null && entry.latest_icr !== null;

  const years: FirmYear[] = FISCAL_YEARS.map((fy, k) => {
    const back = FISCAL_YEARS.length - 1 - k;
    const baseDebt = hasData ? Math.round(debt * range(0.85, 1.1)) : null;
    const yearDebt = back === 0 ? debt : baseDebt;
    const revenue = Math.round((debt ?? 5e7) * revenueFactor * range(0.9, 1.1));
    const assets = Math.round((debt ?? 5e7) * assetsFactor * range(0.95, 1.05));
    const equity = Math.round(assets - (debt ?? 0) * range(0.6, 1.4));
    let yearInterest: number | null = null;
    let yearEbit: number | null = null;
    if (hasData && entry.latest_icr !== null) {
      yearInterest = back === 0 ? interest : Math.max(1, Math.round(interest * range(0.85, 1.1)));
      if (back === 0) {
        yearEbit = Math.round(entry.latest_icr * interest);
      } else {
        let t = entry.latest_icr * range(0.8, 1.25);
        if (entry.status === 'zombie') t = Math.min(t, 0.95);
        else if (entry.status === 'healthy') t = Math.max(t, 1.0);
        else if (back === 2) t = Math.max(t, 1.1); // endangered: covered before the slide
        yearEbit = Math.round(t * yearInterest);
      }
    }
    return {
      fy,
      revenue_usd: revenue,
      ebit_usd: yearEbit,
      interest_expense_usd: yearInterest,
      total_debt_usd: hasData ? yearDebt : null,
      total_assets_usd: assets,
      equity_usd: equity,
      icr: icr(yearEbit, yearInterest),
      ebit_tag: yearEbit === null ? null : 'OperatingIncomeLoss',
      revenue_tag: 'Revenues',
      debt_tags: hasData ? ['LongTermDebtNoncurrent'] : [],
    };
  });

  const below = years.filter((y) => y.icr !== null && y.icr < 1).map((y) => `FY${y.fy}`);
  const reasons: string[] = [];
  if (entry.status === 'insufficient_data') {
    reasons.push('Fewer than 3 consecutive fiscal years with EBIT and interest expense');
  } else if (below.length > 0) {
    reasons.push(`ICR below 1 in ${below.join(', ')}`);
  } else {
    reasons.push(`ICR at or above 1 in every year on file (FY${LATEST_FY})`);
  }
  if (entry.status === 'zombie') {
    reasons.push(`Firm age ${entry.age_years} years (first filing ${entry.first_filing_year})`);
  }

  const fallback = entry.status === 'insufficient_data';
  return {
    cik: entry.cik,
    name: entry.name,
    ticker: entry.ticker,
    sector: entry.sector,
    status: entry.status,
    reasons,
    as_of_filing: { fiscal_year: LATEST_FY, filed: '2025-03-10', form: '10-K' },
    years,
    rescue_inputs: {
      margin_mean: range(0.01, 0.1),
      margin_change_mean: range(-0.005, 0.005),
      margin_change_sd: range(0.01, 0.04),
      revenue_growth_median: range(-0.02, 0.05),
      history_years: fallback ? 3 : 5,
      used_sector_fallback: fallback,
    },
  };
}

function buildMacro(): Macro {
  const medians: Record<string, SectorMedians> = {};
  for (const s of SECTORS) {
    medians[s.name] = {
      margin_mean: 0.06,
      margin_change_mean: 0,
      margin_change_sd: 0.025,
      revenue_growth_median: 0.02,
    };
  }
  return {
    dgs10: { value: 0.042, date: '2025-03-07', source: 'Sample data (fictional)' },
    sector_medians: medians,
  };
}

/**
 * Deterministic bundle of `count` fictional firms. Same (count, seed) gives
 * deeply equal output. Firm files are built on first access.
 */
export function generateSampleFirms(count: number, seed: number): SampleBundle {
  const n = Math.max(0, Math.floor(count));
  const counts: Record<FirmStatus, number> = {
    zombie: 0,
    endangered: 0,
    healthy: 0,
    insufficient_data: 0,
  };
  const entries: FirmIndexEntry[] = [];
  for (let i = 0; i < n; i++) {
    const { entry } = plan(seed, i);
    counts[entry.status] += 1;
    entries.push(entry);
  }
  const index: FirmsIndex = {
    meta: {
      generated_at: '2025-03-10T00:00:00Z',
      source: 'Generated sample (fictional)',
      definition_version: '2.0',
      fiscal_years: [...FISCAL_YEARS],
      counts,
    },
    firms: entries,
  };

  const firms: Record<string, Firm> = {};
  entries.forEach((entry, i) => {
    let cached: Firm | undefined;
    Object.defineProperty(firms, entry.cik, {
      enumerable: true,
      configurable: false,
      get: () => (cached ??= buildFirm(seed, i)),
    });
  });
  return { index, macro: buildMacro(), firms };
}
