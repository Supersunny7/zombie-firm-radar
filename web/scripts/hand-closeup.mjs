// Saves six Craggle hand close-ups to reference/progress/. Never starts a server.
// Usage: node scripts/hand-closeup.mjs [--url http://localhost:5173]
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isReachable, launchChrome } from './lib/browser.mjs';

const ANGLES = [
  'top',
  'side',
  'front',
  'three-quarter-left',
  'three-quarter-right',
  'rising-preview',
];
const argIdx = process.argv.indexOf('--url');
const baseUrl = (argIdx > -1 ? process.argv[argIdx + 1] : undefined) ?? 'http://localhost:5173';
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'reference', 'progress');

if (!(await isReachable(baseUrl))) {
  console.error(
    `Dev server not reachable at ${baseUrl}. Start it with "pnpm dev" in another terminal.`,
  );
  process.exit(1);
}

let browser;
try {
  browser = await launchChrome();
} catch (err) {
  console.error(`Could not launch Google Chrome: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const paths = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 960 } });
  for (const angle of ANGLES) {
    await page.goto(`${baseUrl}/?view=hand-closeup&angle=${angle}`, { waitUntil: 'load' });
    await page.waitForSelector('body[data-hand-ready="true"]', {
      state: 'attached',
      timeout: 30_000,
    });
    await page.waitForTimeout(500);
    const file = join(outDir, `craggle-hand-${angle}.png`);
    await page.screenshot({ path: file });
    if (!existsSync(file) || statSync(file).size === 0) {
      throw new Error(`File was not written: ${file}`);
    }
    paths.push(file);
  }
} catch (err) {
  console.error(`Hand close-up failed: ${err instanceof Error ? err.message : err}`);
  await browser.close();
  process.exit(1);
}
await browser.close();
for (const p of paths) console.log(p);
