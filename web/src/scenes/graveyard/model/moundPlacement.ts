/**
 * Mound placement (pure, no React or three imports).
 *
 * The mound sits at the stone's standing position and faces the standing yaw, so it follows
 * the jittered, rotated and tilted headstone and stays put when the stone has fallen.
 */
import { PIT_FRONT, pitCentreOf, type Point2 } from '../layout/extents';
import type { StoneLayout } from '../layout/layout';

export interface MoundPlacement {
  /** Mound centre on the ground: the stone's standing base centre. */
  readonly x: number;
  readonly z: number;
  /** Yaw of the mound (the standing yaw, never the fallen yaw). */
  readonly yaw: number;
  /** Ground centre of the Pit in front of the mound. */
  readonly pit: Point2;
}

type PlacementInput = Pick<StoneLayout, 'x' | 'z' | 'width' | 'depth' | 'fallen' | 'standingYaw'>;

/** Standing base centre of a stone. A fallen stone lies with its front edge at that point. */
export function standingPosition(s: PlacementInput): Point2 {
  if (!s.fallen) return { x: s.x, z: s.z };
  return {
    x: s.x + Math.sin(s.standingYaw) * (s.width / 2),
    z: s.z + Math.cos(s.standingYaw) * (s.width / 2),
  };
}

export function moundPlacement(s: PlacementInput): MoundPlacement {
  const p = standingPosition(s);
  return {
    x: p.x,
    z: p.z,
    yaw: s.standingYaw,
    pit: pitCentreOf(p.x, p.z, s.standingYaw, s.depth),
  };
}

/** Distance from the stone base centre to the Pit centre along the standing yaw. */
export function pitDistance(depth: number): number {
  return depth / 2 + PIT_FRONT;
}
