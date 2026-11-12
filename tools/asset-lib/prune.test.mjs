import { mkdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyPrune, planPrune, pruneCreditsText, pruneManifest } from './prune.mjs';
import { runFetch } from './run-fetch.mjs';
import { formatRunReport } from './report.mjs';
import { makeEnv, makePick, makeRoots } from './test-helpers/fakes.mjs';

const exists = (p) => stat(p).then(() => true, () => false);
const picksAB = () => [makePick('tex-a', 'texture'), makePick('mod-b', 'model')];

async function snapshot(roots) {
  return {
    manifest: await readFile(path.join(roots.assetRoot, 'manifest.json'), 'utf8'),
    credits: await readFile(roots.creditsFile, 'utf8'),
  };
}

describe('planPrune (pure)', () => {
  const manifest = {
    files: {
      'models/gone/gone.glb': {},
      'models/gone/LICENSE': {},
      'models/kept/kept.glb': {},
      'textures/kept2/a.webp': {},
    },
  };

  it('plans only folders of ids that left picks, with their entries and rows', () => {
    const credits = ['web/public/assets/models/gone/gone.glb', 'web/public/assets/models/gone/LICENSE', 'web/public/assets/models/kept/kept.glb'];
    const plan = planPrune({ picks: [{ id: 'kept' }, { id: 'kept2' }], manifest, credits, assetRoot: '/tmp/assets' });
    expect(plan.errors).toEqual([]);
    expect(plan.folders.map((f) => f.rel)).toEqual(['models/gone']);
    expect(plan.folders[0].files).toEqual(['models/gone/LICENSE', 'models/gone/gone.glb']);
    expect(plan.manifestKeys).toEqual(['models/gone/LICENSE', 'models/gone/gone.glb']);
    expect(plan.creditRows).toEqual(['web/public/assets/models/gone/LICENSE', 'web/public/assets/models/gone/gone.glb']);
  });

  it('ignores shared files without an owner', () => {
    const plan = planPrune({ picks: [], manifest: { files: { 'manifest.json': {}, 'audio/x.ogg': {} } }, assetRoot: '/tmp/assets' });
    expect(plan.folders).toEqual([]);
  });

  it('refuses keys that escape the asset root or leave the known folders', () => {
    const plan = planPrune({
      picks: [],
      manifest: { files: { 'models/../../evil/x.glb': {}, 'cache/foo/x': {}, 'models/ok/x.glb': {} } },
      assetRoot: '/tmp/assets',
    });
    expect(plan.errors.map((e) => e.path).sort()).toEqual(['cache/foo/x', 'models/../../evil/x.glb']);
    expect(plan.folders.map((f) => f.rel)).toEqual(['models/ok']);
    expect(plan.manifestKeys).toEqual(['models/ok/x.glb']);
  });

  it('pruneManifest and pruneCreditsText drop only the listed entries and keep CRLF', () => {
    expect(Object.keys(pruneManifest({ version: 1, files: { a: 1, b: 2 } }, ['a']).files)).toEqual(['b']);
    const md = '# C\r\n\r\n## Assets\r\n\r\n| Path | Title | Author | Source URL | License | Changes we made |\r\n| --- | --- | --- | --- | --- | --- |\r\n| p/a | t | a | u | l | c |\r\n| p/b | t | a | u | l | c |\r\n\r\nend\r\n';
    expect(pruneCreditsText(md, ['p/a'])).toBe(md.replace('| p/a | t | a | u | l | c |\r\n', ''));
  });
});

describe('applyPrune and runFetch', () => {
  it('removes the folder, glb, LICENSE, manifest entries and credits rows; second run prunes nothing', async () => {
    const { env, roots } = await makeEnv();
    await runFetch({ picks: picksAB(), env });
    const bDir = path.join(roots.assetRoot, 'models', 'mod-b');
    await writeFile(path.join(bDir, 'LICENSE'), 'MIT text'); // simulate a listed licence file
    const before = JSON.parse(await readFile(path.join(roots.assetRoot, 'manifest.json'), 'utf8'));
    before.files['models/mod-b/LICENSE'] = { ...before.files['models/mod-b/mod-b.glb'] };
    await writeFile(path.join(roots.assetRoot, 'manifest.json'), JSON.stringify(before));
    const keptFile = path.join(roots.assetRoot, 'textures', 'tex-a');
    expect(await exists(keptFile)).toBe(true);

    const r = await runFetch({ picks: [picksAB()[0]], env });
    expect(r.exitCode).toBe(0);
    expect(r.pruned.folders).toEqual(['models/mod-b']);
    expect(r.pruned.files.sort()).toEqual(['models/mod-b/LICENSE', 'models/mod-b/mod-b.glb']);
    expect(await exists(bDir)).toBe(false);
    expect(await exists(keptFile)).toBe(true);
    const manifest = await readFile(path.join(roots.assetRoot, 'manifest.json'), 'utf8');
    const credits = await readFile(roots.creditsFile, 'utf8');
    expect(manifest).not.toContain('mod-b');
    expect(credits).not.toContain('mod-b');
    expect(manifest).toContain('tex-a');
    expect(credits).toContain('tex-a');
    expect(formatRunReport(r)).toContain('pruned: folder models/mod-b/');

    const snap = await snapshot(roots);
    const again = await runFetch({ picks: [picksAB()[0]], env });
    expect(again.pruned).toEqual({ folders: [], files: [], manifestKeys: [], creditRows: [] });
    expect(again.written).toEqual([]);
    expect(await snapshot(roots)).toEqual(snap);
  });

  it('--dry-run reports the plan and deletes nothing', async () => {
    const { env, roots } = await makeEnv();
    await runFetch({ picks: picksAB(), env });
    const snap = await snapshot(roots);
    const r = await runFetch({ picks: [picksAB()[0]], env, dryRun: true });
    expect(r.pruned.folders).toEqual(['models/mod-b']);
    expect(r.pruned.manifestKeys).toEqual(['models/mod-b/mod-b.glb']);
    expect(r.pruned.creditRows).toEqual(['web/public/assets/models/mod-b/mod-b.glb']);
    expect(formatRunReport(r, { dryRun: true })).toContain('would prune: folder models/mod-b/');
    expect(await exists(path.join(roots.assetRoot, 'models', 'mod-b', 'mod-b.glb'))).toBe(true);
    expect(await snapshot(roots)).toEqual(snap);
  });

  it('keeps files that are not in the manifest and the folder that holds them', async () => {
    const { env, roots } = await makeEnv();
    await runFetch({ picks: picksAB(), env });
    const stray = path.join(roots.assetRoot, 'models', 'mod-b', 'stray.txt');
    await writeFile(stray, 'mine');
    const r = await runFetch({ picks: [picksAB()[0]], env });
    expect(await exists(stray)).toBe(true);
    expect(await exists(path.join(roots.assetRoot, 'models', 'mod-b', 'mod-b.glb'))).toBe(false);
    expect(r.warnings.some((w) => w.includes('models/mod-b'))).toBe(true);
  });

  it('refuses a manifest path that escapes the asset root: error, exit 1, nothing deleted', async () => {
    const { env, roots } = await makeEnv();
    await runFetch({ picks: picksAB(), env });
    const outside = path.join(roots.repoRoot, 'outside.txt');
    await writeFile(outside, 'keep');
    const mf = path.join(roots.assetRoot, 'manifest.json');
    const m = JSON.parse(await readFile(mf, 'utf8'));
    m.files['models/../../../../outside.txt'] = { ...m.files['models/mod-b/mod-b.glb'] };
    await writeFile(mf, JSON.stringify(m));
    const r = await runFetch({ picks: picksAB(), env });
    expect(r.exitCode).toBe(1);
    expect(r.failed.some((f) => f.cause.includes('prune refused'))).toBe(true);
    expect(await exists(outside)).toBe(true);
  });

  it('applyPrune refuses a folder that is a symlink out of the asset root', async () => {
    const roots = await makeRoots();
    const outside = path.join(roots.repoRoot, 'elsewhere');
    await mkdir(outside, { recursive: true });
    await writeFile(path.join(outside, 'x.glb'), 'keep');
    await mkdir(path.join(roots.assetRoot, 'models'), { recursive: true });
    try {
      await symlink(outside, path.join(roots.assetRoot, 'models', 'gone'), 'junction');
    } catch {
      return; // no symlink permission on this machine
    }
    const plan = planPrune({ picks: [], manifest: { files: { 'models/gone/x.glb': {} } }, assetRoot: roots.assetRoot });
    const res = await applyPrune(plan, { assetRoot: roots.assetRoot });
    expect(res.errors).toHaveLength(1);
    expect(await exists(path.join(outside, 'x.glb'))).toBe(true);
    await rm(path.join(roots.assetRoot, 'models', 'gone'), { force: true, recursive: false }).catch(() => {});
  });
});
