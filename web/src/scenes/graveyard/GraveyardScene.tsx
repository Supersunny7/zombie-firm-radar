import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type { RootState } from '@react-three/fiber';
import { ACESFilmicToneMapping } from 'three';
import { useStore } from '../../state/store';
import { GraveyardHud } from '../../ui/graveyard/GraveyardHud';
import { hasWebGL } from '../webgl';
import { computeLayout } from './layout/layout';
import { CAMERA_FAR } from './model/sceneParams';
import { ModelBoundary } from './r3f/ModelBoundary';
import { PointerInput } from './r3f/PointerInput';

// Lazy so the heavy three/drei/shader imports load with the canvas, not with the scene module.
const Stones = lazy(() => import('./r3f/Stones').then((m) => ({ default: m.Stones })));
const SceneLights = lazy(() =>
  import('./r3f/SceneLights').then((m) => ({ default: m.SceneLights })),
);
const Sky = lazy(() => import('./r3f/Sky').then((m) => ({ default: m.Sky })));
const Ground = lazy(() => import('./r3f/Ground').then((m) => ({ default: m.Ground })));
const GroundFog = lazy(() => import('./r3f/GroundFog').then((m) => ({ default: m.GroundFog })));
const Engravings = lazy(() => import('./r3f/Engravings').then((m) => ({ default: m.Engravings })));

const Props = lazy(() => import('./r3f/Props').then((m) => ({ default: m.Props })));

export { ModelBoundary };

const STAGE_BACKGROUND = '#05070A';
const READY_ATTR = 'data-graveyard-ready';
const LABEL = 'Graveyard scene placeholder';

/** Sets `body[data-graveyard-ready="true"]` after the first rendered frame. */
function ReadyFlag() {
  const [done, setDone] = useState(false);
  useFrame(() => {
    if (!done) setDone(true);
  });
  useEffect(() => {
    if (!done) return undefined;
    document.body.setAttribute(READY_ATTR, 'true');
    return () => document.body.removeAttribute(READY_ATTR);
  }, [done]);
  return null;
}

/** Slot for later tasks (stones, ground, lights, props). Minimal for now. */
export function SceneContent() {
  const firms = useStore((s) => s.data?.index.firms);
  const layout = useMemo(() => computeLayout(firms ?? []), [firms]);
  return (
    <>
      <SceneLights />
      <Sky />
      <Ground />
      <GroundFog />
      <Stones layout={layout} />
      <Engravings layout={layout} />
      <Props layout={layout} />
      <PointerInput layout={layout} />
    </>
  );
}

export default function GraveyardScene() {
  const lowQuality = useStore((s) => s.settings.lowQuality);
  const webgl = useMemo(() => hasWebGL(), []);
  const [contextLost, setContextLost] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const text = lowQuality ? `${LABEL} Low quality` : LABEL;

  const onCreated = (state: RootState) => {
    state.gl.toneMapping = ACESFilmicToneMapping;
    const el = state.gl.domElement;
    el.addEventListener('webglcontextlost', (e) => {
      e.preventDefault(); // allows the browser to restore the context
      setContextLost(true);
    });
    el.addEventListener('webglcontextrestored', () => {
      setContextLost(false);
      setCanvasKey((n) => n + 1); // remount so GPU resources are rebuilt
    });
  };

  return (
    <div className="fixed inset-0" style={{ background: STAGE_BACKGROUND }}>
      {webgl ? (
        <Canvas
          key={canvasKey}
          shadows={!lowQuality}
          dpr={lowQuality ? 1 : [1, 1.5]}
          gl={{ antialias: !lowQuality, powerPreference: 'high-performance' }}
          camera={{ fov: 50, near: 0.1, far: CAMERA_FAR, position: [0, 6, 20] }}
          style={{ background: STAGE_BACKGROUND }}
          aria-hidden="true"
          onCreated={onCreated}
        >
          <ReadyFlag />
          <ModelBoundary name="scene">
            <Suspense fallback={null}>
              <SceneContent />
            </Suspense>
          </ModelBoundary>
        </Canvas>
      ) : null}
      <div className="pointer-events-none absolute bottom-16 left-4 font-mono text-sm text-text-2">
        <p>{text}</p>
        {webgl ? null : <p role="status">3D view unavailable. Use Table view.</p>}
        {contextLost ? <p role="status">3D view lost. Waiting for the graphics card…</p> : null}
      </div>
      <GraveyardHud />
    </div>
  );
}
