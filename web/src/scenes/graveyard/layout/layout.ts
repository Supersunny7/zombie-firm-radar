/**
 * Graveyard layout (pure). One plot per sector, one stone per firm.
 * No React or three imports; the input list is never mutated.
 *
 * Band packing: every stone has an extent rectangle (oriented footprint plus the reserved
 * mound zone, see extents.ts). Columns and rows of a plot get variable sizes from the
 * largest extents they hold, separated by MIN_GAP, so footprints keep their distance by
 * construction. All variation comes from stoneJitter(cik), so equal input gives
 * bit-equal output.
 */
import { stoneJitter } from './jitter';
import { MIN_GAP, extentOf, pitCentreOf, type Extent, type Point2 } from './extents';

export { MIN_GAP } from './extents';

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
  /** World metres, model base centre (for a fallen stone, the centre of its lower end). */
  readonly x: number;
  readonly z: number;
  /** Final yaw: standing yaw, plus or minus PI/2 for a fallen stone. */
  readonly yaw: number;
  /** -PI/2 for a fallen stone (lying on its back, face up). */
  readonly pitch: number;
  readonly roll: number;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  /** Metres below ground. */
  readonly sink: number;
  /** hypot(pitch, roll) for an upright stone, 0 for a fallen stone, radians. */
  readonly lean: number;
  readonly fallen: boolean;
  /** Yaw of the stone while standing (the mound faces this way). */
  readonly standingYaw: number;
  /** Instance y: -sink upright, depth / 2 - sink fallen. */
  readonly baseY: number;
  /** Ground centre of the Pit, in front of the standing position. */
  readonly pitCentre: { readonly x: number; readonly z: number };
}

export interface PlotLayout {
  readonly index: number;
  readonly sector: string;
  readonly count: number;
  readonly rect: Rect;
  /** World z of the first row. */
  readonly frontZ: number;
  readonly centerX: number;
  /** World z of each row anchor, front row first. */
  readonly rowAnchors: readonly number[];
  /** Indices into `GraveyardLayout.stones`, reading order. */
  readonly stones: readonly number[];
}

export interface GraveyardLayout {
  readonly stones: readonly StoneLayout[];
  readonly plots: readonly PlotLayout[];
  readonly bounds: Rect;
}

/** Cell pitch of the Base_Spec; only used for the column count formula. */
export const PITCH_X = 1.3;
export const PITCH_Z = 1.8;
/** Gap between adjacent plot rectangles (requirement: at least 1.2 m). */
export const PLOT_GAP = 1.6;
/** Padding between the stones and the plot rectangle. */
export const PAD = 0.4;
/** First row anchor of plot 0 sits at this world z. */
export const FIRST_ROW_Z = 3;

export const HEIGHT_MIN = 0.85;
export const HEIGHT_MAX = 1.6;
export const WIDTH_MIN = 0.62;
export const WIDTH_MAX = 0.88;
/** depth = DEPTH_RATIO * width */
export const DEPTH_RATIO = 0.45;
export const SINK_MIN = 0.15;
export const SINK_MAX = 0.2;

/** Total lean ranges (radians) by status group; the largest total tilt is 0.13 rad = 7.4 degrees. */
export const LEAN_HEALTHY_MAX = 0.02;
export const LEAN_ENDANGERED: readonly [number, number] = [0.05, 0.09];
export const LEAN_ZOMBIE: readonly [number, number] = [0.09, 0.13];
export const ROLL_MAX = 0.03;

const ZERO_RECT: Rect = { x0: 0, z0: 0, x1: 0, z1: 0 };

/** Instance y of the stone's model origin. */
export function stoneBaseY(s: Pick<StoneLayout, 'baseY'>): number {
  return s.baseY;
}

/** World y of the middle of the visible stone body. */
export function stoneCentreY(s: Pick<StoneLayout, 'fallen' | 'baseY' | 'height' | 'sink'>): number {
  return s.fallen ? s.baseY : (s.height - s.sink) / 2;
}

function leanFor(
  status: LayoutInput['status'],
  uMag: number,
  uSplit: number,
  signP: number,
  signR: number,
): { pitch: number; roll: number } {
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

/** Per-stone values relative to the cell anchor, computed before positions are known. */
interface Proto {
  readonly firmIndex: number;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly sink: number;
  readonly pitch: number;
  readonly roll: number;
  readonly lean: number;
  readonly fallen: boolean;
  readonly standingYaw: number;
  readonly yaw: number;
  /** Standing position relative to the anchor. */
  readonly px: number;
  readonly pz: number;
  /** Body origin relative to the anchor. */
  readonly ox: number;
  readonly oz: number;
  readonly extent: Extent;
}

interface Dim {
  readonly sector: string;
  readonly members: readonly number[];
  readonly protos: readonly Proto[];
  readonly cols: number;
  readonly colLeft: readonly number[];
  readonly colAnchorRel: readonly number[];
  readonly rowAnchorRel: readonly number[];
  readonly rowBack: readonly number[];
  readonly front0: number;
  readonly w: number;
  /** Depth from the plot's front line (frontZ + front0 + PAD) to its back edge. */
  readonly d: number;
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

  const protoOf = (firmIndex: number): Proto => {
    const f = firms[firmIndex] as LayoutInput;
    const j = stoneJitter(f.cik);
    let heightBase = HEIGHT_MIN;
    const debt = f.total_debt_usd;
    if (debt !== null && Number.isFinite(debt) && debt > 0 && logSpan > 0) {
      const t = (Math.log10(debt) - logMin) / logSpan;
      heightBase = HEIGHT_MIN + (HEIGHT_MAX - HEIGHT_MIN) * Math.min(1, Math.max(0, t));
    }
    const height = heightBase * j.heightFactor;
    const width = WIDTH_MIN + (WIDTH_MAX - WIDTH_MIN) * j.widthU;
    const depth = DEPTH_RATIO * width;
    const standingYaw = j.yaw;
    const fallen = j.fallen;
    const { pitch, roll } = fallen
      ? { pitch: -Math.PI / 2, roll: 0 }
      : leanFor(f.status, j.leanMagU, j.leanSplitU, j.signP, j.signR);
    const yaw = fallen ? standingYaw + j.fallenSideYaw : standingYaw;
    const sink = fallen ? j.fallenSink : height * (SINK_MIN + (SINK_MAX - SINK_MIN) * j.sinkU);
    // A fallen stone lies with its width along the front-back axis and its front edge at
    // the standing position, so its body stays out of the Pit.
    const ox = fallen ? j.dx - Math.sin(standingYaw) * (width / 2) : j.dx;
    const oz = fallen ? j.dz - Math.cos(standingYaw) * (width / 2) : j.dz;
    const extent = extentOf(
      { x: ox, z: oz, yaw, pitch, roll, width, height, depth, fallen },
      standingYaw,
      j.dx,
      j.dz,
    );
    return {
      firmIndex,
      width,
      height,
      depth,
      sink,
      pitch,
      roll,
      lean: fallen ? 0 : Math.hypot(pitch, roll),
      fallen,
      standingYaw,
      yaw,
      px: j.dx,
      pz: j.dz,
      ox,
      oz,
      extent,
    };
  };

  // Group by sector; plots ordered by sorted sector names (UTF-16 order).
  const bySector = new Map<string, number[]>();
  firms.forEach((f, i) => {
    const list = bySector.get(f.sector);
    if (list) list.push(i);
    else bySector.set(f.sector, [i]);
  });
  const sectors = [...bySector.keys()].sort();

  const dims: Dim[] = sectors.map((sector) => {
    const members = bySector.get(sector) ?? [];
    const n = members.length;
    const cols = Math.max(1, Math.ceil(Math.sqrt((n * PITCH_Z) / PITCH_X)));
    const rows = Math.ceil(n / cols);
    const protos = members.map(protoOf);

    const colLeft = new Array<number>(cols).fill(0);
    const colRight = new Array<number>(cols).fill(0);
    const rowFront = new Array<number>(rows).fill(0);
    const rowBack = new Array<number>(rows).fill(0);
    protos.forEach((p, k) => {
      const c = k % cols;
      const r = Math.floor(k / cols);
      colLeft[c] = Math.max(colLeft[c] ?? 0, p.extent.left);
      colRight[c] = Math.max(colRight[c] ?? 0, p.extent.right);
      rowFront[r] = Math.max(rowFront[r] ?? 0, p.extent.front);
      rowBack[r] = Math.max(rowBack[r] ?? 0, p.extent.back);
    });

    // Anchors relative to the plot's left edge and to the front row anchor.
    const colAnchorRel: number[] = [];
    let ax = PAD + (colLeft[0] ?? 0);
    for (let c = 0; c < cols; c++) {
      colAnchorRel.push(ax);
      ax += (colRight[c] ?? 0) + MIN_GAP + (colLeft[c + 1] ?? 0);
    }
    const w =
      2 * PAD +
      colLeft.reduce((a, b) => a + b, 0) +
      colRight.reduce((a, b) => a + b, 0) +
      MIN_GAP * (cols - 1);

    const rowAnchorRel: number[] = [];
    let az = 0;
    for (let r = 0; r < rows; r++) {
      rowAnchorRel.push(az);
      az -= (rowBack[r] ?? 0) + MIN_GAP + (rowFront[r + 1] ?? 0);
    }
    const front0 = rowFront[0] ?? 0;
    const lastRel = rowAnchorRel[rows - 1] ?? 0;
    const d = PAD + front0 - lastRel + (rowBack[rows - 1] ?? 0) + PAD;
    return {
      sector,
      members,
      protos,
      cols,
      colLeft,
      colAnchorRel,
      rowAnchorRel,
      rowBack,
      front0,
      w,
      d,
    };
  });

  // Arrange plots on a grid: columns go +x, rows go -z (away from the camera).
  const gridCols = Math.max(1, Math.ceil(Math.sqrt(dims.length)));
  const gridRows = Math.ceil(dims.length / gridCols);
  const colW = new Array<number>(gridCols).fill(0);
  const rowFront0 = new Array<number>(gridRows).fill(0);
  dims.forEach((d, i) => {
    const c = i % gridCols;
    const r = Math.floor(i / gridCols);
    colW[c] = Math.max(colW[c] ?? 0, d.w);
    rowFront0[r] = Math.max(rowFront0[r] ?? 0, d.front0);
  });
  const rowD = new Array<number>(gridRows).fill(0);
  dims.forEach((d, i) => {
    const r = Math.floor(i / gridCols);
    // Plot back edge below the grid row's top edge.
    rowD[r] = Math.max(rowD[r] ?? 0, (rowFront0[r] ?? 0) - d.front0 + d.d);
  });
  const first = dims[0] as Dim;
  const colX0: number[] = [];
  let accX = -first.w / 2; // plot 0 is centred on x = 0
  for (let c = 0; c < gridCols; c++) {
    colX0.push(accX);
    accX += (colW[c] ?? 0) + PLOT_GAP;
  }
  // rowTop is the top edge of a grid row; plots of one grid row share their front anchor line.
  const rowFrontZ: number[] = [];
  let rowZ = FIRST_ROW_Z; // exact for grid row 0
  for (let r = 0; r < gridRows; r++) {
    rowFrontZ.push(rowZ);
    const top = rowZ + (rowFront0[r] ?? 0) + PAD;
    const nextTop = top - (rowD[r] ?? 0) - PLOT_GAP;
    rowZ = nextTop - PAD - (rowFront0[r + 1] ?? 0);
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
    const frontZ = rowFrontZ[gr] ?? 0;
    const z1 = frontZ + dim.front0 + PAD;
    const rect: Rect = { x0, z0: z1 - dim.d, x1: x0 + dim.w, z1 };
    bx0 = Math.min(bx0, rect.x0);
    bz0 = Math.min(bz0, rect.z0);
    bx1 = Math.max(bx1, rect.x1);
    bz1 = Math.max(bz1, rect.z1);

    dim.protos.forEach((q, k) => {
      const col = k % dim.cols;
      const row = Math.floor(k / dim.cols);
      const anchorX = x0 + (dim.colAnchorRel[col] ?? 0);
      const anchorZ = frontZ + (dim.rowAnchorRel[row] ?? 0);
      const pit: Point2 = pitCentreOf(anchorX + q.px, anchorZ + q.pz, q.standingYaw, q.depth);
      stones[q.firmIndex] = {
        firmIndex: q.firmIndex,
        plot: p,
        x: anchorX + q.ox,
        z: anchorZ + q.oz,
        yaw: q.yaw,
        pitch: q.pitch,
        roll: q.roll,
        width: q.width,
        height: q.height,
        depth: q.depth,
        sink: q.sink,
        lean: q.lean,
        fallen: q.fallen,
        standingYaw: q.standingYaw,
        baseY: q.fallen ? q.depth / 2 - q.sink : -q.sink,
        pitCentre: { x: pit.x, z: pit.z },
      };
    });

    plots.push({
      index: p,
      sector: dim.sector,
      count: dim.members.length,
      rect,
      frontZ,
      centerX: (rect.x0 + rect.x1) / 2,
      rowAnchors: dim.rowAnchorRel.map((r) => frontZ + r),
      stones: dim.members,
    });
  });

  return { stones, plots, bounds: { x0: bx0, z0: bz0, x1: bx1, z1: bz1 } };
}
