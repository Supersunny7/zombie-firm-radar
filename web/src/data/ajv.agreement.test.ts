/**
 * Agreement between the JSON Schemas in /data/schema (checked with ajv, test-only)
 * and the hand-written runtime guards, plus fixture and mock-data checks.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';
import { ashgroveWorks, fixtureFirms, fixtureIndex, fixtureMacro } from '../dev/fixtures';
import { guardFirm, guardFirmsIndex, guardMacro } from './guards';

const dataDir = resolve(__dirname, '../../../data');
const schemaDir = resolve(dataDir, 'schema');
const mockDir = resolve(dataDir, 'mock');

const readJson = (p: string): unknown => JSON.parse(readFileSync(p, 'utf8'));
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

const ajv = new Ajv2020({ strict: true, allErrors: false });
addFormats(ajv);
for (const f of readdirSync(schemaDir).filter((n) => n.endsWith('.schema.json'))) {
  ajv.addSchema(readJson(resolve(schemaDir, f)) as object);
}

type Kind = 'index' | 'firm' | 'macro';
const schemaId: Record<Kind, string> = {
  index: 'firms_index.schema.json',
  firm: 'firm.schema.json',
  macro: 'macro.schema.json',
};
const guardOf = { index: guardFirmsIndex, firm: guardFirm, macro: guardMacro } as const;

const ajvOk = (kind: Kind, v: unknown): boolean => {
  const validate = ajv.getSchema(schemaId[kind]);
  if (!validate) throw new Error(`schema not loaded: ${schemaId[kind]}`);
  return validate(v) === true;
};
const guardOk = (kind: Kind, v: unknown): boolean => guardOf[kind](v).ok;

/** Both validators must give the same verdict. */
function expectAgree(kind: Kind, v: unknown, expected: boolean): void {
  expect({ ajv: ajvOk(kind, v), guards: guardOk(kind, v) }).toEqual({
    ajv: expected,
    guards: expected,
  });
}

describe('schemas load', () => {
  it('finds all four schemas', () => {
    for (const id of [...Object.values(schemaId), 'keeper_log.schema.json'])
      expect(ajv.getSchema(id), id).toBeDefined();
  });
});

describe('fixture passes ajv and guards', () => {
  it('index, macro and every firm', () => {
    expectAgree('index', clone(fixtureIndex), true);
    expectAgree('macro', clone(fixtureMacro), true);
    for (const f of fixtureFirms) expectAgree('firm', clone(f), true);
  });
});

describe('/data/mock (when present)', () => {
  const files = existsSync(mockDir)
    ? readdirSync(mockDir, { recursive: true, encoding: 'utf8' })
        .map((p) => p.replace(/\\/g, '/'))
        .filter((p) => p.endsWith('.json'))
    : [];

  it.skipIf(files.length === 0)('every mock file passes ajv and guards', () => {
    for (const rel of files) {
      const v = readJson(resolve(mockDir, rel));
      if (rel === 'firms_index.json') expectAgree('index', v, true);
      else if (rel === 'macro.json') expectAgree('macro', v, true);
      else if (rel.startsWith('firms/')) expectAgree('firm', v, true);
      // keeper_log.json is not read by the app, so it has no guard.
      else if (rel === 'keeper_log.json') {
        const validate = ajv.getSchema('keeper_log.schema.json');
        expect(validate?.(v)).toBe(true);
      }
    }
  });

  it.skipIf(files.length === 0)('mock index and firm files are consistent', () => {
    const idx = readJson(resolve(mockDir, 'firms_index.json')) as typeof fixtureIndex;
    for (const e of idx.firms) {
      const p = resolve(mockDir, 'firms', `${e.cik}.json`);
      if (!existsSync(p)) continue;
      const firm = readJson(p) as typeof ashgroveWorks;
      expect(firm.status).toBe(e.status);
      expect(firm.name).toBe(e.name);
    }
  });
});

describe('invalid samples fail both ajv and guards', () => {
  type Mutator = (v: Record<string, any>) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
  const cases: Array<[string, Kind, () => Record<string, unknown>, Mutator]> = [
    [
      'index: missing meta.counts',
      'index',
      () => clone(fixtureIndex) as never,
      (v) => delete v.meta.counts,
    ],
    [
      'index: extra top-level key',
      'index',
      () => clone(fixtureIndex) as never,
      (v) => (v.extra = 1),
    ],
    [
      'index: bad status',
      'index',
      () => clone(fixtureIndex) as never,
      (v) => (v.firms[0].status = 'dead'),
    ],
    [
      'index: short CIK',
      'index',
      () => clone(fixtureIndex) as never,
      (v) => (v.firms[0].cik = '123'),
    ],
    [
      'index: string ICR',
      'index',
      () => clone(fixtureIndex) as never,
      (v) => (v.firms[0].latest_icr = '0.5'),
    ],
    [
      'index: negative age',
      'index',
      () => clone(fixtureIndex) as never,
      (v) => (v.firms[0].age_years = -1),
    ],
    [
      'index: fractional year',
      'index',
      () => clone(fixtureIndex) as never,
      (v) => (v.meta.fiscal_years[0] = 2020.5),
    ],
    [
      'index: negative count',
      'index',
      () => clone(fixtureIndex) as never,
      (v) => (v.meta.counts.zombie = -1),
    ],
    [
      'index: missing nullable key',
      'index',
      () => clone(fixtureIndex) as never,
      (v) => delete v.firms[0].ticker,
    ],
    [
      'index: bad date-time',
      'index',
      () => clone(fixtureIndex) as never,
      (v) => (v.meta.generated_at = 'yesterday'),
    ],
    [
      'index: date-time without zone',
      'index',
      () => clone(fixtureIndex) as never,
      (v) => (v.meta.generated_at = '2025-03-10T00:00:00'),
    ],
    [
      'index: date-time date only',
      'index',
      () => clone(fixtureIndex) as never,
      (v) => (v.meta.generated_at = '2025-03-10'),
    ],
    ['firm: missing years', 'firm', () => clone(ashgroveWorks) as never, (v) => delete v.years],
    ['firm: bad status', 'firm', () => clone(ashgroveWorks) as never, (v) => (v.status = 'ghost')],
    [
      'firm: extra year key',
      'firm',
      () => clone(ashgroveWorks) as never,
      (v) => (v.years[0].extra = 1),
    ],
    [
      'firm: string revenue',
      'firm',
      () => clone(ashgroveWorks) as never,
      (v) => (v.years[1].revenue_usd = '1'),
    ],
    [
      'firm: debt_tags null',
      'firm',
      () => clone(ashgroveWorks) as never,
      (v) => (v.years[0].debt_tags = null),
    ],
    [
      'firm: invalid filed date',
      'firm',
      () => clone(ashgroveWorks) as never,
      (v) => (v.as_of_filing.filed = '2025-02-30'),
    ],
    [
      'firm: non-date filed',
      'firm',
      () => clone(ashgroveWorks) as never,
      (v) => (v.as_of_filing.filed = 'Feb 20'),
    ],
    [
      'firm: negative sd',
      'firm',
      () => clone(ashgroveWorks) as never,
      (v) => (v.rescue_inputs.margin_change_sd = -0.1),
    ],
    [
      'firm: non-boolean fallback',
      'firm',
      () => clone(ashgroveWorks) as never,
      (v) => (v.rescue_inputs.used_sector_fallback = 'no'),
    ],
    [
      'firm: fractional history',
      'firm',
      () => clone(ashgroveWorks) as never,
      (v) => (v.rescue_inputs.history_years = 2.5),
    ],
    ['macro: missing dgs10', 'macro', () => clone(fixtureMacro) as never, (v) => delete v.dgs10],
    [
      'macro: string value',
      'macro',
      () => clone(fixtureMacro) as never,
      (v) => (v.dgs10.value = '0.042'),
    ],
    [
      'macro: bad date',
      'macro',
      () => clone(fixtureMacro) as never,
      (v) => (v.dgs10.date = '2025-13-01'),
    ],
    [
      'macro: sector median missing key',
      'macro',
      () => clone(fixtureMacro) as never,
      (v) => {
        const k = Object.keys(v.sector_medians)[0]!;
        delete v.sector_medians[k].margin_mean;
      },
    ],
  ];

  it.each(cases)('%s', (_name, kind, make, mutate) => {
    const v = make();
    mutate(v);
    expectAgree(kind, v, false);
  });

  it('rejects non-object roots', () => {
    for (const kind of ['index', 'firm', 'macro'] as const)
      for (const v of [null, [], 'x', 1]) expectAgree(kind, v, false);
  });
});

describe('valid edge cases accepted by both', () => {
  it('null nullable fields', () => {
    const idx = clone(fixtureIndex);
    Object.assign(idx.firms[0]!, {
      ticker: null,
      latest_icr: null,
      total_debt_usd: null,
      implied_rate: null,
    });
    expectAgree('index', idx, true);

    const firm = clone(ashgroveWorks);
    Object.assign(firm.years[0]!, {
      revenue_usd: null,
      ebit_usd: null,
      icr: null,
      ebit_tag: null,
      revenue_tag: null,
      debt_tags: [],
    });
    firm.ticker = null;
    expectAgree('firm', firm, true);
  });

  it('date-time with offset or fractional seconds', () => {
    for (const ts of ['2025-03-10T00:00:00Z', '2025-03-10T01:02:03.456+02:00']) {
      const idx = clone(fixtureIndex);
      idx.meta.generated_at = ts;
      expectAgree('index', idx, true);
    }
  });

  it('empty firm list and empty sector_medians', () => {
    const idx = clone(fixtureIndex);
    idx.firms = [];
    expectAgree('index', idx, true);
    const m = clone(fixtureMacro);
    m.sector_medians = {};
    expectAgree('macro', m, true);
  });
});

describe('fixture content', () => {
  it('has the Ashgrove numbers and dgs10 0.042', () => {
    const latest = ashgroveWorks.years.at(-1)!;
    expect(latest.revenue_usd).toBe(1.2e9);
    expect(latest.ebit_usd).toBe(38e6);
    expect(latest.interest_expense_usd).toBe(61e6);
    expect(latest.total_debt_usd).toBe(1.05e9);
    expect(latest.total_assets_usd).toBe(1.6e9);
    expect(latest.equity_usd).toBe(140e6);
    expect(fixtureMacro.dgs10.value).toBe(0.042);
  });

  it('covers three statuses once each, counts match the index', () => {
    const counts = { zombie: 0, endangered: 0, healthy: 0, insufficient_data: 0 };
    for (const e of fixtureIndex.firms) counts[e.status] += 1;
    expect(counts).toEqual(fixtureIndex.meta.counts);
    expect(counts).toMatchObject({ zombie: 1, endangered: 1, healthy: 1 });
  });

  it('index and firm files agree on identity and status', () => {
    expect(fixtureIndex.firms.map((e) => e.cik).sort()).toEqual(
      fixtureFirms.map((f) => f.cik).sort(),
    );
    for (const f of fixtureFirms) {
      const e = fixtureIndex.firms.find((x) => x.cik === f.cik)!;
      expect({ name: e.name, ticker: e.ticker, sector: e.sector, status: e.status }).toEqual({
        name: f.name,
        ticker: f.ticker,
        sector: f.sector,
        status: f.status,
      });
    }
  });

  it('uses fictional CIKs (90000000xx) and no CIK collides with a real-looking one', () => {
    for (const e of fixtureIndex.firms) expect(e.cik).toMatch(/^90000000\d{2}$/);
    expect(new Set(fixtureIndex.firms.map((e) => e.name)).size).toBe(fixtureIndex.firms.length);
  });
});
