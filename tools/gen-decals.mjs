// Procedural blood decals (handprint, drag-mark). Pure JS pixels, seeded, deterministic.
// No Date, no Math.random, no environment reads inside generation.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

export const SIZE = 512;
const MARGIN = 24;
export const DECAL_TYPES = ["handprint", "drag-mark"];

export function fnv1a32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

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

export function seedFor(type, variant) {
  return (fnv1a32(`${type}:${variant}`) ^ 0x5a0b1e) >>> 0;
}

const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);

// 2D value noise on a 64x64 seeded lattice (wraps).
function makeNoise(rand) {
  const N = 64;
  const g = new Float32Array(N * N);
  for (let i = 0; i < g.length; i++) g[i] = rand();
  return (x, y) => {
    const xf = Math.floor(x), yf = Math.floor(y);
    const fx = x - xf, fy = y - yf;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const x0 = ((xf % N) + N) % N, y0 = ((yf % N) + N) % N;
    const x1 = (x0 + 1) % N, y1 = (y0 + 1) % N;
    const a = g[y0 * N + x0], b = g[y0 * N + x1];
    const c = g[y1 * N + x0], d = g[y1 * N + x1];
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

// Capsule from (ax,ay) to (bx,by), radius ra -> rb. Returns signed distance.
function capsule(px, py, s) {
  const dx = px - s.ax, dy = py - s.ay;
  const t = clamp((dx * s.ex + dy * s.ey) * s.il2);
  const cx = dx - s.ex * t, cy = dy - s.ey * t;
  return Math.sqrt(cx * cx + cy * cy) - (s.ra + (s.rb - s.ra) * t);
}
function seg(ax, ay, bx, by, ra, rb) {
  const ex = bx - ax, ey = by - ay;
  return { ax, ay, ex, ey, il2: 1 / (ex * ex + ey * ey || 1), ra, rb };
}

function handprintShapes(rand) {
  const shapes = [];
  const cx = 256 + (rand() - 0.5) * 30, cy = 310 + (rand() - 0.5) * 30;
  const rot = (rand() - 0.5) * 0.5;
  const palm = { cx, cy, rx: 78 + rand() * 14, ry: 92 + rand() * 14, rot };
  const cos = Math.cos(rot), sin = Math.sin(rot);
  const local = (lx, ly) => [cx + lx * cos - ly * sin, cy + lx * sin + ly * cos];
  const fingers = [
    [-62, -70, -0.35, 100], [-30, -90, -0.12, 125], [3, -95, 0, 135],
    [36, -88, 0.12, 120], [68, -60, 0.35, 95],
  ];
  for (const [fx, fy, ang, len] of fingers) {
    const a = ang + (rand() - 0.5) * 0.18 + rot;
    const l = len * (0.9 + rand() * 0.2);
    const w = 13 + rand() * 4;
    const [sx, sy] = local(fx, fy);
    shapes.push(seg(sx, sy, sx + Math.sin(a) * l, sy - Math.cos(a) * l, w, w * 0.8));
  }
  // thumb
  const [tx, ty] = local(-85, 20);
  const ta = -1.0 + (rand() - 0.5) * 0.2 + rot, tl = 85 + rand() * 15;
  shapes.push(seg(tx, ty, tx + Math.sin(ta) * tl, ty - Math.cos(ta) * tl, 16, 13));
  // drips below palm
  const drips = [];
  const nd = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < nd; i++) {
    const [dx, dy] = local((rand() - 0.5) * 120, palm.ry * 0.7);
    const len = 30 + rand() * 60;
    drips.push(seg(dx, dy, dx + (rand() - 0.5) * 6, dy + len, 4 + rand() * 3, 2.5));
  }
  const smearAng = rand() * Math.PI * 2;
  return { palm, shapes, drips, smear: [Math.cos(smearAng), Math.sin(smearAng)], smearAmt: 3 + rand() * 6 };
}

function dragShapes(rand) {
  const n = 3 + Math.floor(rand() * 3);
  const pts = [];
  const y0 = 90 + rand() * 40, y1 = 420 + rand() * 30;
  const xs = 256 + (rand() - 0.5) * 120;
  const dir = rand() < 0.5 ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1);
    pts.push([clamp(xs + dir * 70 * Math.sin(f * 3 + rand()) + (rand() - 0.5) * 50, 70, 440), y0 + (y1 - y0) * f]);
  }
  // Sample as a smoothed polyline (Catmull-Rom-ish via linear interpolation of midpoints).
  const poly = [];
  const steps = 12;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    for (let k = 0; k < steps; k++) {
      const t = k / steps, t2 = t * t, t3 = t2 * t;
      poly.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t +
        (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
    }
  }
  poly.push(pts[n - 1]);
  const width = 26 + rand() * 16;
  const segs = [];
  for (let i = 0; i < poly.length - 1; i++) {
    const f0 = i / (poly.length - 1), f1 = (i + 1) / (poly.length - 1);
    // Thick at start, tapered to the end.
    segs.push(seg(poly[i][0], poly[i][1], poly[i + 1][0], poly[i + 1][1],
      width * (1 - 0.8 * f0), width * (1 - 0.8 * f1)));
  }
  return { segs, streakFreq: 0.35 + rand() * 0.25 };
}

export function generateDecal({ type, variant = 0, seed } = {}) {
  if (!DECAL_TYPES.includes(type)) throw new Error(`unknown decal type: ${type}`);
  const s = seed === undefined ? seedFor(type, variant) : seed >>> 0;
  const rand = mulberry32(s);
  const noise = makeNoise(rand);
  const wetNoise = makeNoise(rand);
  const colNoise = makeNoise(rand);
  const hueBase = (rand() - 0.5) * 10; // degrees
  const hp = type === "handprint" ? handprintShapes(rand) : null;
  const dg = type === "drag-mark" ? dragShapes(rand) : null;

  const rgba = new Uint8ClampedArray(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      let cov = 0;
      if (x >= MARGIN && x < SIZE - MARGIN && y >= MARGIN && y < SIZE - MARGIN) {
        // two cheap noise octaves
        const n = noise(x * 0.06, y * 0.06) * 0.7 + noise(x * 0.2, y * 0.2) * 0.3;
        if (hp) {
          // smear: sample the shapes at a position displaced along the smear direction
          const sh = (n - 0.5) * hp.smearAmt;
          const px = x + hp.smear[0] * sh * 2, py = y + hp.smear[1] * sh * 2;
          const p = hp.palm;
          const cs = Math.cos(p.rot), sn = Math.sin(p.rot);
          const lx = ((px - p.cx) * cs + (py - p.cy) * sn) / p.rx;
          const ly = (-(px - p.cx) * sn + (py - p.cy) * cs) / p.ry;
          let d = (Math.sqrt(lx * lx + ly * ly) - 1) * Math.min(p.rx, p.ry);
          for (const sg of hp.shapes) d = Math.min(d, capsule(px, py, sg));
          for (const sg of hp.drips) d = Math.min(d, capsule(px, py, sg));
          cov = clamp(0.5 - d / 5 + (n - 0.5) * 0.9);
          cov *= 0.75 + 0.25 * wetNoise(x * 0.03, y * 0.03);
        } else {
          let d = 1e9, best = 0, bi = 0;
          for (let k = 0; k < dg.segs.length; k++) {
            const sg = dg.segs[k];
            const v = capsule(x, y, sg);
            if (v < d) { d = v; bi = k; best = clamp(((x - sg.ax) * sg.ex + (y - sg.ay) * sg.ey) * sg.il2); }
          }
          const u = bi + best;
          // finger streaks: noise stretched along the ribbon (fine across, long along)
          const streak = noise(d * dg.streakFreq + 7, u * 0.15);
          const dry = noise(x * 0.12 + 31, y * 0.12) ;
          cov = clamp(0.5 - d / 6 + (n - 0.5) * 0.6);
          cov *= (0.55 + 0.6 * streak) * clamp(0.5 + dry * 1.1 - u * 0.012);
          cov = clamp(cov);
        }
      }
      const wet = 0.85 + 0.15 * wetNoise(x * 0.05 + 11, y * 0.05);
      const alpha = Math.round(255 * clamp(cov * wet));
      // colour: HSV -> RGB, clamped to inner ranges
      const cn = colNoise(x * 0.04, y * 0.04);
      const h = clamp(hueBase + (cn - 0.5) * 8, -7, 7);
      const sat = clamp(0.52 + 0.16 * colNoise(x * 0.07 + 5, y * 0.07), 0.52, 0.68);
      const val = clamp(0.38 - 0.18 * cov - 0.04 * cn, 0.17, 0.38);
      const hh = ((h + 360) % 360) / 60;
      const c = val * sat;
      const xx = c * (1 - Math.abs((hh % 2) - 1));
      let r = 0, g = 0, b = 0;
      if (hh < 1) { r = c; g = xx; } else { r = c; b = xx; } // hue near 0 or near 360
      const m = val - c;
      rgba[i] = Math.round((r + m) * 255);
      rgba[i + 1] = Math.round((g + m) * 255);
      rgba[i + 2] = Math.round((b + m) * 255);
      rgba[i + 3] = alpha;
    }
  }
  return { width: SIZE, height: SIZE, rgba };
}

export async function encodePng(rgba, width = SIZE, height = SIZE) {
  return sharp(Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength), {
    raw: { width, height, channels: 4 },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toBuffer();
}

export async function writeAll(outDir, variants = 3) {
  mkdirSync(outDir, { recursive: true });
  const files = [];
  for (const type of DECAL_TYPES) {
    for (let v = 0; v < variants; v++) {
      const { rgba } = generateDecal({ type, variant: v });
      const name = `${type === "drag-mark" ? "dragmark" : type}-${v}.png`;
      const file = join(outDir, name);
      writeFileSync(file, await encodePng(rgba));
      files.push(file);
    }
  }
  return files;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf("--out");
  const out = resolve(i > -1 ? process.argv[i + 1] : join(dirname(fileURLToPath(import.meta.url)), "cache", "generated", "decals"));
  writeAll(out).then((f) => console.log(`wrote ${f.length} decals to ${out}`));
}
