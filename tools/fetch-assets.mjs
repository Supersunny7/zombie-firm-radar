// CLI: node tools/fetch-assets.mjs [--picks tools/picks.json] [--only a,b] [--dry-run]
// Production wiring for runFetch. Run from the repository root. Exit code 1 on any failure.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { makeDownloader } from './asset-lib/downloader.mjs';
import { makeGenerators } from './asset-lib/generators.mjs';
import { ASSET_ROOT, CACHE_ROOT, CREDITS_FILE, REPO_ROOT } from './asset-lib/paths.mjs';
import { loadPicks } from './asset-lib/picks.mjs';
import { formatRunReport } from './asset-lib/report.mjs';
import { runFetch } from './asset-lib/run-fetch.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_PICKS = path.join(here, 'picks.json');

/**
 * Part of the model recipe version. Bump when model staging or avatar material handling changes,
 * so canSkip sees a new recipe and re-converts avatars whose inputsSha256 is unchanged.
 */
export const MODEL_STAGING_MARKER = 'avatar-textures/v2';

/** Parse argv (without node and script). Throws on unknown flags. */
export function parseArgs(argv) {
  const opts = { picks: DEFAULT_PICKS, only: null, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--picks' || a === '--only') {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) throw new Error(`${a} needs a value`);
      i += 1;
      if (a === '--picks') opts.picks = path.resolve(v);
      else opts.only = v.split(',').map((s) => s.trim()).filter(Boolean);
    } else {
      throw new Error(`unknown argument ${a}`);
    }
  }
  return opts;
}

/** Real converters, loaded lazily so `--help`-style failures stay cheap. */
export async function productionEnv() {
  const [tex, hdri, model, audio] = await Promise.all([
    import('./asset-lib/convert-texture.mjs'),
    import('./asset-lib/convert-hdri.mjs'),
    import('./asset-lib/convert-model.mjs'),
    import('./asset-lib/convert-audio.mjs'),
  ]);
  return {
    roots: { repoRoot: REPO_ROOT, assetRoot: ASSET_ROOT, cacheRoot: CACHE_ROOT, creditsFile: CREDITS_FILE },
    download: makeDownloader(),
    convert: {
      texture: tex.convertTexture,
      hdri: hdri.convertHdri,
      model: (pick, input, out) => model.convertModel(pick, input, out),
      audio: audio.convertAudio,
    },
    // generated: gen-decals + convert-texture; derived: make-cracked-headstone + convert-model.
    generators: makeGenerators(),
    recipeVersions: {
      texture: `limit${tex.LIMIT_DEFAULT}/${tex.LIMIT_GROUND_MAIN} q${tex.QUALITY_COLOR}/${tex.QUALITY_NORMAL}`,
      hdri: JSON.stringify(hdri.HDRI_WIDTHS),
      model: `meshopt-${model.MESHOPT_LEVEL} tex${tex.LIMIT_DEFAULT} single-glb ${MODEL_STAGING_MARKER}`,
      audio: `q${audio.DEFAULT_QUALITY}`,
    },
  };
}

export async function main(argv = process.argv.slice(2)) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    console.error(err.message);
    return 1;
  }
  const loaded = await loadPicks(opts.picks);
  if (!loaded.ok) {
    for (const e of loaded.errors) console.error(`${e.id ?? 'picks'}: ${e.code}: ${e.message}`);
    return 1;
  }
  const result = await runFetch({ picks: loaded.picks, env: await productionEnv(), only: opts.only, dryRun: opts.dryRun });
  console.log(formatRunReport(result, { dryRun: opts.dryRun }));
  return result.exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (err) => {
      console.error(err?.stack ?? err);
      process.exitCode = 1;
    },
  );
}
