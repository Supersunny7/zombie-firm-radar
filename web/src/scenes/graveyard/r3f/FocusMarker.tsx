import { useMemo } from 'react';
import { DoubleSide, RingGeometry } from 'three';
import { useStore } from '../../../state/store';
import type { GraveyardLayout } from '../layout/layout';

/** Light warm ring (HUD text colour) with a dark outer stroke, so it reads on dark and bright ground. */
export const MARKER_LIGHT = '#E6E2D6';
export const MARKER_DARK = '#0d1319';
/** Ring radii in metres: clear of the stone footprint (half width <= 0.44) and the mound edge. */
const INNER = 0.72;
const OUTER = 0.84;
const STROKE = 0.08;
/** Just above the ground (and its blood/mound decals) to avoid z-fighting; depthTest still applies. */
const LIFT = 0.04;

/**
 * Ring on the ground around the keyboard-focused stone (Req 18.7). Unlit, fog off, depth tested
 * so stones occlude it, with a small polygon offset against z-fighting. Hidden when nothing is focused.
 * Should match: reference/graveyard/graveyard-rate-shock-3pp.png (ground and stones it sits on).
 */
export function FocusMarker({ layout }: { layout: GraveyardLayout }) {
  const focusedCik = useStore((s) => s.focusedCik);
  const firms = useStore((s) => s.data?.index.firms);
  const light = useMemo(() => new RingGeometry(INNER, OUTER, 48), []);
  const dark = useMemo(() => new RingGeometry(OUTER, OUTER + STROKE, 48), []);

  if (focusedCik === null || !firms) return null;
  const index = firms.findIndex((f) => f.cik === focusedCik);
  const stone = layout.stones[index];
  if (index < 0 || !stone) return null;

  return (
    <group position={[stone.x, LIFT, stone.z]} rotation={[-Math.PI / 2, 0, 0]} name="focus-marker">
      <mesh geometry={light} renderOrder={3}>
        <meshBasicMaterial
          color={MARKER_LIGHT}
          side={DoubleSide}
          fog={false}
          toneMapped={false}
          depthTest
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>
      <mesh geometry={dark} renderOrder={3}>
        <meshBasicMaterial
          color={MARKER_DARK}
          side={DoubleSide}
          fog={false}
          toneMapped={false}
          depthTest
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>
    </group>
  );
}

export default FocusMarker;
