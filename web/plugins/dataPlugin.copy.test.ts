// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { copyData, copyDataAndLog, planCopy } from './dataPlugin';

let tmp: string;
let dataDir: string;
let outDir: string;

function write(rel: string): void {
  const p = path.join(dataDir, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, '{}');
}

function listOut(): string[] {
  const root = path.join(outDir, 'data');
  if (!fs.existsSync(root)) return [];
  const out: string[] = [];
  const walk = (d: string, base: string): void => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const rel = base ? `${base}/${e.name}` : e.name;
      if (e.isDirectory()) walk(path.join(d, e.name), rel);
      else out.push(rel);
    }
  };
  walk(root, '');
  return out.sort();
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zfr-data-'));
  dataDir = path.join(tmp, 'data');
  outDir = path.join(tmp, 'dist');
  fs.mkdirSync(dataDir, { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('planCopy', () => {
  it('real mode excludes schema and mock', () => {
    const plan = planCopy(dataDir, [
      'firms_index.json',
      'macro.json',
      'firms/0000000001.json',
      'schema/firm.schema.json',
      'mock/firms_index.json',
    ]);
    expect(plan.mode).toBe('real');
    expect(plan.include.sort()).toEqual([
      'firms/0000000001.json',
      'firms_index.json',
      'macro.json',
    ]);
  });

  it('mock-only mode includes only mock files, never schema', () => {
    const plan = planCopy(dataDir, ['mock/firms_index.json', 'mock/macro.json', 'schema/a.json']);
    expect(plan.mode).toBe('mock');
    expect(plan.include).toEqual(['mock/firms_index.json', 'mock/macro.json']);
  });

  it('neither real nor mock gives an empty plan', () => {
    expect(planCopy(dataDir, ['schema/a.json'])).toEqual({ include: [], mode: 'none' });
  });
});

describe('copyData', () => {
  it('copies real data and excludes schema and mock', () => {
    write('firms_index.json');
    write('macro.json');
    write('firms/0000000001.json');
    write('schema/firm.schema.json');
    write('mock/firms_index.json');
    const r = copyData(dataDir, outDir);
    expect(r).toEqual({ count: 3, mode: 'real' });
    expect(listOut()).toEqual(['firms/0000000001.json', 'firms_index.json', 'macro.json']);
  });

  it('copies mock only when there is no real index', () => {
    write('mock/firms_index.json');
    write('mock/firms/0000000001.json');
    write('schema/firm.schema.json');
    const r = copyData(dataDir, outDir);
    expect(r).toEqual({ count: 2, mode: 'mock' });
    expect(listOut()).toEqual(['mock/firms/0000000001.json', 'mock/firms_index.json']);
  });

  it('copies nothing when neither exists, even with schema present', () => {
    write('schema/firm.schema.json');
    const r = copyData(dataDir, outDir);
    expect(r).toEqual({ count: 0, mode: 'none' });
    expect(listOut()).toEqual([]);
  });

  it('copies nothing when the data folder is missing', () => {
    expect(copyData(path.join(tmp, 'absent'), outDir)).toEqual({ count: 0, mode: 'none' });
  });
});

describe('copyDataAndLog', () => {
  function stub() {
    const calls: { level: 'info' | 'warn'; msg: string }[] = [];
    return {
      calls,
      logger: {
        info: (msg: string) => calls.push({ level: 'info', msg }),
        warn: (msg: string) => calls.push({ level: 'warn', msg }),
      },
    };
  }

  it('logs the file count for real data', () => {
    write('firms_index.json');
    write('macro.json');
    const { calls, logger } = stub();
    const r = copyDataAndLog(dataDir, outDir, logger);
    expect(r.message).toBe('[data] copied 2 files (real)');
    expect(calls).toEqual([{ level: 'info', msg: '[data] copied 2 files (real)' }]);
  });

  it('logs the file count for mock data', () => {
    write('mock/firms_index.json');
    const { calls, logger } = stub();
    copyDataAndLog(dataDir, outDir, logger);
    expect(calls).toEqual([{ level: 'info', msg: '[data] copied 1 files (mock)' }]);
  });

  it('warns when nothing is found', () => {
    const { calls, logger } = stub();
    copyDataAndLog(dataDir, outDir, logger);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.level).toBe('warn');
    expect(calls[0]?.msg).toContain('nothing copied');
  });
});
