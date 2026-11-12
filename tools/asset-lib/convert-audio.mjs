// Audio conversion (design.md "Audio", Requirement 16.4): one source -> <name>.ogg + <name>.mp3.
// ffmpeg comes only from the npm package ffmpeg-static; there is no system ffmpeg fallback.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';

export const OVERSIZE_BYTES = 5_242_880;
export const DEFAULT_QUALITY = 4;

const require = createRequire(import.meta.url);

/** Path of the bundled ffmpeg binary, or null when ffmpeg-static has none for this platform. */
export function bundledFfmpegPath() {
  try {
    return require('ffmpeg-static') || null;
  } catch {
    return null;
  }
}

const isNonNeg = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/** Typed error: { code, message }. */
function fail(code, message) {
  return Object.assign(new Error(message), { code });
}

/**
 * Build the two argument arrays (no shell is involved, so file names need no quoting).
 * `trim` = { startSeconds?, durationSeconds? } cuts the source before encoding.
 */
export function buildArgs({ input, oggPath, mp3Path, quality = DEFAULT_QUALITY, trim }) {
  const trimIn = [];
  const trimOut = [];
  if (trim) {
    if (trim.startSeconds !== undefined) trimIn.push('-ss', String(trim.startSeconds));
    if (trim.durationSeconds !== undefined) trimOut.push('-t', String(trim.durationSeconds));
  }
  const common = ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y', ...trimIn, '-i', input, ...trimOut,
    '-vn', '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact'];
  return {
    ogg: [...common, '-c:a', 'libvorbis', '-q:a', String(quality), oggPath],
    mp3: [...common, '-c:a', 'libmp3lame', '-q:a', String(quality), '-id3v2_version', '0', '-write_xing', '0', mp3Path],
  };
}

function run(ffmpeg, args, spawnFn) {
  return new Promise((resolve, reject) => {
    let stderr = '';
    let child;
    try {
      child = spawnFn(ffmpeg, args, { shell: false, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    } catch (e) {
      return reject(fail('FfmpegSpawnFailed', `Cannot start ffmpeg: ${e.message}`));
    }
    child.stderr?.on('data', (d) => { stderr += d; });
    child.on('error', (e) => reject(fail('FfmpegSpawnFailed', `Cannot start ffmpeg: ${e.message}`)));
    child.on('close', (code) => (code === 0 ? resolve() : reject(Object.assign(new Error(stderr.trim()), { code: 'FfmpegFailed', exitCode: code }))));
  });
}

function explain(codec, e) {
  const text = String(e.message);
  if (/Unknown encoder|Encoder .* not found|not (?:compiled|enabled)/i.test(text)) {
    return fail('MissingCodec',
      `The bundled ffmpeg (ffmpeg-static) lacks the ${codec} encoder. No system ffmpeg fallback is used; ` +
      'propose another encoder (for Vorbis: -c:a vorbis -strict -2) instead.');
  }
  return fail(e.code ?? 'FfmpegFailed', `ffmpeg failed while encoding ${codec}: ${text}`);
}

/**
 * Convert `input` to `<outDir>/<name>.ogg` and `<outDir>/<name>.mp3`.
 * Both files are encoded into a staging folder first and only moved into `outDir` when both
 * succeeded, so a failure leaves no partial output. Resolves { files: [{ path, bytes }], warnings }.
 * Rejects with a typed error ({ code, message }).
 */
export async function convertAudio({ input, outDir, name, quality = DEFAULT_QUALITY, trim, ffmpegPath, spawnFn = spawn }) {
  if (typeof name !== 'string' || !/^[A-Za-z0-9._-]+$/.test(name)) throw fail('InvalidName', `Invalid output name "${name}"`);
  if (!(typeof quality === 'number' && quality >= 0 && quality <= 9)) throw fail('InvalidQuality', 'quality must be a number from 0 to 9');
  if (trim && ((trim.startSeconds !== undefined && !isNonNeg(trim.startSeconds)) ||
      (trim.durationSeconds !== undefined && !(isNonNeg(trim.durationSeconds) && trim.durationSeconds > 0)))) {
    throw fail('InvalidTrim', 'trim.startSeconds must be >= 0 and trim.durationSeconds > 0');
  }
  const ffmpeg = ffmpegPath ?? bundledFfmpegPath();
  if (!ffmpeg) throw fail('FfmpegMissing', 'ffmpeg-static provides no binary for this platform; no system ffmpeg fallback is used.');
  try {
    await fs.access(input);
  } catch {
    throw fail('InputMissing', `Source audio not found: ${input}`);
  }

  await fs.mkdir(outDir, { recursive: true });
  const staging = await fs.mkdtemp(path.join(outDir, `.${name}-staging-`));
  try {
    const stagedOgg = path.join(staging, `${name}.ogg`);
    const stagedMp3 = path.join(staging, `${name}.mp3`);
    const args = buildArgs({ input, oggPath: stagedOgg, mp3Path: stagedMp3, quality, trim });
    try { await run(ffmpeg, args.ogg, spawnFn); } catch (e) { throw explain('libvorbis', e); }
    try { await run(ffmpeg, args.mp3, spawnFn); } catch (e) { throw explain('libmp3lame', e); }

    const files = [];
    const warnings = [];
    for (const [staged, ext] of [[stagedOgg, 'ogg'], [stagedMp3, 'mp3']]) {
      const { size } = await fs.stat(staged);
      if (size === 0) throw fail('EmptyOutput', `ffmpeg produced an empty ${ext} file`);
      const final = path.join(outDir, `${name}.${ext}`);
      files.push({ path: final, staged, bytes: size });
      if (size > OVERSIZE_BYTES) {
        warnings.push(`${final} is ${(size / 1_048_576).toFixed(2)} MB (over 5 MB): lower -q:a or trim the source`);
      }
    }
    for (const f of files) await fs.rename(f.staged, f.path);
    return { files: files.map(({ path: p, bytes }) => ({ path: p, bytes })), warnings };
  } finally {
    await fs.rm(staging, { recursive: true, force: true });
  }
}
