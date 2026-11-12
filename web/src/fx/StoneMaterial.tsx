import { useMemo } from 'react';
import { FrontSide, MeshStandardMaterial } from 'three';
import CustomShaderMaterial from 'three-custom-shader-material';

const FRAGMENT = /* glsl */ `
  uniform float uDecay;
  void main() {
    // Cold, slightly green darkening; stronger for more decayed models.
    vec3 c = csm_DiffuseColor.rgb;
    csm_DiffuseColor.rgb = mix(c, c * vec3(0.66, 0.74, 0.62), uDecay);
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
  const uniforms = useMemo(() => ({ uDecay: { value: decay } }), [decay]);
  return (
    <CustomShaderMaterial
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
