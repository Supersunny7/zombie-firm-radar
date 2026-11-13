// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { CRITICAL_ASSET_KEYS as TS_KEYS } from '../src/scenes/graveyard/assets';
import {
  CRITICAL_ASSET_KEYS,
  computeInitialDownload,
  criticalAssetBytes,
} from './check-bundle.mjs';

describe('check-bundle initial download', () => {
  it('keeps the critical key list equal to the TypeScript one', () => {
    expect([...CRITICAL_ASSET_KEYS]).toEqual([...TS_KEYS]);
  });

  it('sums manifest bytes and throws on a missing key', () => {
    const files = { a: { bytes: 10 }, b: { bytes: 5 } };
    expect(criticalAssetBytes(files, ['a', 'b'])).toBe(15);
    expect(() => criticalAssetBytes(files, ['a', 'c'])).toThrow(/"c"/);
  });

  it('passes at the limit and fails above it with the exact message', () => {
    expect(computeInitialDownload({ assetBytes: 24_000_000, jsGzipBytes: 1_000_000 }).message).toBe(
      null,
    );
    const over = computeInitialDownload({ assetBytes: 24_000_000, jsGzipBytes: 1_100_000 });
    expect(over.over).toBe(true);
    expect(over.message).toBe('Initial download 25.1 MB exceeds the 25 MB limit');
  });
});
