/** Build a TGA. pixels: top-down array of [r,g,b,(a)] or [v] rows-major. */
export function buildTga({ width, height, bpp, pixels, topDown = false, rle = false, idLen = 0, grey = false }) {
  const header = Buffer.alloc(18);
  header[0] = idLen;
  header[2] = grey ? (rle ? 11 : 3) : rle ? 10 : 2;
  header.writeUInt16LE(width, 12);
  header.writeUInt16LE(height, 14);
  header[16] = bpp;
  header[17] = topDown ? 0x20 : 0;
  const rows = [];
  for (let y = 0; y < height; y++) rows.push(pixels.slice(y * width, (y + 1) * width));
  const ordered = topDown ? rows : rows.reverse();
  const bytes = [];
  for (const row of ordered) {
    for (const p of row) {
      if (grey) bytes.push(p[0]);
      else {
        bytes.push(p[2], p[1], p[0]);
        if (bpp === 32) bytes.push(p[3]);
      }
    }
  }
  const bpx = bpp / 8;
  let body = Buffer.from(bytes);
  if (rle) {
    const out = [];
    // one raw packet per pixel run of 1 then a repeat packet for the whole image if uniform
    for (let i = 0; i < body.length; i += bpx) {
      out.push(0, ...body.subarray(i, i + bpx));
    }
    body = Buffer.from(out);
  }
  return Buffer.concat([header, Buffer.alloc(idLen, 7), body]);
}
