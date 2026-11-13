/**
 * Stone extents (pure, no React or three imports).
 *
 * An extent is an axis-aligned rectangle relative to a stone's cell anchor:
 * `left`/`right` along x and `front`/`back` along z (+z is front, toward the camera).
 * It is the union of the oriented body footprint (after the final yaw, with the lean
 * of the top and the lying footprint of a fallen stone) and the reserved mound zone
 * (Pit disc plus heap in front of the stone face, at the standing yaw).
 *
 * Because each stone's extent lies inside its cell box and cell boxes are separated by
 * MIN_GAP, the oriented footprints of two stones are at least MIN_GAP apart.
 */

/** Minimum gap between footprint edges, metres (requirement 8.9). */
export const MIN_GAP = 0.15;
/** Pit centre distance in front of the stone face, metres. */
export const PIT_FRONT = 0.45;
/** Largest Pit radius, metres. */
export const PIT_R_MAX = 0.45;

export interface Extent {
  readonly left: number;
  readonly right: number;
  readonly front: number;
  readonly back: number;
}

/** Structural subset of a StoneLayout needed for footprints. */
export interface StoneBody {
  /** Body origin (model base centre) in world metres. */
  readonly x: number;
  readonly z: number;
  /** Final yaw (standing yaw plus +-PI/2 for a fallen stone). */
  readonly yaw: number;
  readonly pitch: number;
  readonly roll: number;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly fallen: boolean;
}

export interface Point2 {
  readonly x: number;
  readonly z: number;
}

interface LocalRect {
  readonly xLo: number;
  readonly xHi: number;
  readonly zLo: number;
  readonly zHi: number;
}

/** Footprint rectangle in the body's local frame (before yaw), origin at the body origin. */
function localRect(b: StoneBody): LocalRect {
  const hw = b.width / 2;
  if (b.fallen) {
    // Rx(-PI/2): the top points to local -z, the face points up.
    return { xLo: -hw, xHi: hw, zLo: -b.height, zHi: 0 };
  }
  const hd = b.depth / 2;
  // Top of the stone after roll (about z) then pitch (about x); order YXZ.
  const tx = -b.height * Math.sin(b.roll);
  const tz = b.height * Math.cos(b.roll) * Math.sin(b.pitch);
  return {
    xLo: -hw + Math.min(0, tx),
    xHi: hw + Math.max(0, tx),
    zLo: -hd + Math.min(0, tz),
    zHi: hd + Math.max(0, tz),
  };
}

function rotatedCorners(
  r: LocalRect,
  yaw: number,
  ox: number,
  oz: number,
): [Point2, Point2, Point2, Point2] {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const at = (lx: number, lz: number): Point2 => ({
    x: ox + c * lx + s * lz,
    z: oz - s * lx + c * lz,
  });
  return [at(r.xLo, r.zLo), at(r.xHi, r.zLo), at(r.xHi, r.zHi), at(r.xLo, r.zHi)];
}

/** The four world-space corners of the oriented footprint (a rectangle containing the body). */
export function footprintCorners(b: StoneBody): [Point2, Point2, Point2, Point2] {
  return rotatedCorners(localRect(b), b.yaw, b.x, b.z);
}

/** Largest distance from the body origin to a footprint corner (bounding circle radius). */
export function stoneReach(b: StoneBody): number {
  let r = 0;
  for (const p of footprintCorners(b)) r = Math.max(r, Math.hypot(p.x - b.x, p.z - b.z));
  return r;
}

interface Box {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

function boxOf(points: readonly Point2[], into?: Box): Box {
  const box = into ?? { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const p of points) {
    if (p.x < box.minX) box.minX = p.x;
    if (p.x > box.maxX) box.maxX = p.x;
    if (p.z < box.minZ) box.minZ = p.z;
    if (p.z > box.maxZ) box.maxZ = p.z;
  }
  return box;
}

/** World centre of the Pit for a stone standing at (px, pz) with the standing yaw. */
export function pitCentreOf(px: number, pz: number, standingYaw: number, depth: number): Point2 {
  const d = depth / 2 + PIT_FRONT;
  return { x: px + Math.sin(standingYaw) * d, z: pz + Math.cos(standingYaw) * d };
}

/** Corners of the reserved mound zone (heap and Pit) of a stone standing at (px, pz). */
export function moundZoneCorners(
  px: number,
  pz: number,
  standingYaw: number,
  width: number,
  depth: number,
): [Point2, Point2, Point2, Point2] {
  const hx = Math.max(width / 2, PIT_R_MAX);
  return rotatedCorners(
    { xLo: -hx, xHi: hx, zLo: -depth / 2, zHi: depth / 2 + PIT_FRONT + PIT_R_MAX },
    standingYaw,
    px,
    pz,
  );
}

/**
 * Extent relative to the cell anchor. `body` is positioned relative to the anchor (so
 * body.x and body.z are the offsets), and (px, pz) is the standing position of the stone
 * relative to the anchor, where the mound zone is reserved.
 */
export function extentOf(body: StoneBody, standingYaw: number, px: number, pz: number): Extent {
  const box = boxOf(footprintCorners(body));
  boxOf(moundZoneCorners(px, pz, standingYaw, body.width, body.depth), box);
  return { left: -box.minX, right: box.maxX, front: box.maxZ, back: -box.minZ };
}
