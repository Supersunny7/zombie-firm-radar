// Horror pass Requirement 24 (24.1 to 24.5, 20.4): the soil, Closed_Mound, Torn_Mound heap, Pit,
// Clod and Grass_Card materials never self-light. Each is built once in lights off (blend 0) and
// once in lights on (blend 1), with stub or real textures and with null maps (fallback path), and
// checked again after the per-frame lights tint has run at both blends.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Color, MeshStandardMaterial, Texture } from 'three';
import type { FirmIndexEntry } from '../../../types/data';
import { computeLayout } from '../layout/layout';
import { groundTint } from '../model/groundGrade';
import { buildGrassTexture } from './Grass';
import { lightsBlendRef } from './lightsBlend';
import { Mounds } from './Mounds';
import {
  CLOD_COLOR,
  GRASS_TINT_OFF,
  PIT_COLOR,
  SOIL_FALLBACK_COLOR,
  SOIL_TINT_CLOSED_OFF,
  SOIL_TINT_TORN_OFF,
  applySoilTint,
  createClodMaterial,
  createClosedMoundMaterial,
  createGrassCardMaterial,
  createGroundSoilMaterial,
  createPitMaterial,
  createTornHeapMaterial,
  useSoilTint,
} from './soil';
import type * as SoilModule from './soil';
import type { SoilMaps } from './soil';

type FrameCallback = (state: unknown) => void;

const h = vi.hoisted(() => ({
  frames: [] as FrameCallback[],
  firms: [] as unknown[],
  textures: 'fail' as 'fail' | 'ok',
  soilTextures: null as Record<string, unknown> | null,
  closed: [] as MeshStandardMaterial[],
}));

vi.mock('@react-three/fiber', () => ({
  useFrame: (cb: FrameCallback) => {
    h.frames.push(cb);
  },
}));

vi.mock('@react-three/drei', async () => {
  const { Texture: T } = await import('three');
  return {
    useTexture: () => {
      if (h.textures === 'fail') throw new Error('soil texture failed (test)');
      h.soilTextures ??= { map: new T(), normalMap: new T(), roughnessMap: new T() };
      return h.soilTextures;
    },
  };
});

vi.mock('../../../state/shockView', () => ({
  useShockView: () => ({
    firms: h.firms,
    batch: { newlyUndead: new Uint8Array(h.firms.length) },
    error: null,
  }),
}));

// Pass-through wrapper that records the Closed_Mound material Mounds builds.
vi.mock('./soil', async (importOriginal) => {
  const actual = await importOriginal<typeof SoilModule>();
  return {
    ...actual,
    createClosedMoundMaterial: (maps: SoilMaps | null, blend: number) => {
      const m = actual.createClosedMoundMaterial(maps, blend);
      h.closed.push(m);
      return m;
    },
  };
});

const BLENDS = [
  ['lights off', 0],
  ['lights on', 1],
] as const;

function stubMaps(): SoilMaps {
  return { map: new Texture(), normalMap: new Texture(), roughnessMap: new Texture() };
}

/** Runs every recorded useFrame callback once with a camera at the origin. */
function runFrames(): void {
  act(() => {
    for (const cb of h.frames) cb({ camera: { position: { x: 0, y: 0, z: 0 } } });
  });
}

function expectNoGlow(m: MeshStandardMaterial, label: string): void {
  expect(m.emissive.getHex(), `${label}: emissive`).toBe(0x000000);
  expect(m.emissiveIntensity, `${label}: emissiveIntensity`).toBe(0);
  expect(m.emissiveMap, `${label}: emissiveMap`).toBeNull();
}

interface MaterialCase {
  readonly name: string;
  readonly build: (textured: boolean, blend: number) => MeshStandardMaterial;
  /** The per-frame lights tint the component runs on the textured material (none for Pit, Clod). */
  readonly tint: ((m: MeshStandardMaterial, blend: number) => void) | null;
  /** True if the material takes soil maps or a texture and so has a fallback path. */
  readonly hasMaps: boolean;
}

const soilTint =
  (off: Color) =>
  (m: MeshStandardMaterial, blend: number): void =>
    applySoilTint(m, off, blend);

const CASES: readonly MaterialCase[] = [
  {
    name: 'soil (Ground_Texture)',
    build: (t, b) => createGroundSoilMaterial(t ? stubMaps() : null, b),
    tint: (m, b) => m.color.setRGB(...groundTint(b)),
    hasMaps: true,
  },
  {
    name: 'Closed_Mound',
    build: (t, b) => createClosedMoundMaterial(t ? stubMaps() : null, b),
    tint: soilTint(SOIL_TINT_CLOSED_OFF),
    hasMaps: true,
  },
  {
    name: 'Torn_Mound heap',
    build: (t, b) => createTornHeapMaterial(t ? stubMaps() : null, b),
    tint: soilTint(SOIL_TINT_TORN_OFF),
    hasMaps: true,
  },
  { name: 'Pit', build: () => createPitMaterial(), tint: null, hasMaps: false },
  { name: 'Clod', build: () => createClodMaterial(), tint: null, hasMaps: false },
  {
    name: 'Grass_Card',
    build: (t, b) => createGrassCardMaterial(t ? buildGrassTexture(1) : null, b),
    tint: soilTint(GRASS_TINT_OFF),
    hasMaps: true,
  },
];

/** Gives the DOM element standing in for an instancedMesh the methods Mounds calls on it. */
const MESH_METHODS = ['setMatrixAt', 'computeBoundingSphere'] as const;

beforeEach(() => {
  h.frames = [];
  h.closed = [];
  h.textures = 'fail';
  h.soilTextures = null;
  lightsBlendRef.current = 0;
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
  lightsBlendRef.current = 0;
  for (const m of MESH_METHODS)
    delete (HTMLElement.prototype as unknown as Record<string, unknown>)[m];
  delete (HTMLElement.prototype as unknown as Record<string, unknown>)['instanceMatrix'];
});

describe('soil materials never self-light (24.1, 24.5)', () => {
  for (const c of CASES) {
    for (const [mode, blend] of BLENDS) {
      for (const textured of c.hasMaps ? [true, false] : [false]) {
        const maps = c.hasMaps ? (textured ? 'textured' : 'null maps') : 'no maps';
        it(`${c.name}, ${mode}, ${maps}: black emissive, intensity 0, no emissive map`, () => {
          lightsBlendRef.current = blend;
          const m = c.build(textured, blend);
          const label = `${c.name} ${mode} ${maps}`;
          expectNoGlow(m, label);
          if (c.hasMaps && !textured) {
            expect(m.map, `${label}: map`).toBeNull();
            expect(m.color.equals(new Color(SOIL_FALLBACK_COLOR)), `${label}: fallback`).toBe(true);
          }
          if (c.hasMaps && textured) expect(m.map, `${label}: map`).not.toBeNull();
          // The lights tint at both blends never touches emissive.
          if (c.tint && textured) {
            for (const [, b] of BLENDS) {
              c.tint(m, b);
              expectNoGlow(m, `${label} after tint at blend ${b}`);
            }
          }
          m.dispose();
        });
      }
    }
  }
});

describe('Clod and Pit values in both lights modes (24.2, 24.3)', () => {
  for (const [mode, blend] of BLENDS) {
    it(`Clod is flat shaded, ${CLOD_COLOR}, roughness 1 (${mode})`, () => {
      lightsBlendRef.current = blend;
      const m = createClodMaterial();
      expect(m).toBeInstanceOf(MeshStandardMaterial);
      expect(m.flatShading).toBe(true);
      expect(`#${m.color.getHexString()}`).toBe('#3b2c1f');
      expect(m.roughness).toBe(1);
      expect(m.map).toBeNull();
      expectNoGlow(m, `Clod ${mode}`);
    });

    it(`Pit is ${PIT_COLOR} with black emissive (${mode})`, () => {
      lightsBlendRef.current = blend;
      const m = createPitMaterial();
      expect(m).toBeInstanceOf(MeshStandardMaterial);
      expect(`#${m.color.getHexString()}`).toBe('#040302');
      expect(m.roughness).toBe(1);
      expectNoGlow(m, `Pit ${mode}`);
    });
  }
});

function Tinted({ m, off }: { m: MeshStandardMaterial; off: Color }) {
  useSoilTint(m, { off });
  return null;
}

describe('useSoilTint follows the lights blend and never sets emissive (24.1, 24.4)', () => {
  const tinted: ReadonlyArray<[string, () => MeshStandardMaterial, Color]> = [
    ['Closed_Mound', () => createClosedMoundMaterial(stubMaps(), 0), SOIL_TINT_CLOSED_OFF],
    ['Torn_Mound heap', () => createTornHeapMaterial(stubMaps(), 0), SOIL_TINT_TORN_OFF],
    ['Grass_Card', () => createGrassCardMaterial(buildGrassTexture(1), 0), GRASS_TINT_OFF],
  ];
  it.each(tinted)('%s', (name, build, off) => {
    const m = build();
    render(<Tinted m={m} off={off} />);
    for (const [mode, blend] of BLENDS) {
      lightsBlendRef.current = blend;
      runFrames();
      const expected = new Color().lerpColors(off, new Color(1, 1, 1), blend);
      expect(m.color.equals(expected), `${name} ${mode}: colour`).toBe(true);
      expectNoGlow(m, `${name} ${mode}`);
    }
    m.dispose();
  });
});

const STATUSES = ['zombie', 'endangered', 'healthy', 'insufficient_data'] as const;

function makeFirms(n: number): FirmIndexEntry[] {
  return Array.from({ length: n }, (_, i) => ({
    cik: String(1000 + i).padStart(10, '0'),
    sector: `Sector ${i % 3}`,
    status: STATUSES[i % STATUSES.length]!,
    total_debt_usd: 1e6 * (i + 1),
  })) as unknown as FirmIndexEntry[];
}

describe('Mounds tint guard (task 3.10 follow-up)', () => {
  it('keeps the Closed_Mound fallback colour when the soil textures fail', () => {
    const firms = makeFirms(40);
    h.firms = firms;
    h.textures = 'fail';
    render(<Mounds layout={computeLayout(firms)} />);
    const m = h.closed.at(-1);
    expect(m).toBeDefined();
    expect(m!.map).toBeNull();
    for (const [mode, blend] of BLENDS) {
      lightsBlendRef.current = blend;
      runFrames();
      expect(m!.color.equals(new Color(SOIL_FALLBACK_COLOR)), `${mode}: fallback colour`).toBe(
        true,
      );
      expectNoGlow(m!, `Closed_Mound fallback ${mode}`);
    }
  });

  it('tints the textured Closed_Mound with the lights blend', () => {
    const firms = makeFirms(40);
    h.firms = firms;
    h.textures = 'ok';
    render(<Mounds layout={computeLayout(firms)} />);
    const m = h.closed.at(-1);
    expect(m).toBeDefined();
    expect(m!.map).not.toBeNull();
    for (const [mode, blend] of BLENDS) {
      lightsBlendRef.current = blend;
      runFrames();
      const expected = new Color().lerpColors(SOIL_TINT_CLOSED_OFF, new Color(1, 1, 1), blend);
      expect(m!.color.equals(expected), `${mode}: tint`).toBe(true);
      expectNoGlow(m!, `Closed_Mound textured ${mode}`);
    }
  });
});

const dir = dirname(fileURLToPath(import.meta.url));
const GUARDED_FILES = ['TornMounds.tsx', 'Grass.tsx', 'Mounds.tsx', 'Ground.tsx', 'soil.tsx'];

/** Source without block and line comments. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

describe('the two known causes of the orange blobs stay removed (24.4)', () => {
  it.each(GUARDED_FILES)('%s sets no emissiveMap and has no glow option', (file) => {
    const code = stripComments(readFileSync(join(dir, file), 'utf8'));
    // Clearing the map (`emissiveMap = null`, soil.tsx blackEmissive) is the only allowed use.
    const emissiveMapUses = code.replace(/\bemissiveMap\s*=\s*null\b/g, '').match(/emissiveMap/g);
    expect(emissiveMapUses, `${file}: emissiveMap`).toBeNull();
    expect(code.match(/\bglow\b/g), `${file}: glow option`).toBeNull();
  });
});
