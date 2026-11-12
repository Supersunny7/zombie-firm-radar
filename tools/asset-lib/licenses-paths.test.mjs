import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkLicense, normalizeLicense } from './licenses.mjs';
import { ASSET_ROOT, planOutputs, safeJoin } from './paths.mjs';

const pick = (over = {}) => ({
  id: 'x',
  kind: 'model',
  credits: {
    title: 'T',
    author: 'A',
    sourceUrl: 'https://sketchfab.com/3d-models/x',
    license: 'CC0',
    changes: 'c',
    ...over,
  },
});

describe('checkLicense', () => {
  it('accepts aliases after normalisation', () => {
    expect(checkLicense(pick({ license: '  CC0_1.0 ' }))).toEqual({ ok: true, canonical: 'CC0' });
    expect(checkLicense(pick({ license: 'CC-BY-4.0' }))).toEqual({ ok: true, canonical: 'CC BY' });
    expect(checkLicense(pick({ license: 'Our  own work' })).canonical).toBe('Own work');
    expect(checkLicense(pick({ license: 'OFL-1.1' })).canonical).toBe('SIL OFL');
  });

  it('rejects NC variants as forbidden', () => {
    for (const license of ['CC BY-NC 4.0', 'cc-by-nc-sa-4.0', 'Non-Commercial', 'noncommercial use']) {
      expect(checkLicense(pick({ license }))).toEqual({ ok: false, reason: 'forbidden' });
    }
  });

  it('rejects forbidden hosts including subdomains', () => {
    for (const sourceUrl of ['https://www.mixamo.com/a', 'https://fab.com/x', 'https://x.turbosquid.com/y']) {
      expect(checkLicense(pick({ sourceUrl }))).toEqual({ ok: false, reason: 'forbidden' });
    }
  });

  it('refuses SA, ND, prefixes and unknown strings', () => {
    for (const license of ['CC BY-SA', 'CC BY-ND 4.0', 'CC0 plus', 'GPL']) {
      expect(checkLicense(pick({ license })).reason).toBe('not on allow list');
    }
  });

  it('names the missing field', () => {
    expect(checkLicense(pick({ sourceUrl: '' })).reason).toContain('sourceUrl');
    expect(checkLicense(pick({ author: '  ' })).reason).toContain('author');
    expect(checkLicense(pick({ license: '' })).reason).toContain('license');
  });

  it('requires an http(s) sourceUrl for CC BY', () => {
    expect(checkLicense(pick({ license: 'CC BY', sourceUrl: 'ftp://x/y' })).ok).toBe(false);
  });

  it('normalizes', () => {
    expect(normalizeLicense(' CC_BY \n 4.0 ')).toBe('cc by 4.0');
  });
});

describe('safeJoin', () => {
  const root = path.resolve('some', 'root');
  it('joins inside the root', () => {
    expect(safeJoin(root, 'a', 'b.txt')).toBe(path.join(root, 'a', 'b.txt'));
  });
  it('throws on traversal, absolute parts and empty result', () => {
    expect(() => safeJoin(root, '..', 'x')).toThrow();
    expect(() => safeJoin(root, 'a', '..', '..', 'x')).toThrow();
    expect(() => safeJoin(root, path.resolve('other'))).toThrow();
    expect(() => safeJoin(root, '.')).toThrow();
  });
});

describe('planOutputs', () => {
  it('maps kinds to folders', () => {
    const kinds = {
      texture: 'textures',
      hdri: 'hdri',
      model: 'models',
      avatar: 'avatars',
      animation: 'animations',
      audio: 'audio',
    };
    for (const [kind, folder] of Object.entries(kinds)) {
      const out = planOutputs({ id: 'my-pick', kind }, [{ fileName: 'a.bin', bytes: 3 }]);
      expect(out).toEqual([{ fileName: 'a.bin', bytes: 3, relPath: `${folder}/my-pick/a.bin` }]);
    }
  });
  it('rejects traversal in ids and file names', () => {
    expect(() => planOutputs({ id: '../evil', kind: 'model' }, [])).toThrow();
    expect(() => planOutputs({ id: 'ok', kind: 'model' }, [{ fileName: '../a' }])).toThrow();
    expect(() => planOutputs({ id: 'ok', kind: 'nope' }, [])).toThrow();
  });
  it('asset root ends in web/public/assets', () => {
    expect(ASSET_ROOT.replaceAll('\\', '/')).toMatch(/web\/public\/assets$/);
  });
});
