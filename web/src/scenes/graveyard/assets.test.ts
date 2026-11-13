import { describe, expect, it } from 'vitest';
import groupAssets from './groupAssets.json';
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

  it('groupAssets.json equals the set derived from ASSET_KEYS', () => {
    const { craggleHand, hdri1k, hdri2k, ...rest } = ASSET_KEYS;
    void craggleHand;
    void hdri1k;
    void hdri2k;
    const derived = new Set<string>();
    const walk = (v: unknown, isAudio: boolean): void => {
      if (typeof v === 'string') derived.add(isAudio ? `${v}.ogg` : v);
      else if (Array.isArray(v)) v.forEach((x) => walk(x, isAudio));
      else if (v && typeof v === 'object') {
        for (const [k, x] of Object.entries(v)) walk(x, isAudio || k === 'audio');
      }
    };
    walk(rest, false);
    const listed = Object.values(groupAssets.categories).flat();
    expect(new Set(listed).size).toBe(listed.length);
    expect(new Set(listed)).toEqual(derived);
    expect([...derived].some((k) => k.toLowerCase().includes('ruella'))).toBe(false);
    expect(groupAssets.hdri).toEqual([ASSET_KEYS.hdri1k, ASSET_KEYS.hdri2k]);
    expect(Object.keys(groupAssets.categories)).toEqual([
      'ground',
      'characters',
      'stones',
      'props',
      'sounds',
    ]);
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
