// Saves lights-off Horror_Pass screenshots to reference/progress/. Never starts a server.
// Usage: node scripts/horror-screenshots.mjs --batch 2|2b [--url http://localhost:5173] [--dry-run]
// State is reached through the UI (lights button, plot chips, pointer) and the DEV-only
// `?horror=zombies|fallen` / `&shock=<pp>` helper (marker __zfr_horror_debug__, forbidden in the
// production bundle by check-bundle). Batch 2b uses the UI only (Plot 1 chip, no helper).
/* global document -- used only inside page.waitForFunction / page.evaluate callbacks */
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isReachable, launchChrome } from './lib/browser.mjs';

export const DEFAULT_URL = 'http://localhost:5173';
export const BATCHES = ['2', '2b'];
const DESKTOP = { width: 1920, height: 1080 };
const MOBILE = { width: 390, height: 844 };
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = join(REPO_ROOT, 'reference', 'progress');
const LOOK_REFERENCE = join(REPO_ROOT, 'reference', 'graveyard', 'horror-direction.png');
const READY_SELECTOR = 'body[data-graveyard-ready="true"]';
const USAGE =
  'Usage: node scripts/horror-screenshots.mjs --batch 2|2b [--url <url>] [--dry-run]\n' +
  '  --batch 2   five Batch 2 shots (horror-batch2-*.png)\n' +
  '  --batch 2b  horror-batch2b-look.png (1920 x 1080, lights off, Plot 1) and\n' +
  '              horror-batch2b-look-vs-reference.png (left: new shot, right: horror-direction.png)\n' +
  '  --dry-run   check arguments and the reference image, print the plan, open no browser\n' +
  'The dev server must already run ("pnpm dev"); the script never starts it.';

/** Parses argv (without node and script). Returns { batch, url[, dryRun] }, { help } or { error }. */
export function parseArgs(argv) {
  let batch;
  let url = DEFAULT_URL;
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') return { help: true };
    if (a === '--dry-run') {
      dryRun = true;
    } else if (a === '--batch' || a === '--url') {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) return { error: `${a} needs a value` };
      if (a === '--batch') batch = v;
      else url = v;
      i++;
    } else {
      return { error: `Unknown argument: ${a}` };
    }
  }
  const supported = BATCHES.join(', ');
  if (batch === undefined) return { error: `Missing --batch (supported: ${supported})` };
  if (!BATCHES.includes(batch)) {
    return { error: `Unsupported batch "${batch}" (supported: ${supported})` };
  }
  return { batch, url: url.replace(/\/+$/, ''), ...(dryRun ? { dryRun: true } : {}) };
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Width and height from a PNG's IHDR chunk. Throws if the buffer is not a PNG. */
export function readPngSize(buf) {
  if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('Not a PNG file');
  }
  if (buf.subarray(12, 16).toString('latin1') !== 'IHDR') throw new Error('PNG has no IHDR chunk');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** Throws unless the PNG at `file` exists, is not empty and is exactly `expected` pixels. */
export function assertPngSize(file, expected) {
  if (!existsSync(file) || statSync(file).size === 0)
    throw new Error(`File was not written: ${file}`);
  const { width, height } = readPngSize(readFileSync(file));
  if (width !== expected.width || height !== expected.height) {
    throw new Error(
      `${file} is ${width} x ${height}, expected ${expected.width} x ${expected.height}`,
    );
  }
}

/**
 * Side-by-side layout: the shot at its own size on the left, the reference scaled to the shot's
 * height on the right, `gap` pixels apart.
 */
export function compareLayout(shot, reference, gap = 16) {
  const refWidth = Math.round((reference.width * shot.height) / reference.height);
  return {
    width: shot.width + gap + refWidth,
    height: shot.height,
    left: { x: 0, width: shot.width },
    right: { x: shot.width + gap, width: refWidth },
  };
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

async function openPage(browser, baseUrl, viewport, isMobile, query, { waitReady = false } = {}) {
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
  if (waitReady) await page.waitForSelector(READY_SELECTOR, { state: 'attached', timeout: 60_000 });
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

export const BATCH_2B_LOOK = 'horror-batch2b-look.png';
export const BATCH_2B_COMPARE = 'horror-batch2b-look-vs-reference.png';
/**
 * After framing: camera move 1.2 s (CameraRig MOVE_SECONDS) and lights ease about 0.46 s
 * (lightsBlend LIGHTS_EASE_RATE 10), plus the same margin as the Batch 2 plot shots for texture
 * upload and the grade's first frames.
 */
const BATCH_2B_SETTLE_MS = 9000;

async function runBatch2b(browser, baseUrl, outDir) {
  const { context, page } = await openPage(browser, baseUrl, DESKTOP, false, '', {
    waitReady: true,
  });
  let look;
  try {
    // The Lights toggle must not remount the scene (Requirement 25); wait for the flag again anyway.
    await page.waitForSelector(READY_SELECTOR, { state: 'attached', timeout: 60_000 });
    if (!(await page.getByRole('button', { name: 'Lights on', exact: true }).count())) {
      throw new Error('Lights are not off (no "Lights on" button)');
    }
    await frame(page, 'plot');
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('nav[aria-label="Plots"] button')].some(
          (b) => b.textContent?.startsWith('1.') && b.getAttribute('aria-pressed') === 'true',
        ),
      undefined,
      { timeout: 10_000 },
    );
    look = await shoot(page, outDir, BATCH_2B_LOOK, DESKTOP, { settleMs: BATCH_2B_SETTLE_MS });
  } finally {
    await context.close();
  }
  assertPngSize(look, DESKTOP);
  const compare = await writeComparison(
    browser,
    look,
    LOOK_REFERENCE,
    join(outDir, BATCH_2B_COMPARE),
  );
  return [look, compare];
}

/** Renders `shotFile` and `referenceFile` side by side in a page and screenshots it. */
async function writeComparison(browser, shotFile, referenceFile, outFile) {
  const shotBuf = readFileSync(shotFile);
  const refBuf = readFileSync(referenceFile);
  const shot = readPngSize(shotBuf);
  const layout = compareLayout(shot, readPngSize(refBuf));
  const context = await browser.newContext({
    viewport: { width: layout.width, height: layout.height },
    deviceScaleFactor: 1,
  });
  try {
    const page = await context.newPage();
    const img = (buf, box) =>
      `<img src="data:image/png;base64,${buf.toString('base64')}" style="position:absolute;top:0;` +
      `left:${box.x}px;width:${box.width}px;height:${layout.height}px">`;
    await page.setContent(
      '<!doctype html><html><body style="margin:0;background:#05070A;overflow:hidden">' +
        img(shotBuf, layout.left) +
        img(refBuf, layout.right) +
        '</body></html>',
      { waitUntil: 'load' },
    );
    await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
    await page.screenshot({ path: outFile });
  } finally {
    await context.close();
  }
  assertPngSize(outFile, { width: layout.width, height: layout.height });
  return outFile;
}

function printPlan(args) {
  const base = `${args.url}/?firms=3000`;
  if (args.batch === '2b') {
    const ref = readPngSize(readFileSync(LOOK_REFERENCE));
    const layout = compareLayout(DESKTOP, ref);
    console.log(`Dry run, batch 2b: ${base}, headed Chrome, 1920 x 1080, lights off, Plot 1`);
    console.log(`  ${join(OUT_DIR, BATCH_2B_LOOK)} (1920 x 1080)`);
    console.log(
      `  ${join(OUT_DIR, BATCH_2B_COMPARE)} (${layout.width} x ${layout.height}; reference ` +
        `${ref.width} x ${ref.height} scaled to ${layout.right.width} x ${layout.height})`,
    );
  } else {
    console.log(`Dry run, batch 2: ${base}, headed Chrome, lights off`);
    for (const s of SHOTS) console.log(`  ${join(OUT_DIR, s.name)}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE);
    return;
  }
  if (args.error) {
    console.error(`${args.error}\n${USAGE}`);
    process.exit(1);
  }
  if (args.dryRun) {
    try {
      printPlan(args);
    } catch (err) {
      console.error(`Dry run failed: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
    return;
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
  const outDir = OUT_DIR;
  mkdirSync(outDir, { recursive: true });
  try {
    const run = args.batch === '2b' ? runBatch2b : runBatch2;
    const files = await run(browser, args.url, outDir);
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
