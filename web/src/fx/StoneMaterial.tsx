import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { FrontSide, MeshStandardMaterial } from 'three';
import CustomShaderMaterial from 'three-custom-shader-material';
import type CustomShaderMaterialType from 'three-custom-shader-material/vanilla';
import { blendedParamsRef } from '../scenes/graveyard/r3f/lightsBlend';

/** Overview emissive: cold blue-grey in linear colour, so stones read as lit silhouettes from far away. */
export const OVERVIEW_STONE_EMISSIVE = [0.08, 0.11, 0.17] as const;

const FRAGMENT = /* glsl */ `
  uniform float uDecay;
  uniform float uLift;
  void main() {
    // Cold, slightly green darkening; stronger for more decayed models.
    vec3 c = csm_DiffuseColor.rgb;
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
