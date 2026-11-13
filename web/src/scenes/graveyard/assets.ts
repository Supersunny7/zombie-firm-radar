// Pure asset key table for the graveyard scene (design Section 8). No react or three imports.
// The Ruella hand model is intentionally absent (Requirement 14.2).
import manifest from '../../../public/assets/manifest.json';

const tex = (dir: string, suffix: string): string => `textures/${dir}/${dir}_${suffix}.webp`;
const model = (name: string): string => `models/${name}/${name}.glb`;
const audioBase = (name: string): string => `audio/${name}/${name}`;

/** Poly Haven slug of the Ground_Texture (horror-pass Requirement 2/6). */
export const GROUND_SLUG = 'polyhaven-brown-mud-leaves-01';
export const ASSET_KEYS = {
  forestFloor: {
    diffuse: tex(GROUND_SLUG, 'diffuse'),
    normal: tex(GROUND_SLUG, 'nor-gl'),
    rough: tex(GROUND_SLUG, 'rough'),
  },
  characters: {
    hero: model('sketchfab-possessed-undead-giantswing'),
    walker: model('sketchfab-zombie-pxltiger'),
    crawler: model('sketchfab-zombie-walk-oscar'),
    watcher: model('sketchfab-hooded-horror-woman-purplepoint'),
  },
  soil: {
    diffuse: tex('polyhaven-excavated-soil-wall', 'diffuse'),
    normal: tex('polyhaven-excavated-soil-wall', 'nor-gl'),
    rough: tex('polyhaven-excavated-soil-wall', 'rough'),
  },
  lichenRock: {
    diffuse: tex('polyhaven-lichen-rock', 'diffuse'),
    normal: tex('polyhaven-lichen-rock', 'nor-gl'),
    rough: tex('polyhaven-lichen-rock', 'rough'),
  },
  intactStone: model('sketchfab-small-gravestone-drydoctoregg'),
  crackedStone: model('own-headstone-cracked'),
  brokenStone: model('sketchfab-damaged-tombstone-drydoctoregg'),
  mutant: model('sketchfab-zombie-mutant'),
  greenallCorpse: model('sketchfab-zombie-corpse-greenall'),
  craggleHand: model('sketchfab-zombie-hand-craggle'),
  gate: model('polyhaven-large-iron-gate'),
  statue: model('polyhaven-gothic-statue'),
  trunk: model('polyhaven-dead-tree-trunk'),
  stumps: [model('polyhaven-tree-stump-01'), model('polyhaven-tree-stump-02')],
  lantern: model('polyhaven-lantern-01'),
  cobwebs: model('sketchfab-cobwebs-asset-pack-emarshall'),
  hdri1k: 'hdri/polyhaven-moonlit-golf-environment/polyhaven-moonlit-golf-environment_1k.hdr',
  hdri2k: 'hdri/polyhaven-moonlit-golf/polyhaven-moonlit-golf_2k.hdr',
  blood: tex('oga-blood-splatter-exilegl', 'color'),
  handprints: [0, 1, 2].map((i) => tex('own-handprint-decal', `handprint-${i}`)),
  dragMarks: [0, 1, 2].map((i) => tex('own-drag-mark-decal', `drag-mark-${i}`)),
  /** Audio bases without extension; use pickAudioKey(base). */
  audio: {
    wind: audioBase('freesound-tomhannen-howling-wind-tower'),
    crows: audioBase('freesound-giddster-crows-cawing'),
    digging: audioBase('freesound-guyburns-digging-with-shovel'),
    gate: audioBase('freesound-launemax-open-close-iron-gate'),
    growls: [
      audioBase('freesound-tonsil5-zombie-growl-5'),
      audioBase('freesound-ezcah-zombie-growl-01'),
    ],
    footsteps: audioBase('freesound-indieground-pas-zombie-route'),
  },
} as const;

type Manifest = { files: Record<string, unknown> };

/** Manifest keys are relative to /assets/. Returns null when the key is not in the manifest. */
export function assetUrl(
  key: string,
  files: Manifest['files'] = (manifest as Manifest).files,
  base = '/assets/',
): string | null {
  return Object.prototype.hasOwnProperty.call(files, key) ? `${base}${key}` : null;
}

/** Ogg first, mp3 when the browser cannot play Vorbis. `canPlay` is injectable for tests. */
export function pickAudioKey(
  audioBaseKey: string,
  canPlay: (type: string) => string = defaultCanPlay,
): string {
  const ogg = canPlay('audio/ogg; codecs="vorbis"');
  return `${audioBaseKey}.${ogg === 'probably' || ogg === 'maybe' ? 'ogg' : 'mp3'}`;
}

function defaultCanPlay(type: string): string {
  if (typeof Audio === 'undefined') return '';
  try {
    return new Audio().canPlayType(type);
  } catch {
    return '';
  }
}

/** Every concrete manifest key the scene can request (both audio formats included). */
export function allAssetKeys(): string[] {
  const out: string[] = [];
  const walk = (v: unknown, isAudio: boolean): void => {
    if (typeof v === 'string') {
      if (isAudio) out.push(`${v}.ogg`, `${v}.mp3`);
      else out.push(v);
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, isAudio));
    else if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) walk(x, isAudio || k === 'audio');
    }
  };
  walk(ASSET_KEYS, false);
  return out;
}

/** Keys the first frame needs: three stones, 1k HDRI, soil set. Used by the bundle check. */
export const CRITICAL_ASSET_KEYS: readonly string[] = [
  ASSET_KEYS.intactStone,
  ASSET_KEYS.crackedStone,
  ASSET_KEYS.brokenStone,
  ASSET_KEYS.hdri1k,
  ASSET_KEYS.soil.diffuse,
  ASSET_KEYS.soil.normal,
  ASSET_KEYS.soil.rough,
];
