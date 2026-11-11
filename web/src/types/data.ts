/**
 * Types for the data contract (v2 draft, pending partner review).
 * Source of truth: .kiro/steering/data-contract.md and /data/schema/*.json.
 * Update all three together.
 *
 * Money is USD (not thousands). Ratios are decimals (0.06 = 6%).
 * Missing data is null, never 0. Years are sorted ascending.
 */

export type FirmStatus = 'zombie' | 'endangered' | 'healthy' | 'insufficient_data';

// File 1: /data/firms_index.json

export interface FirmsIndexMeta {
  /** ISO 8601 */
  generated_at: string;
  source: string;
  definition_version: string;
  /** Sorted ascending. */
  fiscal_years: number[];
  counts: Record<FirmStatus, number>;
}

export interface FirmIndexEntry {
  /** 10-digit zero-padded CIK. */
  cik: string;
  ticker: string | null;
  name: string;
  /** SIC division name. */
  sector: string;
  sic: string;
  first_filing_year: number;
  age_years: number;
  status: FirmStatus;
  latest_icr: number | null;
  total_debt_usd: number | null;
  implied_rate: number | null;
  shock_eligible: boolean;
  rescue_eligible: boolean;
}

export interface FirmsIndex {
  meta: FirmsIndexMeta;
  firms: FirmIndexEntry[];
}

// File 2: /data/firms/{cik}.json

export interface AsOfFiling {
  fiscal_year: number;
  /** YYYY-MM-DD */
  filed: string;
  form: string;
}

export interface FirmYear {
  fy: number;
  revenue_usd: number | null;
  ebit_usd: number | null;
  interest_expense_usd: number | null;
  total_debt_usd: number | null;
  total_assets_usd: number | null;
  equity_usd: number | null;
  icr: number | null;
  ebit_tag: string | null;
  revenue_tag: string | null;
  /** Empty when no debt tag was used. */
  debt_tags: string[];
}

export interface RescueInputs {
  margin_mean: number;
  margin_change_mean: number;
  margin_change_sd: number;
  revenue_growth_median: number;
  history_years: number;
  used_sector_fallback: boolean;
}

export interface Firm {
  cik: string;
  name: string;
  ticker: string | null;
  sector: string;
  status: FirmStatus;
  reasons: string[];
  as_of_filing: AsOfFiling;
  /** Sorted ascending by fy. */
  years: FirmYear[];
  rescue_inputs: RescueInputs;
}

// File 3: /data/macro.json

export interface SectorMedians {
  margin_mean: number;
  margin_change_mean: number;
  margin_change_sd: number;
  revenue_growth_median: number;
}

export interface Macro {
  dgs10: {
    /** Decimal, 0.042 = 4.2%. */
    value: number;
    /** YYYY-MM-DD */
    date: string;
    source: string;
  };
  sector_medians: Record<string, SectorMedians>;
}

// File 4: /data/keeper_log.json

export interface KeeperLogEntry {
  /** YYYY-MM-DD */
  date: string;
  new_zombies: string[];
  revived: string[];
  filings_read: number;
  summary: string;
}

export interface KeeperLog {
  /** Newest first, max 60 entries. */
  entries: KeeperLogEntry[];
}
