import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';

export interface DataPluginOptions {
  /** Absolute path of the repo-root data folder. */
  dataDir: string;
}

export type CopyMode = 'real' | 'mock' | 'none';

/**
 * Resolves a URL path (relative to the /data/ mount) to an absolute path inside
 * `dataDir`. Returns null when the path is malformed or would leave the folder.
 */
export function resolveInsideData(dataDir: string, urlPath: string): string | null {
  const root = path.resolve(dataDir);
  const withoutQuery = urlPath.split(/[?#]/, 1)[0] ?? '';
  let decoded: string;
  try {
    decoded = decodeURIComponent(withoutQuery);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const relative = decoded.replace(/\\/g, '/').replace(/^\/+/, '');
  const resolved = path.resolve(root, relative);
  if (resolved === root || resolved.startsWith(root + path.sep)) return resolved;
  return null;
}

/**
 * Decides what to copy. `files` are paths relative to the data folder, using
 * forward slashes. Real data (firms_index.json present) copies everything but
 * `schema/` and `mock/`; otherwise only `mock/` (never `schema/`).
 */
export function planCopy(_dataDir: string, files: string[]): { include: string[]; mode: CopyMode } {
  const norm = files.map((f) => f.replace(/\\/g, '/'));
  const top = (f: string) => f.split('/', 1)[0];
  if (norm.includes('firms_index.json')) {
    return {
      include: norm.filter((f) => top(f) !== 'schema' && top(f) !== 'mock'),
      mode: 'real',
    };
  }
  const mock = norm.filter((f) => f.startsWith('mock/') && top(f) !== 'schema');
  return mock.length > 0 ? { include: mock, mode: 'mock' } : { include: [], mode: 'none' };
}

function listFiles(dir: string, base = ''): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFiles(path.join(dir, entry.name), rel));
    else if (entry.isFile()) out.push(rel);
  }
  return out;
}

/** Copies the planned files into `<outDir>/data`. Reads dataDir in place. */
export function copyData(dataDir: string, outDir: string): { count: number; mode: CopyMode } {
  const { include, mode } = planCopy(dataDir, listFiles(dataDir));
  for (const rel of include) {
    const target = path.join(outDir, 'data', rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(dataDir, rel), target);
  }
  return { count: include.length, mode };
}

export interface DataLogger {
  info(msg: string): void;
  warn(msg: string): void;
}

/** Copies data and reports the result through `logger`. Used by closeBundle. */
export function copyDataAndLog(
  dataDir: string,
  outDir: string,
  logger: DataLogger,
): { count: number; mode: CopyMode; message: string } {
  const { count, mode } = copyData(dataDir, outDir);
  const message =
    mode === 'none'
      ? '[data] no firms_index.json and no data/mock found; nothing copied'
      : `[data] copied ${count} files (${mode})`;
  if (mode === 'none') logger.warn(message);
  else logger.info(message);
  return { count, mode, message };
}

export function dataPlugin(opts: DataPluginOptions): Plugin {
  const dataDir = path.resolve(opts.dataDir);
  let config: ResolvedConfig | undefined;

  return {
    name: 'zfr-data',
    configResolved(resolved) {
      config = resolved;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '';
        if (!url.startsWith('/data/')) return next();
        const file = resolveInsideData(dataDir, url.slice('/data/'.length));
        let stat: fs.Stats | undefined;
        if (file) {
          try {
            stat = fs.statSync(file);
          } catch {
            stat = undefined;
          }
        }
        if (!file || !stat || !stat.isFile()) {
          res.statusCode = 404;
          res.setHeader('Cache-Control', 'no-cache');
          res.end('Not found');
          return;
        }
        res.statusCode = 200;
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader(
          'Content-Type',
          file.endsWith('.json') ? 'application/json; charset=utf-8' : 'application/octet-stream',
        );
        if (req.method === 'HEAD') {
          res.end();
          return;
        }
        res.end(fs.readFileSync(file));
      });
    },
    closeBundle: {
      order: 'post',
      handler() {
        if (!config || config.command !== 'build') return;
        const outDir = path.resolve(config.root, config.build.outDir);
        copyDataAndLog(dataDir, outDir, config.logger);
      },
    },
  };
}
