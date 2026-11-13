import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DataTexture,
  DoubleSide,
  LinearFilter,
  LinearMipmapLinearFilter,
  Matrix4,
  Quaternion,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
  Vector3,
} from 'three';
import type { InstancedMesh, MeshStandardMaterial } from 'three';
import { fnv1a32 } from '../../../engine/hash';
import { useStore } from '../../../state/store';
import type { GraveyardLayout } from '../layout/layout';
import { GRASS_CAP, placeGrass } from '../model/grass';
import type { GrassCard } from '../model/grass';
import { GRASS_TEXTURE_SIZE, grassTexture } from '../model/grassTexture';
import { lightsBlendRef } from './lightsBlend';

/** Card geometry size in metres; instance scale = card.width / CARD_W, card.height / CARD_H. */
const CARD_W = 0.5;
const CARD_H = 0.35;
/** Lights-off tint dims and cools the straw; lights on is the plain texture colour. */
const TINT_OFF = new Color(0.62, 0.66, 0.7);
const TINT_ON = new Color(1, 1, 1);
/** Lights-off self-light on the grass texture: sparse straw has to read against the black ground. */
const GRASS_GLOW = 0.3;

/** Two crossed quads (0.5 x 0.35 m), base on y = 0, merged into one geometry. */
export function buildGrassGeometry(): BufferGeometry {
  const hw = CARD_W / 2;
  // Quad A lies in the XY plane, quad B in the ZY plane.
  const positions = new Float32Array([
    -hw,
    0,
    0,
    hw,
    0,
    0,
    hw,
    CARD_H,
    0,
    -hw,
    CARD_H,
    0,
    0,
    0,
    -hw,
    0,
    0,
    hw,
    0,
    CARD_H,
    hw,
    0,
    CARD_H,
    -hw,
  ]);
  const normals = new Float32Array(8 * 3);
  for (let i = 0; i < 8; i++) normals[i * 3 + 1] = 1; // up: soft, even lighting for both faces
  const uvs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1]);
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(positions, 3));
  g.setAttribute('normal', new BufferAttribute(normals, 3));
  g.setAttribute('uv', new BufferAttribute(uvs, 2));
  g.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
  return g;
}

/** Dead-grass DataTexture with mipmaps, trilinear filtering and sRGB colour space. */
export function buildGrassTexture(seed: number): DataTexture {
  const t = new DataTexture(
    grassTexture(seed),
    GRASS_TEXTURE_SIZE,
    GRASS_TEXTURE_SIZE,
    RGBAFormat,
    UnsignedByteType,
  );
  t.generateMipmaps = true;
  t.minFilter = LinearMipmapLinearFilter;
  t.magFilter = LinearFilter;
  t.colorSpace = SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

const _m = new Matrix4();
const _q = new Quaternion();
const _p = new Vector3();
const _s = new Vector3();
const _up = new Vector3(0, 1, 0);

/** Writes the cards into the instance buffer (at most its capacity) and sets the draw count. */
export function writeGrassInstances(mesh: InstancedMesh, cards: readonly GrassCard[]): number {
  const n = Math.min(cards.length, mesh.instanceMatrix.count);
  for (let k = 0; k < n; k++) {
    const c = cards[k] as GrassCard;
    _p.set(c.x, 0, c.z);
    _q.setFromAxisAngle(_up, c.yaw);
    _s.set(c.width / CARD_W, c.height / CARD_H, c.width / CARD_W);
    _m.compose(_p, _q, _s);
    mesh.setMatrixAt(k, _m);
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  if (n > 0) mesh.computeBoundingSphere();
  return n;
}

/**
 * Dead grass: one InstancedMesh (capacity 1,500) holding only the framed plot's cards, the same
 * cards in both lights modes (6.4, 6.10); low quality keeps half (6.9, 6.11). Overview draws none.
 */
export function Grass({ layout }: { layout: GraveyardLayout }) {
  const framed = useStore((s) => s.framedPlot);
  const lowQuality = useStore((s) => s.settings.lowQuality);
  const ref = useRef<InstancedMesh>(null);
  const mat = useRef<MeshStandardMaterial>(null);

  const geometry = useMemo(() => buildGrassGeometry(), []);
  const texture = useMemo(() => buildGrassTexture(fnv1a32('dead-grass')), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => texture.dispose(), [texture]);

  const cards = useMemo(
    () => (framed === 'overview' ? [] : placeGrass(layout, framed, lowQuality ? 'low' : 'normal')),
    [layout, framed, lowQuality],
  );

  useLayoutEffect(() => {
    if (ref.current) writeGrassInstances(ref.current, cards);
  }, [cards]);

  // Lights-on lighting: untinted and brighter; follows the eased lights value.
  useFrame(() => {
    const m = mat.current;
    if (!m) return;
    const lb = lightsBlendRef.current;
    m.color.lerpColors(TINT_OFF, TINT_ON, lb);
    const g = GRASS_GLOW * (1 - lb);
    m.emissive.setRGB(g * 0.9, g, g * 0.8);
  });

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, GRASS_CAP]}
      raycast={() => null}
      receiveShadow
      name="grass"
    >
      <meshStandardMaterial
        ref={mat}
        map={texture}
        emissiveMap={texture}
        alphaTest={0.5}
        side={DoubleSide}
        roughness={1}
        metalness={0}
      />
    </instancedMesh>
  );
}
