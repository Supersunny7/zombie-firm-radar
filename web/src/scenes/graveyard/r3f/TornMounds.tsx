import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  DoubleSide,
  Euler,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three';
import type { InstancedMesh, MeshStandardMaterial } from 'three';
import { mulberry32 } from '../../../engine/rng';
import { useShockView } from '../../../state/shockView';
import { useStore } from '../../../state/store';
import type { FirmIndexEntry } from '../../../types/data';
import type { GraveyardLayout } from '../layout/layout';
import { planDressing } from '../model/dressing';
import type { StainPlan } from '../model/dressing';
import { moundPlacement } from '../model/moundPlacement';
import { moundSets } from '../model/moundSets';
import { CLOD_MAX, clodsFor, pitRadius, tornMoundProfile } from '../model/tornMound';
import { useActiveRiserCiks } from './activeRisers';
import { SOIL_FALLBACK_COLOR, SOIL_TINT_TORN_OFF, WithSoil, useSoilTint } from './soil';
import type { SoilMaps } from './soil';
import { useVisibleStones } from './useVisibleStones';

/** Heap sits slightly under the ground so its outer edge (height 0) never z-fights. */
const HEAP_Y = -0.02;
/** The Pit disc lies just above the ground, inside the rim wall. */
const PIT_DISC_Y = 0.012;
const PIT_DISC_SCALE = 0.99;
const PIT_COLOR = '#010101';
/** Lights-off self-light of the textured rim and clods, so they read against the black ground. */
const RIM_GLOW = 0.8;
const CLOD_GLOW = 0.38;
const STAIN_COLOR = '#3a0604';
const STAIN_MAX_RADIUS = 0.12;
const STAIN_MIN_RADIUS = 0.05;

/** Rings of the unit heap, in Pit radii. The first ring is the inner wall foot on the ground. */
const HEAP_RINGS = [0.97, 1.0, 1.08, 1.15, 1.3, 1.5, 1.75, 2.05, 2.4];
const HEAP_SEGMENTS = 28;
const SOIL_UV_SCALE = 0.5;

const _m = new Matrix4();
const _q = new Quaternion();
const _e = new Euler();
const _p = new Vector3();
const _s = new Vector3();

/**
 * Torn heap for a Pit radius of 1 (instances scale x and z by the real radius). The profile
 * comes from `tornMoundProfile`; rim heights get a deterministic angular wobble so the rim looks
 * broken. The region inside the first ring is left open: nothing covers the Pit (7.3).
 */
export function buildTornHeapGeometry(): BufferGeometry {
  const rings = HEAP_RINGS.length;
  const positions = new Float32Array(rings * HEAP_SEGMENTS * 3);
  const uvs = new Float32Array(rings * HEAP_SEGMENTS * 2);
  let v = 0;
  for (let ri = 0; ri < rings; ri++) {
    const r = HEAP_RINGS[ri]!;
    // The wall foot (ring 0) and the outer edge stay on the ground.
    const base = ri === 0 ? 0 : tornMoundProfile(r, 1);
    const wobbleAmount = r > 0.99 && r < 1.8 ? 0.42 * (1 - Math.abs(r - 1.2) / 0.8) : 0;
    for (let si = 0; si < HEAP_SEGMENTS; si++) {
      const a = (si / HEAP_SEGMENTS) * Math.PI * 2;
      const wobble = Math.sin(a * 3 + 0.7) * 0.5 + Math.sin(a * 7 + 2.1) * 0.5;
      const y = ri === 0 ? 0 : Math.max(0, base) * (1 + wobbleAmount * wobble);
      const x = Math.sin(a) * r;
      const z = Math.cos(a) * r;
      positions.set([x, y, z], v * 3);
      uvs.set([x * SOIL_UV_SCALE + 0.5, z * SOIL_UV_SCALE + 0.5], v * 2);
      v++;
    }
  }
  const index: number[] = [];
  for (let ri = 0; ri < rings - 1; ri++) {
    for (let si = 0; si < HEAP_SEGMENTS; si++) {
      const sn = (si + 1) % HEAP_SEGMENTS;
      const a = ri * HEAP_SEGMENTS + si;
      const b = ri * HEAP_SEGMENTS + sn;
      const c = (ri + 1) * HEAP_SEGMENTS + si;
      const d = (ri + 1) * HEAP_SEGMENTS + sn;
      index.push(a, c, b, b, c, d);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(positions, 3));
  g.setAttribute('uv', new BufferAttribute(uvs, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** Flat unit disc lying on the ground (normal +y). */
function flatDisc(segments: number): CircleGeometry {
  const g = new CircleGeometry(1, segments);
  g.rotateX(-Math.PI / 2);
  return g;
}

interface TornSite {
  readonly firm: number;
  readonly cik: string;
  readonly x: number;
  readonly z: number;
  readonly yaw: number;
  readonly pitR: number;
}

function useSites(
  layout: GraveyardLayout,
  firms: readonly FirmIndexEntry[],
  torn: readonly number[],
): TornSite[] {
  return useMemo(() => {
    const out: TornSite[] = [];
    for (const i of torn) {
      const s = layout.stones[i];
      const f = firms[i];
      if (!s || !f) continue;
      const place = moundPlacement(s);
      out.push({
        firm: i,
        cik: f.cik,
        x: place.pit.x,
        z: place.pit.z,
        yaw: place.yaw,
        pitR: pitRadius(f.cik),
      });
    }
    return out;
  }, [layout, firms, torn]);
}

function Heaps({ sites, maps }: { sites: readonly TornSite[]; maps: SoilMaps | null }) {
  const ref = useRef<InstancedMesh>(null);
  const mat = useRef<MeshStandardMaterial>(null);
  const geometry = useMemo(() => buildTornHeapGeometry(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const capacity = Math.max(1, sites.length);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    sites.forEach((t, k) => {
      _p.set(t.x, HEAP_Y, t.z);
      _e.set(0, t.yaw, 0, 'YXZ');
      _q.setFromEuler(_e);
      _s.set(t.pitR, 1, t.pitR);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(k, _m);
    });
    mesh.count = sites.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [sites, capacity]);

  useSoilTint(mat, { off: SOIL_TINT_TORN_OFF, glow: RIM_GLOW });

  return (
    <instancedMesh
      key={capacity}
      ref={ref}
      args={[geometry, undefined, capacity]}
      raycast={() => null}
      receiveShadow
      castShadow
      frustumCulled
      name="torn-mounds"
    >
      {maps ? (
        <meshStandardMaterial ref={mat} {...maps} emissiveMap={maps.map} side={DoubleSide} />
      ) : (
        <meshStandardMaterial ref={mat} color={SOIL_FALLBACK_COLOR} side={DoubleSide} />
      )}
    </instancedMesh>
  );
}

function Clods({ sites, maps }: { sites: readonly TornSite[]; maps: SoilMaps | null }) {
  const ref = useRef<InstancedMesh>(null);
  const mat = useRef<MeshStandardMaterial>(null);
  const capacity = Math.max(1, sites.length * CLOD_MAX);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    let k = 0;
    for (const t of sites) {
      for (const c of clodsFor(t.cik, t.pitR)) {
        if (k >= capacity) break;
        const ground = Math.max(0, tornMoundProfile(Math.hypot(c.dx, c.dz) / t.pitR, 1));
        _p.set(t.x + c.dx, HEAP_Y + ground + c.scale * 0.45, t.z + c.dz);
        _e.set(c.dx * 7, c.dz * 11, c.scale * 31, 'YXZ');
        _q.setFromEuler(_e);
        _s.set(c.scale, c.scale * 0.75, c.scale);
        _m.compose(_p, _q, _s);
        mesh.setMatrixAt(k++, _m);
      }
    }
    mesh.count = k;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [sites, capacity]);

  useSoilTint(mat, { off: SOIL_TINT_TORN_OFF, glow: CLOD_GLOW });

  return (
    <instancedMesh
      key={capacity}
      ref={ref}
      args={[undefined, undefined, capacity]}
      raycast={() => null}
      receiveShadow
      castShadow
      name="clods"
    >
      <icosahedronGeometry args={[1, 1]} />
      {maps ? (
        <meshStandardMaterial ref={mat} {...maps} emissiveMap={maps.map} />
      ) : (
        <meshStandardMaterial ref={mat} color={SOIL_FALLBACK_COLOR} />
      )}
    </instancedMesh>
  );
}

/** Dark open Pit: one disc per torn mound, nothing above it, darker than the soil in both modes. */
function Pits({ sites }: { sites: readonly TornSite[] }) {
  const ref = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => flatDisc(28), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const capacity = Math.max(1, sites.length);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    sites.forEach((t, k) => {
      _p.set(t.x, PIT_DISC_Y, t.z);
      _q.identity();
      const r = t.pitR * PIT_DISC_SCALE;
      _s.set(r, 1, r);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(k, _m);
    });
    mesh.count = sites.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [sites, capacity]);

  return (
    <instancedMesh
      key={capacity}
      ref={ref}
      args={[geometry, undefined, capacity]}
      raycast={() => null}
      name="pits"
    >
      <meshBasicMaterial color={PIT_COLOR} />
    </instancedMesh>
  );
}

/** Lights-off only: at most 3 dark-red stains per torn mound, flat on the rim and heap (7.11). */
function Stains({ sites, stains }: { sites: readonly TornSite[]; stains: readonly StainPlan[] }) {
  const ref = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => flatDisc(12), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const capacity = Math.max(1, sites.length * 3);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const byCik = new Map(sites.map((t) => [t.firm, t]));
    let k = 0;
    for (const st of stains) {
      const t = byCik.get(st.firm);
      if (!t) continue;
      for (const seed of st.seeds.slice(0, 3)) {
        if (k >= capacity) break;
        const rand = mulberry32(seed);
        const a = rand() * Math.PI * 2;
        const rUnits = 1.15 + rand() * 0.45;
        const size = STAIN_MIN_RADIUS + rand() * (STAIN_MAX_RADIUS - STAIN_MIN_RADIUS);
        const stretch = 1 + rand() * 0.8;
        const y = HEAP_Y + Math.max(0, tornMoundProfile(rUnits, 1)) + 0.035;
        _p.set(t.x + Math.sin(a) * rUnits * t.pitR, y, t.z + Math.cos(a) * rUnits * t.pitR);
        _e.set(0, rand() * Math.PI, 0, 'YXZ');
        _q.setFromEuler(_e);
        _s.set(size * stretch, 1, size);
        _m.compose(_p, _q, _s);
        mesh.setMatrixAt(k++, _m);
      }
    }
    mesh.count = k;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [sites, stains, capacity]);

  return (
    <instancedMesh
      key={capacity}
      ref={ref}
      args={[geometry, undefined, capacity]}
      raycast={() => null}
      name="mound-stains"
    >
      <meshStandardMaterial
        color={STAIN_COLOR}
        roughness={0.35}
        metalness={0}
        polygonOffset
        polygonOffsetFactor={-2}
      />
    </instancedMesh>
  );
}

/**
 * Torn-open graves (7.1 to 7.11): for every zombie or newly undead firm near the camera, a
 * broken heap, a dark open Pit disc, 6 to 14 clods and, in lights off, up to 3 stains. Four
 * InstancedMesh objects, so draw calls do not grow with the firm count (6.11). A mound stays
 * torn while its character is rising or lowering (7.5, `tornMoundSet`).
 */
export function TornMounds({ layout }: { layout: GraveyardLayout }) {
  const { firms, batch } = useShockView();
  const lights = useStore((s) => s.settings.lights);
  const visible = useVisibleStones(layout);
  const active = useActiveRiserCiks();

  const plan = useMemo(() => planDressing(firms, batch, lights), [firms, batch, lights]);
  const torn = useMemo(
    () => moundSets(firms, plan, active).torn.filter((i) => visible.has(i)),
    [firms, plan, active, visible],
  );
  const sites = useSites(layout, firms, torn);
  const stains = useMemo(() => {
    const keep = new Set(torn);
    return plan.stains.filter((s) => keep.has(s.firm) && s.count > 0);
  }, [plan, torn]);

  return (
    <>
      <WithSoil name="torn-mounds">
        {(maps) => (
          <>
            <Heaps sites={sites} maps={maps} />
            <Clods sites={sites} maps={maps} />
          </>
        )}
      </WithSoil>
      <Pits sites={sites} />
      {lights === 'off' ? <Stains sites={sites} stains={stains} /> : null}
    </>
  );
}
