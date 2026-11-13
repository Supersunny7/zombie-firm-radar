import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { FogExp2, Object3D, Vector3 } from 'three';
import type { DirectionalLight, HemisphereLight } from 'three';
import { useStore } from '../../../state/store';
import { CAMERA_FOV } from './CameraRig';
import { CAMERA_FAR, FOG_COLOR, sceneParams } from '../model/sceneParams';
import type { GraveyardLayout } from '../layout/layout';
import { framedPlotCentre, moonAnchor, rectCentre } from '../model/moonAnchor';
import { qualityParams } from '../model/quality';
import { cameraStateRef } from './cameraState';
import {
  applyToScene,
  blendParams,
  cameraFarEdgeDistance,
  cameraFogRef,
  defaultCameraFog,
  easeStep,
  lightsBlendRef,
  publishBlend,
} from './lightsBlend';

/** Moon shadow frustum: 40 m x 40 m (design Section 7). */
const SHADOW_HALF = 20;
/** How far ahead of the camera the shadow box is centred, and its snap size in metres. */
const SHADOW_AHEAD = 12;
const SHADOW_SNAP = 1;

const _fwd = new Vector3();

/**
 * Moon, hemisphere light and exponential fog. One eased value `lb` blends the lights-off and
 * lights-on parameters (settles in about 0.5 s, 17.2, 7.18). The camera fog term is not eased (7.15).
 * In lights-off framed plots the blended values are the Batch 2b look (23.4 to 23.8): hemisphere
 * `#3a4a66` / `#0a0806` / 0.18, environment 0 (drei Environment stays mounted; applyToScene sets
 * `scene.environmentIntensity`), shadow moon `#7f9cd6` 1.1 at plot centre + (-4, 9, -22).
 */
export function SceneLights({ layout }: { layout: GraveyardLayout }) {
  const layoutRef = useRef(layout);
  useLayoutEffect(() => {
    layoutRef.current = layout;
  }, [layout]);
  const lowQuality = useStore((s) => s.settings.lowQuality);
  const moon = useRef<DirectionalLight>(null);
  const hemi = useRef<HemisphereLight>(null);
  const initial = useMemo(() => sceneParams('off', 0, defaultCameraFog(0)), []);
  const fog = useMemo(() => new FogExp2(FOG_COLOR, initial.fogDensity), [initial]);
  const target = useMemo(() => new Object3D(), []);

  useLayoutEffect(() => {
    const cam = moon.current?.shadow.camera;
    if (!cam) return;
    cam.left = -SHADOW_HALF;
    cam.right = SHADOW_HALF;
    cam.top = SHADOW_HALF;
    cam.bottom = -SHADOW_HALF;
    cam.near = 1;
    cam.far = 90;
    cam.updateProjectionMatrix();
  }, []);

  // Priority -10 so GroundFog reads this frame's blended values.
  useFrame((state, dt) => {
    const st = useStore.getState();
    const goal = st.settings.lights === 'on' ? 1 : 0;
    const lb = easeStep(lightsBlendRef.current, goal, Math.min(dt, 0.1));

    const cam = cameraFogRef.current ?? defaultCameraFog(st.framedPlot);
    // Overview fog scales with the camera distance (density about 1.6 / far-edge distance).
    const rig = cameraStateRef.current;
    const dist = cameraFarEdgeDistance(rig.position, rig.lookAt, CAMERA_FOV, CAMERA_FAR);
    const p = blendParams(lb, st.machine.ctx.rateShock, cam, dist);
    publishBlend(lb, p);
    applyToScene(state.scene, p);
    const h = hemi.current;
    if (h) {
      // Hemisphere colours change in lights-off framed plots (23.7), so set them every frame.
      h.color.set(p.hemi.skyColor);
      h.groundColor.set(p.hemi.groundColor);
      h.intensity = p.hemi.intensity;
    }

    const light = moon.current;
    if (light) {
      light.color.set(p.moon.color);
      light.intensity = p.moon.intensity;
      // Base_Spec anchor: the camera focus, snapped so shadows do not swim.
      state.camera.getWorldDirection(_fwd);
      const focus = {
        x:
          Math.round((state.camera.position.x + _fwd.x * SHADOW_AHEAD) / SHADOW_SNAP) * SHADOW_SNAP,
        z:
          Math.round((state.camera.position.z + _fwd.z * SHADOW_AHEAD) / SHADOW_SNAP) * SHADOW_SNAP,
      };
      // Lights-off framed plot: the anchor moves to the framed plot centre (23.8), so the moon sits
      // at centre + (-4, 9, -22) behind the stones and the shadow box is fixed on the plot.
      const plots = layoutRef.current.plots;
      const centre = framedPlotCentre(cam, (i) => {
        const plot = plots[i];
        return plot ? rectCentre(plot.rect) : null;
      });
      const a = moonAnchor(focus, centre, p.plotLook);
      const [mx, my, mz] = p.moon.position;
      light.position.set(a.x + mx, my, a.z + mz);
      target.position.set(a.x, 0, a.z);
      target.updateMatrixWorld();
    }
  }, -10);

  const size = qualityParams(lowQuality, 1).moonShadowMapSize;
  return (
    <>
      <primitive object={fog} attach="fog" />
      <hemisphereLight
        ref={hemi}
        color={initial.hemi.skyColor}
        groundColor={initial.hemi.groundColor}
        intensity={initial.hemi.intensity}
      />
      <primitive object={target} />
      <directionalLight
        ref={moon}
        target={target}
        color={initial.moon.color}
        position={[...initial.moon.position]}
        intensity={initial.moon.intensity}
        castShadow
        shadow-mapSize={[size, size]}
        shadow-bias={-0.0004}
      />
    </>
  );
}
