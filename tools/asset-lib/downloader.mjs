// Production downloader for cache.ensureDownloaded: (pick, dir) -> DownloadRecord.
// Handles Poly Haven picks and plain URL picks. Rocketbox avatars also get the sibling
// Textures/*.tga files and the repository LICENSE at the same pinned SHA.
// `httpOpts` ({ fetch, userAgent, sleep, delays }) is passed through to http.mjs so tests inject a fake fetch.
import path from 'node:path';
import { downloadToFile, fetchJson } from './http.mjs';
import { DEFAULT_TEXTURE_MAPS, downloadPolyHavenPick } from './polyhaven.mjs';
import { safeJoin } from './paths.mjs';
import { sha256File } from './cache.mjs';

const ROCKETBOX_RAW =
  /^https:\/\/raw\.githubusercontent\.com\/microsoft\/Microsoft-Rocketbox\/([0-9a-f]{40})\/(.+)\/Export\/[^/]+\.fbx$/i;

/** Rocketbox FBX url -> { sha, dir } or null. Pure. */
export function parseRocketboxUrl(url) {
  const m = ROCKETBOX_RAW.exec(url);
  return m ? { sha: m[1], dir: m[2] } : null;
}

async function record(dir, files, extra = {}) {
  const out = [];
  for (const f of files) {
    const full = safeJoin(dir, ...f.file.split('/'));
    out.push({ ...f, bytes: f.bytes, sha256: f.sha256 ?? (await sha256File(full)) });
  }
  return { sourceUrls: files.map((f) => f.url), files: out.map(({ url, ...rest }) => rest), ...extra };
}

async function fetchRocketboxExtras(pick, dir, httpOpts) {
  const rb = parseRocketboxUrl(pick.source.url);
  if (!rb || pick.kind !== 'avatar') return [];
  const listUrl = `https://api.github.com/repos/microsoft/Microsoft-Rocketbox/contents/${rb.dir}/Textures?ref=${rb.sha}`;
  const listing = await fetchJson(listUrl, httpOpts);
  if (!Array.isArray(listing)) throw new Error(`${listUrl}: unexpected response`);
  const items = listing
    .filter((e) => e?.type === 'file' && /\.tga$/i.test(e.name) && typeof e.download_url === 'string')
    .sort((a, b) => (a.name < b.name ? -1 : 1));
  if (items.length === 0) throw new Error(`${listUrl}: no .tga textures listed`);
  const files = [];
  for (const it of items) {
    if (new URL(it.download_url).hostname !== 'raw.githubusercontent.com') {
      throw new Error(`refusing texture URL outside raw.githubusercontent.com: ${it.download_url}`);
    }
    const rel = `Textures/${it.name}`;
    const r = await downloadToFile(it.download_url, safeJoin(dir, 'Textures', it.name), httpOpts);
    files.push({ file: rel, url: it.download_url, bytes: r.bytes, sha256: r.sha256, md5: r.md5 });
  }
  const licenseUrl = `https://raw.githubusercontent.com/microsoft/Microsoft-Rocketbox/${rb.sha}/LICENSE.md`;
  const lic = await downloadToFile(licenseUrl, safeJoin(dir, 'LICENSE'), httpOpts);
  files.push({ file: 'LICENSE', url: licenseUrl, bytes: lic.bytes, sha256: lic.sha256, md5: lic.md5 });
  return files;
}

/** @returns {(pick, dir) => Promise<{sourceUrls:string[], files:object[], apiResponse?:object}>} */
export function makeDownloader(httpOpts = {}) {
  return async function download(pick, dir) {
    const src = pick.source;
    if (src.type === 'polyhaven') {
      const { records, apiResponse } = await downloadPolyHavenPick(pick.kind, src, dir, httpOpts);
      const maps = pick.kind === 'texture' ? (src.maps?.length ? src.maps : DEFAULT_TEXTURE_MAPS) : [];
      const files = records.map((r, i) => ({
        file: r.file,
        url: r.url,
        bytes: r.bytes,
        sha256: r.sha256,
        md5: r.md5,
        ...(maps[i] ? { map: maps[i] } : {}),
      }));
      return record(dir, files, { apiResponse });
    }
    if (src.type === 'url') {
      const name = decodeURIComponent(path.posix.basename(new URL(src.url).pathname));
      const r = await downloadToFile(src.url, safeJoin(dir, name), httpOpts);
      if (src.sha256 && r.sha256 !== src.sha256.toLowerCase()) {
        throw new Error(`${name}: sha256 ${r.sha256} does not match the pick`);
      }
      const files = [{ file: name, url: src.url, bytes: r.bytes, sha256: r.sha256, md5: r.md5 }];
      files.push(...(await fetchRocketboxExtras(pick, dir, httpOpts)));
      return record(dir, files);
    }
    throw new Error(`downloader: source type ${src.type} is not downloadable`);
  };
}
