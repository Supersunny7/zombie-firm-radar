/**
 * Pure pieces of the engraving pool (design Section 5, requirements 5.1 to 5.6).
 * No React or three imports, so the pool property test (task 12.3) runs in plain node.
 */
import type { Grid } from '../layout/grid';
import type { GraveyardLayout } from '../layout/layout';
import { nearestToRay, type Ray } from '../layout/pick';
import type { FaceAnchor } from '../model/deriveFaceAnchor';

/** Number of engraving slots (and the most stones that can carry an engraving at once). */
export const POOL_SIZE = 13;

export interface PoolRequest {
  readonly grid: Grid;
  readonly layout: GraveyardLayout;
  /** Pointer ray (hover) or camera-to-stone ray (keyboard focus); null when unknown. */
  readonly ray: Ray | null;
  /** Hovered or focused stone index; always first in the result when valid. */
  readonly primary: number | null;
}

/**
 * Stone indices that get an engraving: the hovered/focused stone first, then the stones
 * nearest to the ray, at most `size` (13) in total, no duplicates. When the layout has
 * `size` stones or fewer, every stone is returned (primary first, the rest ascending).
 */
export function selectEngravingPool(req: PoolRequest, size: number = POOL_SIZE): number[] {
  const total = req.layout.stones.length;
  if (total === 0 || !(size >= 1)) return [];
  const p = req.primary;
  const first = p !== null && Number.isInteger(p) && p >= 0 && p < total ? p : null;
  const out: number[] = first === null ? [] : [first];

  if (total <= size) {
    for (let i = 0; i < total; i++) if (i !== first) out.push(i);
    return out;
  }
  if (req.ray) {
    const hits = nearestToRay(req.grid, req.layout, req.ray, size + (first === null ? 0 : 1));
    for (const h of hits) {
      if (out.length >= size) break;
      if (h.stone !== first && !out.includes(h.stone)) out.push(h.stone);
    }
  }
  return out;
}

export interface BodyBox {
  readonly origin: { readonly x: number; readonly y: number; readonly z: number };
  readonly body: { readonly w: number; readonly h: number; readonly d: number };
}

/** Face used for the engraving, always on the +z side (the side the camera sees). */
export interface EngravingFace {
  readonly z: number;
  readonly centreX: number;
  readonly centreY: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Picks the engraving face. A derived anchor is used only when it is a large +z face
 * (the real Intact/Cracked geometry only yields a small plinth ledge at the back, which
 * would put the text in the wrong place); otherwise the front of the body box is used.
 */
export function chooseEngravingFace(found: FaceAnchor | null, m: BodyBox): EngravingFace {
  if (
    found &&
    found.frontSign === 1 &&
    found.size.width >= 0.35 * m.body.w &&
    found.size.height >= 0.25 * m.body.h
  ) {
    return {
      z: found.z,
      centreX: found.centreX,
      centreY: found.centreY,
      width: found.size.width,
      height: found.size.height,
    };
  }
  return {
    z: m.origin.z + m.body.d / 2,
    centreX: m.origin.x,
    centreY: m.origin.y + 0.55 * m.body.h,
    width: 0.7 * m.body.w,
    height: 0.5 * m.body.h,
  };
}

export const TEXTURE_ASPECT = 384 / 256;

export interface DecalBox {
  readonly position: [number, number, number];
  readonly scale: [number, number, number];
}

/**
 * Decal box in model units around the face. The stone is scaled non-uniformly into the
 * world (sx, sy), so the box is sized in world metres to keep the 2:3 texture undistorted,
 * then converted back. The box is deep enough to reach a slightly curved surface.
 */
export function decalBox(
  face: EngravingFace,
  body: { readonly d: number },
  scale: { readonly sx: number; readonly sy: number },
): DecalBox {
  let worldW = 0.8 * face.width * scale.sx;
  let worldH = worldW * TEXTURE_ASPECT;
  const maxH = 0.6 * face.height * scale.sy;
  if (worldH > maxH) {
    worldH = maxH;
    worldW = worldH / TEXTURE_ASPECT;
  }
  return {
    position: [face.centreX, face.centreY, face.z - 0.1 * body.d],
    scale: [worldW / scale.sx, worldH / scale.sy, 0.3 * body.d],
  };
}
