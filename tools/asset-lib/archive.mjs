// Zip extraction with fflate and a zip-slip guard (design: "HTTP stage").
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { unzipSync } from 'fflate';
import { safeJoin } from './paths.mjs';

/**
 * Extract a zip (path or bytes) into destDir. Every entry name goes through safeJoin,
 * so an entry that escapes destDir throws and nothing from that archive is written.
 * Directory entries are skipped. Returns the absolute paths written, in archive order.
 * `only` (optional) limits extraction to one exact entry name; throws if it is absent.
 */
export async function extractZip(zip, destDir, { only } = {}) {
  const bytes = typeof zip === 'string' ? await readFile(zip) : zip;
  const entries = unzipSync(new Uint8Array(bytes), only ? { filter: (f) => f.name === only } : undefined);
  const names = Object.keys(entries).filter((n) => !n.endsWith('/'));
  if (only && !names.includes(only)) throw new Error(`archive: entry not found: ${only}`);

  // Validate all names first so a hostile archive writes nothing.
  const targets = names.map((name) => {
    const parts = name.split(/[\\/]+/).filter((p) => p !== '');
    if (parts.length === 0) throw new Error(`archive: empty entry name ${JSON.stringify(name)}`);
    return { name, target: safeJoin(destDir, ...parts) };
  });

  const written = [];
  for (const { name, target } of targets) {
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, entries[name]);
    written.push(target);
  }
  return written;
}
