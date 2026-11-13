import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { FrontSide, MeshStandardMaterial } from 'three';
import CustomShaderMaterial from 'three-custom-shader-material';
import type CustomShaderMaterialType from 'three-custom-shader-material/vanilla';
import { blendedParamsRef } from '../scenes/graveyard/r3f/lightsBlend';

/** Overview emissive: cold blue-grey in linear colour, so stones read as lit silhouettes from far away. */
export const OVERVIEW_STONE_EMISSIVE = [0.14, 0.19, 0.28] as const;

const FRAGMENT = /* glsl */ `
  uniform float uDecay;
  uniform float uLift;
  void main() {
    // Cold, slightly green darkening; stronger for more decayed models.
    // Albedo is pulled down and cooled so the flashlight pool reads dim grey-blue, not white.
    vec3 c = csm_DiffuseColor.rgb * vec3(0.62, 0.68, 0.78);
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

/** Opaque, single-sided stone material with a small decay tint (design Section 4). */
export function StoneMaterial({ source, decay }: Props) {
  const uniforms = useMemo(() => ({ uDecay: { value: decay }, uLift: { value: 0 } }), [decay]);
  const material = useRef<CustomShaderMaterialType<typeof MeshStandardMaterial>>(null);
  // Overview lift follows the plot/overview fog weight published by SceneLights.
  useFrame(() => {
    const u = material.current?.uniforms.uLift as { value: number } | undefined;
    if (u) u.value = blendedParamsRef.current?.stoneLift ?? 0;
  });
  return (
    <CustomShaderMaterial
      ref={material}
      baseMaterial={MeshStandardMaterial}
      fragmentShader={FRAGMENT}
      uniforms={uniforms}
      map={source.map ?? undefined}
      normalMap={source.normalMap ?? undefined}
      roughnessMap={source.roughnessMap ?? undefined}
      color={source.color}
      roughness={source.roughness}
      metalness={source.metalness}
      side={FrontSide}
      transparent={false}
    />
  );
}
