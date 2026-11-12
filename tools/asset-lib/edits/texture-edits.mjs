// Texture edits: desaturate, darken, grime (design: "Edit operations", Requirements 36.1, 36.5, 36.8).
// sharp decodes and encodes; the only random source is mulberry32(seed). All three are clamp-based, so
// a second application is a no-op (desaturate and darken within 1 level of rounding, grime exactly).
import sharp from 'sharp';
import { EditTargetMissing } from './errors.mjs';

/** Seeded PRNG returning floats in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function checkNumber(op, name, value, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`edit ${op}: ${name} must be a number in [${min}, ${max}], got ${value}`);
  }
}

function findTexture(doc, params, op, ctx) {
  const name = params.texture;
  // glTF textures often have no name (Sketchfab exports); fall back to the image file name without extension.
  const stem = (t) => (t.getURI() || '').split('/').pop().replace(/\.[^.]+$/, '');
  const tex = doc.getRoot().listTextures().find((t) => t.getName() === name || (!t.getName() && stem(t) === name));
  if (!tex) {
    if (ctx.strict) throw new EditTargetMissing({ pick: ctx.pick, op, target: name });
    return null;
  }
  return tex;
}

/** Decode to RGBA8 raw pixels, run `fn(data, width, height)` in place, encode in the original format. */
async function editPixels(tex, fn) {
  const mime = tex.getMimeType();
  const { data, info } = await sharp(Buffer.from(tex.getImage()), { failOn: 'none' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  fn(data, info.width, info.height);
  const raw = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
  let out;
  if (mime === 'image/jpeg') out = await raw.jpeg({ quality: 95, chromaSubsampling: '4:4:4' }).toBuffer();
  else if (mime === 'image/webp') out = await raw.webp({ lossless: true }).toBuffer();
  else out = await raw.png().toBuffer();
  tex.setImage(new Uint8Array(out));
}

export async function desaturate(doc, params, ctx = {}) {
  checkNumber('desaturate', 'maxSaturation', params.maxSaturation, 0, 1);
  const tex = findTexture(doc, params, 'desaturate', ctx);
  if (!tex) return doc;
  const maxS = params.maxSaturation;
  await editPixels(tex, (d) => {
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      if (mx === 0) continue;
      const s = (mx - mn) / mx;
      if (s <= maxS) continue;
      // HSV with s capped and v, h unchanged: min channel rises to v * (1 - maxS), others keep their hue ratio.
      const newMin = mx * (1 - maxS);
      const k = (mx - newMin) / (mx - mn);
      d[i] = Math.round(mx - (mx - r) * k);
      d[i + 1] = Math.round(mx - (mx - g) * k);
      d[i + 2] = Math.round(mx - (mx - b) * k);
    }
  });
  return doc;
}

export async function darken(doc, params, ctx = {}) {
  checkNumber('darken', 'maxValue', params.maxValue, 0, 255);
  const percentile = params.percentile ?? 99.5;
  checkNumber('darken', 'percentile', percentile, 0, 100);
  const tex = findTexture(doc, params, 'darken', ctx);
  if (!tex) return doc;
  await editPixels(tex, (d) => {
    const hist = new Uint32Array(256);
    const n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) hist[Math.max(d[i], d[i + 1], d[i + 2])]++;
    const rank = Math.ceil((percentile / 100) * n);
    let acc = 0;
    let p = 255;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= rank) {
        p = v;
        break;
      }
    }
    if (p <= params.maxValue || p === 0) return;
    const f = params.maxValue / p;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.floor(d[i] * f);
      d[i + 1] = Math.floor(d[i + 1] * f);
      d[i + 2] = Math.floor(d[i + 2] * f);
    }
  });
  return doc;
}

const smooth = (t) => t * t * (3 - 2 * t);

/** Seeded value noise in [0, 1] sampled at integer pixels; lattice spacing `cell` pixels. */
function noiseField(seed, width, height, cell) {
  const rnd = mulberry32(seed);
  const gw = Math.ceil(width / cell) + 2;
  const gh = Math.ceil(height / cell) + 2;
  const lattice = new Float64Array(gw * gh);
  for (let i = 0; i < lattice.length; i++) lattice[i] = rnd();
  return (x, y) => {
    const fx = x / cell, fy = y / cell;
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const tx = smooth(fx - x0), ty = smooth(fy - y0);
    const v = (cx, cy) => lattice[cy * gw + cx];
    const top = v(x0, y0) * (1 - tx) + v(x0 + 1, y0) * tx;
    const bot = v(x0, y0 + 1) * (1 - tx) + v(x0 + 1, y0 + 1) * tx;
    return top * (1 - ty) + bot * ty;
  };
}

export async function grime(doc, params, ctx = {}) {
  checkNumber('grime', 'floor', params.floor, 0, 255);
  checkNumber('grime', 'seed', params.seed, -2147483648, 4294967295);
  const tex = findTexture(doc, params, 'grime', ctx);
  if (!tex) return doc;
  const floor = params.floor;
  await editPixels(tex, (d, w, h) => {
    const noise = noiseField(params.seed, w, h, Math.max(2, Math.round(Math.min(w, h) / 8)));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const cap = Math.round(floor + (255 - floor) * noise(x, y));
        const mx = Math.max(d[i], d[i + 1], d[i + 2]);
        if (mx <= cap) continue; // a second pass lands here for every pixel
        const f = cap / mx;
        d[i] = Math.floor(d[i] * f);
        d[i + 1] = Math.floor(d[i + 1] * f);
        d[i + 2] = Math.floor(d[i + 2] * f);
      }
    }
  });
  return doc;
}

