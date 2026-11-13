// Screenshot driver for preview scenes. Starts the static preview server in-process, drives headed
// Chrome through web/scripts/lib/browser.mjs, writes PNGs at 1920x1080.
// Usage: node tools/preview/screenshot.mjs --scene horror-assets
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "./serve.mjs";
import { launchChrome } from "../../web/scripts/lib/browser.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..", "..");

const SCENES = {
  "horror-assets": {
    page: "horror-assets.html",
    shots: [
      ["assets", "horror-batch1-assets.png"],
      ["ground", "horror-batch1-ground.png"],
      ["possessed-undead", "horror-batch1-possessed-undead.png"],
      ["zombie-pxltiger", "horror-batch1-zombie-pxltiger.png"],
      ["zombie-walk-oscar", "horror-batch1-zombie-walk-oscar.png"],
      ["hooded-woman", "horror-batch1-hooded-woman.png"],
    ],
  },
  // Task 3.31: same page, camera and lights for the before and after shots (see SETUP in horror-stones.js).
  "horror-stones-before": {
    page: "horror-stones.html",
    shots: [
      ["prefix", "horror-batch2b-stone-before.png"],
      ["metalmap", "horror-batch2b-stone-diagnostic-metalnessmap.png"],
    ],
  },
  "horror-stones-after": {
    page: "horror-stones.html",
    shots: [["app", "horror-batch2b-stone-after.png"]],
  },
};

const i = process.argv.indexOf("--scene");
const scene = SCENES[i >= 0 ? process.argv[i + 1] : ""];
if (!scene) {
  console.error(`usage: --scene ${Object.keys(SCENES).join("|")}`);
  process.exit(2);
}
const extra = process.argv.includes("--exposure") ? `&exposure=${process.argv[process.argv.indexOf("--exposure") + 1]}` : "";

const server = createServer();
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const outDir = path.join(repo, "reference", "progress");
fs.mkdirSync(outDir, { recursive: true });

const browser = await launchChrome();
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on("console", (m) => m.type() === "error" && console.error("[page]", m.text()));
  for (const [shot, file] of scene.shots) {
    await page.goto(`${base}/${scene.page}?shot=${shot}${extra}`);
    await page.waitForFunction(() => window.__ready === true || window.__error, null, { timeout: 60_000 });
    const err = await page.evaluate(() => window.__error);
    if (err) throw new Error(`${shot}: ${err}`);
    console.log(shot, JSON.stringify(await page.evaluate(() => window.__stats)));
    await page.locator("canvas").screenshot({ path: path.join(outDir, file) });
    console.log("wrote", file);
  }
} finally {
  await browser.close();
  server.close();
  server.closeAllConnections?.();
}
