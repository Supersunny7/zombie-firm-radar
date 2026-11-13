import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  CanvasTexture,
  Euler,
  InstancedBufferAttribute,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from 'three';
import type { InstancedMesh, MeshBasicMaterial } from 'three';
import { mulberry32 } from '../../../engine/rng';
import { useShockView } from '../../../state/shockView';
import { useStore } from '../../../state/store';
import { ASSET_KEYS, assetUrl } from '../assets';
import type { GraveyardLayout } from '../layout/layout';
import { planDressing, type BloodPlan } from '../model/dressing';
import { useVisibleStones } from './useVisibleStones';

/** Atlas: 4 x 2 cells of 512 px. Cell 0 blood, 1 to 3 handprints, 4 to 6 drag marks. */
const CELL_PX = 512;
const COLS = 4;
const ROWS = 2;
const CELL_COUNT = 7;
const FIRST_DRAG = 4;
const FADE_S = 0.35;
const MAX_QUADS = 5;
/** Dark red multiplies the CC0 splatter so it reads as blood. */
const BLOOD_TINT = '#8a1410';

const _q = new Quaternion();
const _qr = new Quaternion();
const _e = new Euler();
const _p = new Vector3();
const _s = new Vector3();
const _off = new Vector3();
const Z = new Vector3(0, 0, 1);
const X = new Vector3(1, 0, 0);

function atlasKeys(): string[] {
  return [ASSET_KEYS.blood, ...ASSET_KEYS.handprints, ...ASSET_KEYS.dragMarks];
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`decal failed: ${url}`));
    img.src = url;
  });
}

/** Draws the 7 decal images into one canvas, each fitted (aspect kept) in its cell. */
async function buildAtlas(): Promise<CanvasTexture | null> {
  const canvas = document.createElement('canvas');
  canvas.width = CELL_PX * COLS;
  canvas.height = CELL_PX * ROWS;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const keys = atlasKeys();
  const results = await Promise.allSettled(
    keys.map((k) => {
      const url = assetUrl(k);
      return url ? loadImage(url) : Promise.reject(new Error(`not in manifest: ${k}`));
    }),
  );
  results.forEach((r, i) => {
    if (r.status !== 'fulfilled') return; // a missing decal leaves its cell empty
    const img = r.value;
    const scale = Math.min(CELL_PX / img.width, CELL_PX / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const cx = (i % COLS) * CELL_PX + (CELL_PX - w) / 2;
    const cy = Math.floor(i / COLS) * CELL_PX + (CELL_PX - h) / 2;
    ctx.drawImage(img, cx, cy, w, h);
  });
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export interface QuadSpec {
  readonly matrix: Matrix4;
  /** (u offset, v offset, u scale, v scale) of the atlas cell. */
  readonly cell: readonly [number, number, number, number];
}

function cellRect(cell: number): [number, number, number, number] {
  const col = cell % COLS;
  const row = Math.floor(cell / COLS);
  // Canvas row 0 is the top; texture v runs bottom to top.
  return [col / COLS, 1 - (row + 1) / ROWS, 1 / COLS, 1 / ROWS];
}

/**
 * Builds the quads for one undead stone from its seeds. Splatters and handprints sit on the
 * stone front face; drag marks lie on the ground in front of the stone (6.1).
 */
export function quadsFor(
  layout: GraveyardLayout,
  plan: BloodPlan,
  out: QuadSpec[],
  max: number,
): void {
  const s = layout.stones[plan.firm];
  if (!s) return;
  _e.set(s.pitch, s.yaw, s.roll, 'YXZ');
  _q.setFromEuler(_e);
  for (const seed of plan.seeds) {
    if (out.length >= max) return;
    const rnd = mulberry32(seed);
    const cell = Math.floor(rnd() * CELL_COUNT);
    const ux = rnd();
    const uy = rnd();
    const rot = rnd() * Math.PI * 2;
    const size = 0.22 + rnd() * 0.2;
    if (cell >= FIRST_DRAG) {
      // Ground mark: flat, in front of the stone, beyond the mound's front edge.
      _off.set((ux * 2 - 1) * s.width * 0.4, 0, s.depth / 2 + 0.55 + uy * 0.5);
      _qr.setFromEuler(_e.set(0, s.yaw, 0, 'YXZ'));
      _off.applyQuaternion(_qr);
      _p.set(s.x + _off.x, 0.02, s.z + _off.z);
      _q.setFromEuler(_e.set(0, s.yaw, 0, 'YXZ'));
      _qr.setFromAxisAngle(X, -Math.PI / 2);
      _q.multiply(_qr);
      _qr.setFromAxisAngle(Z, rot);
      _q.multiply(_qr);
      _s.set(size * 1.8, size * 1.8, 1);
    } else {
      // Face: local offset from the stone base, just in front of the face.
      _off.set((ux * 2 - 1) * s.width * 0.3, s.height * (0.3 + uy * 0.45), s.depth / 2 + 0.015);
      _q.setFromEuler(_e.set(s.pitch, s.yaw, s.roll, 'YXZ'));
      _off.applyQuaternion(_q);
      _p.set(s.x + _off.x, -s.sink + _off.y, s.z + _off.z);
      _qr.setFromAxisAngle(Z, (rot - Math.PI) * 0.25);
      _q.multiply(_qr);
      _s.set(size, size, 1);
    }
    out.push({ matrix: new Matrix4().compose(_p, _q, _s), cell: cellRect(cell) });
  }
}

function patchMaterial(material: MeshBasicMaterial): void {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aCell;')
      .replace(
        '#include <uv_vertex>',
        '#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = vMapUv * aCell.zw + aCell.xy;\n#endif',
      );
  };
  material.customProgramCacheKey = () => 'blood-atlas';
}

interface QuadsProps {
  quads: readonly QuadSpec[];
  capacity: number;
  atlas: CanvasTexture;
  show: boolean;
}

function BloodQuads({ quads, capacity, atlas, show }: QuadsProps) {
  const ref = useRef<InstancedMesh>(null);
  const mat = useRef<MeshBasicMaterial>(null);
  const opacity = useRef(0);
  const geometry = useMemo(() => {
    const g = new PlaneGeometry(1, 1);
    g.setAttribute('aCell', new InstancedBufferAttribute(new Float32Array(capacity * 4), 4));
    return g;
  }, [capacity]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    const m = mat.current;
    if (m) patchMaterial(m);
  }, []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const attr = geometry.getAttribute('aCell') as InstancedBufferAttribute;
    const n = Math.min(quads.length, capacity);
    for (let k = 0; k < n; k++) {
      const q = quads[k]!;
      mesh.setMatrixAt(k, q.matrix);
      attr.setXYZW(k, q.cell[0], q.cell[1], q.cell[2], q.cell[3]);
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    attr.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [quads, capacity, geometry]);

  // 0.35 s linear fade on lights change; the mesh is hidden (zero cost) once fully faded out.
  useFrame((_, dt) => {
    const mesh = ref.current;
    const m = mat.current;
    if (!mesh || !m) return;
    const target = show ? 1 : 0;
    const step = dt / FADE_S;
    opacity.current =
      target > opacity.current
        ? Math.min(target, opacity.current + step)
        : Math.max(target, opacity.current - step);
    m.opacity = opacity.current;
    mesh.visible = opacity.current > 0;
  });

  return (
    <instancedMesh
      key={capacity}
      ref={ref}
      args={[geometry, undefined, capacity]}
      raycast={() => null}
      renderOrder={2}
      visible={false}
      name="blood-decals"
    >
      <meshBasicMaterial
        ref={mat}
        map={atlas}
        color={BLOOD_TINT}
        transparent
        opacity={0}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
      />
    </instancedMesh>
  );
}

/**
 * One InstancedMesh of blood quads with a runtime atlas of the 7 existing decal images (6.1 to
 * 6.5). Lights off only: 1 to 5 quads per undead stone near the camera. On lights on or when a
 * firm stops being undead the quads fade out in 0.35 s and are then dropped (under 1 s).
 */
export function BloodDecals({ layout }: { layout: GraveyardLayout }) {
  const { firms, batch } = useShockView();
  const lights = useStore((s) => s.settings.lights);
  const visible = useVisibleStones(layout);
  const [atlas, setAtlas] = useState<CanvasTexture | null>(null);

  // The lights-off plan is the quad source; lights on keeps it only to fade the quads out, then
  // `show` is false and the mesh is hidden. planDressing(..., 'on') is empty by construction (6.2).
  const plan = useMemo(() => planDressing(firms, batch, 'off'), [firms, batch]);
  const wanted = lights === 'off' && plan.blood.length > 0;

  // Fetch the decals at first need only: never while the scene stays in lights on.
  useEffect(() => {
    if (!wanted || atlas) return undefined;
    let cancelled = false;
    void buildAtlas().then((t) => {
      if (cancelled) t?.dispose();
      else if (t) setAtlas(t);
    });
    return () => {
      cancelled = true;
    };
  }, [wanted, atlas]);
  useEffect(() => () => atlas?.dispose(), [atlas]);

  const capacity = Math.max(1, firms.length * MAX_QUADS);
  const quads = useMemo(() => {
    const out: QuadSpec[] = [];
    for (const b of plan.blood) {
      if (visible.has(b.firm)) quadsFor(layout, b, out, capacity);
    }
    return out;
  }, [plan, visible, layout, capacity]);

  if (!atlas) return null;
  return <BloodQuads quads={quads} capacity={capacity} atlas={atlas} show={wanted} />;
}
