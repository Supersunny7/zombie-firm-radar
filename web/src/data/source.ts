/**
 * Data source types and URL helpers. Pure TypeScript: no React or three imports.
 */
import type { FixtureBundle } from '../dev/fixtures';

export type DataSource = 'real' | 'mock' | 'fixture' | 'sample';

export const SAMPLE_FIRM_COUNT = 3000;

/**
 * `?firms=3000` only, and only in a development build. `dev` is a parameter so
 * tests cover both values.
 */
export function sampleCountFromSearch(search: string, dev: boolean): number | null {
  if (!dev) return null;
  const values = new URLSearchParams(search).getAll('firms');
  return values.includes(String(SAMPLE_FIRM_COUNT)) ? SAMPLE_FIRM_COUNT : null;
}

export const REAL_BASE = '/data/';
export const MOCK_BASE = '/data/mock/';

export const indexUrl = (base: string): string => `${base}firms_index.json`;
export const macroUrl = (base: string): string => `${base}macro.json`;
export const firmUrl = (base: string, cik: string): string => `${base}firms/${cik}.json`;

export const CIK_PATTERN = /^\d{10}$/;

/**
 * Dynamic fixture import, only present in development. `import.meta.env.DEV` is
 * replaced by a literal at build time, so Rollup drops the import in production.
 */
export const devLoadFixture: (() => Promise<FixtureBundle>) | undefined = import.meta.env.DEV
  ? async () => (await import('../dev/fixtures')).fixtureBundle
  : undefined;
