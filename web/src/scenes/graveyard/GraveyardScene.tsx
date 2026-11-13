import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type { RootState } from '@react-three/fiber';
import { ACESFilmicToneMapping } from 'three';
import { useGraveyardAudio } from '../../audio/useGraveyardAudio';
import { qualityParams } from './model/quality';
import { useStore } from '../../state/store';
import { GraveyardHud } from '../../ui/graveyard/GraveyardHud';
import { hasWebGL } from '../webgl';
import { computeLayout } from './layout/layout';
import { CAMERA_FAR } from './model/sceneParams';
import { CAMERA_FOV, CAMERA_NEAR, CameraRig } from './r3f/CameraRig';
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

const Mounds = lazy(() => import('./r3f/Mounds').then((m) => ({ default: m.Mounds })));
const BloodDecals = lazy(() =>
  import('./r3f/BloodDecals').then((m) => ({ default: m.BloodDecals })),
);

const CctvPass = lazy(() => import('../../fx/CctvPass').then((m) => ({ default: m.CctvPass })));
const Flashlight = lazy(() => import('./r3f/Flashlight').then((m) => ({ default: m.Flashlight })));
const Creatures = lazy(() => import('./r3f/Creatures').then((m) => ({ default: m.Creatures })));
const Hands = lazy(() => import('./r3f/Hands').then((m) => ({ default: m.Hands })));
const FocusMarker = lazy(() =>
  import('./r3f/FocusMarker').then((m) => ({ default: m.FocusMarker })),
);
const Props = lazy(() => import('./r3f/Props').then((m) => ({ default: m.Props })));

export { ModelBoundary };

const STAGE_BACKGROUND = '#05070A';
const READY_ATTR = 'data-graveyard-ready';

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
      <CameraRig layout={layout} />
      <SceneLights />
      <Sky />
      <Ground />
      <GroundFog />
      <Stones layout={layout} />
      <Mounds layout={layout} />
      <BloodDecals layout={layout} />
      <Hands layout={layout} />
      <Engravings layout={layout} />
      <Props layout={layout} />
      <Creatures layout={layout} />
      <Flashlight layout={layout} />
      <FocusMarker layout={layout} />
      <PointerInput layout={layout} />
      <CctvPass />
    </>
  );
}

export default function GraveyardScene() {
  useGraveyardAudio();
  const lowQuality = useStore((s) => s.settings.lowQuality);
  const quality = qualityParams(lowQuality, window.devicePixelRatio);
  const webgl = useMemo(() => hasWebGL(), []);
  const [contextLost, setContextLost] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);

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
          shadows
          dpr={quality.dpr}
          gl={{ antialias: !lowQuality, powerPreference: 'high-performance' }}
          camera={{ fov: CAMERA_FOV, near: CAMERA_NEAR, far: CAMERA_FAR, position: [0, 2.15, 9.4] }}
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
        {webgl ? null : <p role="status">3D view unavailable. Use Table view.</p>}
        {contextLost ? <p role="status">3D view lost. Waiting for the graphics card…</p> : null}
      </div>
      <GraveyardHud />
    </div>
  );
}
