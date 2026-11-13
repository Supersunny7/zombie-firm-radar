import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DataTexture, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping } from 'three';
import type { Group, Mesh, MeshBasicMaterial } from 'three';
import { mulberry32 } from '../../../engine/rng';
import { useStore } from '../../../state/store';
import { qualityParams } from '../model/quality';
import { FOG_LAYER_COLOR, sceneParams } from '../model/sceneParams';
import { blendedParamsRef, defaultCameraFog } from './lightsBlend';

/** Fog sheet side in metres, snap of its follow motion, and noise tile size. */
const SHEET_M = 160;
const NOISE_TILE_M = 10;
const SNAP_M = NOISE_TILE_M;
const NOISE_SIZE = 64;
/** Drift speed in tiles per second per layer (slow; no strobing). */
const DRIFT = [0.004, 0.0065, 0.009] as const;

const INITIAL = sceneParams('off', 0, defaultCameraFog(0)).fogLayers;

/** Tileable two-octave value noise as an RGBA texture; the alpha map reads the green channel. */
function makeNoise(seed: number): DataTexture {
  const rnd = mulberry32(seed);
  const octaves = [4, 8].map((n) => {
    const grid = Float32Array.from({ length: n * n }, () => rnd());
    return { n, grid };
  });
  const smooth = (t: number): number => t * t * (3 - 2 * t);
  const sample = (n: number, grid: Float32Array, u: number, v: number): number => {
    const x = u * n;
    const y = v * n;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = smooth(x - x0);
    const fy = smooth(y - y0);
    const at = (i: number, j: number): number => grid[(j % n) * n + (i % n)]!;
    const top = at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx;
    const bottom = at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx;
    return top * (1 - fy) + bottom * fy;
  };
  const data = new Uint8Array(NOISE_SIZE * NOISE_SIZE * 4);
  for (let j = 0; j < NOISE_SIZE; j++) {
    for (let i = 0; i < NOISE_SIZE; i++) {
      const u = i / NOISE_SIZE;
      const v = j / NOISE_SIZE;
      const a = sample(octaves[0]!.n, octaves[0]!.grid, u, v);
      const b = sample(octaves[1]!.n, octaves[1]!.grid, u, v);
      // Contrast stretch so the sheet has clear wisps and gaps.
      const raw = a * 0.65 + b * 0.35;
      const c = Math.min(1, Math.max(0, (raw - 0.25) * 2));
      const byte = Math.round(c * 255);
      const o = (j * NOISE_SIZE + i) * 4;
      data[o] = byte;
      data[o + 1] = byte;
      data[o + 2] = byte;
      data[o + 3] = 255;
    }
  }
  const tex = new DataTexture(data, NOISE_SIZE, NOISE_SIZE);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.repeat.set(SHEET_M / NOISE_TILE_M, SHEET_M / NOISE_TILE_M);
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

function driftTexture(tex: DataTexture, amount: number): void {
  tex.offset.x += amount;
  tex.offset.y += amount * 0.5;
}

function setOpacity(mesh: Mesh, opacity: number): void {
  (mesh.material as MeshBasicMaterial).opacity = opacity;
}

/**
 * Three horizontal noise layers at y = 0.1, 0.38 and 0.8 m (7.11). Opacities come from
 * `sceneParams` through the shared blend (lights, camera and rate shock, 7.12, 7.14); the
 * sheets follow the camera on a snap equal to one noise tile and drift slowly.
 */
export function GroundFog() {
  const count = qualityParams(
    useStore((s) => s.settings.lowQuality),
    1,
  ).fogLayers;
  const group = useRef<Group>(null);
  const meshes = useRef<(Mesh | null)[]>([null, null, null]);
  const textures = useMemo(() => [makeNoise(11), makeNoise(23), makeNoise(37)], []);
  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures]);

  useFrame(({ camera }, dt) => {
    group.current?.position.set(
      Math.round(camera.position.x / SNAP_M) * SNAP_M,
      0,
      Math.round(camera.position.z / SNAP_M) * SNAP_M,
    );
    const layers = blendedParamsRef.current?.fogLayers;
    for (let i = 0; i < count; i++) {
      const tex = textures[i]!;
      driftTexture(tex, DRIFT[i]! * Math.min(dt, 0.1));
      const mesh = meshes.current[i];
      if (mesh && layers) setOpacity(mesh, layers[i]!.opacity);
    }
  }, -5);

  return (
    <group ref={group}>
      {INITIAL.slice(0, count).map((layer, i) => (
        <mesh
          key={layer.y}
          ref={(m) => {
            meshes.current[i] = m;
          }}
          position={[0, layer.y, 0]}
          rotation-x={-Math.PI / 2}
          renderOrder={10 + i}
        >
          <planeGeometry args={[SHEET_M, SHEET_M]} />
          <meshBasicMaterial
            color={FOG_LAYER_COLOR}
            alphaMap={textures[i]}
            opacity={layer.opacity}
            transparent
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
