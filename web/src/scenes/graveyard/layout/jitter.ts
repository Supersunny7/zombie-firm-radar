/**
 * Stone_Jitter (pure). Per-firm variation drawn from mulberry32(fnv1a32(cik)).
 * Exactly 12 uniforms are drawn in a fixed order for every firm, so one firm's
 * jitter never depends on any other firm and equal input gives bit-equal output.
 * No React or three imports.
 */
import { fnv1a32 } from '../../../engine/hash';
import { mulberry32 } from '../../../engine/rng';

export const OFFSET_MAX = 0.3; // metres per axis (8.2)
export const YAW_MAX = (20 * Math.PI) / 180; // 8.3
export const HEIGHT_FACTOR: readonly [number, number] = [0.9, 1.1]; // 8.5
export const FALLEN_RATE = 0.05; // 8.6
export const FALLEN_SINK_MAX = 0.08; // 8.7

export interface StoneJitter {
  /** Offsets from the cell anchor, each in [-0.30, 0.30] m. */
  readonly dx: number;
  readonly dz: number;
  /** Standing yaw in [-20deg, 20deg] (radians). */
  readonly yaw: number;
  /** Multiplies the base height, in [0.90, 1.10]. */
  readonly heightFactor: number;
  readonly fallen: boolean;
  /** +PI/2 or -PI/2; added to the yaw of a fallen stone. */
  readonly fallenSideYaw: number;
  /** Sink of a fallen stone, in [0, 0.08] m. */
  readonly fallenSink: number;
  /** Base_Spec draws, consumed by the layout (width, sink, lean). */
  readonly widthU: number;
  readonly sinkU: number;
  readonly leanMagU: number;
  readonly leanSplitU: number;
  readonly signP: number;
  readonly signR: number;
}

function between(lo: number, hi: number, u: number): number {
  return lo + (hi - lo) * u;
}

export function stoneJitter(cik: string): StoneJitter {
  const rnd = mulberry32(fnv1a32(cik));
  // Fixed draw order: 12 uniforms.
  const uDx = rnd();
  const uDz = rnd();
  const uYaw = rnd();
  const uHeight = rnd();
  const uFallen = rnd(); // fallen when < FALLEN_RATE; its lower half picks the side
  const uSink = rnd();
  const widthU = rnd();
  const sinkU = rnd();
  const leanMagU = rnd();
  const leanSplitU = rnd();
  const uSignP = rnd();
  const uSignR = rnd();

  const fallen = uFallen < FALLEN_RATE;
  return {
    dx: between(-OFFSET_MAX, OFFSET_MAX, uDx),
    dz: between(-OFFSET_MAX, OFFSET_MAX, uDz),
    yaw: between(-YAW_MAX, YAW_MAX, uYaw),
    heightFactor: between(HEIGHT_FACTOR[0], HEIGHT_FACTOR[1], uHeight),
    fallen,
    fallenSideYaw: uFallen < FALLEN_RATE / 2 ? -Math.PI / 2 : Math.PI / 2,
    fallenSink: FALLEN_SINK_MAX * uSink,
    widthU,
    sinkU,
    leanMagU,
    leanSplitU,
    signP: uSignP < 0.5 ? -1 : 1,
    signR: uSignR < 0.5 ? -1 : 1,
  };
}
