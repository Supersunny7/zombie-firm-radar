// Orchestrator: runFetch(opts). All side effects come in through `env`, so tests pass temp roots
// and fake converters. Production wiring lives in tools/fetch-assets.mjs.
//
// Per pick: validate, license check, gather source (download, manual cache, generator or
// derivation), convert into <cache>/work/<id>-<pid>/out, atomic rename into
// <assets>/<kindFolder>/<id>/, then (once, after all picks) budgets, manifest, credits, manual README.
import { createHash } from 'node:crypto';
import { cp, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { extractZip } from './archive.mjs';
import { account } from './budgets.mjs';
import { ensureDownloaded, isCached, readManual, readRecord, sha256File } from './cache.mjs';
import { writeCredits } from './credits.mjs';
import { stageFbxTextures } from './fbx-textures.mjs';
import { checkLicense } from './licenses.mjs';
import { render as renderManualReadme } from './manual-readme.mjs';
import { findStaleKeys, mergeManifestWithReport, parseManifest, writeManifest, MANIFEST_FILE } from './manifest.mjs';
import { KIND_FOLDERS, planOutputs, safeJoin } from './paths.mjs';
import { validatePick } from './picks.mjs';
import { exitCodeFor } from './report.mjs';

/**
 * Env = {
 *   roots: { repoRoot, assetRoot, cacheRoot, creditsFile },
 *   download(pick, dir) -> DownloadRecord { sourceUrls, files: [{file, bytes, sha256, md5?, map?}], apiResponse? },
 *   convert: {
 *     texture(pick, inputs:[{map,path}], outDir) -> { files, warnings },
 *     hdri(pick, pathOrBytes) -> { ok, produced|error },
 *     model(pick, { path, licensePath? }, outDir) -> { files, warnings, bip01 },
 *     audio({ input, outDir, name }) -> { files:[{path,bytes}], warnings },
 *   },
 *   generators?: {   // hooks for task 21.2
 *     generated(pick, ctx) -> ProducedFiles | { files, warnings },
 *     derived(pick, ctx)   -> ProducedFiles | { files, warnings },
 *   },
 *   recipeVersions?: Record<string, string>,   // converter name -> version/settings string
 *   pid?: number | string,
 * }
 */

const sha256Text = (text) => createHash('sha256').update(text).digest('hex');
const hashFiles = (hashes) => sha256Text([...hashes].sort().join('\n'));
const toPosix = (p) => p.split(path.sep).join('/');
const ordinal = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// ------------------------------------------------------------------ path guard

function isInside(root, target) {
  const rel = path.relative(path.resolve(root), path.resolve(target));
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/**
 * Only web/public/assets, tools/cache, CREDITS.md and tools/cache/manual/README.md may be written.
 * Inside tools/cache/manual only README.md is allowed (the user's manual files are never touched).
 */
export function assertWritable(target, roots) {
  const resolved = path.resolve(target);
  const manualRoot = path.join(roots.cacheRoot, 'manual');
  if (isInside(manualRoot, resolved)) {
    if (resolved === path.resolve(manualRoot, 'README.md')) return resolved;
    throw new Error(`path guard: ${target} is inside the manual cache`);
  }
  if (resolved === path.resolve(roots.creditsFile)) return resolved;
  if (isInside(roots.assetRoot, resolved) || isInside(roots.cacheRoot, resolved)) return resolved;
  throw new Error(`path guard: refusing to write outside the allowed roots: ${target}`);
}

async function writeFileAtomic(file, data, roots) {
  assertWritable(file, roots);
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    await writeFile(tmp, data);
    await rename(tmp, file);
  } catch (err) {
    await rm(tmp, { force: true });
    throw err;
  }
}

// ------------------------------------------------------------------ small helpers

/** Texture map name: lower case, `_` and other characters become `-` (convertTexture pattern). */
export function mapName(raw) {
  const s = String(raw).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  return s === '' ? 'color' : s;
}

const IMAGE_EXT = /\.(png|jpe?g)$/i;
const MODEL_EXT = /\.(gltf|glb|fbx)$/i;

/** Merge adapters: every converter result becomes [{ fileName, path, bytes, title? }]. */
export function normaliseProduced(kind, result, outDir) {
  if (kind === 'hdri') {
    throw new Error('normaliseProduced: hdri results are written by the orchestrator');
  }
  const files = result?.files;
  if (!Array.isArray(files) || files.length === 0) throw new Error(`${kind}: converter produced no files`);
  return files.map((f) => {
    const p = f.path ?? path.join(outDir, f.fileName);
    const out = { fileName: f.fileName ?? path.basename(p), path: p, bytes: f.bytes };
    if (f.title) out.title = f.title;
    return out;
  });
}

async function listFilesRecursive(root, rel = '') {
  const out = [];
  let entries;
  try {
    entries = await readdir(path.join(root, rel), { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return out;
    throw err;
  }
  for (const e of entries) {
    const r = rel === '' ? e.name : `${rel}/${e.name}`;
    if (e.isDirectory()) out.push(...(await listFilesRecursive(root, r)));
    else out.push(r);
  }
  return out;
}

// ------------------------------------------------------------------ source gathering

/**
 * Returns { ok:true, files:[{name,path,sha256,map?}], hash, entry? } or
 * { ok:false, missing } / { ok:false, defer:true } for generated and derived picks.
 */
async function gatherSource(pick, ctx, { dryRun }) {
  const { env } = ctx;
  const type = pick.source.type;
  if (type === 'polyhaven' || type === 'url') {
    const dir = safeJoin(path.join(env.roots.cacheRoot, 'downloads'), pick.id);
    if (dryRun) {
      const rec = await readRecord(dir);
      if (!rec || !(await isCached(dir, rec))) return { ok: true, dryUncached: true, files: [], hash: null };
      return fromRecord(dir, rec);
    }
    const { dir: d, record } = await ensureDownloaded(pick, env.download, {
      downloadsRoot: path.join(env.roots.cacheRoot, 'downloads'),
    });
    return fromRecord(d, record);
  }
  if (type === 'manual') {
    const r = await readManual(pick, { manualRoot: path.join(env.roots.cacheRoot, 'manual') });
    if (!r.ok) return { ok: false, missing: r };
    const sha = await sha256File(r.file);
    return {
      ok: true,
      files: [{ name: path.basename(r.file), path: r.file, sha256: sha }],
      hash: hashFiles([sha]),
      entry: r.entry ?? null,
    };
  }
  return { ok: false, defer: true };
}

function fromRecord(dir, record) {
  const files = record.files.map((f) => ({
    name: f.file,
    path: safeJoin(dir, ...f.file.split('/')),
    sha256: String(f.sha256).toLowerCase(),
    ...(f.map ? { map: f.map } : {}),
  }));
  return { ok: true, files, hash: hashFiles(files.map((f) => f.sha256)) };
}

function recipeHash(pick, env) {
  return sha256Text(
    JSON.stringify({
      kind: pick.kind,
      role: pick.role ?? null,
      edits: pick.edits ?? [],
      source: pick.source.type === 'generated' || pick.source.type === 'derived' ? pick.source : pick.source.entry ?? null,
      versions: env.recipeVersions ?? {},
    }),
  );
}

// ------------------------------------------------------------------ conversion

async function resolveModelInput(pick, source, work) {
  let files = source.files;
  let modelPath;
  const zip = files.find((f) => /\.zip$/i.test(f.name));
  if (zip) {
    const dir = path.join(work, 'extract');
    const written = await extractZip(zip.path, dir);
    const rels = written.map((p) => toPosix(path.relative(dir, p)));
    const wanted = source.entry ?? pick.source.entry;
    const rel = wanted ? rels.find((r) => r === wanted || r.endsWith(`/${wanted}`)) : rels.find((r) => MODEL_EXT.test(r));
    if (!rel) throw new Error(`no model file${wanted ? ` "${wanted}"` : ''} found in ${zip.name}`);
    modelPath = path.join(dir, ...rel.split('/'));
    return { path: modelPath };
  }
  const model = files.find((f) => MODEL_EXT.test(f.name) && !f.name.includes('/')) ?? files.find((f) => MODEL_EXT.test(f.name));
  if (!model) throw new Error('no .gltf, .glb or .fbx among the source files');
  const licenseFile = files.find((f) => f.name === 'LICENSE');
  const input = {};
  if (licenseFile) input.licensePath = licenseFile.path;

  // Rocketbox: textures sit in Textures/*.tga. FBX2glTF cannot load TGA (it writes 1x1 placeholders),
  // so stage PNG copies of the referenced TGAs plus a same-length patched FBX that points at them.
  const textures = files.filter((f) => /^Textures\//i.test(f.name));
  if (/\.fbx$/i.test(model.name) && textures.length > 0) {
    const staged = await stageFbxTextures({
      avatarId: pick.id,
      fbxPath: model.path,
      textureFiles: textures,
      stageDir: path.join(work, 'src'),
    });
    input.path = staged.fbxPath;
  } else {
    input.path = model.path;
  }
  return input;
}

async function convertPick(pick, source, ctx, work, out) {
  const { env } = ctx;
  await mkdir(out, { recursive: true });
  switch (pick.kind) {
    case 'texture': {
      const images = source.files.filter((f) => IMAGE_EXT.test(f.name));
      if (images.length === 0) throw new Error('no PNG or JPG among the source files');
      const inputs = images.map((f, i) => ({
        map: mapName(f.map ?? (images.length === 1 ? 'color' : `map${i + 1}`)),
        path: f.path,
      }));
      return normaliseProduced('texture', await env.convert.texture(pick, inputs, out), out);
    }
    case 'hdri': {
      const file = source.files.find((f) => /\.hdr$/i.test(f.name));
      if (!file) throw new Error('no .hdr among the source files');
      const r = await env.convert.hdri(pick, file.path);
      if (!r?.ok) throw new Error(`${r?.error?.code ?? 'HdriFailed'}: ${r?.error?.message ?? 'conversion failed'}`);
      const produced = [];
      for (const p of r.produced) {
        const dest = safeJoin(out, p.fileName);
        await writeFile(dest, p.bytes);
        produced.push({ fileName: p.fileName, path: dest, bytes: p.bytes.length });
      }
      return produced;
    }
    case 'model':
    case 'avatar':
    case 'animation': {
      const input = await resolveModelInput(pick, { ...source, entry: source.entry }, work);
      return normaliseProduced(pick.kind, await env.convert.model(pick, input, out), out);
    }
    case 'audio': {
      let input = source.files[0]?.path;
      if (source.files[0] && /\.zip$/i.test(source.files[0].name)) {
        const dir = path.join(work, 'extract');
        const written = await extractZip(source.files[0].path, dir);
        const wanted = source.entry ?? pick.source.entry;
        const hit = wanted ? written.find((p) => toPosix(p).endsWith(`/${wanted}`) || path.basename(p) === wanted) : written[0];
        if (!hit) throw new Error('audio entry not found in archive');
        input = hit;
      }
      if (!input) throw new Error('no source audio file');
      return normaliseProduced('audio', await env.convert.audio({ input, outDir: out, name: pick.id }), out);
    }
    default:
      throw new Error(`unsupported kind ${pick.kind}`);
  }
}

async function runGenerator(pick, ctx, out, hashes) {
  const gen = ctx.env.generators?.[pick.source.type];
  if (typeof gen !== 'function') {
    throw new Error(`${pick.source.type} generator not wired yet (task 21.2)`);
  }
  await mkdir(out, { recursive: true });
  const result = await gen(pick, {
    outDir: out,
    roots: ctx.env.roots,
    pick,
    picksById: ctx.byId,
    sourceDir: pick.source.type === 'derived' ? sourceOutputDir(ctx, pick.source.from) : null,
    sourceInputsHash: pick.source.type === 'derived' ? hashes.get(pick.source.from) ?? null : null,
  });
  const list = Array.isArray(result) ? result : result?.files;
  if (!Array.isArray(list) || list.length === 0) throw new Error('generator produced no files');
  return list.map((f) => ({
    fileName: f.fileName ?? path.basename(f.path),
    path: f.path ?? path.join(out, f.fileName),
    bytes: f.bytes,
    ...(f.title ? { title: f.title } : {}),
  }));
}

function sourceOutputDir(ctx, id) {
  const p = ctx.byId.get(id);
  return p ? path.join(ctx.env.roots.assetRoot, KIND_FOLDERS[p.kind], p.id) : null;
}

// ------------------------------------------------------------------ publish

async function publish(outDir, destDir, roots) {
  assertWritable(destDir, roots);
  await mkdir(path.dirname(destDir), { recursive: true });
  const old = `${destDir}.old-${process.pid}`;
  let hadOld = false;
  try {
    await rename(destDir, old);
    hadOld = true;
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  try {
    try {
      await rename(outDir, destDir);
    } catch (err) {
      if (err.code !== 'EXDEV') throw err;
      await cp(outDir, destDir, { recursive: true });
    }
  } catch (err) {
    if (hadOld) await rename(old, destDir).catch(() => {});
    throw err;
  }
  if (hadOld) await rm(old, { recursive: true, force: true });
}

// ------------------------------------------------------------------ skip logic

async function canSkip(prev, pick, inputsHash, recipe, assetRoot) {
  const entries = Object.entries(prev.files).filter(([, e]) => e.pick === pick.id);
  if (entries.length === 0) return null;
  for (const [key, e] of entries) {
    if (e.inputsSha256 !== inputsHash || e.recipe !== recipe) return null;
    try {
      const full = safeJoin(assetRoot, ...key.split('/'));
      if ((await sha256File(full)) !== e.sha256) return null;
    } catch {
      return null;
    }
  }
  return entries.map(([key, e]) => ({ key, bytes: e.bytes, sha256: e.sha256 }));
}

/** Licence text copied beside an asset is never edited, so it does not inherit the asset's "changes". */
export const LICENSE_CHANGES = 'Copied unchanged from the Rocketbox repository (MIT license text).';
export const isLicenseFile = (relPath) => path.posix.basename(String(relPath).replace(/\\/g, '/')) === 'LICENSE';

async function entriesFor(pick, files, assetRoot, inputsHash, recipe) {
  const entries = [];
  for (const f of files) {
    const full = safeJoin(assetRoot, ...f.relPath.split('/'));
    const st = await stat(full);
    entries.push({
      relPath: f.relPath,
      pick: pick.id,
      title: f.title ?? pick.credits.title,
      author: pick.credits.author,
      sourceUrl: pick.credits.sourceUrl,
      license: pick.credits.license,
      changes: isLicenseFile(f.relPath) ? LICENSE_CHANGES : pick.credits.changes,
      ...(pick.sizeException ? { sizeException: pick.sizeException } : {}),
      group: pick.group ?? null,
      bytes: st.size,
      sha256: await sha256File(full),
      inputsSha256: inputsHash,
      recipe,
    });
  }
  return entries;
}

// ------------------------------------------------------------------ failure text

const EDIT_ERRORS = new Set(['SplitImpossible', 'DecimateUnreachable', 'EditTargetMissing']);

/**
 * Failure text per pick. Edit errors that cannot be solved without a 3D editor are labelled with their
 * type and tell the agent to ask the user (Blender is never run automatically). Other picks continue.
 */
export function describeFailure(err) {
  const message = err?.message ?? String(err);
  if (!EDIT_ERRORS.has(err?.name)) return message;
  const ask = /ask the user/i.test(message) ? '' : ' Ask the user how to proceed; Blender is not run automatically.';
  return `${err.name}: ${message}${ask}`;
}

// ------------------------------------------------------------------ main

/**
 * @param {{ picks: object[], env: object, only?: string[]|null, dryRun?: boolean }} opts
 * @returns {Promise<{exitCode:0|1, written:string[], skipped:string[], refused:{name,reason}[],
 *   failed:{name,cause}[], missing:object[], warnings:string[], plan:object[], budgets:object|null}>}
 */
export async function runFetch({ picks, env, only = null, dryRun = false }) {
  const { roots } = env;
  const result = { exitCode: 0, written: [], skipped: [], refused: [], failed: [], missing: [], warnings: [], plan: [], budgets: null };
  const byId = new Map(picks.map((p) => [p.id, p]));
  const ctx = { env, byId };
  const pid = env.pid ?? process.pid;

  let selected = picks;
  if (only && only.length > 0) {
    const wanted = new Set(only);
    for (const id of wanted) if (!byId.has(id)) result.failed.push({ name: id, cause: 'unknown pick id (--only)' });
    selected = picks.filter((p) => wanted.has(p.id));
  }

  // Manual README: regenerated from all picks, identical bytes on every run.
  if (!dryRun) {
    try {
      const readme = path.join(roots.cacheRoot, 'manual', 'README.md');
      const text = renderManualReadme(picks);
      let current = null;
      try {
        current = await readFile(readme, 'utf8');
      } catch {
        /* not there yet */
      }
      if (current !== text) await writeFileAtomic(readme, text, roots);
    } catch (err) {
      result.failed.push({ name: 'manual-readme', cause: err.message });
    }
  }

  let prevManifest = { version: 1, files: {} };
  try {
    prevManifest = parseManifest(await readFile(path.join(roots.assetRoot, MANIFEST_FILE), 'utf8'));
  } catch {
    /* none yet */
  }

  const hashes = new Map(); // pick id -> inputs hash
  for (const e of Object.values(prevManifest.files)) if (!hashes.has(e.pick)) hashes.set(e.pick, e.inputsSha256);
  const newEntries = [];
  const done = new Set(); // ids with outputs on disk after this run

  for (const pick of selected) {
    const id = pick.id;
    const work = path.join(roots.cacheRoot, 'work', `${id}-${pid}`);
    try {
      const problems = validatePick(pick);
      // Empty license, author or sourceUrl is a refusal (Requirement 18.8), not a generic invalid pick.
      const licEarly = problems.length > 0 ? checkLicense(pick) : null;
      if (licEarly && !licEarly.ok) {
        result.refused.push({ name: id, reason: licEarly.reason });
        continue;
      }
      if (problems.length > 0) {
        result.failed.push({ name: id, cause: `invalid pick: ${problems.map((p) => p.message).join('; ')}` });
        continue;
      }
      const lic = checkLicense(pick);
      if (!lic.ok) {
        result.refused.push({ name: id, reason: lic.reason });
        continue;
      }

      const src = await gatherSource(pick, ctx, { dryRun });
      if (!src.ok && src.missing) {
        result.missing.push({ name: id, ...src.missing });
        result.plan.push({ id, action: 'missing manual file' });
        continue;
      }

      const type = pick.source.type;
      let inputsHash;
      if (src.ok) {
        inputsHash = src.hash;
      } else {
        // generated or derived
        if (type === 'derived') {
          if (!done.has(pick.source.from) && !hashes.has(pick.source.from)) {
            const intact = byId.get(pick.source.from);
            const file = intact?.expectedFile ? ` (intact scan file: ${intact.expectedFile})` : '';
            result.failed.push({
              name: id,
              cause: `source pick ${pick.source.from} has no output${file}; procedural headstones stay as the fallback`,
            });
            continue;
          }
          inputsHash = sha256Text(JSON.stringify([pick.source, hashes.get(pick.source.from) ?? '']));
        } else {
          inputsHash = sha256Text(JSON.stringify(pick.source));
        }
      }
      const recipe = recipeHash(pick, env);

      if (inputsHash !== null) {
        const same = await canSkip(prevManifest, pick, inputsHash, recipe, roots.assetRoot);
        if (same) {
          hashes.set(id, inputsHash);
          done.add(id);
          result.skipped.push(id);
          result.plan.push({ id, action: 'unchanged' });
          const files = same.map((s) => ({ relPath: s.key, title: prevManifest.files[s.key].title }));
          newEntries.push(...(await entriesFor(pick, files, roots.assetRoot, inputsHash, recipe)));
          continue;
        }
      }
      if (dryRun) {
        result.plan.push({ id, action: src.dryUncached ? 'download and convert' : 'convert' });
        continue;
      }

      // Convert into the work folder, then rename into the asset root.
      const out = path.join(work, 'out');
      assertWritable(out, roots);
      await rm(work, { recursive: true, force: true });
      await mkdir(work, { recursive: true });
      const produced = src.ok ? await convertPick(pick, src, ctx, work, out) : await runGenerator(pick, ctx, out, hashes);
      const names = new Set();
      for (const f of produced) {
        if (names.has(f.fileName)) throw new Error(`duplicate output file ${f.fileName}`);
        names.add(f.fileName);
      }
      const planned = planOutputs(pick, produced);
      const lic2 = checkLicense(pick); // second check right before writing (Requirement 18.7)
      if (!lic2.ok) {
        result.refused.push({ name: id, reason: lic2.reason });
        continue;
      }
      const destDir = safeJoin(roots.assetRoot, KIND_FOLDERS[pick.kind], id);
      await publish(out, destDir, roots);
      newEntries.push(...(await entriesFor(pick, planned, roots.assetRoot, inputsHash, recipe)));
      for (const p of planned) result.written.push(p.relPath);
      hashes.set(id, inputsHash);
      done.add(id);
      result.plan.push({ id, action: 'converted' });
    } catch (err) {
      result.failed.push({ name: id, cause: describeFailure(err) });
    } finally {
      if (!dryRun) await rm(work, { recursive: true, force: true }).catch(() => {});
    }
  }

  if (!dryRun) {
    try {
      const { manifest, refused } = mergeManifestWithReport(prevManifest, newEntries);
      for (const r of refused) result.refused.push({ name: r.relPath, reason: r.problems.join(', ') });
      await writeManifest(roots.assetRoot, manifest);
      prevManifest = manifest;

      const rel = toPosix(path.relative(roots.repoRoot, roots.assetRoot));
      const rows = newEntries
        .filter((e) => manifest.files[e.relPath])
        .map((e) => ({
          path: `${rel}/${e.relPath}`,
          title: e.title,
          author: e.author,
          sourceUrl: e.sourceUrl,
          license: e.license,
          changes: e.changes,
        }));
      const processed = selected.filter((p) => done.has(p.id));
      const credits = await writeCredits({
        rows,
        usesCmu: processed.some((p) => checkLicense(p).canonical === 'CMU Graphics Lab motion capture'),
        usesPolyHaven: processed.some((p) => p.source.type === 'polyhaven'),
        file: roots.creditsFile,
        root: roots.repoRoot,
      });
      result.warnings.push(...credits.warnings);
    } catch (err) {
      result.failed.push({ name: 'manifest-or-credits', cause: err.message });
    }
  }

  // Budget accounting over everything on disk (read-only).
  const files = [];
  const groups = {};
  for (const [k, e] of Object.entries(prevManifest.files)) if (e.group) groups[k] = e.group;
  const onDisk = await listFilesRecursive(roots.assetRoot);
  for (const rel of onDisk.filter((r) => !/\.(tmp|part)$/.test(r) && !/\.old-/.test(r)).sort(ordinal)) {
    try {
      const bytes = (await stat(path.join(roots.assetRoot, ...rel.split('/')))).size;
      const se = prevManifest.files[rel]?.sizeException;
      files.push({ path: rel, bytes, ...(se ? { sizeException: se } : {}) });
    } catch (err) {
      files.push({ path: rel, error: err.message });
    }
  }
  result.budgets = account(files, groups);
  for (const k of findStaleKeys(prevManifest, onDisk)) result.warnings.push(`manifest key without file: ${k}`);

  result.exitCode = exitCodeFor(result);
  return result;
}
