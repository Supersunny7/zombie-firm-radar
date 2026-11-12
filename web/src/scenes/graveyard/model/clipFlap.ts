// Pure base-flap clip (design Section 4). No react or three imports.
import type { FlapClip } from './stoneModels';

/**
 * Returns a NEW index list without every triangle that has at least one vertex in the flap
 * region (`z > zMin && y < yMax`, model space). `positions` is a flat xyz array; `index` is the
 * triangle index list, or null for a non-indexed geometry (vertices 3t..3t+2 form triangle t).
 * Neither input is mutated. See stoneModels.ts for the measured flap bounds.
 */
export function clipFlap(
  positions: ArrayLike<number>,
  index: ArrayLike<number> | null,
  clip: FlapClip,
): Uint32Array {
  const count = index ? index.length : Math.floor(positions.length / 3);
  const at = (i: number): number => (index ? index[i]! : i);
  const inFlap = (v: number): boolean =>
    positions[v * 3 + 2]! > clip.zMin && positions[v * 3 + 1]! < clip.yMax;
  const out: number[] = [];
  for (let t = 0; t + 2 < count; t += 3) {
    const a = at(t);
    const b = at(t + 1);
    const c = at(t + 2);
    if (inFlap(a) || inFlap(b) || inFlap(c)) continue;
    out.push(a, b, c);
  }
  return Uint32Array.from(out);
}
