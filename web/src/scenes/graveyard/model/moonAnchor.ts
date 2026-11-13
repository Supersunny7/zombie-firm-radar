// Pure moon anchor for the framed-plot look (Batch 2b, Requirement 23.8, design section 6).
// No react or three imports.
import { mix, type CameraFogState } from './sceneParams';

/** A point on the ground plane (world x and z, metres). */
export interface GroundPoint {
  readonly x: number;
  readonly z: number;
}

/** Centre of a plot rectangle on the ground. */
export function rectCentre(rect: {
  readonly x0: number;
  readonly z0: number;
  readonly x1: number;
  readonly z1: number;
}): GroundPoint {
  return { x: (rect.x0 + rect.x1) / 2, z: (rect.z0 + rect.z1) / 2 };
}

/**
 * Centre of the framed Plot for the published camera state. During a plot-to-plot move the centre
 * slides from the old plot to the new one with the move progress; during a move to or from the
 * overview it is the plot end of the move. Null when no plot end exists (overview, or plots that
 * are not in the layout).
 */
export function framedPlotCentre(
  cam: CameraFogState,
  centreOf: (plot: number) => GroundPoint | null,
): GroundPoint | null {
  const a = cam.from === 'overview' ? null : centreOf(cam.from);
  const b = cam.to === 'overview' ? null : centreOf(cam.to);
  if (a && b) return { x: mix(a.x, b.x, cam.progress), z: mix(a.z, b.z, cam.progress) };
  return b ?? a;
}

/**
 * Point the moon offset is added to: the snapped camera focus (Base_Spec) at plotLook 0, the framed
 * Plot centre at plotLook 1 (23.8), linear in between. Exact at both ends.
 */
export function moonAnchor(
  focus: GroundPoint,
  plotCentre: GroundPoint | null,
  plotLook: number,
): GroundPoint {
  if (plotCentre === null || plotLook <= 0) return focus;
  if (plotLook >= 1) return plotCentre;
  return { x: mix(focus.x, plotCentre.x, plotLook), z: mix(focus.z, plotCentre.z, plotLook) };
}
