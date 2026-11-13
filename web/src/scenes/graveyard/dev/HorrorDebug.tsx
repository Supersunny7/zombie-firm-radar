// DEV-only screenshot helper (`?horror=zombies|fallen`, `&shock=<pp>`). It is only imported behind
// `import.meta.env.DEV` in GraveyardScene, and check-bundle fails a production build that still
// contains the marker below.
import { useEffect } from 'react';
import { useStore } from '../../../state/store';
import { CAMERA_FOV } from '../r3f/CameraRig';
import { plotPose, projectToNdc } from '../layout/camera';
import type { CameraPose } from '../layout/camera';
import type { GraveyardLayout, LayoutInput } from '../layout/layout';

export const HORROR_DEBUG_MARKER = '__zfr_horror_debug__';

export type HorrorCase = 'zombies' | 'fallen';

export interface HorrorParams {
  readonly horror: HorrorCase | null;
  /** Rate shock in percentage points (0 to 5), or null when not given. */
  readonly shockPp: number | null;
}

export function parseHorrorParams(search: string): HorrorParams {
  const q = new URLSearchParams(search);
  const h = q.get('horror');
  const raw = q.get('shock');
  const pp = raw === null || raw.trim() === '' ? Number.NaN : Number(raw);
  return {
    horror: h === 'zombies' || h === 'fallen' ? h : null,
    shockPp: Number.isFinite(pp) && pp >= 0 && pp <= 5 ? pp : null,
  };
}

const ASPECT = 16 / 9;
/** Zombies must be at least this far so the Pit clears the shock panel at the bottom of the frame. */
const MIN_ZOMBIE_DEPTH = 3.6;
/** Zombies must be this close so the torn mound reads at the framed pose. */
const MAX_DEPTH = 6.5;

function inView(pose: CameraPose, x: number, z: number, y = 0.3, minDepth = 0): number | null {
  const n = projectToNdc(pose, [x, y, z], CAMERA_FOV, ASPECT);
  if (
    !n ||
    Math.abs(n.x) > 0.6 ||
    n.y < -1 ||
    n.y > 0.4 ||
    n.depth > MAX_DEPTH ||
    n.depth < minDepth
  )
    return null;
  return n.depth;
}

/**
 * Plot to frame for a case. `zombies`: the first plot with an in-view zombie firm (any zombie as a
 * fallback). `fallen`: the plot whose in-view fallen stone is nearest the camera. Null if none.
 */
export function pickPlotFor(
  c: HorrorCase,
  layout: GraveyardLayout,
  firms: readonly Pick<LayoutInput, 'status'>[],
): number | null {
  let anyZombiePlot: number | null = null;
  let best: { plot: number; depth: number } | null = null;
  for (const plot of layout.plots) {
    const pose = plotPose(plot);
    for (const si of plot.stones) {
      const s = layout.stones[si];
      if (!s) continue;
      if (c === 'zombies') {
        if (firms[s.firmIndex]?.status !== 'zombie') continue;
        anyZombiePlot ??= plot.index;
        if (inView(pose, s.x, s.z, 0.5, MIN_ZOMBIE_DEPTH) !== null) {
          console.info(
            `[${HORROR_DEBUG_MARKER}] zombie stone at ${s.x.toFixed(1)},${s.z.toFixed(1)}`,
          );
          return plot.index;
        }
      } else if (s.fallen) {
        const d = inView(pose, s.x, s.z, 0.1);
        if (d !== null && (best === null || d < best.depth)) best = { plot: plot.index, depth: d };
      }
    }
  }
  return c === 'zombies' ? anyZombiePlot : (best?.plot ?? null);
}

/**
 * True once the URL case has been applied in this page load. Module-level, not a component ref, so
 * a remount of the scene tree (e.g. `canvasKey` bumped on `webglcontextrestored`) does not apply
 * `?shock=` again and overwrite the user's slider value (Requirement 25, H2).
 */
let appliedThisPageLoad = false;

/** Test-only: clears the once-per-page-load flag so tests stay independent. */
export function resetHorrorDebugForTests(): void {
  appliedThisPageLoad = false;
}

/** Applies the URL case once per page load, once firms and layout are ready. Renders nothing. */
export function HorrorDebug({ layout }: { layout: GraveyardLayout }) {
  const firms = useStore((s) => s.data?.index.firms);
  useEffect(() => {
    if (appliedThisPageLoad || !firms || layout.plots.length === 0) return;
    appliedThisPageLoad = true;
    const { horror, shockPp } = parseHorrorParams(window.location.search);
    if (horror === null && shockPp === null) return;
    const st = useStore.getState();
    // Shock first: `zombies` is defined at shock 0 unless a shock is given.
    st.setRateShock(shockPp === null ? 0 : shockPp / 100);
    if (horror === null) return;
    const plot = pickPlotFor(horror, layout, firms);
    console.info(`[${HORROR_DEBUG_MARKER}] ${horror} -> plot ${plot === null ? 'none' : plot + 1}`);
    if (plot !== null) st.setFramedPlot(plot);
  }, [firms, layout]);
  return null;
}
