import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { FrontSide, MeshStandardMaterial, type MeshStandardMaterialParameters } from 'three';
import CustomShaderMaterial from 'three-custom-shader-material';
import type CustomShaderMaterialType from 'three-custom-shader-material/vanilla';
import { blendedParamsRef, stoneColorFactor } from '../scenes/graveyard/r3f/lightsBlend';

/** Overview emissive: cold blue-grey in linear colour, so stones read as lit silhouettes from far away. */
export const OVERVIEW_STONE_EMISSIVE = [0.14, 0.19, 0.28] as const;

const FRAGMENT = /* glsl */ `
  uniform float uDecay;
  uniform float uLift;
  uniform float uColorFactor;
  void main() {
    // Cold, slightly green darkening; stronger for more decayed models.
    // Albedo is pulled down and cooled so the flashlight pool reads dim grey-blue, not white.
    // uColorFactor: 0.55 in lights off, 1 in lights on (23.14); the decay mix below is unchanged.
    vec3 c = csm_DiffuseColor.rgb * vec3(0.62, 0.68, 0.78) * uColorFactor;
    csm_DiffuseColor.rgb = mix(c, c * vec3(0.66, 0.74, 0.62), uDecay);
    csm_Emissive = vec3(${OVERVIEW_STONE_EMISSIVE.map((v) => v.toFixed(3)).join(', ')}) * uLift;
  }
`;

interface Props {
  /** Material of the source GLB mesh; its maps and scalars are reused. */
  source: MeshStandardMaterial;
  /** 0 (intact) to 1 (fully decayed) tint amount. Modest by design. */
  decay: number;
}

/**
 * Base-material options taken from the source GLB material. glTF stores metalness (blue) and
 * roughness (green) in one metal/roughness texture, which GLTFLoader assigns to both
 * `roughnessMap` and `metalnessMap`. Both maps are passed, so a stone whose metallicFactor is 1
 * gets the near-zero metalness of its texture instead of rendering fully metallic (24.6).
 */
export function stoneMaterialOptions(source: MeshStandardMaterial): MeshStandardMaterialParameters {
  return {
    map: source.map ?? undefined,
    normalMap: source.normalMap ?? undefined,
    roughnessMap: source.roughnessMap ?? undefined,
    metalnessMap: source.metalnessMap ?? undefined,
    color: source.color,
    roughness: source.roughness,
    metalness: source.metalness,
    side: FrontSide,
    transparent: false,
  };
}

/** Opaque, single-sided stone material with a small decay tint (design Section 4). */
export function StoneMaterial({ source, decay }: Props) {
  const uniforms = useMemo(
    () => ({
      uDecay: { value: decay },
      uLift: { value: 0 },
      uColorFactor: { value: stoneColorFactor(blendedParamsRef.current) },
    }),
    [decay],
  );
  const material = useRef<CustomShaderMaterialType<typeof MeshStandardMaterial>>(null);
  // Overview lift follows the plot/overview fog weight published by SceneLights; the base-colour
  // factor follows the eased lights value (0.55 off, 1 on).
  useFrame(() => {
    const u = material.current?.uniforms as
      Record<'uLift' | 'uColorFactor', { value: number } | undefined> | undefined;
    if (u?.uLift) u.uLift.value = blendedParamsRef.current?.stoneLift ?? 0;
    if (u?.uColorFactor) u.uColorFactor.value = stoneColorFactor(blendedParamsRef.current);
  });
  return (
    <CustomShaderMaterial
      ref={material}
      baseMaterial={MeshStandardMaterial}
      fragmentShader={FRAGMENT}
      uniforms={uniforms}
      {...stoneMaterialOptions(source)}
    />
  );
}
