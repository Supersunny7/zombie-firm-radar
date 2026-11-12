/**
 * Pure front-face finder for engravings (design Section 5, requirements 5.1).
 * No three or react imports: takes raw typed arrays.
 */

export interface FaceAnchor {
  /** Plane z of the face in model units. */
  z: number;
  /** +1 if the face normal points to +z, -1 if to -z. */
  frontSign: 1 | -1;
  centreX: number;
  centreY: number;
  /** Extent of the face cluster. */
  size: { width: number; height: number };
}

/** Typed-array read with a 0 default (noUncheckedIndexedAccess). */
const g = (a: ArrayLike<number>, i: number): number => a[i] ?? 0;

const MAX_ABS_NY = 0.3;
const PLANE_EPS = 1e-4;

interface Cluster {
  sign: 1 | -1;
  z: number;
  area: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Finds the largest nearly vertical (|normal.y| < 0.3) face cluster whose normal is
 * along +z or -z. Triangles are grouped by sign and by plane z (within 1e-4).
 * Returns null when no such face exists. Ties go to the earlier-found cluster.
 */
export function deriveFaceAnchor(
  positions: ArrayLike<number>,
  normals: ArrayLike<number>,
  indices?: ArrayLike<number> | null,
): FaceAnchor | null {
  const vertexCount = Math.floor(positions.length / 3);
  const triCount = indices ? Math.floor(indices.length / 3) : Math.floor(vertexCount / 3);
  const clusters: Cluster[] = [];

  for (let t = 0; t < triCount; t++) {
    const ia = indices ? g(indices, t * 3) : t * 3;
    const ib = indices ? g(indices, t * 3 + 1) : t * 3 + 1;
    const ic = indices ? g(indices, t * 3 + 2) : t * 3 + 2;
    if (ia >= vertexCount || ib >= vertexCount || ic >= vertexCount) continue;

    const nx = g(normals, ia * 3) + g(normals, ib * 3) + g(normals, ic * 3);
    const ny = g(normals, ia * 3 + 1) + g(normals, ib * 3 + 1) + g(normals, ic * 3 + 1);
    const nz = g(normals, ia * 3 + 2) + g(normals, ib * 3 + 2) + g(normals, ic * 3 + 2);
    const len = Math.hypot(nx, ny, nz);
    if (!(len > 0)) continue;
    if (Math.abs(ny / len) >= MAX_ABS_NY) continue;
    if (Math.abs(nz) <= Math.abs(nx)) continue; // must be along z, not x
    const sign: 1 | -1 = nz > 0 ? 1 : -1;

    const ax = g(positions, ia * 3);
    const ay = g(positions, ia * 3 + 1);
    const az = g(positions, ia * 3 + 2);
    const bx = g(positions, ib * 3);
    const by = g(positions, ib * 3 + 1);
    const bz = g(positions, ib * 3 + 2);
    const cx = g(positions, ic * 3);
    const cy = g(positions, ic * 3 + 1);
    const cz = g(positions, ic * 3 + 2);
    const ex = bx - ax;
    const ey = by - ay;
    const ez = bz - az;
    const fx = cx - ax;
    const fy = cy - ay;
    const fz = cz - az;
    const area = 0.5 * Math.hypot(ey * fz - ez * fy, ez * fx - ex * fz, ex * fy - ey * fx);
    if (!(area > 0)) continue;

    const z = (az + bz + cz) / 3;
    let cl = clusters.find((c) => c.sign === sign && Math.abs(c.z - z) <= PLANE_EPS);
    if (!cl) {
      cl = {
        sign,
        z,
        area: 0,
        minX: Infinity,
        maxX: -Infinity,
        minY: Infinity,
        maxY: -Infinity,
      };
      clusters.push(cl);
    }
    cl.area += area;
    cl.minX = Math.min(cl.minX, ax, bx, cx);
    cl.maxX = Math.max(cl.maxX, ax, bx, cx);
    cl.minY = Math.min(cl.minY, ay, by, cy);
    cl.maxY = Math.max(cl.maxY, ay, by, cy);
  }

  let best: Cluster | null = null;
  for (const c of clusters) if (!best || c.area > best.area) best = c;
  if (!best) return null;

  return {
    z: best.z,
    frontSign: best.sign,
    centreX: (best.minX + best.maxX) / 2,
    centreY: (best.minY + best.maxY) / 2,
    size: { width: best.maxX - best.minX, height: best.maxY - best.minY },
  };
}
