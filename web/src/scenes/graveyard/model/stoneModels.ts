// Pure stone model table (design Section 4). No react or three imports.
import { ASSET_KEYS } from '../assets';

export type StoneModelId = 'intact' | 'cracked' | 'broken';

/** Triangles with a vertex where `z > zMin && y < yMax` (model space) are the base flap. */
export interface FlapClip {
  readonly zMin: number;
  readonly yMax: number;
}

export interface StoneModelInfo {
  readonly id: StoneModelId;
  /** Key into manifest.json (from ASSET_KEYS). */
  readonly assetKey: string;
  /** Base centre of the body in model space: centre x, base y, centre z (flap excluded). */
  readonly origin: { readonly x: number; readonly y: number; readonly z: number };
  /** Body size W x H x D in model units (flap excluded). */
  readonly body: { readonly w: number; readonly h: number; readonly d: number };
  /** Runtime geometry clip for the base flap, or null when the model has none. */
  readonly flapClip: FlapClip | null;
}

/**
 * Measured on the real GLBs (Meshopt decoded, node transforms baked into model space).
 *
 * Base flap: Intact and Cracked carry a thin sheet that curves from the base up and back
 * toward the body. Its vertices lie at z > 9. Measured flap tops: Intact y 12.3 (17.6% of
 * the 69.8 height), Cracked y 16.8 (about 25% of 66.0). Both are above the 15 to 20 percent
 * sink range, so sinking alone cannot hide it. clipFlap drops those triangles at load time;
 * the model files are untouched. Body vertices stay at z <= 7.9 (Intact 5.9, Cracked 7.8),
 * so zMin 8 keeps a margin. yMax is a little above the flap tops (14 and 18).
 * Broken has no such sheet (its lowest 16% is a plinth that the sink buries): flapClip null.
 *
 * Body bounds below exclude the flap, so depth is smaller than the whole-file depth (50.3).
 */
export const STONE_MODELS: Readonly<Record<StoneModelId, StoneModelInfo>> = {
  intact: {
    id: 'intact',
    assetKey: ASSET_KEYS.intactStone,
    origin: { x: -1.08, y: -0.49, z: -11.67 },
    body: { w: 59.22, h: 69.81, d: 35.06 },
    flapClip: { zMin: 8, yMax: 14 },
  },
  cracked: {
    id: 'cracked',
    assetKey: ASSET_KEYS.crackedStone,
    origin: { x: -1.16, y: -0.49, z: -10.68 },
    body: { w: 59.07, h: 66.02, d: 37.05 },
    flapClip: { zMin: 8, yMax: 18 },
  },
  broken: {
    id: 'broken',
    assetKey: ASSET_KEYS.brokenStone,
    origin: { x: -1.94, y: -0.51, z: -3.94 },
    body: { w: 58.49, h: 165.49, d: 58.35 },
    flapClip: null,
  },
};
