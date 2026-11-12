// Generator hooks for runFetch (task 21.2): env.generators.generated and env.generators.derived.
//   generated: tools/gen-decals.mjs -> PNG variants -> convert-texture (WebP with alpha, limit per pick)
//   derived:   tools/make-cracked-headstone.mjs on the converted intact scan -> convert-model (pick edits, Meshopt)
// All collaborators are injectable so tests run with tiny in-memory documents and temp dirs.
// Credits, group and manifest data come from the pick (run-fetch does that); nothing here invents them.
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DECAL_TYPES, encodePng, generateDecal } from '../gen-decals.mjs';
import {
  CrackedHeadstoneImpossible,
  DEFAULT_SEED,
  makeCrackedHeadstone,
  readModel,
  writeModel,
} from '../make-cracked-headstone.mjs';
import { convertModel } from './convert-model.mjs';
import { convertTexture } from './convert-texture.mjs';

export const MIN_DECAL_VARIANTS = 3;
export const FALLBACK_NOTE = 'Procedural headstones stay as the fallback.';

/** Sibling scratch folder of the pick's out dir (inside tools/cache/work/<id>-<pid>). */
const scratchDir = (ctx, name) => path.join(path.dirname(ctx.outDir), name);

/** Hook for `source.type === 'generated'`. Returns { files, warnings }. */
export function makeGeneratedHook({
  generate = generateDecal,
  encode = encodePng,
  texture = convertTexture,
} = {}) {
  return async function generated(pick, ctx) {
    const src = pick.source;
    if (src.generator !== 'decals') {
      throw new Error(`generator ${JSON.stringify(src.generator)} is unknown (only "decals" exists)`);
    }
    if (!DECAL_TYPES.includes(src.decal)) {
      throw new Error(`decal ${JSON.stringify(src.decal)} is unknown; expected one of ${DECAL_TYPES.join(', ')}`);
    }
    const variants = src.variants ?? MIN_DECAL_VARIANTS;
    if (!Number.isInteger(variants) || variants < MIN_DECAL_VARIANTS) {
      throw new Error(`decal ${src.decal}: at least ${MIN_DECAL_VARIANTS} variants are required, got ${variants}`);
    }
    const scratch = scratchDir(ctx, 'gen');
    await mkdir(scratch, { recursive: true });
    try {
      const inputs = [];
      for (let v = 0; v < variants; v += 1) {
        const { rgba, width, height } = generate({ type: src.decal, variant: v });
        const file = path.join(scratch, `${src.decal}-${v}.png`);
        await writeFile(file, await encode(rgba, width, height));
        inputs.push({ map: `${src.decal}-${v}`, path: file });
      }
      // convertTexture keeps alpha and applies the longest-side limit of the pick.
      return await texture(pick, inputs, ctx.outDir);
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  };
}

async function findIntactGlb(dir, from) {
  let names;
  try {
    names = await readdir(dir);
  } catch {
    return null;
  }
  const glbs = names.filter((n) => /\.glb$/i.test(n)).sort();
  const exact = glbs.find((n) => n === `${from}.glb`);
  const hit = exact ?? glbs[0];
  return hit ? path.join(dir, hit) : null;
}

/** Hook for `source.type === 'derived'`. Returns convertModel's result. */
export function makeDerivedHook({
  read = readModel,
  write = writeModel,
  crack = makeCrackedHeadstone,
  model = convertModel,
} = {}) {
  return async function derived(pick, ctx) {
    const src = pick.source;
    if (src.script !== 'cracked-headstone') {
      throw new Error(`derivation script ${JSON.stringify(src.script)} is unknown (only "cracked-headstone" exists)`);
    }
    const seed = src.seed ?? DEFAULT_SEED;
    const intact = ctx.picksById?.get(src.from);
    const scan = ctx.sourceDir ? await findIntactGlb(ctx.sourceDir, src.from) : null;
    if (!scan) {
      const expected = intact?.expectedFile ? ` (expected manual file: ${intact.expectedFile})` : '';
      throw new Error(`intact scan ${src.from} has no converted model to derive from${expected}. ${FALLBACK_NOTE}`);
    }
    const scratch = scratchDir(ctx, 'derive');
    await mkdir(scratch, { recursive: true });
    try {
      const doc = await read(scan);
      try {
        await crack(doc, { seed });
      } catch (err) {
        if (err instanceof CrackedHeadstoneImpossible) {
          throw new Error(`${err.message}. ${FALLBACK_NOTE}`);
        }
        throw err;
      }
      const cracked = path.join(scratch, `${pick.id}.glb`);
      await write(doc, cracked);
      // Normal model conversion: the derived pick's own edits, WebP textures, Meshopt.
      return await model(pick, { path: cracked }, ctx.outDir, { seed });
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  };
}

/** Production hooks object for env.generators. */
export function makeGenerators(overrides = {}) {
  return { generated: makeGeneratedHook(overrides.generated), derived: makeDerivedHook(overrides.derived) };
}
