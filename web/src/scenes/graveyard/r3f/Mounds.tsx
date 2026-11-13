import { useLayoutEffect, useMemo, useRef } from 'react';
import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import type { InstancedMesh, MeshStandardMaterial } from 'three';
import { useShockView } from '../../../state/shockView';
import { useStore } from '../../../state/store';
import type { GraveyardLayout } from '../layout/layout';
import { planDressing } from '../model/dressing';
import { moundPlacement } from '../model/moundPlacement';
import { moundSets } from '../model/moundSets';
import { SOIL_FALLBACK_COLOR, WithSoil, useSoilTint } from './soil';
import type { SoilMaps } from './soil';
import { useActiveRiserCiks } from './activeRisers';
import { useVisibleStones } from './useVisibleStones';

/** Half-ellipsoid proportions: radius beyond the stone, and height of the heap (metres). */
const MOUND_HEIGHT = 0.24;
const MOUND_FRONT = 0.45;
const MOUND_SIDE = 0.2;

const _m = new Matrix4();
const _q = new Quaternion();
const _e = new Euler();
const _p = new Vector3();
const _s = new Vector3();

interface MoundMeshProps {
  firms: readonly number[];
  capacity: number;
  layout: GraveyardLayout;
  /** Soil maps; null draws a flat dark soil colour when the textures fail. */
  maps: SoilMaps | null;
}

function MoundMesh({ firms, capacity, layout, maps }: MoundMeshProps) {
  const ref = useRef<InstancedMesh>(null);
  const mat = useRef<MeshStandardMaterial>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const n = Math.min(firms.length, capacity);
    for (let k = 0; k < n; k++) {
      const s = layout.stones[firms[k]!];
      if (!s) continue;
      // The mound sits at the standing position and follows the standing yaw, so a fallen
      // stone leaves its mound where the stone used to stand (7.8, 7.9).
      const place = moundPlacement(s);
      // Unit hemisphere scaled to a half-ellipsoid that wraps the stone base and reaches in front.
      const rz = s.depth / 2 + MOUND_FRONT;
      const rx = s.width / 2 + MOUND_SIDE;
      _p.set(place.x, -0.02, place.z);
      _e.set(0, place.yaw, 0, 'YXZ');
      _q.setFromEuler(_e);
      _s.set(rx, MOUND_HEIGHT, rz);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(k, _m);
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [firms, capacity, layout]);

  useSoilTint(mat);

  return (
    <instancedMesh
      key={capacity}
      ref={ref}
      args={[undefined, undefined, capacity]}
      raycast={() => null}
      receiveShadow
      name="mounds"
    >
      <sphereGeometry args={[1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      {maps ? (
        <meshStandardMaterial ref={mat} {...maps} />
      ) : (
        <meshStandardMaterial ref={mat} color={SOIL_FALLBACK_COLOR} />
      )}
    </instancedMesh>
  );
}

/**
 * One InstancedMesh of closed half-ellipsoid soil heaps, one per stone that has no torn mound,
 * near the camera, in both lights modes (6.11, 7.1, 7.10, 14.1). Uses the soil PBR set already
 * in the manifest.
 */
export function Mounds({ layout }: { layout: GraveyardLayout }) {
  const { firms, batch } = useShockView();
  const lights = useStore((s) => s.settings.lights);
  const visible = useVisibleStones(layout);
  const active = useActiveRiserCiks();

  const closed = useMemo(() => {
    const plan = planDressing(firms, batch, lights);
    return moundSets(firms, plan, active).closed.filter((i) => visible.has(i));
  }, [firms, batch, lights, visible, active]);
  const capacity = Math.max(1, firms.length);

  return (
    <WithSoil name="mounds">
      {(maps) => <MoundMesh firms={closed} capacity={capacity} layout={layout} maps={maps} />}
    </WithSoil>
  );
}
