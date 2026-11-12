import { Suspense, useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { RepeatWrapping, SRGBColorSpace } from 'three';
import type { Group } from 'three';
import { ASSET_KEYS, assetUrl } from '../assets';
import { FLAT_GROUND_COLOR, GROUND_SIZE_M } from '../model/sceneParams';
import { ModelBoundary } from './ModelBoundary';
import { reportEnvironmentFailure } from './environmentFailure';

/** One soil tile is 4 m; the ground follows the camera in whole tiles so the texture never swims. */
const TILE_M = 4;
const REPEAT = GROUND_SIZE_M / TILE_M;
const MAX_ANISOTROPY = 8;

function GroundPlane({ children }: { children: React.ReactNode }) {
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[GROUND_SIZE_M, GROUND_SIZE_M]} />
      {children}
    </mesh>
  );
}

function FlatGround() {
  return (
    <GroundPlane>
      <meshBasicMaterial color={FLAT_GROUND_COLOR} />
    </GroundPlane>
  );
}

function soilUrl(key: string): string {
  const url = assetUrl(key);
  if (url === null) throw new Error(`Soil texture is not in the manifest: ${key}`);
  return url;
}

function SoilGround() {
  const maxAniso = useThree((s) => s.gl.capabilities.getMaxAnisotropy());
  const textures = useTexture({
    map: soilUrl(ASSET_KEYS.soil.diffuse),
    normalMap: soilUrl(ASSET_KEYS.soil.normal),
    roughnessMap: soilUrl(ASSET_KEYS.soil.rough),
  });

  useEffect(() => {
    for (const [name, t] of Object.entries(textures)) {
      t.wrapS = RepeatWrapping;
      t.wrapT = RepeatWrapping;
      t.repeat.set(REPEAT, REPEAT);
      t.anisotropy = Math.min(MAX_ANISOTROPY, maxAniso);
      if (name === 'map') t.colorSpace = SRGBColorSpace;
      t.needsUpdate = true;
    }
  }, [textures, maxAniso]);

  return (
    <GroundPlane>
      <meshStandardMaterial {...textures} />
    </GroundPlane>
  );
}

/**
 * 480 m soil ground that follows the camera on a 4 m snap (7.1). The nearest edge is 240 m away,
 * more than 1.5 times the longest fog distance (132 m), so fog hides the edge (7.2). If a soil
 * texture fails, a flat #0b0806 ground replaces it and the HUD posts a notice (7.13).
 */
export function Ground() {
  const group = useRef<Group>(null);
  const [failed, setFailed] = useState(false);

  useFrame(({ camera }) => {
    group.current?.position.set(
      Math.round(camera.position.x / TILE_M) * TILE_M,
      0,
      Math.round(camera.position.z / TILE_M) * TILE_M,
    );
  });

  return (
    <group ref={group}>
      {failed ? (
        <FlatGround />
      ) : (
        <ModelBoundary
          name="ground"
          onError={(e) => {
            reportEnvironmentFailure(e);
            setFailed(true);
          }}
        >
          <Suspense fallback={<FlatGround />}>
            <SoilGround />
          </Suspense>
        </ModelBoundary>
      )}
    </group>
  );
}
