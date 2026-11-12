// Minimal TGA decoder (types 2, 3, 10, 11 at 8/24/32 bpp). sharp cannot read TGA and
// FBX2glTF cannot load it, so Rocketbox textures are decoded here and written as PNG.
import sharp from 'sharp';
import { LIMIT_DEFAULT } from './convert-texture.mjs';

export class TgaError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'TgaError';
    this.code = code; // 'UnsupportedTga' | 'TruncatedTga'
  }
}

const HEADER = 18;

/**
 * Decode a TGA file into top-down, left-to-right raw pixels.
 * @param {Buffer|Uint8Array} buffer
 * @returns {{ width: number, height: number, channels: 1|3|4, data: Buffer }}
 *   channels 1 = grey, 3 = RGB, 4 = RGBA
 */
export function decodeTga(buffer) {
  const buf = Buffer.isBuffer(buffer)
    ? buffer
    : Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  if (buf.length < HEADER) throw new TgaError('TruncatedTga', 'TGA header is truncated');

  const idLen = buf[0];
  const cmapType = buf[1];
  const type = buf[2];
  const cmapLen = buf.readUInt16LE(5);
  const cmapBits = buf[7];
  const width = buf.readUInt16LE(12);
  const height = buf.readUInt16LE(14);
  const bpp = buf[16];
  const descriptor = buf[17];

  if (![2, 3, 10, 11].includes(type)) {
    throw new TgaError('UnsupportedTga', `Unsupported TGA image type ${type}`);
  }
  const grey = type === 3 || type === 11;
  const rle = type === 10 || type === 11;
  if (grey ? bpp !== 8 : bpp !== 24 && bpp !== 32) {
    throw new TgaError('UnsupportedTga', `Unsupported TGA depth ${bpp} bpp for type ${type}`);
  }
  if (width === 0 || height === 0) {
    throw new TgaError('UnsupportedTga', `Invalid TGA size ${width}x${height}`);
  }

  const bytesPP = bpp / 8;
  const channels = bpp === 8 ? 1 : bpp === 24 ? 3 : 4;
  const cmapBytes = cmapType === 1 ? cmapLen * Math.ceil(cmapBits / 8) : 0;
  let pos = HEADER + idLen + cmapBytes;
  const total = width * height;
  const raw = Buffer.alloc(total * bytesPP);

  if (!rle) {
    if (buf.length < pos + raw.length) throw new TgaError('TruncatedTga', 'TGA pixel data is truncated');
    buf.copy(raw, 0, pos, pos + raw.length);
  } else {
    let out = 0;
    while (out < raw.length) {
      if (pos >= buf.length) throw new TgaError('TruncatedTga', 'TGA RLE data is truncated');
      const head = buf[pos++];
      const count = (head & 0x7f) + 1;
      const bytes = count * bytesPP;
      if (head & 0x80) {
        if (pos + bytesPP > buf.length) throw new TgaError('TruncatedTga', 'TGA RLE data is truncated');
        for (let i = 0; i < count && out < raw.length; i++) {
          buf.copy(raw, out, pos, pos + bytesPP);
          out += bytesPP;
        }
        pos += bytesPP;
      } else {
        if (pos + bytes > buf.length) throw new TgaError('TruncatedTga', 'TGA RLE data is truncated');
        const n = Math.min(bytes, raw.length - out);
        buf.copy(raw, out, pos, pos + n);
        out += n;
        pos += bytes;
      }
    }
  }

  const topDown = (descriptor & 0x20) !== 0;
  const rightToLeft = (descriptor & 0x10) !== 0;
  const data = Buffer.alloc(raw.length);
  const rowBytes = width * bytesPP;
  for (let y = 0; y < height; y++) {
    const srcRow = (topDown ? y : height - 1 - y) * rowBytes;
    for (let x = 0; x < width; x++) {
      const s = srcRow + (rightToLeft ? width - 1 - x : x) * bytesPP;
      const d = y * rowBytes + x * bytesPP;
      if (channels === 1) {
        data[d] = raw[s];
      } else {
        // TGA stores BGR(A)
        data[d] = raw[s + 2];
        data[d + 1] = raw[s + 1];
        data[d + 2] = raw[s];
        if (channels === 4) data[d + 3] = raw[s + 3];
      }
    }
  }
  return { width, height, channels, data };
}

/**
 * Encode a decoded TGA as PNG, shrinking so the longest side is at most `limit`.
 * @returns {Promise<Buffer>}
 */
export async function tgaToPng(tga, limit = LIMIT_DEFAULT) {
  let img = sharp(tga.data, { raw: { width: tga.width, height: tga.height, channels: tga.channels } });
  if (Math.max(tga.width, tga.height) > limit) {
    img = img.resize(limit, limit, { fit: 'inside', withoutEnlargement: true });
  }
  return img.png().toBuffer();
}
