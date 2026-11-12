import { Suspense, startTransition, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { ASSET_KEYS, assetUrl } from '../assets';
import { FOG_COLOR, sceneParams } from '../model/sceneParams';
import { blendedParamsRef, defaultCameraFog } from './lightsBlend';
import { ModelBoundary } from './ModelBoundary';
import { reportEnvironmentFailure } from './environmentFailure';

const FALLBACK_PARAMS = sceneParams('off', 0, defaultCameraFog(0));

/**
 * Night sky and moonlit environment (7.5, 8.7 to 8.9). The 1k HDRI is used first; after the first
 * frame the same Environment gets the 2k file inside a transition, so React keeps the 1k map until
 * the 2k map is decoded and then swaps background and environment in one commit (no blank frame).
 * Intensities are driven every frame by SceneLights; the props only seed the first frame.
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

  if (url === null || failed1k) return <color attach="background" args={[FOG_COLOR]} />;

  return (
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
        <Environment
          files={url}
          background
          backgroundIntensity={p.backgroundIntensity}
          environmentIntensity={p.envIntensity}
        />
      </Suspense>
    </ModelBoundary>
  );
}
