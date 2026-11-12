import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Raycaster, Vector2 } from 'three';
import { useStore } from '../../../state/store';
import { announce } from '../../../ui/graveyard/LiveRegion';
import { buildGrid } from '../layout/grid';
import type { GraveyardLayout } from '../layout/layout';
import type { Ray } from '../layout/pick';
import {
  emitHoverChange,
  isTap,
  ndcFromClient,
  pickFirmIndex,
  recordPointerRay,
} from './pointerPick';

/**
 * Canvas-level pointer input. One ray per event from the camera through the pointer,
 * picked against the stone grid. Stones stay non-DOM and raycast-disabled.
 */
export function PointerInput({ layout }: { layout: GraveyardLayout }) {
  const gl = useThree((s) => s.gl);
  const get = useThree((s) => s.get);
  const grid = useMemo(() => buildGrid(layout), [layout]);

  useEffect(() => {
    const el = gl.domElement;
    const raycaster = new Raycaster();
    const ndc = new Vector2();
    let down: { x: number; y: number } | null = null;

    const rayAt = (e: PointerEvent | MouseEvent): Ray | null => {
      const p = ndcFromClient(el.getBoundingClientRect(), e.clientX, e.clientY);
      if (!p) return null;
      ndc.set(p.x, p.y);
      const cam = get().camera;
      cam.updateMatrixWorld();
      raycaster.setFromCamera(ndc, cam);
      const { origin: o, direction: d } = raycaster.ray;
      return { ox: o.x, oy: o.y, oz: o.z, dx: d.x, dy: d.y, dz: d.z };
    };

    const firmAt = (e: PointerEvent | MouseEvent) => {
      const ray = rayAt(e);
      if (!ray) return null;
      return { ray, index: pickFirmIndex(grid, layout, ray) };
    };

    const cikAt = (index: number | null) =>
      index === null ? null : (useStore.getState().data?.index.firms[index]?.cik ?? null);

    const onMove = (e: PointerEvent) => {
      const hit = firmAt(e);
      if (!hit) return;
      const cik = cikAt(hit.index);
      const st = useStore.getState();
      if (st.hoveredCik === cik) {
        recordPointerRay(hit.ray);
        return;
      }
      st.setHovered(cik);
      emitHoverChange({ firm: cik === null ? null : hit.index, ray: hit.ray });
    };

    const onLeave = () => {
      const st = useStore.getState();
      if (st.hoveredCik !== null) st.setHovered(null);
    };

    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
    };

    const onClick = (e: MouseEvent) => {
      const wasTap = isTap(down, e.clientX, e.clientY);
      down = null;
      if (!wasTap) return;
      const hit = firmAt(e);
      if (!hit || hit.index === null) return;
      const firm = useStore.getState().data?.index.firms[hit.index];
      if (!firm) return;
      const st = useStore.getState();
      st.setHovered(firm.cik);
      st.openCard(firm.cik, 'pointer');
      announce({ name: firm.name, status: firm.status });
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('click', onClick);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('click', onClick);
    };
  }, [gl, get, grid, layout]);

  return null;
}
