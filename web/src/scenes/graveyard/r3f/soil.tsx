import { Suspense, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { Color, RepeatWrapping, SRGBColorSpace } from 'three';
import type { MeshStandardMaterial, Texture } from 'three';
import type { RefObject } from 'react';
import { ASSET_KEYS, assetUrl } from '../assets';
import { ModelBoundary } from './ModelBoundary';
import { lightsBlendRef } from './lightsBlend';
import { reportEnvironmentFailure } from './environmentFailure';

/** Soil maps shared by the closed mounds, the torn heaps and the clods. */
export interface SoilMaps {
  map: Texture;
  normalMap: Texture;
  roughnessMap: Texture;
}

/** Flat dark soil colour used when the soil textures fail (Base_Spec 7.13). */
export const SOIL_FALLBACK_COLOR = '#0b0806';

/**
 * Lights-off tints. Closed mounds are dark and cool (the raw map is orange and read as smooth
 * domes); torn heaps and clods stay a little warmer and lighter so the broken rim reads.
 * Lights on is untinted (14.1, no red tint).
 */
export const SOIL_TINT_CLOSED_OFF = new Color(0.34, 0.37, 0.44);
export const SOIL_TINT_TORN_OFF = new Color(0.8, 0.66, 0.6);
const TINT_ON = new Color(1, 1, 1);
const SOIL_REPEAT = 1.5;
const _glow = new Color();

export interface SoilTintOptions {
  /** Lights-off colour multiplier on the diffuse map. */
  readonly off?: Color;
  /** Lights-off self-light (needs `emissiveMap` = the diffuse map), fades to 0 in lights on. */
  readonly glow?: number;
}

function soilUrl(key: string): string {
  const url = assetUrl(key);
  if (url === null) throw new Error(`Soil texture is not in the manifest: ${key}`);
  return url;
}

/** Soil tint follows the eased lights value (same ~0.35 s feel as the rest of the scene). */
export function useSoilTint(
  mat: RefObject<MeshStandardMaterial | null>,
  { off = SOIL_TINT_CLOSED_OFF, glow = 0 }: SoilTintOptions = {},
): void {
  useFrame(() => {
    const m = mat.current;
    if (!m) return;
    const lb = lightsBlendRef.current;
    m.color.lerpColors(off, TINT_ON, lb);
    if (glow > 0) {
      const g = glow * (1 - lb);
      m.emissive.copy(_glow.setRGB(g, g * 0.88, g * 0.82));
    }
  });
}

function SoilLoader({ children }: { children: (maps: SoilMaps) => ReactNode }) {
  const textures = useTexture({
    map: soilUrl(ASSET_KEYS.soil.diffuse),
    normalMap: soilUrl(ASSET_KEYS.soil.normal),
    roughnessMap: soilUrl(ASSET_KEYS.soil.rough),
  });
  // Clones share the image but keep their own repeat (Ground repeats the originals for its own tiling).
  const maps = useMemo<SoilMaps>(() => {
    const out = {
      map: textures.map.clone(),
      normalMap: textures.normalMap.clone(),
      roughnessMap: textures.roughnessMap.clone(),
    };
    for (const [name, t] of Object.entries(out)) {
      t.wrapS = RepeatWrapping;
      t.wrapT = RepeatWrapping;
      t.repeat.set(SOIL_REPEAT, SOIL_REPEAT);
      if (name === 'map') t.colorSpace = SRGBColorSpace;
      t.needsUpdate = true;
    }
    return out;
  }, [textures]);
  useEffect(
    () => () => {
      maps.map.dispose();
      maps.normalMap.dispose();
      maps.roughnessMap.dispose();
    },
    [maps],
  );
  return <>{children(maps)}</>;
}

/**
 * Loads the soil PBR set already in the manifest and hands it to `children`. If loading fails
 * the children are rendered with `null` (flat dark colour). Nothing is drawn while loading.
 */
export function WithSoil({
  name,
  children,
}: {
  name: string;
  children: (maps: SoilMaps | null) => ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{children(null)}</>;
  return (
    <ModelBoundary
      name={name}
      onError={(e) => {
        reportEnvironmentFailure(e);
        setFailed(true);
      }}
    >
      <Suspense fallback={null}>
        <SoilLoader>{children}</SoilLoader>
      </Suspense>
    </ModelBoundary>
  );
}
