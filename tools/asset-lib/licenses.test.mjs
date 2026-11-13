import { describe, expect, it } from 'vitest';
import { checkLicense } from './licenses.mjs';

const credits = (over = {}) => ({
  title: 'Zombie Walk Test',
  author: 'OSCAR CREATIVO',
  sourceUrl: 'https://sketchfab.com/3d-models/zombie-walk-test',
  license: 'CC BY 4.0',
  ...over,
});

describe('license check, graveyard-horror-pass', () => {
  it('refuses a pick whose source host is mixamo.com (or a subdomain)', () => {
    for (const sourceUrl of ['https://mixamo.com/#/?page=1', 'https://www.mixamo.com/clip', 'https://a.b.mixamo.com/x']) {
      const pick = { edits: [{ op: 'removeAnimations' }], credits: credits({ sourceUrl }) };
      expect(checkLicense(pick)).toEqual({ ok: false, reason: 'forbidden' });
    }
  });

  it('accepts a CC BY Sketchfab pick whose edits remove the animation clips', () => {
    const pick = { edits: [{ op: 'removeAnimations' }], credits: credits() };
    expect(checkLicense(pick)).toEqual({ ok: true, canonical: 'CC BY' });
  });
});
