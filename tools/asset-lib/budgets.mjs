// Budget accounting for web/public/assets (Requirement 16.8, 17). Pure, no I/O.

export const LIMITS = Object.freeze({
  graveyard: 26_214_400,
  lab: 26_214_400,
  total: 62_914_560,
});
export const OVERSIZE_BYTES = 5_242_880;
const BUDGET_NAMES = ['graveyard', 'lab', 'total'];

function isMeta(path) {
  const base = String(path).split(/[\\/]/).pop().toLowerCase();
  return base === 'manifest.json' || base.startsWith('license');
}

function kindOf(file) {
  if (file.kind) return file.kind;
  const p = String(file.path).toLowerCase();
  if (/\.(glb|gltf|fbx)$/.test(p)) return 'model';
  if (/\.hdr$/.test(p)) return 'hdri';
  if (/\.(ogg|mp3|wav)$/.test(p)) return 'audio';
  return 'other';
}

function suggestionFor(kind) {
  if (kind === 'model' || kind === 'avatar' || kind === 'animation') {
    return 're-run with a lower texture limit or higher Meshopt level';
  }
  if (kind === 'hdri') return 'use the 1k HDRI';
  if (kind === 'audio') return 'lower -q:a';
  return 'reduce the file size';
}

function top3(list) {
  return [...list]
    .sort((a, b) => b.bytes - a.bytes || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    .slice(0, 3)
    .map(({ path, bytes }) => ({ path, bytes }));
}

/**
 * @param {{path:string, bytes?:number, group?:'graveyard'|'lab'|null, kind?:string, error?:string, sizeException?:{maxBytes:number, reason:string}}[]} files
 * @param {Record<string,'graveyard'|'lab'>} [groups] path -> group lookup (used when file.group is absent)
 */
export function account(files, groups = {}) {
  const used = { graveyard: 0, lab: 0, total: 0 };
  const unassigned = [];
  const unreadable = [];
  const readable = [];
  const oversizeFiles = [];
  const acceptedExceptions = [];
  const byBudget = { graveyard: [], lab: [], total: [] };

  for (const f of files) {
    if (f.error !== undefined || typeof f.bytes !== 'number' || !Number.isFinite(f.bytes) || f.bytes < 0) {
      unreadable.push({ path: f.path, reason: f.error ?? 'size unavailable' });
      continue;
    }
    const group = f.group ?? groups[f.path] ?? null;
    const entry = { path: f.path, bytes: f.bytes, group };
    readable.push(entry);
    used.total += f.bytes;
    byBudget.total.push(entry);
    if (group === 'graveyard' || group === 'lab') {
      used[group] += f.bytes;
      byBudget[group].push(entry);
    } else if (!isMeta(f.path)) {
      unassigned.push(f.path);
    }
    const se = f.sizeException;
    if (f.bytes > OVERSIZE_BYTES && se && typeof se.maxBytes === 'number' && f.bytes <= se.maxBytes) {
      acceptedExceptions.push({
        path: f.path,
        bytes: f.bytes,
        mb: (f.bytes / 1_048_576).toFixed(2),
        maxBytes: se.maxBytes,
        reason: String(se.reason ?? ''),
      });
    } else if (f.bytes > OVERSIZE_BYTES) {
      oversizeFiles.push({
        path: f.path,
        bytes: f.bytes,
        mb: (f.bytes / 1_048_576).toFixed(2),
        suggestion: suggestionFor(kindOf(f)),
      });
    }
  }

  const exceeded = BUDGET_NAMES.filter((n) => used[n] > LIMITS[n]);
  const largest = { graveyard: [], lab: [], total: [] };
  for (const n of exceeded) largest[n] = top3(byBudget[n]);

  return {
    used,
    limit: { ...LIMITS },
    exceeded,
    largest,
    unassigned,
    oversizeFiles,
    acceptedExceptions,
    unreadable,
    files: readable.map(({ path, bytes }) => ({ path, bytes })),
    exitCode: exceeded.length > 0 || unreadable.length > 0 ? 1 : 0,
  };
}

export const accountBudgets = account;

/** Human-readable report lines (17.4, 17.5, 17.6, 17.7, 16.8). */
export function formatReport(report) {
  const lines = [];
  for (const f of report.files) lines.push(`${f.path}: ${f.bytes} B`);
  for (const p of report.unassigned) {
    lines.push(`warning: ${p} has no group; counted in total only`);
  }
  for (const o of report.oversizeFiles) {
    lines.push(`warning: ${o.path} is ${o.mb} MB (over 5 MB); ${o.suggestion}`);
  }
  for (const a of report.acceptedExceptions ?? []) {
    lines.push(`accepted exception: ${a.path} is ${a.mb} MB (over 5 MB, allowed up to ${a.maxBytes} B): ${a.reason}`);
  }
  for (const u of report.unreadable) {
    lines.push(`error: cannot read size of ${u.path}: ${u.reason}`);
  }
  for (const n of BUDGET_NAMES) {
    lines.push(`${n} ${report.used[n]} / ${report.limit[n]}`);
  }
  for (const n of report.exceeded) {
    lines.push(`budget exceeded: ${n} used ${report.used[n]} limit ${report.limit[n]}`);
    lines.push(`  largest files in ${n}:`);
    for (const f of report.largest[n]) lines.push(`    ${f.path}: ${f.bytes} B`);
  }
  return lines.join('\n');
}
