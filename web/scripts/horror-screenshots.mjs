// Saves lights-off Horror_Pass screenshots to reference/progress/. Never starts a server.
// Usage: node scripts/horror-screenshots.mjs --batch 2 [--url http://localhost:5173]
// State is reached through the UI (lights button, plot chips, pointer) and the DEV-only
// `?horror=zombies|fallen` / `&shock=<pp>` helper (marker __zfr_horror_debug__, forbidden in the
// production bundle by check-bundle).
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isReachable, launchChrome } from './lib/browser.mjs';

export const DEFAULT_URL = 'http://localhost:5173';
export const BATCHES = ['2'];
const DESKTOP = { width: 1920, height: 1080 };
const MOBILE = { width: 390, height: 844 };

/** Parses argv (without node and script). Returns { batch, url } or { error }. */
export function parseArgs(argv) {
  let batch;
  let url = DEFAULT_URL;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--batch' || a === '--url') {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) return { error: `${a} needs a value` };
      if (a === '--batch') batch = v;
      else url = v;
      i++;
    } else {
      return { error: `Unknown argument: ${a}` };
    }
  }
  if (batch === undefined) return { error: 'Missing --batch (supported: 2)' };
  if (!BATCHES.includes(batch)) return { error: `Unsupported batch "${batch}" (supported: 2)` };
  return { batch, url: url.replace(/\/+$/, '') };
}

async function lightsOff(page) {
  // The button label names the mode the click switches to; "Lights off" means lights are on now.
  const btn = page.getByRole('button', { name: 'Lights off', exact: true });
  if (await btn.count()) {
    await btn.first().click();
    await page.waitForTimeout(600);
  }
}

async function frame(page, target) {
  const nav = page.getByRole('navigation', { name: 'Plots' });
  await nav.waitFor({ state: 'attached', timeout: 60_000 });
  const chip =
    target === 'overview'
      ? nav.getByRole('button', { name: /Overview/ })
      : nav.getByRole('button', { name: /^1\./ });
  if ((await chip.first().getAttribute('aria-pressed')) === 'true') return;
  await chip.first().focus();
  await chip.first().click({ force: true });
}

async function openPage(browser, baseUrl, viewport, isMobile, query) {
  const context = await browser.newContext({
    viewport,
    ...(isMobile ? { hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : {}),
  });
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning')
      console.log(`[browser ${m.type()}] ${m.text()}`);
    if (m.text().includes('__zfr_horror_debug__')) console.log(`[helper] ${m.text()}`);
  });
  await page.goto(`${baseUrl}/?firms=3000${query}`, { waitUntil: 'load' });
  await page.locator('canvas').first().waitFor({ state: 'attached', timeout: 60_000 });
  await lightsOff(page);
  return { context, page };
}

async function shoot(page, outDir, name, viewport, { centrePointer = true, settleMs = 2500 } = {}) {
  if (centrePointer) await page.mouse.move(viewport.width / 2, viewport.height / 2);
  await page.waitForTimeout(settleMs); // camera move, textures and fade-in settle
  const file = join(outDir, name);
  await page.screenshot({ path: file });
  if (!existsSync(file) || statSync(file).size === 0) {
    throw new Error(`File was not written: ${file}`);
  }
  return file;
}

/**
 * Each shot uses its own page so the five files differ. The DEV-only helper frames the cases:
 * `horror=zombies` (first plot with zombie firms at shock 0) and `horror=fallen` (a plot with a
 * fallen stone in view). HORROR_ONLY=plot,stones limits the run (iteration aid).
 */
const SHOTS = [
  { name: 'horror-batch2-plot.png', query: '&horror=zombies', view: 'plot', settleMs: 9000 },
  { name: 'horror-batch2-ground-graves.png', query: '', view: 'plot', settleMs: 9000 },
  { name: 'horror-batch2-stones.png', query: '&horror=fallen', view: 'plot', settleMs: 9000 },
  { name: 'horror-batch2-overview.png', query: '', view: 'overview', settleMs: 7000 },
  {
    name: 'horror-batch2-mobile.png',
    query: '&horror=zombies',
    view: 'plot',
    mobile: true,
    settleMs: 9000,
  },
];

async function runBatch2(browser, baseUrl, outDir) {
  const only = (process.env.HORROR_ONLY ?? '').split(',').filter(Boolean);
  const files = [];
  for (const s of SHOTS) {
    if (only.length && !only.some((o) => s.name.includes(o))) continue;
    const viewport = s.mobile ? MOBILE : DESKTOP;
    const { context, page } = await openPage(
      browser,
      baseUrl,
      viewport,
      Boolean(s.mobile),
      s.query,
    );
    try {
      // The helper frames the plot itself; plain shots frame Plot 1 or the overview through the UI.
      if (s.query === '' || s.view === 'overview') await frame(page, s.view);
      files.push(
        await shoot(page, outDir, s.name, viewport, {
          centrePointer: !s.mobile,
          settleMs: s.settleMs,
        }),
      );
    } finally {
      await context.close();
    }
  }
  return files;
}
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.error) {
    console.error(
      `${args.error}\nUsage: node scripts/horror-screenshots.mjs --batch 2 [--url <url>]`,
    );
    process.exit(1);
  }
  if (!(await isReachable(args.url))) {
    console.error(
      `Dev server not reachable at ${args.url}. Start it with "pnpm dev" in another terminal.`,
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
  const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'reference', 'progress');
  mkdirSync(outDir, { recursive: true });
  try {
    const files = await runBatch2(browser, args.url, outDir);
    for (const f of files) console.log(f);
  } catch (err) {
    console.error(`Horror screenshots failed: ${err instanceof Error ? err.message : err}`);
    await browser.close();
    process.exit(1);
  }
  await browser.close();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
