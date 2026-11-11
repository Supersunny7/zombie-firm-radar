export interface Settings {
  lights: 'off' | 'on';
  /** Stored flag only. No audio is started by the app shell. */
  sound: boolean;
  lowQuality: boolean;
  /** null = follow the system `prefers-reduced-motion` setting. */
  reducedMotion: boolean | null;
}

export const DEFAULT_SETTINGS: Settings = {
  lights: 'off',
  sound: false,
  lowQuality: false,
  reducedMotion: null,
};

export function serializeSettings(s: Settings): string {
  return JSON.stringify(s);
}

/** Never throws. Invalid JSON, non-objects and wrongly typed fields fall back per field. */
export function parseSettings(raw: string | null): Settings {
  const result: Settings = { ...DEFAULT_SETTINGS };
  if (raw === null) return result;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return result;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return result;
  const o = value as Record<string, unknown>;
  if (o['lights'] === 'off' || o['lights'] === 'on') result.lights = o['lights'];
  if (typeof o['sound'] === 'boolean') result.sound = o['sound'];
  if (typeof o['lowQuality'] === 'boolean') result.lowQuality = o['lowQuality'];
  if (typeof o['reducedMotion'] === 'boolean' || o['reducedMotion'] === null) {
    result.reducedMotion = o['reducedMotion'];
  }
  return result;
}
