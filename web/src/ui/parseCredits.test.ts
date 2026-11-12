import { describe, expect, it } from 'vitest';
import { parseCredits, parseInline } from './parseCredits';

const SAMPLE = `# Credits
Rules live in \`.kiro/steering/asset-licensing.md\`.
## Assets
| Path | Title | Author | Source URL | License | Changes we made |
| --- | --- | --- | --- | --- | --- |
| web/public/assets/audio/a/a.ogg | Crows cawing | giddster | https://freesound.org/people/giddster/sounds/437345/ | CC0 | Original file kept |
| web/public/assets/x.glb | Thing | Someone | [page](https://example.com/x) | MIT | Converted, see [notes](https://example.com/n) |
| web/public/assets/y.glb | Odd | Nobody | javascript:alert(1) | CC0 | none |
## Services
Powered by Poly Haven (polyhaven.com).`;

describe('parseCredits', () => {
  const blocks = parseCredits(SAMPLE);

  it('parses headings and paragraphs, skipping header and separator rows', () => {
    expect(blocks[0]).toEqual({ type: 'heading', level: 1, text: 'Credits' });
    expect(blocks.filter((b) => b.type === 'heading')).toHaveLength(3);
    expect(blocks.filter((b) => b.type === 'entry')).toHaveLength(3);
    expect(blocks.some((b) => b.type === 'text' && b.inline.some((i) => i.kind === 'code'))).toBe(
      true,
    );
  });

  it('parses a bare URL source and a markdown link source', () => {
    const e = blocks.filter((b) => b.type === 'entry');
    expect(e[0]).toMatchObject({ title: 'Crows cawing', author: 'giddster', license: 'CC0' });
    expect(e[0]?.sourceUrl).toBe('https://freesound.org/people/giddster/sounds/437345/');
    expect(e[1]?.sourceUrl).toBe('https://example.com/x');
    expect(e[1]?.changes.some((c) => c.kind === 'link')).toBe(true);
  });

  it('never produces a link for non-http(s) URLs', () => {
    const e = blocks.filter((b) => b.type === 'entry')[2];
    expect(e?.sourceUrl).toBeNull();
    expect(e?.sourceText).toBe('javascript:alert(1)');
    expect(parseInline('[x](javascript:void0)')).toEqual([{ kind: 'text', text: 'x' }]);
  });

  it('falls back to plain text for unparseable table lines', () => {
    const b = parseCredits('| just | two |');
    expect(b).toEqual([{ type: 'text', inline: [{ kind: 'text', text: '| just | two |' }] }]);
  });

  it('returns no blocks for empty input', () => {
    expect(parseCredits(' \n ')).toEqual([]);
  });
});
