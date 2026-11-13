// Stone metalness map (requirements 24.6, 24.7). For each stone model, the glTF material of the real
// GLB is read from its JSON chunk and rebuilt the way GLTFLoader builds it (metalness =
// metallicFactor, default 1; the one metallicRoughnessTexture assigned to both roughnessMap and
// metalnessMap). The stone material built from that source must carry the same texture as both maps.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MeshStandardMaterial, Texture } from 'three';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
import { assetUrl } from '../scenes/graveyard/assets';
import { STONE_MODELS, type StoneModelId } from '../scenes/graveyard/model/stoneModels';
import { stoneMaterialOptions } from './StoneMaterial';

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public');

interface GltfMaterial {
  pbrMetallicRoughness?: {
    metallicFactor?: number;
    roughnessFactor?: number;
    metallicRoughnessTexture?: { index: number };
  };
}

/** The glTF JSON chunk of a .glb (chunk 0, starting after the 12-byte header). */
function glbJson(file: string): { materials: GltfMaterial[] } {
  const b = readFileSync(file);
  const length = b.readUInt32LE(12);
  return JSON.parse(b.subarray(20, 20 + length).toString('utf8')) as { materials: GltfMaterial[] };
}

/** Source material as GLTFLoader builds it from the glTF metal/roughness block. */
function loaderMaterial(m: GltfMaterial): MeshStandardMaterial {
  const pbr = m.pbrMetallicRoughness ?? {};
  const mat = new MeshStandardMaterial({
    metalness: pbr.metallicFactor ?? 1,
    roughness: pbr.roughnessFactor ?? 1,
    map: new Texture(),
    normalMap: new Texture(),
  });
  if (pbr.metallicRoughnessTexture) {
    const mr = new Texture();
    mat.roughnessMap = mr;
    mat.metalnessMap = mr;
  }
  return mat;
}

const IDS: readonly StoneModelId[] = ['intact', 'cracked', 'broken'];

describe('stone material metalness map (24.6, 24.7)', () => {
  it.each(IDS)('%s stone: metalnessMap is the same texture as roughnessMap', (id) => {
    const url = assetUrl(STONE_MODELS[id].assetKey);
    expect(url).not.toBeNull();
    const gltf = glbJson(join(publicDir, url!));
    expect(gltf.materials).toHaveLength(1);
    const pbr = gltf.materials[0]!.pbrMetallicRoughness;
    // The case behind the blotches: metallicFactor 1 (glTF default) with a metal/roughness texture.
    expect(pbr?.metallicRoughnessTexture).toBeDefined();
    expect(pbr?.metallicFactor ?? 1).toBe(1);

    const source = loaderMaterial(gltf.materials[0]!);
    const opts = stoneMaterialOptions(source);
    expect(opts.roughnessMap).toBe(source.roughnessMap);
    expect(opts.metalnessMap).toBe(opts.roughnessMap);
    expect(opts.metalness).toBe(1);

    // The options reach the built material the way <CustomShaderMaterial {...opts}> forwards them.
    const built = new CustomShaderMaterial({
      baseMaterial: MeshStandardMaterial,
      ...opts,
    }) as unknown as MeshStandardMaterial;
    expect(built.metalnessMap).toBeInstanceOf(Texture);
    expect(built.metalnessMap).toBe(built.roughnessMap);
    expect(built.transparent).toBe(false);
  });

  it('a source without a metal/roughness texture keeps its metalness factor and gets no map', () => {
    const source = new MeshStandardMaterial({ metalness: 0.2, roughness: 0.8 });
    const opts = stoneMaterialOptions(source);
    expect(opts.metalnessMap).toBeUndefined();
    expect(opts.roughnessMap).toBeUndefined();
    expect(opts.metalness).toBe(0.2);
  });
});
