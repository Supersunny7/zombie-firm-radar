import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Decal, useGLTF } from '@react-three/drei';
import { CanvasTexture, Euler, Matrix4, Quaternion, SRGBColorSpace, Vector3 } from 'three';
import type { BufferGeometry, Mesh, Object3D } from 'three';
import { useStore } from '../../../state/store';
import { useShockView } from '../../../state/shockView';
import { assetUrl } from '../assets';
import { buildGrid } from '../layout/grid';
import { stoneBaseY, stoneCentreY, type GraveyardLayout, type StoneLayout } from '../layout/layout';
import type { Ray } from '../layout/pick';
import { deriveFaceAnchor } from '../model/deriveFaceAnchor';
import { modelFor } from '../model/modelFor';
import { STONE_MODELS, type StoneModelId } from '../model/stoneModels';
import {
  drawEngraving,
  ensureEngravingFonts,
  clearEngraving,
  TEX_H,
  TEX_W,
} from './engravingCanvas';
import {
  chooseEngravingFace,
  decalBox,
  POOL_SIZE,
  selectEngravingPool,
  type EngravingFace,
} from './engravingPool';
import { ModelBoundary } from './ModelBoundary';
import { subscribeHoverChange } from './pointerPick';
import { reportAssetError } from './reportAssetError';
import { buildStoneGeometry } from './stoneGeometry';

const MODEL_IDS: readonly StoneModelId[] = ['intact', 'cracked', 'broken'];
const NO_RAYCAST = () => null;
const ROTATION: [number, number, number] = [0, 0, 0];

interface ModelParts {
  geometry: BufferGeometry;
  face: EngravingFace;
}

type PartsMap = Partial<Record<StoneModelId, ModelParts>>;

interface PoolState {
  readonly layout: GraveyardLayout | null;
  readonly pool: readonly number[];
}

const EMPTY_POOL: readonly number[] = Object.freeze([]);

interface Slot {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D | null;
  readonly texture: CanvasTexture;
}

function createSlot(): Slot {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return { canvas, ctx: canvas.getContext('2d'), texture };
}

/** Builds the proxy geometry and engraving face for one stone model from its loaded GLB. */
function buildParts(scene: Object3D, id: StoneModelId): ModelParts {
  const info = STONE_MODELS[id];
  const { geometry } = buildStoneGeometry(scene, info.flapClip);
  const pos = geometry.getAttribute('position');
  const nor = geometry.getAttribute('normal');
  const found = nor
    ? deriveFaceAnchor(pos.array, nor.array, geometry.getIndex()?.array ?? null)
    : null;
  return { geometry, face: chooseEngravingFace(found, info) };
}

/** Loads one stone model (cached by drei) and registers its proxy geometry. */
function ModelProbe({
  id,
  url,
  onReady,
}: {
  id: StoneModelId;
  url: string;
  onReady: (id: StoneModelId, parts: ModelParts | null) => void;
}) {
  const gltf = useGLTF(url, false);
  const parts = useMemo(() => buildParts(gltf.scene, id), [gltf.scene, id]);
  useEffect(() => {
    onReady(id, parts);
    return () => {
      onReady(id, null);
      parts.geometry.dispose();
    };
  }, [id, parts, onReady]);
  return null;
}

function ModelProbeSlot(props: {
  id: StoneModelId;
  onReady: (id: StoneModelId, p: ModelParts | null) => void;
}) {
  const key = STONE_MODELS[props.id].assetKey;
  const url = assetUrl(key);
  if (!url) return null; // Stones already reports the missing asset.
  return (
    <ModelBoundary name={`${key}:engraving`} onError={(e) => reportAssetError(key, e)}>
      <Suspense fallback={null}>
        <ModelProbe {...props} url={url} />
      </Suspense>
    </ModelBoundary>
  );
}

const _m = new Matrix4();
const _t = new Matrix4();
const _q = new Quaternion();
const _e = new Euler();
const _p = new Vector3();
const _s = new Vector3();

/** One pool slot: invisible proxy of the stone (same matrix as the instance) plus a Decal. */
function EngravingSlot({
  stone,
  id,
  parts,
  texture,
}: {
  stone: StoneLayout;
  id: StoneModelId;
  parts: ModelParts;
  texture: CanvasTexture;
}) {
  const ref = useRef<Mesh>(null);
  const info = STONE_MODELS[id];
  const sx = stone.width / info.body.w;
  const sy = stone.height / info.body.h;
  const box = useMemo(
    () => decalBox(parts.face, info.body, { sx, sy }),
    [parts.face, info, sx, sy],
  );

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    _t.makeTranslation(-info.origin.x, -info.origin.y, -info.origin.z);
    _p.set(stone.x, stoneBaseY(stone), stone.z);
    _e.set(stone.pitch, stone.yaw, stone.roll, 'YXZ');
    _q.setFromEuler(_e);
    _s.set(sx, sy, stone.depth / info.body.d);
    _m.compose(_p, _q, _s).multiply(_t);
    mesh.matrix.copy(_m);
    mesh.matrixWorldNeedsUpdate = true;
  }, [stone, info, sx, sy]);

  return (
    <mesh
      ref={ref}
      geometry={parts.geometry}
      matrixAutoUpdate={false}
      raycast={NO_RAYCAST}
      name="engraving-proxy"
    >
      <meshBasicMaterial colorWrite={false} depthWrite={false} visible={false} />
      <Decal
        key={`${id}:${stone.firmIndex}`}
        position={box.position}
        rotation={ROTATION}
        scale={box.scale}
      >
        <meshStandardMaterial
          map={texture}
          transparent
          depthTest
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-4}
          roughness={0.9}
          metalness={0}
        />
      </Decal>
    </mesh>
  );
}

/**
 * Pool of 13 engravings (requirement 5). Rebuilt when the hovered stone or the keyboard
 * focus changes; with nothing hovered the slots keep their last content (5.6).
 */
export function Engravings({ layout }: { layout: GraveyardLayout }) {
  const { firms, batch } = useShockView();
  const camera = useThree((s) => s.camera);
  const grid = useMemo(() => buildGrid(layout), [layout]);
  const slots = useMemo(() => Array.from({ length: POOL_SIZE }, createSlot), []);
  const [parts, setParts] = useState<PartsMap>({});
  const [want, setWant] = useState<PoolState>({ layout: null, pool: EMPTY_POOL });
  const [shown, setShown] = useState<PoolState>({ layout: null, pool: EMPTY_POOL });

  useEffect(
    () => () => {
      slots.forEach((s) => s.texture.dispose());
    },
    [slots],
  );

  const onReady = useMemo(
    () => (id: StoneModelId, p: ModelParts | null) =>
      setParts((cur) => {
        if (p === null ? cur[id] === undefined : cur[id] === p) return cur;
        const next = { ...cur };
        if (p === null) delete next[id];
        else next[id] = p;
        return next;
      }),
    [],
  );

  // Hover: the pointer ray at the time the hovered stone changed.
  useEffect(
    () =>
      subscribeHoverChange(({ firm, ray }) => {
        if (firm === null) return; // keep the last content
        setWant({ layout, pool: selectEngravingPool({ grid, layout, ray, primary: firm }) });
      }),
    [grid, layout],
  );

  // Keyboard focus: ray from the camera to the focused stone.
  useEffect(
    () =>
      useStore.subscribe((s, prev) => {
        if (s.focusedCik === prev.focusedCik || s.focusedCik === null) return;
        const index = firms.findIndex((f) => f.cik === s.focusedCik);
        const stone = layout.stones[index];
        if (index < 0 || !stone) return;
        const c = camera.position;
        const ray: Ray = {
          ox: c.x,
          oy: c.y,
          oz: c.z,
          dx: stone.x - c.x,
          dy: stoneCentreY(stone) - c.y,
          dz: stone.z - c.z,
        };
        setWant({ layout, pool: selectEngravingPool({ grid, layout, ray, primary: index }) });
      }),
    [firms, grid, layout, camera],
  );

  // Draw the wanted pool into the 13 canvases, then show it (fonts are capped at 300 ms).
  useEffect(() => {
    if (want.layout !== layout || want.pool.length === 0) return undefined;
    let cancelled = false;
    void ensureEngravingFonts().then(() => {
      if (cancelled) return;
      slots.forEach((slot, k) => {
        if (!slot.ctx) return;
        const idx = want.pool[k];
        const f = idx === undefined ? undefined : firms[idx];
        if (!f) {
          clearEngraving(slot.ctx);
        } else {
          drawEngraving(slot.ctx, {
            name: f.name,
            firstFilingYear: f.first_filing_year,
            icr: f.latest_icr,
            status: f.status,
          });
        }
        slot.texture.needsUpdate = true;
      });
      setShown(want);
    });
    return () => {
      cancelled = true;
    };
  }, [want, layout, firms, slots]);

  const pool = shown.layout === layout ? shown.pool : EMPTY_POOL;
  return (
    <>
      {MODEL_IDS.map((id) => (
        <ModelProbeSlot key={id} id={id} onReady={onReady} />
      ))}
      {slots.map((slot, k) => {
        const idx = pool[k];
        const stone = idx === undefined ? undefined : layout.stones[idx];
        const f = idx === undefined ? undefined : firms[idx];
        if (!stone || !f) return null;
        const id = modelFor(f.status, batch.newlyUndead[idx!] === 1);
        const p = parts[id];
        if (!p) return null;
        return <EngravingSlot key={k} stone={stone} id={id} parts={p} texture={slot.texture} />;
      })}
    </>
  );
}
