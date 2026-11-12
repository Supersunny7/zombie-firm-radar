import { describe, expect, it } from 'vitest';

const EXPECTED = [
  'applyTreatment',
  'createSimulationClient',
  'diagnose',
  'drawOutcome',
  'icr',
  'liquidationRecovery',
  'mulberry32',
  'parseTreatment',
  'score',
  'seedFrom',
  'shockBatch',
  'shockFirm',
  'simulate',
].sort();

describe('engine index exports', () => {
  it('exposes exactly the expected runtime symbols', async () => {
    const mod = await import('./index');
    expect(Object.keys(mod).sort()).toEqual(EXPECTED);
  });

  it('resolves every symbol to a function', async () => {
    const mod = (await import('./index')) as Record<string, unknown>;
    for (const name of EXPECTED) {
      expect(typeof mod[name], name).toBe('function');
    }
  });
});
