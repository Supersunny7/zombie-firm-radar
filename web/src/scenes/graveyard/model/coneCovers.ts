/**
 * Flashlight cone versus bounding sphere (pure, no React or three imports).
 * Design section 8, requirements 9.2 to 9.4.
 */

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface Sphere {
  readonly center: Vec3;
  readonly radius: number;
}

/**
 * True when the sphere intersects the cone (apex `origin`, axis `dir`, half angle
 * `halfAngle` radians) truncated at `range` along the axis-independent distance
 * used by the design: the nearest point of the sphere must be within `range`.
 *
 * Exact test: with d = |c - o| and theta = angle(dir, c - o), the sphere meets the
 * infinite cone when theta <= halfAngle + asin(r / d) (or the apex is inside the
 * sphere), and meets the range when d - r <= range.
 */
export function coneCovers(
  origin: Vec3,
  dir: Vec3,
  halfAngle: number,
  range: number,
  sphere: Sphere,
): boolean {
  const r = Math.max(0, sphere.radius);
  const vx = sphere.center.x - origin.x;
  const vy = sphere.center.y - origin.y;
  const vz = sphere.center.z - origin.z;
  const dist = Math.hypot(vx, vy, vz);
  if (dist - r > range) return false;
  // Apex inside (or on) the sphere: every direction touches it.
  if (dist <= r) return true;
  const dl = Math.hypot(dir.x, dir.y, dir.z);
  if (dl === 0 || !Number.isFinite(dl)) return false;
  const cos = (vx * dir.x + vy * dir.y + vz * dir.z) / (dist * dl);
  const theta = Math.acos(Math.min(1, Math.max(-1, cos)));
  const slack = Math.asin(Math.min(1, r / dist));
  return theta <= halfAngle + slack;
}
