// Horror pass scene tests (jsdom, mocked Canvas stack).
// Requirements 5.1 (no Character_Model request before the first frame) and 8.15 (exactly three
// stone InstancedMesh, a fallen stone included).
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FirmIndexEntry } from '../../types/data';
import { ASSET_KEYS } from './assets';
import { computeLayout } from './layout/layout';

const h = vi.hoisted(() => ({
  gltfUrls: [] as string[],
  frameCallbacks: 0,
  firms: [] as unknown[],
}));

vi.mock('@react-three/fiber', () => ({
  Canvas: () => null,
  useFrame: () => {
    // Recorded only: the first frame never runs in this test.
    h.frameCallbacks += 1;
  },
}));

vi.mock('@react-three/drei', async () => {
  const { Group: G } = await import('three');
  return {
    useGLTF: (url: string) => {
      h.gltfUrls.push(url);
      return { scene: new G() };
    },
  };
});

vi.mock('../../fx/StoneMaterial', () => ({ StoneMaterial: () => null }));

vi.mock('./r3f/stoneGeometry', async () => {
  const { BufferGeometry: B, MeshStandardMaterial: M } = await import('three');
  return { buildStoneGeometry: () => ({ geometry: new B(), material: new M() }) };
});

vi.mock('../../state/shockView', () => ({
  useShockView: () => ({
    firms: h.firms,
    batch: { newlyUndead: new Uint8Array(h.firms.length) },
    error: null,
  }),
}));

const STATUSES = ['zombie', 'endangered', 'healthy', 'insufficient_data'] as const;

function makeFirms(n: number): FirmIndexEntry[] {
  return Array.from({ length: n }, (_, i) => ({
    cik: String(1000 + i).padStart(10, '0'),
    sector: `Sector ${i % 3}`,
    status: STATUSES[i % STATUSES.length]!,
    total_debt_usd: 1e6 * (i + 1),
  })) as unknown as FirmIndexEntry[];
}

const CHARACTER_KEYS: string[] = Object.values(ASSET_KEYS.characters);

/** Gives the DOM element standing in for an instancedMesh the methods Stones calls on it. */
const MESH_METHODS = ['setMatrixAt', 'setColorAt', 'computeBoundingSphere'] as const;

beforeEach(() => {
  h.gltfUrls = [];
  h.frameCallbacks = 0;
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  for (const m of MESH_METHODS) {
    Object.defineProperty(HTMLElement.prototype, m, {
      configurable: true,
      value: () => undefined,
    });
  }
  Object.defineProperty(HTMLElement.prototype, 'instanceMatrix', {
    configurable: true,
    value: { needsUpdate: false },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  for (const m of MESH_METHODS)
    delete (HTMLElement.prototype as unknown as Record<string, unknown>)[m];
  delete (HTMLElement.prototype as unknown as Record<string, unknown>)['instanceMatrix'];
});

describe('Horror pass graveyard scene', () => {
  it('renders exactly 3 stone InstancedMesh while a fallen stone is present (8.15)', async () => {
    const firms = makeFirms(200);
    h.firms = firms;
    const layout = computeLayout(firms);
    expect(layout.stones.some((s) => s.fallen)).toBe(true);

    const { Stones } = await import('./r3f/Stones');
    const { container } = render(<Stones layout={layout} />);
    const meshes = [...container.querySelectorAll('instancedmesh')];
    expect(meshes.map((m) => m.getAttribute('name')).sort()).toEqual([
      'stones-broken',
      'stones-cracked',
      'stones-intact',
    ]);
  });

  it('requests no Character_Model file before the first frame (5.1)', async () => {
    const firms = makeFirms(200);
    h.firms = firms;
    const layout = computeLayout(firms);
    const fetchSpy = vi.fn(() => Promise.reject(new Error('no network in tests')));
    vi.stubGlobal('fetch', fetchSpy);

    const { Stones } = await import('./r3f/Stones');
    render(<Stones layout={layout} />);

    expect(h.frameCallbacks).toBeGreaterThan(0); // registered, never run
    const requested = [
      ...h.gltfUrls,
      ...fetchSpy.mock.calls.map((c) => String((c as unknown[])[0])),
    ];
    expect(requested.length).toBeGreaterThan(0);
    for (const key of CHARACTER_KEYS) {
      expect(requested.some((u) => u.includes(key))).toBe(false);
    }
    vi.unstubAllGlobals();
  });
});
