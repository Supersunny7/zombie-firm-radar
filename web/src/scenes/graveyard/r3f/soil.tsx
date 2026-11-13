import { Suspense, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { Color, DoubleSide, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace } from 'three';
import type { Texture } from 'three';
import type { RefObject } from 'react';
import { ASSET_KEYS, assetUrl } from '../assets';
import { groundTint } from '../model/groundGrade';
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
/** Lights-off tint of the Grass_Cards: dims and cools the straw; lights on is untinted. */
export const GRASS_TINT_OFF = new Color(0.62, 0.66, 0.7);
/** Clod colour, roughness 1, flat shaded (horror-pass 24.2, `horror-direction-params.md`). */
export const CLOD_COLOR = '#3b2c1f';
/** Open Pit colour (horror-pass 24.3). */
export const PIT_COLOR = '#040302';
const TINT_ON = new Color(1, 1, 1);
const SOIL_REPEAT = 1.5;

export interface SoilTintOptions {
  /** Lights-off colour multiplier on the diffuse map. */
  readonly off?: Color;
}

function soilUrl(key: string): string {
  const url = assetUrl(key);
  if (url === null) throw new Error(`Soil texture is not in the manifest: ${key}`);
  return url;
}

/** Sets the tint for the eased lights value `blend` (0 = lights off, 1 = lights on). */
export function applySoilTint(m: MeshStandardMaterial, off: Color, blend: number): void {
  m.color.lerpColors(off, TINT_ON, blend);
}

/**
 * Soil tint follows the eased lights value (same ~0.35 s feel as the rest of the scene). Accepts
 * a ref (JSX material) or a material built by one of the factories below. Never touches emissive.
 */
export function useSoilTint(
  mat: RefObject<MeshStandardMaterial | null> | MeshStandardMaterial,
  { off = SOIL_TINT_CLOSED_OFF }: SoilTintOptions = {},
): void {
  useFrame(() => {
    const m = mat instanceof MeshStandardMaterial ? mat : mat.current;
    if (m) applySoilTint(m, off, lightsBlendRef.current);
  });
}

/*
 * Soil material factories (horror-pass 24.1 to 24.5). Each returns a new MeshStandardMaterial
 * with emissive #000000, emissiveIntensity 0 and no emissiveMap in both lights modes, so no
 * soil, mound, heap, Pit, Clod or Grass_Card self-lights. `blend` is the lights value the colour
 * starts at (0 = lights off, 1 = lights on; pass `lightsBlendRef.current`); the per-frame tint
 * (`useSoilTint`, `groundTint`) keeps the colour in step afterwards and never sets emissive.
 * The caller owns the material: attach it with `<primitive object={m} attach="material" />`
 * (or pass it in `args`) and call `m.dispose()` on unmount; R3F does not dispose primitives.
 *
 *   createGroundSoilMaterial(maps, blend)   ground surface (Ground_Texture), colour groundTint(blend)
 *   createClosedMoundMaterial(maps, blend)  Closed_Mound, SOIL_TINT_CLOSED_OFF
 *   createTornHeapMaterial(maps, blend)     Torn_Mound heap, SOIL_TINT_TORN_OFF, double-sided
 *   createPitMaterial()                     Pit, PIT_COLOR, roughness 1
 *   createClodMaterial()                    Clod, CLOD_COLOR, roughness 1, flatShading (no maps)
 *   createGrassCardMaterial(texture, blend) Grass_Card, GRASS_TINT_OFF, alphaTest 0.5, double-sided
 *
 * `maps` / `texture` may be null (textures failed): the material then uses SOIL_FALLBACK_COLOR.
 */

/** Black emissive, intensity 0, no emissive map (24.1). */
function blackEmissive(m: MeshStandardMaterial): MeshStandardMaterial {
  m.emissive.set('#000000');
  m.emissiveIntensity = 0;
  m.emissiveMap = null;
  return m;
}

function soilMaterial(
  maps: SoilMaps | null,
  off: Color,
  blend: number,
  extra: ConstructorParameters<typeof MeshStandardMaterial>[0] = {},
): MeshStandardMaterial {
  if (!maps)
    return blackEmissive(new MeshStandardMaterial({ color: SOIL_FALLBACK_COLOR, ...extra }));
  const m = new MeshStandardMaterial({ ...maps, ...extra });
  applySoilTint(m, off, blend);
  return blackEmissive(m);
}

/** Ground surface that uses the Ground_Texture; colour follows `groundTint`. */
export function createGroundSoilMaterial(
  maps: SoilMaps | null,
  blend: number,
): MeshStandardMaterial {
  if (!maps) return blackEmissive(new MeshStandardMaterial({ color: SOIL_FALLBACK_COLOR }));
  const m = new MeshStandardMaterial({ ...maps });
  m.color.setRGB(...groundTint(blend));
  return blackEmissive(m);
}

/** Closed_Mound soil. */
export function createClosedMoundMaterial(
  maps: SoilMaps | null,
  blend: number,
): MeshStandardMaterial {
  return soilMaterial(maps, SOIL_TINT_CLOSED_OFF, blend);
}

/** Torn_Mound heap soil (double-sided: the inner wall is seen from the Pit side). */
export function createTornHeapMaterial(maps: SoilMaps | null, blend: number): MeshStandardMaterial {
  return soilMaterial(maps, SOIL_TINT_TORN_OFF, blend, { side: DoubleSide });
}

/** Dark open Pit; lit material so the black emissive rule applies (24.1, 24.3). */
export function createPitMaterial(): MeshStandardMaterial {
  return blackEmissive(new MeshStandardMaterial({ color: PIT_COLOR, roughness: 1, metalness: 0 }));
}

/** Flat-shaded dirt Clod, same colour in both lights modes (24.2). */
export function createClodMaterial(): MeshStandardMaterial {
  return blackEmissive(
    new MeshStandardMaterial({ color: CLOD_COLOR, roughness: 1, metalness: 0, flatShading: true }),
  );
}

/** Grass_Card: the dead-grass texture as `map` only (no emissive map, 24.4). */
export function createGrassCardMaterial(
  texture: Texture | null,
  blend: number,
): MeshStandardMaterial {
  const m = new MeshStandardMaterial({
    ...(texture ? { map: texture } : { color: SOIL_FALLBACK_COLOR }),
    alphaTest: 0.5,
    side: DoubleSide,
    roughness: 1,
    metalness: 0,
  });
  if (texture) applySoilTint(m, GRASS_TINT_OFF, blend);
  return blackEmissive(m);
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
