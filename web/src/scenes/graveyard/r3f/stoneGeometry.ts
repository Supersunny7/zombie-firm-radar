import {
  BufferAttribute,
  BufferGeometry,
  Matrix3,
  MeshStandardMaterial,
  Vector3,
  type Material,
  type Mesh,
  type Object3D,
} from 'three';
import { clipFlap } from '../model/clipFlap';
import type { FlapClip } from '../model/stoneModels';

export interface StoneGeometry {
  geometry: BufferGeometry;
  material: MeshStandardMaterial;
}

/**
 * Builds a float32 geometry in model space from the first mesh of a loaded GLB: the node's
 * matrixWorld is baked in (the GLBs are quantized, so attributes are copied through the
 * attribute getters), then the base flap is clipped. The cached glTF is not modified.
 */
export function buildStoneGeometry(scene: Object3D, flapClip: FlapClip | null): StoneGeometry {
  scene.updateWorldMatrix(true, true);
  let mesh: Mesh | null = null;
  scene.traverse((o) => {
    if (!mesh && (o as Mesh).isMesh) mesh = o as Mesh;
  });
  const found = mesh as Mesh | null;
  if (!found) throw new Error('stone model has no mesh');

  const src = found.geometry;
  const pos = src.getAttribute('position');
  const nor = src.getAttribute('normal');
  const uv = src.getAttribute('uv');
  const m = found.matrixWorld;
  const nm = new Matrix3().getNormalMatrix(m);
  const n = pos.count;
  const positions = new Float32Array(n * 3);
  const normals = nor ? new Float32Array(n * 3) : null;
  const uvs = uv ? new Float32Array(n * 2) : null;
  const v = new Vector3();
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(m);
    positions.set([v.x, v.y, v.z], i * 3);
    if (normals && nor) {
      v.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
      normals.set([v.x, v.y, v.z], i * 3);
    }
    if (uvs && uv) uvs.set([uv.getX(i), uv.getY(i)], i * 2);
  }

  const srcIndex = src.getIndex();
  const index: ArrayLike<number> | null = srcIndex ? (srcIndex.array as ArrayLike<number>) : null;
  const triCount = index ? index.length : n;
  let tris: Uint32Array;
  if (flapClip) tris = clipFlap(positions, index, flapClip);
  else {
    tris = new Uint32Array(triCount);
    for (let i = 0; i < triCount; i++) tris[i] = index ? index[i]! : i;
  }
  // A mirrored node matrix flips the winding; keep front faces front.
  if (m.determinant() < 0) {
    for (let t = 0; t + 2 < tris.length; t += 3) {
      const b = tris[t + 1]!;
      tris[t + 1] = tris[t + 2]!;
      tris[t + 2] = b;
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  if (normals) geometry.setAttribute('normal', new BufferAttribute(normals, 3));
  if (uvs) geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
  geometry.setIndex(new BufferAttribute(tris, 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  const srcMat: Material | Material[] = found.material;
  const first = Array.isArray(srcMat) ? srcMat[0] : srcMat;
  const material = first instanceof MeshStandardMaterial ? first : new MeshStandardMaterial();
  return { geometry, material };
}
