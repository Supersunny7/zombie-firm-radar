import { Suspense, startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { BackSide, Color, ShaderMaterial } from 'three';
import { Environment } from '@react-three/drei';
import { ASSET_KEYS, assetUrl } from '../assets';
import { CAMERA_FAR, sceneParams } from '../model/sceneParams';
import { blendedParamsRef, defaultCameraFog, lightsBlendRef } from './lightsBlend';
import { ModelBoundary } from './ModelBoundary';
import { reportEnvironmentFailure } from './environmentFailure';

const FALLBACK_PARAMS = sceneParams('off', 0, defaultCameraFog(0));

/** Zenith colours: near black lights off, a slightly lighter dark blue lights on (scene-reference). */
const TOP_OFF = '#030406';
const TOP_ON = '#0b111a';
/** Moonlit haze just above the horizon, so far silhouettes (the gate) read against it. */
const HAZE_OFF = '#34404f';
const HAZE_ON = '#4d5b6e';
/** Dome radius: inside the camera far plane (360) so it is never clipped. */
const DOME_RADIUS = Math.min(300, CAMERA_FAR - 60);

const DOME_VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    // Centre the dome on the camera in the shader: it follows the camera with no frame lag.
    gl_Position = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0);
  }
`;
const DOME_FRAGMENT = /* glsl */ `
  uniform vec3 horizonColor;
  uniform vec3 topColor;
  uniform vec3 hazeColor;
  varying vec3 vDir;
  #include <common>
  #include <dithering_pars_fragment>
  void main() {
    float h = normalize(vDir).y;
    // At or below the horizon the colour is exactly the fog colour; it fades to the zenith colour.
    float t = pow(clamp(h, 0.0, 1.0), 0.55);
    vec3 sky = mix(horizonColor, topColor, t);
    // Haze: zero at and below the horizon (the fogged ground keeps its colour), then a band that fades with height.
    float haze = smoothstep(0.0, 0.012, h) * exp(-h * 12.0);
    gl_FragColor = vec4(mix(sky, hazeColor, haze), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <dithering_fragment>
  }
`;

/**
 * Sky gradient dome. The HDRI only lights the scene; this dome is what is seen behind the ground.
 * Its colour at the horizon is the fog colour (same tone mapping as the fogged ground), so there is
 * no visible edge; below the horizon it keeps that colour. The zenith eases with the lights blend.
 */
function SkyDome() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          horizonColor: { value: new Color(FALLBACK_PARAMS.fogColor) },
          topColor: { value: new Color(TOP_OFF) },
          hazeColor: { value: new Color(HAZE_OFF) },
        },
        vertexShader: DOME_VERTEX,
        fragmentShader: DOME_FRAGMENT,
        side: BackSide,
        depthWrite: false,
        depthTest: false,
        fog: false,
        dithering: true,
      }),
    [],
  );
  const off = useMemo(() => new Color(TOP_OFF), []);
  const on = useMemo(() => new Color(TOP_ON), []);
  const hazeOff = useMemo(() => new Color(HAZE_OFF), []);
  const hazeOn = useMemo(() => new Color(HAZE_ON), []);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(() => {
    const p = blendedParamsRef.current ?? FALLBACK_PARAMS;
    const u = material.uniforms as Record<string, { value: Color }>;
    u.horizonColor?.value.set(p.fogColor);
    u.topColor?.value.copy(off).lerp(on, lightsBlendRef.current);
    u.hazeColor?.value.copy(hazeOff).lerp(hazeOn, lightsBlendRef.current);
  });
  return (
    <mesh renderOrder={-1000} frustumCulled={false}>
      <sphereGeometry args={[DOME_RADIUS, 32, 16]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
/**
 * Night sky and moonlit environment (7.5, 8.7 to 8.9). The HDRI is used for lighting only (no
 * background); the visible sky is SkyDome. The 1k HDRI is used first; after the first frame the same
 * Environment gets the 2k file inside a transition, so React keeps the 1k map until the 2k map is
 * decoded and then swaps it in one commit. Intensities are driven every frame by SceneLights.
 */
export function Sky() {
  const [want2k, setWant2k] = useState(false);
  const [failed1k, setFailed1k] = useState(false);
  const [failed2k, setFailed2k] = useState(false);
  const started = useRef(false);

  useFrame(() => {
    if (started.current) return;
    started.current = true;
    requestAnimationFrame(() => startTransition(() => setWant2k(true)));
  });

  const url1k = assetUrl(ASSET_KEYS.hdri1k);
  const url2k = assetUrl(ASSET_KEYS.hdri2k);
  const missing1k = url1k === null;

  useEffect(() => {
    if (missing1k) reportEnvironmentFailure(new Error('1k HDRI is not in the manifest'));
  }, [missing1k]);

  const p = blendedParamsRef.current ?? FALLBACK_PARAMS;
  const use2k = want2k && !failed2k && url2k !== null && !failed1k;
  const url = use2k ? url2k : url1k;

  if (url === null || failed1k) return <SkyDome />;
  return (
    <>
      <SkyDome />
      <ModelBoundary
        // Same boundary and Suspense across the 1k to 2k swap so React keeps the 1k map on screen;
        // the key only changes to reset the boundary after a failed 2k file.
        key={failed2k ? 'after-2k-failure' : 'main'}
        name={use2k ? 'sky-2k' : 'sky-1k'}
        onError={(e) => {
          reportEnvironmentFailure(e);
          if (use2k) setFailed2k(true);
          else setFailed1k(true);
        }}
      >
        <Suspense fallback={null}>
          <Environment files={url} environmentIntensity={p.envIntensity} />
        </Suspense>
      </ModelBoundary>
    </>
  );
}
