// HTTP helpers for the asset fetch stage (Requirement 14, 19.7).
// User-Agent names the project with a contact URL, 60 s timeout per attempt,
// 2 retries (1 s then 2 s back-off), streaming downloads to a `.part` file.
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

export const TIMEOUT_MS = 60_000;
export const RETRY_DELAYS_MS = [1000, 2000];

const PACKAGE_JSON = fileURLToPath(new URL('../package.json', import.meta.url));

/** Turn a package.json `repository` value into a plain https URL. */
export function contactUrlFrom(repository) {
  const raw = typeof repository === 'string' ? repository : repository?.url;
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new Error('package.json has no repository.url for the User-Agent contact URL');
  }
  return raw
    .replace(/^git\+/, '')
    .replace(/^git:\/\//, 'https://')
    .replace(/^git@github\.com:/, 'https://github.com/')
    .replace(/\.git$/, '');
}

/** `ZombieFirmRadar-asset-fetch/1.0 (+<repository url>)`, read from package.json at run time. */
export async function buildUserAgent(packageJsonPath = PACKAGE_JSON) {
  const pkg = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  return `ZombieFirmRadar-asset-fetch/1.0 (+${contactUrlFrom(pkg.repository)})`;
}

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function describe(err) {
  if (err?.name === 'TimeoutError' || err?.name === 'AbortError') return 'timeout';
  return err?.message ?? String(err);
}

/**
 * Run `attempt(signal)` up to 3 times (first try + 2 retries).
 * Throws `Error("<url>: <cause>")` after the last failure.
 */
export async function withRetry(url, attempt, opts = {}) {
  const { timeoutMs = TIMEOUT_MS, sleep = defaultSleep, delays = RETRY_DELAYS_MS } = opts;
  let lastError;
  for (let i = 0; i <= delays.length; i += 1) {
    try {
      return await attempt(AbortSignal.timeout(timeoutMs));
    } catch (err) {
      lastError = err;
      if (i < delays.length) await sleep(delays[i]);
    }
  }
  const error = new Error(`${url}: ${describe(lastError)}`);
  error.cause = lastError;
  throw error;
}

function requireHttps(url) {
  if (new URL(url).protocol !== 'https:') throw new Error(`${url}: only https is allowed`);
}

async function headers(opts) {
  return { 'User-Agent': opts.userAgent ?? (await buildUserAgent()) };
}

/** GET a URL and parse JSON, with timeout and retries. */
export async function fetchJson(url, opts = {}) {
  requireHttps(url);
  const fetchImpl = opts.fetch ?? fetch;
  const h = { ...(await headers(opts)), Accept: 'application/json' };
  return withRetry(
    url,
    async (signal) => {
      const res = await fetchImpl(url, { headers: h, signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    opts,
  );
}

/**
 * Stream a URL to `destPath`: write `<destPath>.part`, then rename on success.
 * Returns { bytes, md5, sha256 }. A failed attempt removes the partial file.
 */
export async function downloadToFile(url, destPath, opts = {}) {
  requireHttps(url);
  const fetchImpl = opts.fetch ?? fetch;
  const h = await headers(opts);
  const part = `${destPath}.part`;
  await mkdir(dirname(destPath), { recursive: true });
  try {
    const result = await withRetry(
      url,
      async (signal) => {
        const res = await fetchImpl(url, { headers: h, signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (!res.body) throw new Error('empty response body');
        const md5 = createHash('md5');
        const sha256 = createHash('sha256');
        let bytes = 0;
        await pipeline(
          Readable.fromWeb(res.body),
          async function* hashing(source) {
            for await (const chunk of source) {
              md5.update(chunk);
              sha256.update(chunk);
              bytes += chunk.length;
              yield chunk;
            }
          },
          createWriteStream(part),
        );
        return { bytes, md5: md5.digest('hex'), sha256: sha256.digest('hex') };
      },
      opts,
    );
    await rename(part, destPath);
    return result;
  } finally {
    await rm(part, { force: true });
  }
}
