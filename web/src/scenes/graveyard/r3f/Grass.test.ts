import { describe, expect, it } from 'vitest';
import {
  DoubleSide,
  InstancedMesh,
  LinearMipmapLinearFilter,
  MeshStandardMaterial,
  SRGBColorSpace,
} from 'three';
import { GRASS_CAP } from '../model/grass';
import { buildGrassGeometry, buildGrassTexture, writeGrassInstances } from './Grass';

describe('Grass helpers', () => {
  it('builds two crossed quads no taller than 0.35 m', () => {
    const g = buildGrassGeometry();
    expect(g.getIndex()?.count).toBe(12);
    g.computeBoundingBox();
    expect(g.boundingBox?.min.y).toBe(0);
    expect(g.boundingBox?.max.y).toBeCloseTo(0.35);
  });

  it('makes a mipmapped sRGB texture', () => {
    const t = buildGrassTexture(1);
    expect(t.generateMipmaps).toBe(true);
    expect(t.minFilter).toBe(LinearMipmapLinearFilter);
    expect(t.colorSpace).toBe(SRGBColorSpace);
  });

  it('writes cards up to capacity and sets the draw count', () => {
    const mesh = new InstancedMesh(
      buildGrassGeometry(),
      new MeshStandardMaterial({ side: DoubleSide }),
      GRASS_CAP,
    );
    const card = { x: 1, z: 2, yaw: 0, height: 0.35, width: 0.5 };
    expect(writeGrassInstances(mesh, [card, card])).toBe(2);
    expect(mesh.count).toBe(2);
    expect(
      writeGrassInstances(
        mesh,
        Array.from({ length: GRASS_CAP + 10 }, () => card),
      ),
    ).toBe(GRASS_CAP);
    expect(writeGrassInstances(mesh, [])).toBe(0);
    expect(mesh.count).toBe(0);
  });
});
