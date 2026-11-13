import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { RepeatWrapping, SRGBColorSpace } from 'three';
import type { Group } from 'three';
import { ASSET_KEYS, assetUrl } from '../assets';
import { groundTint, TILE_M } from '../model/groundGrade';
import { FLAT_GROUND_COLOR, GROUND_SIZE_M } from '../model/sceneParams';
import { ModelBoundary } from './ModelBoundary';
import { reportEnvironmentFailure } from './environmentFailure';
import { lightsBlendRef } from './lightsBlend';
import { createGroundSoilMaterial } from './soil';

/** The ground follows the camera in whole TILE_M tiles so the texture never swims. */
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

function groundUrl(key: string): string {
  const url = assetUrl(key);
  if (url === null) throw new Error(`Ground texture is not in the manifest: ${key}`);
  return url;
}

function ForestGround() {
  const maxAniso = useThree((s) => s.gl.capabilities.getMaxAnisotropy());
  const textures = useTexture({
    map: groundUrl(ASSET_KEYS.forestFloor.diffuse),
    normalMap: groundUrl(ASSET_KEYS.forestFloor.normal),
    roughnessMap: groundUrl(ASSET_KEYS.forestFloor.rough),
  });

  // Black emissive in both lights modes (horror-pass 24.1).
  // Keyed on the textures themselves: useTexture returns a new keyed object every render.
  const { map, normalMap, roughnessMap } = textures;
  const material = useMemo(
    () => createGroundSoilMaterial({ map, normalMap, roughnessMap }, lightsBlendRef.current),
    [map, normalMap, roughnessMap],
  );
  useEffect(() => () => material.dispose(), [material]);
  // Night grade: darker and redder in lights off, eased with the lights blend.
  useFrame(() => {
    material.color.setRGB(...groundTint(lightsBlendRef.current));
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
      <primitive object={material} attach="material" />
    </GroundPlane>
  );
}

/**
 * 480 m forest-floor ground that follows the camera on a 4 m snap (7.1). The nearest edge is 240 m away,
 * more than 1.5 times the longest fog distance (132 m), so fog hides the edge (7.2). If a ground
 * texture fails, a flat #0b0806 ground replaces it and the HUD posts a notice (7.13).
 */
export function Ground() {
  const group = useRef<Group>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const frames = useRef(0);

  useFrame(({ camera }) => {
    // Start the Ground_Texture requests right after the first frame has rendered (5.2).
    if (frames.current++ === 1) setLoading(true);
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
            {loading ? <ForestGround /> : <FlatGround />}
          </Suspense>
        </ModelBoundary>
      )}
    </group>
  );
}
