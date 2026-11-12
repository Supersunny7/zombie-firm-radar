/**
 * Data loader: picks the data source, fetches, validates and caches.
 * Pure TypeScript: no React or three imports. Never requests `keeper_log.json`.
 */
import type { Firm, FirmsIndex, Macro } from '../types/data';
import type { FixtureBundle } from '../dev/fixtures';
import type { LoadError, Result } from './errors';
import { guardFirm, guardFirmsIndex, guardMacro, type GuardResult } from './guards';
import {
  CIK_PATTERN,
  MOCK_BASE,
  REAL_BASE,
  devLoadFixture,
  firmUrl,
  indexUrl,
  macroUrl,
  sampleCountFromSearch,
  type DataSource,
} from './source';

export type { DataSource } from './source';
export type { LoadError, Result } from './errors';

export interface LoadedData {
  index: FirmsIndex;
  macro: Macro;
  source: DataSource;
}

export interface LoaderDeps {
  fetch: typeof fetch;
  isDev: boolean;
  loadFixture?: () => Promise<FixtureBundle>;
  /** URL query string (e.g. `location.search`); only `firms=3000` in development is honoured. */
  search?: string;
}

/** Dev-only generated firm files, keyed by CIK. */
interface RawBundle {
  firms: Record<string, unknown>;
}

export interface Loader {
  loadStartup(): Promise<Result<LoadedData, LoadError>>;
  loadFirm(cik: string): Promise<Result<Firm, LoadError>>;
  /** Clears pending work; only validated successes are ever cached, so failures are never retained. */
  retry(): void;
}

const err = <T>(error: LoadError): Result<T, LoadError> => ({ ok: false, error });
const good = <T>(value: T): Result<T, LoadError> => ({ ok: true, value });

export function createLoader(deps: LoaderDeps): Loader {
  /** Validated values keyed by full URL. Failures are never written here. */
  const cache = new Map<string, unknown>();
  let loaded: (LoadedData & { base: string; fixture?: RawBundle }) | null = null;
  let startup: Promise<Result<LoadedData, LoadError>> | null = null;

  /** Fetch `url`, parse JSON, run `guard`, cache on success. */
  async function getValidated<T>(
    url: string,
    guard: (v: unknown) => GuardResult<T>,
  ): Promise<Result<T, LoadError>> {
    if (cache.has(url)) return good(cache.get(url) as T);

    let res: Response;
    try {
      res = await deps.fetch(url);
    } catch {
      return err({ file: url, status: 'network error' });
    }
    if (!res.ok) return err({ file: url, status: res.status });

    let text: string;
    try {
      text = await res.text();
    } catch {
      return err({ file: url, status: 'network error' });
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return err({ file: url, status: 'invalid json' });
    }
    const g = guard(parsed);
    if (!g.ok) return err({ file: url, status: 'invalid data', detail: g });
    cache.set(url, g.value);
    return good(g.value);
  }

  /**
   * Probe the index of `base`. The response is the index fetch itself, so the
   * index is requested once. `missing` is true when the probe got no 2xx
   * response (non-2xx or network error), which allows falling back.
   */
  async function probe(
    base: string,
  ): Promise<{ result: Result<FirmsIndex, LoadError>; missing: boolean }> {
    const result = await getValidated(indexUrl(base), guardFirmsIndex);
    const missing =
      !result.ok &&
      (typeof result.error.status === 'number' || result.error.status === 'network error');
    return { result, missing };
  }

  async function startFromBase(
    base: string,
    source: DataSource,
    index: FirmsIndex,
  ): Promise<Result<LoadedData, LoadError>> {
    const macro = await getValidated(macroUrl(base), guardMacro);
    if (!macro.ok) return err(macro.error);
    loaded = { index, macro: macro.value, source, base };
    return good({ index, macro: macro.value, source });
  }

  async function startFromFixture(): Promise<Result<LoadedData, LoadError>> {
    const load = deps.loadFixture ?? (deps.isDev ? devLoadFixture : undefined);
    if (!load)
      return err({
        file: 'fixture',
        status: 'invalid data',
        message: 'No dev fixture is available.',
      });
    let bundle: FixtureBundle;
    try {
      bundle = await load();
    } catch {
      return err({
        file: 'fixture',
        status: 'invalid data',
        message: 'The dev fixture could not be loaded.',
      });
    }
    const index = guardFirmsIndex(bundle.index);
    if (!index.ok)
      return err({ file: 'fixture:firms_index.json', status: 'invalid data', detail: index });
    const macro = guardMacro(bundle.macro);
    if (!macro.ok)
      return err({ file: 'fixture:macro.json', status: 'invalid data', detail: macro });
    loaded = {
      index: index.value,
      macro: macro.value,
      source: 'fixture',
      base: '',
      fixture: bundle,
    };
    return good({ index: index.value, macro: macro.value, source: 'fixture' });
  }

  /** Development only: generated sample firms, never requested from disk or network. */
  async function startFromSample(count: number): Promise<Result<LoadedData, LoadError>> {
    if (import.meta.env.DEV) {
      try {
        const { generateSampleFirms } = await import('../dev/sample/generate');
        const bundle = generateSampleFirms(count, 1);
        const index = guardFirmsIndex(bundle.index);
        if (!index.ok)
          return err({ file: 'sample:firms_index.json', status: 'invalid data', detail: index });
        const macro = guardMacro(bundle.macro);
        if (!macro.ok)
          return err({ file: 'sample:macro.json', status: 'invalid data', detail: macro });
        loaded = {
          index: index.value,
          macro: macro.value,
          source: 'sample',
          base: '',
          fixture: bundle,
        };
        return good({ index: index.value, macro: macro.value, source: 'sample' });
      } catch {
        /* fall through to the error below */
      }
    }
    return err({
      file: 'sample',
      status: 'invalid data',
      message: 'The dev sample could not be generated.',
    });
  }

  async function runStartup(): Promise<Result<LoadedData, LoadError>> {
    if (deps.isDev) {
      const count = sampleCountFromSearch(deps.search ?? '', true);
      if (count !== null) return startFromSample(count);
    }
    const real = await probe(REAL_BASE);
    if (real.result.ok) return startFromBase(REAL_BASE, 'real', real.result.value);
    const mock = await probe(MOCK_BASE);
    if (mock.result.ok) return startFromBase(MOCK_BASE, 'mock', mock.result.value);
    if (deps.isDev) {
      const fixture = await startFromFixture();
      if (fixture.ok) return fixture;
      const sample = await startFromSample(100);
      if (sample.ok) return sample;
    }
    return err(mock.result.error);
  }

  function loadStartup(): Promise<Result<LoadedData, LoadError>> {
    if (loaded) {
      const { index, macro, source } = loaded;
      return Promise.resolve(good({ index, macro, source }));
    }
    if (!startup) {
      startup = runStartup().finally(() => {
        startup = null;
      });
    }
    return startup;
  }

  async function loadFirm(cik: string): Promise<Result<Firm, LoadError>> {
    const file = `firms/${cik}.json`;
    if (!CIK_PATTERN.test(cik)) {
      return err({
        file,
        status: 'invalid data',
        message: `CIK "${cik}" is not a 10-digit zero-padded string.`,
      });
    }
    const start = await loadStartup();
    if (!start.ok) return start;
    const data = loaded;
    if (!data) return err({ file, status: 'invalid data', message: 'Data is not loaded.' });
    if (!data.index.firms.some((f) => f.cik === cik)) {
      return err({
        file,
        status: 'invalid data',
        message: `CIK ${cik} is not listed in firms_index.json.`,
      });
    }
    if (data.source === 'fixture' || data.source === 'sample') {
      const prefix = data.source;
      const raw = data.fixture?.firms[cik];
      const url = `${prefix}:${file}`;
      if (raw === undefined)
        return err({
          file: url,
          status: 'invalid data',
          message: `CIK ${cik} is not in the ${prefix}.`,
        });
      const g = guardFirm(raw);
      if (!g.ok) return err({ file: url, status: 'invalid data', detail: g });
      return good(g.value);
    }
    return getValidated(firmUrl(data.base, cik), guardFirm);
  }

  function retry(): void {
    startup = null;
  }

  return { loadStartup, loadFirm, retry };
}
