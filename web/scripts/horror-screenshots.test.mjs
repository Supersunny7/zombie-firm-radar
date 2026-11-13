// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { DEFAULT_URL, parseArgs } from './horror-screenshots.mjs';

describe('horror-screenshots parseArgs', () => {
  it('accepts --batch 2 and defaults the url', () => {
    expect(parseArgs(['--batch', '2'])).toEqual({ batch: '2', url: DEFAULT_URL });
  });

  it('reads --url and trims trailing slashes', () => {
    expect(parseArgs(['--batch', '2', '--url', 'http://localhost:4000/'])).toEqual({
      batch: '2',
      url: 'http://localhost:4000',
    });
  });

  it('rejects missing, unsupported and unknown arguments', () => {
    expect(parseArgs([]).error).toMatch(/Missing --batch/);
    expect(parseArgs(['--batch', '9']).error).toMatch(/Unsupported/);
    expect(parseArgs(['--batch']).error).toMatch(/needs a value/);
    expect(parseArgs(['--batch', '2', '--x']).error).toMatch(/Unknown/);
  });
});
