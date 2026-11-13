/**
 * Torn mound geometry and set rules (pure, no React or three imports).
 * Design section 5, Requirements 7.2, 7.3, 7.5.
 */
import { fnv1a32 } from '../../../engine/hash';
import { mulberry32 } from '../../../engine/rng';
import { PIT_R_MAX } from '../layout/extents';

/** Smallest and largest Pit radius in metres (width 0.5 to 0.9 m). Max equals PIT_R_MAX. */
export const PIT_R_MIN = 0.25;
export { PIT_R_MAX };
/** Rim crest height in metres, reached at `PIT_R * RIM_AT`. */
export const RIM_HEIGHT = 0.3;
export const RIM_AT = 1.15;
/** Depth of the crater floor below ground, metres (negative y). */
export const CRATER_DEPTH = 0.12;
/** Heap radius as a multiple of the Pit radius. */
export const HEAP_RADIUS_FACTOR = 2.4;

export const CLOD_MIN = 6;
export const CLOD_MAX = 14;
/** Outer distance of a clod from the Pit centre, metres. */
export const CLOD_R_MAX = 1.2;
/** Clod gap beyond the Pit edge, metres. */
export const CLOD_GAP = 0.05;
export const CLOD_SCALE_MIN = 0.07;
export const CLOD_SCALE_MAX = 0.18;

export interface Clod {
  /** Offset from the Pit centre on the ground plane, metres. */
  readonly dx: number;
  readonly dz: number;
  /** Radius of the clod (icosahedron scale), metres. */
  readonly scale: number;
}

/** Pit radius for a firm: `0.25 + 0.2 * u`, so within [0.25, 0.45]. */
export function pitRadius(cik: string): number {
  const u = mulberry32(fnv1a32(`pit:${cik}`))();
  return PIT_R_MIN + (PIT_R_MAX - PIT_R_MIN) * u;
}

/** Number of clods for a firm: `6 + hash % 9`, so 6 to 14. */
export function clodCount(cik: string): number {
  return CLOD_MIN + (fnv1a32(`clods:${cik}`) % (CLOD_MAX - CLOD_MIN + 1));
}

/** Seeded clod positions between `pitR + 0.05` and 1.2 m from the Pit centre. */
export function clodsFor(cik: string, pitR: number = pitRadius(cik)): Clod[] {
  const rand = mulberry32(fnv1a32(`clodpos:${cik}`));
  const lo = pitR + CLOD_GAP;
  const out: Clod[] = [];
  for (let i = clodCount(cik); i > 0; i--) {
    const a = rand() * Math.PI * 2;
    const d = lo + rand() * (CLOD_R_MAX - lo);
    const scale = CLOD_SCALE_MIN + rand() * (CLOD_SCALE_MAX - CLOD_SCALE_MIN);
    out.push({ dx: Math.sin(a) * d, dz: Math.cos(a) * d, scale });
  }
  return out;
}

/**
 * Heap height at radial coordinate `r` (metres from the Pit centre): crater floor below
 * ground inside `pitR`, rim crest of 0.30 m at `pitR * 1.15`, falling to 0 at the heap radius.
 */
export function tornMoundProfile(r: number, pitR: number = PIT_R_MAX): number {
  const rr = Math.max(0, r);
  const crest = pitR * RIM_AT;
  const heapR = pitR * HEAP_RADIUS_FACTOR;
  if (rr >= heapR) return 0;
  if (rr <= pitR) {
    // Floor sinks smoothly from the rim edge into the crater.
    const t = rr / pitR;
    const rimEdge = RIM_HEIGHT * smooth((pitR - 0) / (crest - 0)); // value at r = pitR
    return -CRATER_DEPTH + (rimEdge + CRATER_DEPTH) * t * t;
  }
  if (rr <= crest) {
    const rimEdge = RIM_HEIGHT * smooth(pitR / crest);
    const t = (rr - pitR) / (crest - pitR);
    return rimEdge + (RIM_HEIGHT - rimEdge) * smooth(t);
  }
  const t = (rr - crest) / (heapR - crest);
  return RIM_HEIGHT * (1 - smooth(t));
}

function smooth(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/**
 * Firms that draw a torn mound: the torn ciks plus every cik whose Risen_Zombie is still
 * rising or lowering, so a torn mound is never removed under a character (7.5).
 */
export function tornMoundSet(
  torn: Iterable<string>,
  activeCiks: Iterable<string>,
): ReadonlySet<string> {
  const set = new Set<string>(torn);
  for (const cik of activeCiks) set.add(cik);
  return set;
}
