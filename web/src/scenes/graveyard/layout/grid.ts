/**
 * Uniform spatial grid over the stones (pure, no React or three imports).
 *
 * CSR layout: `cellItems[cellStart[c] .. cellStart[c + 1])` lists the stones whose
 * bounding circle overlaps cell `c` (so one stone can appear in a few cells; used by
 * picking). `stoneCell[i]` is the single cell that contains the stone's centre, which
 * lets range queries report each stone exactly once.
 */
import { stoneReach } from './extents';
import type { GraveyardLayout } from './layout';

export interface Grid {
  readonly cell: number;
  readonly x0: number;
  readonly z0: number;
  readonly nx: number;
  readonly nz: number;
  readonly cellStart: Uint32Array;
  readonly cellItems: Uint32Array;
  /** Cell index of each stone's centre. */
  readonly stoneCell: Uint32Array;
  /** Stone centres (copied so queries need no layout). */
  readonly px: Float64Array;
  readonly pz: Float64Array;
}

function clampInt(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function buildGrid(layout: GraveyardLayout, cell = 2): Grid {
  const stones = layout.stones;
  const n = stones.length;
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;
  const px = new Float64Array(n);
  const pz = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const s = stones[i];
    if (!s) continue;
    const r = stoneReach(s);
    px[i] = s.x;
    pz[i] = s.z;
    minX = Math.min(minX, s.x - r);
    maxX = Math.max(maxX, s.x + r);
    minZ = Math.min(minZ, s.z - r);
    maxZ = Math.max(maxZ, s.z + r);
  }
  if (n === 0) {
    minX = 0;
    minZ = 0;
    maxX = 0;
    maxZ = 0;
  }
  const nx = Math.max(1, Math.floor((maxX - minX) / cell) + 1);
  const nz = Math.max(1, Math.floor((maxZ - minZ) / cell) + 1);

  const cellCount = nx * nz;
  const counts = new Uint32Array(cellCount + 1);
  const stoneCell = new Uint32Array(n);
  const ranges = new Int32Array(n * 4);

  for (let i = 0; i < n; i++) {
    const s = stones[i];
    if (!s) continue;
    const r = stoneReach(s);
    const cx0 = clampInt(Math.floor((s.x - r - minX) / cell), 0, nx - 1);
    const cx1 = clampInt(Math.floor((s.x + r - minX) / cell), 0, nx - 1);
    const cz0 = clampInt(Math.floor((s.z - r - minZ) / cell), 0, nz - 1);
    const cz1 = clampInt(Math.floor((s.z + r - minZ) / cell), 0, nz - 1);
    ranges.set([cx0, cx1, cz0, cz1], i * 4);
    const ccx = clampInt(Math.floor((s.x - minX) / cell), 0, nx - 1);
    const ccz = clampInt(Math.floor((s.z - minZ) / cell), 0, nz - 1);
    stoneCell[i] = ccx + ccz * nx;
    for (let cz = cz0; cz <= cz1; cz++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const c = cx + cz * nx + 1;
        counts[c] = (counts[c] ?? 0) + 1;
      }
    }
  }

  const cellStart = counts;
  for (let c = 0; c < cellCount; c++) {
    cellStart[c + 1] = (cellStart[c + 1] ?? 0) + (cellStart[c] ?? 0);
  }
  const cellItems = new Uint32Array(cellStart[cellCount] ?? 0);
  const fill = cellStart.slice(0, cellCount);
  for (let i = 0; i < n; i++) {
    const cx0 = ranges[i * 4] ?? 0;
    const cx1 = ranges[i * 4 + 1] ?? 0;
    const cz0 = ranges[i * 4 + 2] ?? 0;
    const cz1 = ranges[i * 4 + 3] ?? 0;
    for (let cz = cz0; cz <= cz1; cz++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const c = cx + cz * nx;
        const at = fill[c] ?? 0;
        cellItems[at] = i;
        fill[c] = at + 1;
      }
    }
  }

  return { cell, x0: minX, z0: minZ, nx, nz, cellStart, cellItems, stoneCell, px, pz };
}

/**
 * Calls `visit(stone)` once for every stone whose centre lies in the axis-aligned
 * rectangle (inclusive), in unspecified order.
 */
export function forEachCentreInRect(
  grid: Grid,
  xMin: number,
  xMax: number,
  zMin: number,
  zMax: number,
  visit: (stone: number) => void,
): void {
  const { cell, x0, z0, nx, nz } = grid;
  const cx0 = clampInt(Math.floor((xMin - x0) / cell), 0, nx - 1);
  const cx1 = clampInt(Math.floor((xMax - x0) / cell), 0, nx - 1);
  const cz0 = clampInt(Math.floor((zMin - z0) / cell), 0, nz - 1);
  const cz1 = clampInt(Math.floor((zMax - z0) / cell), 0, nz - 1);
  for (let cz = cz0; cz <= cz1; cz++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      const c = cx + cz * nx;
      const end = grid.cellStart[c + 1] ?? 0;
      for (let k = grid.cellStart[c] ?? 0; k < end; k++) {
        const i = grid.cellItems[k] ?? 0;
        if (grid.stoneCell[i] === c) visit(i);
      }
    }
  }
}

/** Stone indices (ascending) whose centre is within `r` metres of (x, z) on the ground. */
export function queryRadius(grid: Grid, x: number, z: number, r: number): number[] {
  const out: number[] = [];
  if (!(r >= 0) || !Number.isFinite(x) || !Number.isFinite(z)) return out;
  const r2 = r * r;
  forEachCentreInRect(grid, x - r, x + r, z - r, z + r, (i) => {
    const dx = (grid.px[i] ?? 0) - x;
    const dz = (grid.pz[i] ?? 0) - z;
    if (dx * dx + dz * dz <= r2) out.push(i);
  });
  return out.sort((a, b) => a - b);
}
