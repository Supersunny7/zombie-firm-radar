import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, parseSettings, serializeSettings, type Settings } from './settings';
import { SETTINGS_KEY, readSettings, writeSettings } from './settingsStorage';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('settings defaults', () => {
  it('has the documented default values', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      lights: 'off',
      sound: false,
      lowQuality: false,
      reducedMotion: null,
    });
  });

  it('parseSettings(null) returns the defaults', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('readSettings returns defaults when nothing is stored', () => {
    const storage = { getItem: () => null };
    expect(readSettings(storage)).toEqual(DEFAULT_SETTINGS);
  });

  it('returns a fresh object, not the shared default', () => {
    expect(readSettings({ getItem: () => null })).not.toBe(DEFAULT_SETTINGS);
  });
});

describe('throwing localStorage', () => {
  it('readSettings returns defaults when getItem throws', () => {
    const storage = {
      getItem: () => {
        throw new Error('SecurityError');
      },
    };
    expect(readSettings(storage)).toEqual(DEFAULT_SETTINGS);
  });

  it('readSettings returns defaults when accessing global localStorage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied');
      },
    });
    expect(readSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('writeSettings returns false when setItem throws', () => {
    const storage = {
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(writeSettings({ ...DEFAULT_SETTINGS }, storage)).toBe(false);
  });

  it('writeSettings returns true and stores under the versioned key on success', () => {
    const setItem = vi.fn();
    const next: Settings = { lights: 'on', sound: true, lowQuality: true, reducedMotion: false };
    expect(writeSettings(next, { setItem })).toBe(true);
    expect(setItem).toHaveBeenCalledWith(SETTINGS_KEY, serializeSettings(next));
    expect(SETTINGS_KEY).toBe('zfr.settings.v1');
  });
});

describe('sound flag creates no audio', () => {
  it('never constructs an AudioContext during settings operations', () => {
    const audio = vi.fn();
    const webkit = vi.fn();
    vi.stubGlobal('AudioContext', audio);
    vi.stubGlobal('webkitAudioContext', webkit);

    const s: Settings = { ...DEFAULT_SETTINGS, sound: true };
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    };
    expect(writeSettings(s, storage)).toBe(true);
    expect(readSettings(storage).sound).toBe(true);
    parseSettings(serializeSettings(s));

    expect(audio).not.toHaveBeenCalled();
    expect(webkit).not.toHaveBeenCalled();
  });
});
