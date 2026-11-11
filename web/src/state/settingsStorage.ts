import { DEFAULT_SETTINGS, parseSettings, serializeSettings, type Settings } from './settings';

export const SETTINGS_KEY = 'zfr.settings.v1';

/** Reads settings from localStorage. Never throws; falls back to defaults. */
export function readSettings(storage?: Pick<Storage, 'getItem'>): Settings {
  try {
    const s = storage ?? globalThis.localStorage;
    return parseSettings(s.getItem(SETTINGS_KEY));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Writes settings to localStorage. Returns false on any failure. */
export function writeSettings(s: Settings, storage?: Pick<Storage, 'setItem'>): boolean {
  try {
    const target = storage ?? globalThis.localStorage;
    target.setItem(SETTINGS_KEY, serializeSettings(s));
    return true;
  } catch {
    return false;
  }
}
