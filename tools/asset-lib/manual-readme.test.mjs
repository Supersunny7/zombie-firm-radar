import { describe, it, expect } from 'vitest';
import { render, check, manualPicks, HOOK_ID } from './manual-readme.mjs';

const pick = (id, extra = {}) => ({
  id,
  kind: 'model',
  group: 'lab',
  manual: true,
  expectedFile: `${id}.zip`,
  targetFolder: `tools/cache/manual/${id}`,
  source: {
    type: 'manual',
    pageUrl: `https://sketchfab.com/3d-models/${id}`,
    downloadOption: 'Sketchfab "Download 3D Model" > "glTF" (autoconverted) zip. Login required.',
    note: 'Use the grey variant.',
  },
  credits: { title: 'Knife switch', author: 'Someone', sourceUrl: `https://sketchfab.com/3d-models/${id}`, license: 'CC BY 4.0', changes: 'x' },
  ...extra,
});
const fsPick = (id) =>
  pick(id, {
    kind: 'audio',
    expectedFile: `${id}.wav`,
    source: { type: 'manual', pageUrl: 'https://freesound.org/people/u/sounds/1/', downloadOption: 'Freesound "Download" of the original file (not the preview MP3). Login required.' },
    credits: { title: 'Zap', author: 'u', sourceUrl: 'https://freesound.org/people/u/sounds/1/', license: 'CC0', changes: 'x' },
  });

const picks = [
  pick('sketchfab-b'),
  fsPick('freesound-a'),
  { id: 'polyhaven-x', manual: false, source: { type: 'polyhaven' } },
];

describe('manual-readme render', () => {
  const md = render(picks);
  it('lists only manual picks, sorted by id', () => {
    expect(manualPicks(picks).map((p) => p.id)).toEqual(['freesound-a', 'sketchfab-b']);
    expect(md).not.toContain('### polyhaven-x');
    expect(md.indexOf('### freesound-a')).toBeLessThan(md.indexOf('### sketchfab-b'));
  });
  it('writes the block fields', () => {
    expect(md).toContain('- Source page: https://sketchfab.com/3d-models/sketchfab-b');
    expect(md).toContain('- Expected file name: sketchfab-b.zip');
    expect(md).toContain('- Put it at: tools/cache/manual/sketchfab-b/sketchfab-b.zip');
    expect(md).toContain('- Notes: Use the grey variant.');
    expect(md).toContain('- Notes: No edits planned.');
    expect(md).toContain('"Zap" by u (Freesound user), CC0 (https://creativecommons.org/publicdomain/zero/1.0/)');
    expect(md).toContain('Files to download: **2** (1 Sketchfab zips, 1 Freesound sounds).');
  });
  it('is deterministic and ignores input order', () => {
    expect(render([...picks].reverse())).toBe(md);
  });
  it('omits the hook unless its check passed', () => {
    const withHook = [...picks, pick(HOOK_ID)];
    expect(render(withHook)).not.toContain(`### ${HOOK_ID}`);
    expect(render(withHook, { hookCheckPassed: true })).toContain(`### ${HOOK_ID}`);
  });
});

describe('manual-readme check', () => {
  const md = render(picks);
  it('accepts its own output', () => {
    expect(check(picks, md)).toMatchObject({ missing: [], extra: [], incomplete: [], upToDate: true });
  });
  it('reports missing and extra entries', () => {
    const more = [...picks, pick('sketchfab-c')];
    expect(check(more, md).missing).toEqual(['sketchfab-c']);
    expect(check(picks.slice(1), md).extra).toEqual(['sketchfab-b']);
  });
  it('reports a block missing its target path as incomplete', () => {
    const broken = md.replace('- Put it at: tools/cache/manual/sketchfab-b/sketchfab-b.zip\n', '');
    const r = check(picks, broken);
    expect(r.incomplete).toEqual(['sketchfab-b']);
    expect(r.upToDate).toBe(false);
  });
  it('flags text drift while entries still match', () => {
    const r = check(picks, md.replace('Use the grey variant.', 'Other.'));
    expect(r.entriesMatch).toBe(true);
    expect(r.upToDate).toBe(false);
  });
});
