// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DEFAULT_URL, compareLayout, parseArgs, readPngSize } from './horror-screenshots.mjs';

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

  it('accepts --batch 2b, --dry-run and --help', () => {
    expect(parseArgs(['--batch', '2b'])).toEqual({ batch: '2b', url: DEFAULT_URL });
    expect(parseArgs(['--batch', '2b', '--dry-run'])).toEqual({
      batch: '2b',
      url: DEFAULT_URL,
      dryRun: true,
    });
    expect(parseArgs(['--batch', '2b', '--help'])).toEqual({ help: true });
  });

  it('rejects missing, unsupported and unknown arguments', () => {
    expect(parseArgs([]).error).toMatch(/Missing --batch/);
    expect(parseArgs(['--batch', '9']).error).toMatch(/Unsupported/);
    expect(parseArgs(['--batch']).error).toMatch(/needs a value/);
    expect(parseArgs(['--batch', '2', '--x']).error).toMatch(/Unknown/);
  });
});

describe('horror-screenshots image helpers', () => {
  it('reads the size of the committed reference PNG', () => {
    const ref = readFileSync(
      fileURLToPath(new URL('../../reference/graveyard/horror-direction.png', import.meta.url)),
    );
    expect(readPngSize(ref)).toEqual({ width: 1280, height: 720 });
  });

  it('rejects a buffer that is not a PNG', () => {
    expect(() => readPngSize(Buffer.from('not a png at all, just some text'))).toThrow(/Not a PNG/);
  });

  it('scales the reference to the shot height, right of the shot', () => {
    expect(compareLayout({ width: 1920, height: 1080 }, { width: 1280, height: 720 }, 16)).toEqual({
      width: 3856,
      height: 1080,
      left: { x: 0, width: 1920 },
      right: { x: 1936, width: 1920 },
    });
  });
});
