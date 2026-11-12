// tint: grade skin to a dead grey-green tone (design: "Ruella hand edits", Requirement 43).
// Works on a base colour texture (sharp, pixels already sRGB) or, when the model has no textures,
// on COLOR_0 vertex colours (linear, converted to sRGB for the grading so "value" means what the
// eye sees). Hue is moved into [hue - hueSpread, hue + hueSpread], saturation is clamped to
// [minSaturation, maxSaturation], and value is scaled so the mean value of the skin samples equals
// `meanValue`. Hue and saturation are clamps and value is a scale that is 1 once the mean is on
// target, so a second run changes nothing. Detail (veins, nails, dirt) is kept because value
// differences between samples are scaled, not flattened.
import { EditTargetMissing } from './errors.mjs';
import { findMeshes } from './geometry.mjs';
import { rgbToHsv } from './remove-by-color.mjs';
import { editPixels, findTexture } from './texture-edits.mjs';

const lin2srgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
const srgb2lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const SKIN_MIN_VALUE = 0.02; // near-black samples (outlines, holes) are not skin

function hsvToRgb(h, s, v) {
  const f = (n) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return [f(5), f(3), f(1)];
}

function check(params) {
  const num = (name, v, lo, hi) => {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < lo || v > hi) {
      throw new RangeError(`edit tint: ${name} must be a number in [${lo}, ${hi}], got ${v}`);
    }
  };
  num('hue', params.hue, 0, 360);
  num('maxSaturation', params.maxSaturation, 0, 1);
  num('meanValue', params.meanValue, 0, 1);
  num('minSaturation', params.minSaturation ?? 0, 0, params.maxSaturation);
  num('tolerance', params.tolerance ?? 0.01, 0, 0.5);
  num('hueSpread', params.hueSpread ?? 12, 0, 180);
}

/** Grade `n` samples. `get(i)` returns encoded [r, g, b] in 0..1 or null to skip; `set(i, r, g, b)` writes back. */
function grade(n, get, set, params) {
  const tol = params.tolerance ?? 0.01;
  const spread = params.hueSpread ?? 12;
  const minS = params.minSaturation ?? 0;
  const hsv = new Array(n).fill(null);
  let sum = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    const rgb = get(i);
    if (!rgb) continue;
    const [h, s, v] = rgbToHsv(rgb[0], rgb[1], rgb[2]);
    if (v < SKIN_MIN_VALUE) continue;
    hsv[i] = [h, s, v];
    sum += v;
    count++;
  }
  if (count === 0) return;
  // Scale f so the mean of min(1, v * f) equals meanValue (bisection, deterministic).
  const meanAt = (f) => {
    let m = 0;
    for (const x of hsv) if (x) m += Math.min(1, x[2] * f);
    return m / count;
  };
  let f = 1;
  if (Math.abs(sum / count - params.meanValue) > tol) {
    let a = 0;
    let b = 64;
    for (let k = 0; k < 60; k++) {
      f = (a + b) / 2;
      if (meanAt(f) < params.meanValue) a = f;
      else b = f;
    }
  }
  for (let i = 0; i < n; i++) {
    const x = hsv[i];
    if (!x) continue;
    let d = ((x[0] - params.hue + 540) % 360) - 180; // signed hue offset in [-180, 180)
    d = Math.max(-spread, Math.min(spread, d));
    const h = (params.hue + d + 360) % 360;
    const s = Math.max(minS, Math.min(params.maxSaturation, x[1]));
    const v = Math.min(1, x[2] * f);
    const [r, g, b] = hsvToRgb(h, s, v);
    set(i, r, g, b);
  }
}

export async function tint(doc, params, ctx = {}) {
  check(params);
  if (typeof params.texture === 'string') {
    const tex = findTexture(doc, params, 'tint', ctx);
    if (!tex) return doc;
    await editPixels(tex, (d) => {
      grade(
        d.length / 4,
        (i) => (d[i * 4 + 3] === 0 ? null : [d[i * 4] / 255, d[i * 4 + 1] / 255, d[i * 4 + 2] / 255]),
        (i, r, g, b) => {
          d[i * 4] = Math.round(r * 255);
          d[i * 4 + 1] = Math.round(g * 255);
          d[i * 4 + 2] = Math.round(b * 255);
        },
        params,
      );
    });
    return doc;
  }

  // Vertex colours of the named meshes (all meshes when `meshes` is absent), graded as one skin population.
  const names = params.meshes ?? [undefined];
  const prims = [];
  for (const name of names) {
    for (const mesh of findMeshes(doc, name, 'tint', ctx)) {
      for (const prim of mesh.listPrimitives()) {
        if (prim.getAttribute('COLOR_0')) prims.push(prim);
        else if (ctx.strict && name !== undefined) throw new EditTargetMissing({ pick: ctx.pick, op: 'tint', target: `${name}.COLOR_0` });
      }
    }
  }
  if (prims.length === 0) return doc;
  const offsets = [];
  let total = 0;
  for (const p of prims) {
    offsets.push(total);
    total += p.getAttribute('COLOR_0').getCount();
  }
  const where = (i) => {
    let k = prims.length - 1;
    while (offsets[k] > i) k--;
    return [prims[k].getAttribute('COLOR_0'), i - offsets[k]];
  };
  const tmp = [0, 0, 0, 0];
  grade(
    total,
    (i) => {
      const [acc, j] = where(i);
      acc.getElement(j, tmp);
      return [lin2srgb(tmp[0]), lin2srgb(tmp[1]), lin2srgb(tmp[2])];
    },
    (i, r, g, b) => {
      const [acc, j] = where(i);
      acc.getElement(j, tmp);
      acc.setElement(j, [srgb2lin(r), srgb2lin(g), srgb2lin(b), tmp[3]].slice(0, acc.getElementSize()));
    },
    params,
  );
  return doc;
}
