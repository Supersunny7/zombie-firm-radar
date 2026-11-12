// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import manifest from '../../../../public/assets/manifest.json';
import { HAND_PRINCIPAL_AXIS } from './handConstants';

const HAND_KEY = 'models/sketchfab-zombie-hand-craggle/sketchfab-zombie-hand-craggle.glb';

/** Remove images and textures from the GLB JSON chunk so Node needs no image decoding. */
function stripTextures(buf: Buffer): ArrayBuffer {
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8')) as Record<
    string,
    unknown
  >;
  delete json.images;
  delete json.textures;
  delete json.samplers;
  const strip = (o: unknown): void => {
    if (Array.isArray(o)) o.forEach(strip);
    else if (o && typeof o === 'object') {
      const rec = o as Record<string, unknown>;
      for (const k of Object.keys(rec)) {
        if (k.endsWith('Texture') || k === 'extensions') {
          if (k.endsWith('Texture')) delete rec[k];
          else strip(rec[k]);
        } else strip(rec[k]);
      }
    }
  };
  strip(json.materials);
  const jsonBytes = Buffer.from(JSON.stringify(json), 'utf8');
  const padded = Buffer.concat([jsonBytes, Buffer.alloc((4 - (jsonBytes.length % 4)) % 4, 0x20)]);
  const rest = buf.subarray(20 + jsonLen);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + padded.length + rest.length, 8);
  header.writeUInt32LE(padded.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  const out = Buffer.concat([header, padded, rest]);
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;
}

function loadHand(): Promise<GLTF> {
  const file = fileURLToPath(new URL(`../../../../public/assets/${HAND_KEY}`, import.meta.url));
  const data = stripTextures(readFileSync(file));
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  return new Promise((resolve, reject) => {
    loader.parse(data, '', resolve, reject);
  });
}

/** Dominant eigenvector of the vertex covariance (power iteration), world space. */
function principalAxis(root: THREE.Object3D): THREE.Vector3 {
  root.updateMatrixWorld(true);
  const pts: THREE.Vector3[] = [];
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const pos = mesh.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      pts.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld));
    }
  });
  const mean = pts.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(pts.length);
  const c = [0, 0, 0, 0, 0, 0]; // xx xy xz yy yz zz
  for (const p of pts) {
    const d = p.clone().sub(mean);
    c[0]! += d.x * d.x;
    c[1]! += d.x * d.y;
    c[2]! += d.x * d.z;
    c[3]! += d.y * d.y;
    c[4]! += d.y * d.z;
    c[5]! += d.z * d.z;
  }
  const [xx, xy, xz, yy, yz, zz] = c as [number, number, number, number, number, number];
  let v = new THREE.Vector3(1, 1, 1).normalize();
  for (let i = 0; i < 200; i++) {
    v = new THREE.Vector3(
      xx * v.x + xy * v.y + xz * v.z,
      xy * v.x + yy * v.y + yz * v.z,
      xz * v.x + yz * v.y + zz * v.z,
    ).normalize();
  }
  return v;
}

describe('Craggle hand geometry', () => {
  it('is listed in the manifest', () => {
    expect(HAND_KEY in manifest.files).toBe(true);
  });

  it('has a principal axis matching HAND_PRINCIPAL_AXIS (sign ignored)', async () => {
    const gltf = await loadHand();
    const axis = principalAxis(gltf.scene);
    const expected = new THREE.Vector3(...HAND_PRINCIPAL_AXIS).normalize();
    const dot = Math.abs(axis.dot(expected));
    expect(dot).toBeGreaterThan(1 - 0.05);
    for (let i = 0; i < 3; i++) {
      const a = [axis.x, axis.y, axis.z][i]!;
      const b = [expected.x, expected.y, expected.z][i]!;
      expect(Math.abs(Math.abs(a) - Math.abs(b))).toBeLessThan(0.05);
    }
  });

  it('has no skin and no animation clips', async () => {
    const gltf = await loadHand();
    expect(gltf.animations).toHaveLength(0);
    let skinned = 0;
    gltf.scene.traverse((o) => {
      if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned++;
    });
    expect(skinned).toBe(0);
    const parser = gltf.parser as unknown as { json: { skins?: unknown[] } };
    expect(parser.json.skins ?? []).toHaveLength(0);
  });
});
