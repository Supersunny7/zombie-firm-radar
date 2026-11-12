import { describe, expect, it } from 'vitest';
import { ASSET_KEYS, CRITICAL_ASSET_KEYS, allAssetKeys, assetUrl, pickAudioKey } from './assets';

describe('graveyard assets', () => {
  it('every key is in the manifest and none mentions ruella', () => {
    const keys = allAssetKeys();
    expect(keys.length).toBeGreaterThan(30);
    for (const k of keys) {
      expect(assetUrl(k), k).not.toBeNull();
      expect(k.toLowerCase()).not.toContain('ruella');
    }
    for (const k of CRITICAL_ASSET_KEYS) expect(assetUrl(k)).not.toBeNull();
  });

  it('assetUrl returns null for unknown keys and prefixes known ones', () => {
    expect(assetUrl('models/nope.glb')).toBeNull();
    expect(assetUrl('toString')).toBeNull();
    expect(assetUrl(ASSET_KEYS.gate)).toBe(`/assets/${ASSET_KEYS.gate}`);
    expect(assetUrl('a', { a: {} }, '/x/')).toBe('/x/a');
  });

  it('pickAudioKey prefers ogg and falls back to mp3', () => {
    const base = ASSET_KEYS.audio.wind;
    expect(pickAudioKey(base, () => 'probably')).toBe(`${base}.ogg`);
    expect(pickAudioKey(base, () => 'maybe')).toBe(`${base}.ogg`);
    expect(pickAudioKey(base, () => '')).toBe(`${base}.mp3`);
  });
});
