// Texture converter (design: "Conversion pipeline", Requirements 16.2, 16.6, 16.9, 38.8).
// PNG/JPG -> WebP through sharp. No KTX2, no toktx. Writes only into the given work folder.
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export const LIMIT_DEFAULT = 1024;
export const LIMIT_GROUND_MAIN = 2048;
export const QUALITY_COLOR = 82;
export const QUALITY_NORMAL = 90;
export const ALPHA_QUALITY = 90;
export const WARN_BYTES = 5_242_880;
const MAP_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/** Longest-side limit for a pick: 2048 for role `ground-main`, otherwise 1024. */
export function textureLimit(pick) {
  return pick?.role === 'ground-main' ? LIMIT_GROUND_MAIN : LIMIT_DEFAULT;
}

/**
 * Dimensions that fit inside L x L, keep the aspect ratio and are never larger than the source.
 * Pure. Longest side = min(max(w, h), L); the other side is rounded, at least 1.
 */
export function fitInside(w, h, L) {
  for (const [name, v] of [['w', w], ['h', h], ['L', L]]) {
    if (!Number.isInteger(v) || v < 1) throw new Error(`fitInside: ${name} must be an integer >= 1, got ${v}`);
  }
  const longest = Math.max(w, h);
  if (longest <= L) return { width: w, height: h };
  const scale = L / longest;
  return {
    width: w >= h ? L : Math.max(1, Math.round(w * scale)),
    height: h >= w ? L : Math.max(1, Math.round(h * scale)),
  };
}

/** Normal maps are detected from the map name (`normal`, `nor`, `nor_gl`, `nor_dx`). */
export function isNormalMap(map) {
  return /(^|[-_])(normal|nor|nrm)([-_]|$)/i.test(map);
}

/** WebP options for a map: quality 82 (90 for normal maps, never near-lossless), effort 4. */
export function webpOptions(map) {
  if (isNormalMap(map)) return { quality: QUALITY_NORMAL, nearLossless: false, effort: 4 };
  return { quality: QUALITY_COLOR, alphaQuality: ALPHA_QUALITY, effort: 4 };
}

/** Size warning with a suggestion for files over 5 MB (Requirement 17.5). Pure. */
export function sizeWarning(fileName, bytes) {
  if (bytes <= WARN_BYTES) return null;
  const mb = (bytes / 1_048_576).toFixed(2);
  return `${fileName} is ${mb} MB (over 5 MB). Suggestion: lower the texture limit to 1024 px or use a lower WebP quality.`;
}

/**
 * Convert the source maps of one texture pick into `workDir`.
 * pick: { id, role? }; inputs: [{ map, path }] (path to a PNG or JPG; map e.g. 'color', 'normal', 'roughness').
 * Output file names: `<id>_<map>.webp`. Alpha is kept (sharp keeps it by default; no flatten).
 * All files are encoded in memory first, so a failing input writes nothing; if a later write
 * fails, every file this call created is removed again (no partial output, Requirement 16.9).
 * Returns { files: [{ fileName, path, bytes, width, height, map }], warnings: string[] }.
 */
export async function convertTexture(pick, inputs, workDir) {
  if (typeof pick?.id !== 'string' || pick.id === '') throw new Error('convertTexture: pick.id is required');
  if (!Array.isArray(inputs) || inputs.length === 0) throw new Error(`convertTexture: no input maps for ${pick.id}`);
  const seen = new Set();
  for (const input of inputs) {
    if (typeof input?.map !== 'string' || !MAP_PATTERN.test(input.map)) {
      throw new Error(`convertTexture: invalid map name ${JSON.stringify(input?.map)} for ${pick.id}`);
    }
    if (seen.has(input.map)) throw new Error(`convertTexture: duplicate map ${input.map} for ${pick.id}`);
    seen.add(input.map);
  }
  const limit = textureLimit(pick);

  // Encode everything in memory first.
  const encoded = [];
  for (const input of inputs) {
    const source = await readFile(input.path);
    const meta = await sharp(source).metadata();
    if (!meta.width || !meta.height) throw new Error(`convertTexture: cannot read size of ${input.path}`);
    const size = fitInside(meta.width, meta.height, limit);
    const { data, info } = await sharp(source)
      // fitInside already keeps the ratio (within one pixel); 'fill' gives exactly these dimensions.
      // 'inside' with the rounded box would shrink the longest side below the limit on very thin images.
      .resize({ width: size.width, height: size.height, fit: 'fill' })
      .webp(webpOptions(input.map))
      .toBuffer({ resolveWithObject: true });
    encoded.push({
      map: input.map,
      fileName: `${pick.id}_${input.map}.webp`,
      data,
      width: info.width,
      height: info.height,
    });
  }

  // Write through temp files and rename; undo on any failure.
  await mkdir(workDir, { recursive: true });
  const created = [];
  const temps = [];
  try {
    for (const item of encoded) {
      const finalPath = path.join(workDir, item.fileName);
      const tmpPath = `${finalPath}.tmp`;
      temps.push(tmpPath);
      await writeFile(tmpPath, item.data);
      await rename(tmpPath, finalPath);
      created.push(finalPath);
    }
  } catch (error) {
    await Promise.all([...created, ...temps].map((p) => rm(p, { force: true })));
    throw error;
  }

  const files = encoded.map((item) => ({
    map: item.map,
    fileName: item.fileName,
    path: path.join(workDir, item.fileName),
    bytes: item.data.length,
    width: item.width,
    height: item.height,
  }));
  const warnings = files.map((f) => sizeWarning(f.fileName, f.bytes)).filter(Boolean);
  return { files, warnings };
}
