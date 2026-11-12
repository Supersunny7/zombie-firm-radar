import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Document } from '@gltf-transform/core';
import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';
import { CrackedHeadstoneImpossible, isCracked, readModel, writeModel } from '../make-cracked-headstone.mjs';
import { EditTargetMissing, SplitImpossible, DecimateUnreachable } from './edits/errors.mjs';
import { makeDerivedHook, makeGeneratedHook, makeGenerators } from './generators.mjs';
import { describeFailure, runFetch } from './run-fetch.mjs';
import { makeEnv, makePick } from './test-helpers/fakes.mjs';

const temps = [];
const tmp = async () => {
  const d = await mkdtemp(path.join(os.tmpdir(), 'gen-hooks-'));
  temps.push(d);
  return d;
};
afterEach(async () => {
  await Promise.all(temps.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

const decalPick = (decal, variants = 3) =>
  makePick(`own-${decal}-decal`, 'texture', {
    source: { type: 'generated', generator: 'decals', decal, variants },
    credits: { author: 'Zombie Firm Radar team', license: 'Own work' },
  });

/** Small textured quad grid (UVs optional), no normal map. */
function tinyStone({ uvs = true } = {}) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const n = 4;
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      pos.push(i / n - 0.5, (j / n) * 1.5, 0);
      uv.push(i / n, 1 - j / n);
    }
  }
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  }
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(idx)).setBuffer(buffer));
  if (uvs) prim.setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(new Float32Array(uv)).setBuffer(buffer));
  prim.setMaterial(doc.createMaterial('stone'));
  const mesh = doc.createMesh('stone').addPrimitive(prim);
  doc.getRoot().setDefaultScene(doc.createScene().addChild(doc.createNode('stone').setMesh(mesh)));
  return doc;
}

describe('generated hook (decals)', () => {
  it('writes 3 WebP variants with alpha, longest side 512, and cleans its scratch folder', async () => {
    const dir = await tmp();
    const outDir = path.join(dir, 'work', 'out');
    await mkdir(outDir, { recursive: true });
    const pick = decalPick('handprint');
    const result = await makeGeneratedHook()(pick, { outDir, roots: {}, picksById: new Map() });
    expect(result.files.map((f) => f.fileName).sort()).toEqual([
      'own-handprint-decal_handprint-0.webp',
      'own-handprint-decal_handprint-1.webp',
      'own-handprint-decal_handprint-2.webp',
    ]);
    for (const f of result.files) {
      const meta = await sharp(await readFile(f.path)).metadata();
      expect(meta.format).toBe('webp');
      expect(meta.hasAlpha).toBe(true);
      expect(Math.max(meta.width, meta.height)).toBe(512);
    }
    await expect(readdir(path.join(dir, 'work', 'gen')).catch((e) => e.code)).resolves.toBe('ENOENT');
  });

  it('rejects fewer than 3 variants and unknown decals', async () => {
    const ctx = { outDir: path.join(await tmp(), 'work', 'out') };
    await expect(makeGeneratedHook()(decalPick('handprint', 2), ctx)).rejects.toThrow(/at least 3 variants/);
    const bad = decalPick('handprint');
    bad.source.decal = 'footprint';
    await expect(makeGeneratedHook()(bad, ctx)).rejects.toThrow(/unknown/);
  });
});

describe('derived hook (cracked headstone)', () => {
  const derivedPick = (extra = {}) =>
    makePick('own-headstone-cracked', 'model', {
      source: { type: 'derived', script: 'cracked-headstone', from: 'intact', seed: 7 },
      credits: { author: 'Peter Tilley (drydoctoregg)', license: 'CC BY 4.0', changes: 'Derived by our script' },
      ...extra,
    });

  async function setup(doc) {
    const dir = await tmp();
    const sourceDir = path.join(dir, 'assets', 'models', 'intact');
    const outDir = path.join(dir, 'work', 'out');
    await mkdir(outDir, { recursive: true });
    await writeModel(doc, path.join(sourceDir, 'intact.glb'));
    const intact = makePick('intact', 'model', { manual: true, expectedFile: 'intact.zip' });
    return { ctx: { outDir, sourceDir, picksById: new Map([['intact', intact]]) }, outDir };
  }

  it('cracks the converted intact scan and converts it with the derived pick', async () => {
    const { ctx, outDir } = await setup(tinyStone());
    const result = await makeDerivedHook()(derivedPick(), ctx);
    expect(result.files[0].fileName).toBe('own-headstone-cracked.glb');
    const doc = await readModel(path.join(outDir, 'own-headstone-cracked.glb'));
    expect(isCracked(doc)).toBe(true);
    expect(doc.getRoot().getExtras().crackedHeadstone.seed).toBe(7);
  }, 60_000);

  it('fails with the fallback message when the scan has no UVs', async () => {
    const { ctx } = await setup(tinyStone({ uvs: false }));
    const err = await makeDerivedHook()(derivedPick(), ctx).catch((e) => e);
    expect(err.message).toMatch(/no UVs/);
    expect(err.message).toMatch(/Procedural headstones stay as the fallback/);
  });

  it('names the expected intact file when the scan output is missing', async () => {
    const dir = await tmp();
    const intact = makePick('intact', 'model', { expectedFile: 'intact.zip' });
    const err = await makeDerivedHook()(derivedPick(), {
      outDir: path.join(dir, 'work', 'out'),
      sourceDir: path.join(dir, 'nothing'),
      picksById: new Map([['intact', intact]]),
    }).catch((e) => e);
    expect(err.message).toContain('intact.zip');
  });

  it('passes the pick edits to the model conversion', async () => {
    const seen = [];
    const hook = makeDerivedHook({
      read: async () => ({}),
      crack: async () => {},
      write: async (_doc, out) => writeFile(out, 'x'),
      model: async (pick, input, out, opts) => {
        seen.push({ edits: pick.edits, seed: opts.seed });
        await writeFile(path.join(out, `${pick.id}.glb`), 'glb');
        return { files: [{ fileName: `${pick.id}.glb`, path: path.join(out, `${pick.id}.glb`), bytes: 3 }] };
      },
    });
    const { ctx } = await setup(tinyStone());
    const edits = [{ op: 'decimate', triangles: 100 }];
    await hook(derivedPick({ edits }), ctx);
    expect(seen).toEqual([{ edits, seed: 7 }]);
  });

  it('exports CrackedHeadstoneImpossible as the cause type', () => {
    expect(new CrackedHeadstoneImpossible('x')).toBeInstanceOf(Error);
  });
});

describe('runFetch with the generator hooks', () => {
  it('runs a derived pick after its source, sets group and credits from the pick, and keeps going after SplitImpossible', async () => {
    const { env, roots } = await makeEnv();
    const split = new SplitImpossible({ pick: 'bad-model', mesh: 'm', reason: 'one component' });
    const origModel = env.convert.model;
    env.convert.model = async (pick, input, out) => {
      if (pick.id === 'bad-model') throw split;
      return origModel(pick, input, out);
    };
    env.generators = makeGenerators({
      derived: {
        read: async () => ({}),
        crack: async () => {},
        write: async (_doc, out) => writeFile(out, 'stone'),
        model: env.convert.model,
      },
      generated: { texture: env.convert.texture, encode: async () => Buffer.from('png') },
    });
    const intact = makePick('intact', 'model');
    const derived = makePick('own-headstone-cracked', 'model', {
      source: { type: 'derived', script: 'cracked-headstone', from: 'intact', seed: 1 },
      credits: { author: 'Peter Tilley (drydoctoregg)', license: 'CC BY 4.0', changes: 'Derived by our script' },
    });
    const bad = makePick('bad-model', 'model');
    const decal = decalPick('drag-mark');
    const r = await runFetch({ picks: [intact, derived, bad, decal], env });

    expect(r.failed).toHaveLength(1);
    expect(r.failed[0].name).toBe('bad-model');
    expect(r.failed[0].cause).toMatch(/^SplitImpossible: /);
    expect(r.failed[0].cause).toMatch(/ask the user/i);
    expect(r.exitCode).toBe(1);
    expect(r.written).toContain('models/own-headstone-cracked/own-headstone-cracked.glb');
    expect(r.written.filter((w) => w.startsWith('textures/own-drag-mark-decal/'))).toHaveLength(3);

    const manifest = JSON.parse(await readFile(path.join(roots.assetRoot, 'manifest.json'), 'utf8'));
    expect(manifest.files['models/own-headstone-cracked/own-headstone-cracked.glb'].group).toBe('graveyard');
    const credits = await readFile(roots.creditsFile, 'utf8');
    expect(credits).toContain('Peter Tilley (drydoctoregg)');
    expect(credits).toContain('Derived by our script');
    expect(credits).toContain('Own work');
  });

  it('fails only the derived pick when its source pick failed', async () => {
    const { env } = await makeEnv({ converters: { failIds: ['intact'] } });
    env.generators = makeGenerators();
    const intact = makePick('intact', 'model', { expectedFile: 'intact.zip' });
    const derived = makePick('own-headstone-cracked', 'model', {
      source: { type: 'derived', script: 'cracked-headstone', from: 'intact', seed: 1 },
    });
    const r = await runFetch({ picks: [intact, derived], env });
    expect(r.failed.map((f) => f.name)).toEqual(['intact', 'own-headstone-cracked']);
    expect(r.failed[1].cause).toContain('has no output');
    expect(r.failed[1].cause).toContain('intact.zip');
  });
});

describe('describeFailure', () => {
  it('labels edit errors and tells the agent to ask the user', () => {
    const split = describeFailure(new SplitImpossible({ pick: 'p', mesh: 'm', reason: 'r' }));
    expect(split).toMatch(/^SplitImpossible: /);
    expect(split).toMatch(/ask the user/i);
    const missing = describeFailure(new EditTargetMissing({ pick: 'p', op: 'removeNode', target: 'Foo' }));
    expect(missing).toMatch(/^EditTargetMissing: .*"Foo"/);
    expect(missing).toMatch(/ask the user/i);
    const decimate = describeFailure(new DecimateUnreachable({ pick: 'p', target: 10, reached: 20 }));
    expect(decimate.match(/ask the user/gi)).toHaveLength(1);
  });

  it('leaves other errors unchanged', () => {
    expect(describeFailure(new Error('boom'))).toBe('boom');
  });
});
