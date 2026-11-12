/**
 * Graveyard layout (pure). One plot per sector, one stone per firm.
 * No React or three imports; the input list is never mutated.
 * All variation comes from hash32(cik) seeding mulberry32, so equal input gives
 * bit-equal output.
 */
import { fnv1a32 as hash32 } from '../../../engine/hash';
import { mulberry32 } from '../../../engine/rng';

/** Structural subset of a firm index entry. */
export interface LayoutInput {
  readonly cik: string;
  readonly sector: string;
  readonly status: 'zombie' | 'endangered' | 'healthy' | 'insufficient_data';
  readonly total_debt_usd: number | null;
}

export interface Rect {
  readonly x0: number;
  readonly z0: number;
  readonly x1: number;
  readonly z1: number;
}

export interface StoneLayout {
  /** Index into the input list (equals the index in `stones`). */
  readonly firmIndex: number;
  readonly plot: number;
  /** World metres, base centre. */
  readonly x: number;
  readonly z: number;
  readonly yaw: number;
  readonly pitch: number;
  readonly roll: number;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  /** Metres below ground. */
  readonly sink: number;
  /** hypot(pitch, roll), radians. */
  readonly lean: number;
}

export interface PlotLayout {
  readonly index: number;
  readonly sector: string;
  readonly count: number;
  readonly rect: Rect;
  /** World z of the first row. */
  readonly frontZ: number;
  readonly centerX: number;
  /** Indices into `GraveyardLayout.stones`, reading order. */
  readonly stones: readonly number[];
}

export interface GraveyardLayout {
  readonly stones: readonly StoneLayout[];
  readonly plots: readonly PlotLayout[];
  readonly bounds: Rect;
}

/** Cell pitch inside a plot (metres). */
export const PITCH_X = 1.3;
export const PITCH_Z = 1.8;
/** Gap between adjacent plot rectangles (requirement: at least 1.2 m). */
export const PLOT_GAP = 1.6;
/** Padding between the stones and the plot rectangle. */
export const PAD = 0.4;
/** First row of plot 0 sits at this world z. */
export const FIRST_ROW_Z = 3;

export const HEIGHT_MIN = 0.85;
export const HEIGHT_MAX = 1.6;
export const WIDTH_MIN = 0.62;
export const WIDTH_MAX = 0.88;
/** depth = DEPTH_RATIO * width */
export const DEPTH_RATIO = 0.45;
export const SINK_MIN = 0.15;
export const SINK_MAX = 0.2;

export const JITTER_POS = 0.06;
export const JITTER_YAW = 0.1;

/** Total lean ranges (radians) by status group. */
export const LEAN_HEALTHY_MAX = 0.02;
export const LEAN_ENDANGERED: readonly [number, number] = [0.05, 0.09];
export const LEAN_ZOMBIE: readonly [number, number] = [0.09, 0.14];
export const ROLL_MAX = 0.03;

const ZERO_RECT: Rect = { x0: 0, z0: 0, x1: 0, z1: 0 };

function leanFor(
  status: LayoutInput['status'],
  uMag: number,
  uSplit: number,
  uSignP: number,
  uSignR: number,
): { pitch: number; roll: number } {
  const signP = uSignP < 0.5 ? -1 : 1;
  const signR = uSignR < 0.5 ? -1 : 1;
  if (status === 'healthy' || status === 'insufficient_data') {
    // Each component within 0.014 so hypot <= 0.0198 < 0.02.
    const lim = LEAN_HEALTHY_MAX * 0.7;
    return { pitch: signP * uMag * lim, roll: signR * uSplit * lim };
  }
  const [lo, hi] = status === 'zombie' ? LEAN_ZOMBIE : LEAN_ENDANGERED;
  const total = lo + (hi - lo) * uMag;
  const roll = signR * uSplit * Math.min(ROLL_MAX, total);
  const pitch = signP * Math.sqrt(Math.max(0, total * total - roll * roll));
  return { pitch, roll };
}

/** Compute the whole graveyard layout. Pure and deterministic. */
export function computeLayout(firms: readonly LayoutInput[]): GraveyardLayout {
  if (firms.length === 0) return { stones: [], plots: [], bounds: ZERO_RECT };

  // Height mapping range over firms with positive debt.
  let logMin = Infinity;
  let logMax = -Infinity;
  for (const f of firms) {
    const d = f.total_debt_usd;
    if (d !== null && Number.isFinite(d) && d > 0) {
      const l = Math.log10(d);
      if (l < logMin) logMin = l;
      if (l > logMax) logMax = l;
    }
  }
  const logSpan = logMax - logMin;

  // Group by sector; plots ordered by sorted sector names (UTF-16 order).
  const bySector = new Map<string, number[]>();
  firms.forEach((f, i) => {
    const list = bySector.get(f.sector);
    if (list) list.push(i);
    else bySector.set(f.sector, [i]);
  });
  const sectors = [...bySector.keys()].sort();

  // Plot internal sizes.
  interface Dim {
    readonly sector: string;
    readonly members: readonly number[];
    readonly cols: number;
    readonly rows: number;
    readonly w: number;
    readonly d: number;
  }
  const dims: Dim[] = sectors.map((sector) => {
    const members = bySector.get(sector) ?? [];
    const n = members.length;
    const cols = Math.max(1, Math.ceil(Math.sqrt((n * PITCH_Z) / PITCH_X)));
    const rows = Math.ceil(n / cols);
    return {
      sector,
      members,
      cols,
      rows,
      w: cols * PITCH_X + 2 * PAD,
      d: rows * PITCH_Z + 2 * PAD,
    };
  });

  // Arrange plots on a grid: columns go +x, rows go -z (away from the camera).
  const gridCols = Math.max(1, Math.ceil(Math.sqrt(dims.length)));
  const gridRows = Math.ceil(dims.length / gridCols);
  const colW = new Array<number>(gridCols).fill(0);
  const rowD = new Array<number>(gridRows).fill(0);
  dims.forEach((d, i) => {
    const c = i % gridCols;
    const r = Math.floor(i / gridCols);
    colW[c] = Math.max(colW[c] ?? 0, d.w);
    rowD[r] = Math.max(rowD[r] ?? 0, d.d);
  });
  const first = dims[0] as Dim;
  const colX0: number[] = [];
  let accX = -first.w / 2; // plot 0 is centred on x = 0
  for (let c = 0; c < gridCols; c++) {
    colX0.push(accX);
    accX += (colW[c] ?? 0) + PLOT_GAP;
  }
  const rowTop: number[] = [];
  let accZ = FIRST_ROW_Z + PITCH_Z / 2 + PAD; // top edge of plot row 0
  for (let r = 0; r < gridRows; r++) {
    rowTop.push(accZ);
    accZ -= (rowD[r] ?? 0) + PLOT_GAP;
  }

  const stones: StoneLayout[] = new Array<StoneLayout>(firms.length);
  const plots: PlotLayout[] = [];
  let bx0 = Infinity;
  let bz0 = Infinity;
  let bx1 = -Infinity;
  let bz1 = -Infinity;

  dims.forEach((dim, p) => {
    const gc = p % gridCols;
    const gr = Math.floor(p / gridCols);
    const x0 = colX0[gc] ?? 0;
    const z1 = rowTop[gr] ?? 0;
    const rect: Rect = { x0, z0: z1 - dim.d, x1: x0 + dim.w, z1 };
    const frontZ = z1 - PAD - PITCH_Z / 2;
    bx0 = Math.min(bx0, rect.x0);
    bz0 = Math.min(bz0, rect.z0);
    bx1 = Math.max(bx1, rect.x1);
    bz1 = Math.max(bz1, rect.z1);

    dim.members.forEach((firmIndex, k) => {
      const f = firms[firmIndex] as LayoutInput;
      const rnd = mulberry32(hash32(f.cik));
      // Fixed draw order: 11 uniforms per firm regardless of status.
      const uJx = rnd();
      const uJz = rnd();
      const uYaw = rnd();
      const uW = rnd();
      const uSink = rnd();
      const uMag = rnd();
      const uSplit = rnd();
      const uSignP = rnd();
      const uSignR = rnd();

      const col = k % dim.cols;
      const row = Math.floor(k / dim.cols);
      const x = x0 + PAD + (col + 0.5) * PITCH_X + (uJx * 2 - 1) * JITTER_POS;
      const z = frontZ - row * PITCH_Z + (uJz * 2 - 1) * JITTER_POS;

      const d = f.total_debt_usd;
      let height = HEIGHT_MIN;
      if (d !== null && Number.isFinite(d) && d > 0 && logSpan > 0) {
        const t = (Math.log10(d) - logMin) / logSpan;
        height = HEIGHT_MIN + (HEIGHT_MAX - HEIGHT_MIN) * Math.min(1, Math.max(0, t));
      }
      const width = WIDTH_MIN + (WIDTH_MAX - WIDTH_MIN) * uW;
      const { pitch, roll } = leanFor(f.status, uMag, uSplit, uSignP, uSignR);

      stones[firmIndex] = {
        firmIndex,
        plot: p,
        x,
        z,
        yaw: (uYaw * 2 - 1) * JITTER_YAW,
        pitch,
        roll,
        width,
        height,
        depth: DEPTH_RATIO * width,
        sink: height * (SINK_MIN + (SINK_MAX - SINK_MIN) * uSink),
        lean: Math.hypot(pitch, roll),
      };
    });

    plots.push({
      index: p,
      sector: dim.sector,
      count: dim.members.length,
      rect,
      frontZ,
      centerX: (rect.x0 + rect.x1) / 2,
      stones: dim.members,
    });
  });

  return { stones, plots, bounds: { x0: bx0, z0: bz0, x1: bx1, z1: bz1 } };
}
