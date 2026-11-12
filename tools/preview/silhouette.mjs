// Silhouette comparison (Requirements 42.10, 42.11, 44).
//
// Two render-free ways to get xor = |A xor B| / |A| and IoU = |A and B| / |A or B|:
//   - maskFromDocument / compareDocuments: rasterise the front orthographic projection (look along -z,
//     x right, y up) of a gltf-transform Document to a 200 x 200 mask. Same framing for both documents.
//   - maskFromPng / comparePngs: threshold two PNG renders (flat black on white) at 128 with sharp.
// A is the reference (intact) silhouette.
import sharp from 'sharp';

export const SIZE = 200;

function worldMatrices(doc) {
  const byMesh = new Map();
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (mesh && !byMesh.has(mesh)) byMesh.set(mesh, node.getWorldMatrix());
  }
  return byMesh;
}

/** World-space front-projected triangles as flat arrays [x0,y0,x1,y1,x2,y2]. */
export function projectTriangles(doc) {
  const mats = worldMatrices(doc);
  const out = [];
  const e = [0, 0, 0];
  for (const mesh of doc.getRoot().listMeshes()) {
    const m = mats.get(mesh) ?? [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      if (!pos || prim.getMode() !== 4) continue;
      const pts = [];
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, e);
        pts.push([m[0] * e[0] + m[4] * e[1] + m[8] * e[2] + m[12], m[1] * e[0] + m[5] * e[1] + m[9] * e[2] + m[13]]);
      }
      const idx = prim.getIndices();
      const n = idx ? idx.getCount() : pts.length;
      for (let i = 0; i + 2 < n; i += 3) {
        const a = pts[idx ? idx.getScalar(i) : i], b = pts[idx ? idx.getScalar(i + 1) : i + 1], c = pts[idx ? idx.getScalar(i + 2) : i + 2];
        out.push([a[0], a[1], b[0], b[1], c[0], c[1]]);
      }
    }
  }
  return out;
}

function boundsOf(tris) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const t of tris) {
    for (let k = 0; k < 6; k += 2) {
      x0 = Math.min(x0, t[k]); x1 = Math.max(x1, t[k]);
      y0 = Math.min(y0, t[k + 1]); y1 = Math.max(y1, t[k + 1]);
    }
  }
  return { x0, y0, x1, y1 };
}

/** Square frame with 5 percent margin around the union of the given bounds. */
export function sharedFrame(boundsList) {
  const b = {
    x0: Math.min(...boundsList.map((q) => q.x0)), y0: Math.min(...boundsList.map((q) => q.y0)),
    x1: Math.max(...boundsList.map((q) => q.x1)), y1: Math.max(...boundsList.map((q) => q.y1)),
  };
  const half = (Math.max(b.x1 - b.x0, b.y1 - b.y0) / 2) * 1.05;
  return { cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2, half };
}

/** Rasterise triangles (pixel centres) into a Uint8Array mask of size x size, 1 = inside. */
export function rasterise(tris, frame, size = SIZE) {
  const mask = new Uint8Array(size * size);
  const s = size / (2 * frame.half);
  const px = (x) => (x - frame.cx) * s + size / 2;
  const py = (y) => size / 2 - (y - frame.cy) * s; // image y grows downward
  for (const t of tris) {
    const ax = px(t[0]), ay = py(t[1]), bx = px(t[2]), by = py(t[3]), cx = px(t[4]), cy = py(t[5]);
    const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (Math.abs(area) < 1e-12) continue;
    const xs = Math.max(0, Math.floor(Math.min(ax, bx, cx))), xe = Math.min(size - 1, Math.ceil(Math.max(ax, bx, cx)));
    const ys = Math.max(0, Math.floor(Math.min(ay, by, cy))), ye = Math.min(size - 1, Math.ceil(Math.max(ay, by, cy)));
    for (let y = ys; y <= ye; y++) {
      for (let x = xs; x <= xe; x++) {
        const qx = x + 0.5, qy = y + 0.5;
        const w0 = ((bx - qx) * (cy - qy) - (by - qy) * (cx - qx)) / area;
        const w1 = ((cx - qx) * (ay - qy) - (cy - qy) * (ax - qx)) / area;
        const w2 = 1 - w0 - w1;
        const e = -1e-9;
        if (w0 >= e && w1 >= e && w2 >= e) mask[y * size + x] = 1;
      }
    }
  }
  return mask;
}

/** XOR share of A and IoU of two equally sized masks. */
export function compareMasks(a, b) {
  let areaA = 0, areaB = 0, both = 0, either = 0;
  for (let i = 0; i < a.length; i++) {
    areaA += a[i]; areaB += b[i];
    both += a[i] & b[i];
    either += a[i] | b[i];
  }
  const xorArea = either - both;
  return {
    areaA, areaB, xorArea,
    xor: areaA ? xorArea / areaA : 0,
    iou: either ? both / either : 1,
  };
}

/** Front silhouettes of two Documents with one shared frame. A is the reference. */
export function compareDocuments(docA, docB, { size = SIZE } = {}) {
  const ta = projectTriangles(docA), tb = projectTriangles(docB);
  const frame = sharedFrame([boundsOf(ta), boundsOf(tb)]);
  const a = rasterise(ta, frame, size), b = rasterise(tb, frame, size);
  return { ...compareMasks(a, b), maskA: a, maskB: b, size };
}

/** Mask from a PNG buffer or path: dark pixels (luma below 128) are inside. */
export async function maskFromPng(input) {
  const { data, info } = await sharp(input).flatten({ background: '#ffffff' }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const mask = new Uint8Array(info.width * info.height);
  for (let i = 0; i < mask.length; i++) mask[i] = data[i * info.channels] < 128 ? 1 : 0;
  return { mask, width: info.width, height: info.height };
}

/** XOR and IoU of two silhouette PNGs of the same size. */
export async function comparePngs(pngA, pngB) {
  const a = await maskFromPng(pngA), b = await maskFromPng(pngB);
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(`silhouette sizes differ: ${a.width}x${a.height} vs ${b.width}x${b.height}`);
  }
  return { ...compareMasks(a.mask, b.mask), width: a.width, height: a.height };
}

export const XOR_THRESHOLD = 0.03;
