import { mkdtemp, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  convertTexture, fitInside, isNormalMap, sizeWarning, textureLimit, webpOptions,
} from './convert-texture.mjs';

let dir;
beforeEach(async () => { dir = await mkdtemp(path.join(os.tmpdir(), 'tex-')); });
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

async function makePng(name, width, height, channels = 3) {
  const file = path.join(dir, name);
  const background = channels === 4 ? { r: 120, g: 30, b: 30, alpha: 0.5 } : { r: 120, g: 30, b: 30 };
  await sharp({ create: { width, height, channels, background } }).png().toFile(file);
  return file;
}

const metaOf = async (file) => sharp(await readFile(file)).metadata();

describe('fitInside', () => {
  it('shrinks the longest side to L and keeps the ratio', () => {
    expect(fitInside(4000, 2000, 1024)).toEqual({ width: 1024, height: 512 });
    expect(fitInside(2000, 4000, 2048)).toEqual({ width: 1024, height: 2048 });
  });
  it('never enlarges', () => {
    expect(fitInside(300, 200, 1024)).toEqual({ width: 300, height: 200 });
  });
  it('rejects invalid input', () => {
    expect(() => fitInside(0, 5, 1024)).toThrow();
    expect(() => fitInside(5, 1.5, 1024)).toThrow();
  });
  it('property: longest side = min(max, L), no enlargement, ratio within a pixel', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 20000 }), fc.integer({ min: 1, max: 20000 }), fc.constantFrom(1024, 2048),
      (w, h, L) => {
        const r = fitInside(w, h, L);
        expect(Math.max(r.width, r.height)).toBe(Math.min(Math.max(w, h), L));
        expect(r.width).toBeLessThanOrEqual(w);
        expect(r.height).toBeLessThanOrEqual(h);
        const scale = Math.max(r.width, r.height) / Math.max(w, h);
        expect(Math.abs(r.width - w * scale)).toBeLessThanOrEqual(1);
        expect(Math.abs(r.height - h * scale)).toBeLessThanOrEqual(1);
      },
    ));
  });
});

describe('helpers', () => {
  it('uses 2048 only for ground-main', () => {
    expect(textureLimit({ role: 'ground-main' })).toBe(2048);
    expect(textureLimit({ role: 'other' })).toBe(1024);
    expect(textureLimit({})).toBe(1024);
  });
  it('uses quality 90 for normal maps and 82 otherwise', () => {
    expect(isNormalMap('normal')).toBe(true);
    expect(isNormalMap('nor_gl')).toBe(true);
    expect(isNormalMap('color')).toBe(false);
    expect(webpOptions('normal')).toMatchObject({ quality: 90, nearLossless: false });
    expect(webpOptions('color').quality).toBe(82);
  });
  it('warns above 5 MB with a suggestion', () => {
    expect(sizeWarning('a.webp', 5_242_880)).toBeNull();
    expect(sizeWarning('a.webp', 5_242_881)).toMatch(/5\.00 MB.*Suggestion/);
  });
});

describe('convertTexture', () => {
  it('converts to WebP, limits to 1024 and keeps alpha', async () => {
    const color = await makePng('c.png', 1500, 700, 4);
    const out = path.join(dir, 'work');
    const { files, warnings } = await convertTexture({ id: 'tomb' }, [{ map: 'color', path: color }], out);
    expect(warnings).toEqual([]);
    expect(files).toHaveLength(1);
    expect(files[0].fileName).toBe('tomb_color.webp');
    const meta = await metaOf(path.join(out, 'tomb_color.webp'));
    expect(meta.format).toBe('webp');
    expect(meta.width).toBe(1024);
    expect(meta.height).toBe(Math.round(700 * 1024 / 1500));
    expect(meta.hasAlpha).toBe(true);
    expect(await readdir(out)).toEqual(['tomb_color.webp']);
  });

  it('uses 2048 for ground-main and does not enlarge small images', async () => {
    const big = await makePng('b.png', 2600, 2600);
    const small = await makePng('s.png', 64, 32);
    const out = path.join(dir, 'work');
    await convertTexture({ id: 'ground', role: 'ground-main' }, [{ map: 'color', path: big }, { map: 'rough', path: small }], out);
    expect((await metaOf(path.join(out, 'ground_color.webp'))).width).toBe(2048);
    const s = await metaOf(path.join(out, 'ground_rough.webp'));
    expect([s.width, s.height]).toEqual([64, 32]);
  });

  it('is byte-identical on repeated runs (Req 14.3)', async () => {
    const color = await makePng('c.png', 1300, 900);
    const normal = await makePng('n.png', 1300, 900);
    const inputs = [{ map: 'color', path: color }, { map: 'normal', path: normal }];
    await convertTexture({ id: 'x' }, inputs, path.join(dir, 'w1'));
    await convertTexture({ id: 'x' }, inputs, path.join(dir, 'w2'));
    for (const f of ['x_color.webp', 'x_normal.webp']) {
      const a = await readFile(path.join(dir, 'w1', f));
      const b = await readFile(path.join(dir, 'w2', f));
      expect(a.equals(b)).toBe(true);
    }
  });

  it('leaves no output when a later input is unreadable', async () => {
    const good = await makePng('g.png', 100, 100);
    const bad = path.join(dir, 'bad.png');
    await writeFile(bad, 'not an image');
    const out = path.join(dir, 'work');
    await expect(convertTexture({ id: 'y' }, [{ map: 'color', path: good }, { map: 'normal', path: bad }], out)).rejects.toThrow();
    const left = await readdir(out).catch(() => []);
    expect(left).toEqual([]);
  });

  it('rejects bad pick and map names', async () => {
    const good = await makePng('g.png', 10, 10);
    await expect(convertTexture({ id: 'y' }, [{ map: '../x', path: good }], dir)).rejects.toThrow(/invalid map/);
    await expect(convertTexture({ id: 'y' }, [], dir)).rejects.toThrow(/no input/);
    await expect(convertTexture({}, [{ map: 'a', path: good }], dir)).rejects.toThrow(/pick.id/);
  });
});
