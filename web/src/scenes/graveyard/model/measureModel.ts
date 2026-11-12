// three-dependent part of the stone model code (kept apart from the pure files).
// three APIs used (checked with context7): Box3.expandByPoint, Vector3.fromBufferAttribute,
// Vector3.applyMatrix4, Object3D.updateMatrixWorld, BufferGeometry.getAttribute.
import { Box3, Vector3, type Mesh, type Object3D } from 'three';
import type { FlapClip } from './stoneModels';

export interface MeasuredModel {
  readonly origin: { x: number; y: number; z: number };
  readonly body: { w: number; h: number; d: number };
}

/**
 * Measures the body of a loaded model in model space (node transforms applied), ignoring
 * vertices in the flap region. Returns null when the model has no body vertices.
 * Tests compare the result with the constants in STONE_MODELS.
 */
export function measureModel(root: Object3D, flapClip: FlapClip | null): MeasuredModel | null {
  root.updateMatrixWorld(true);
  const box = new Box3();
  const v = new Vector3();
  root.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    const pos = mesh.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      if (flapClip && v.z > flapClip.zMin && v.y < flapClip.yMax) continue;
      box.expandByPoint(v);
    }
  });
  if (box.isEmpty()) return null;
  const size = box.getSize(new Vector3());
  return {
    origin: { x: (box.min.x + box.max.x) / 2, y: box.min.y, z: (box.min.z + box.max.z) / 2 },
    body: { w: size.x, h: size.y, d: size.z },
  };
}
