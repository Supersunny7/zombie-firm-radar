// Manual README generator (design.md "Manual README format").
// Pure: render(picks, options) -> markdown; check(picks, existingText) -> report.
// The only thing not derived from the picks is the fixed header and footer text.
export const README_PATH = 'tools/cache/manual/README.md';
export const HOOK_ID = 'sketchfab-butchers-hook-chain-proop';

const LICENSE_URLS = {
  CC0: 'https://creativecommons.org/publicdomain/zero/1.0/',
  'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC BY': 'https://creativecommons.org/licenses/by/4.0/',
  MIT: 'https://opensource.org/licenses/MIT',
  'Apache-2.0': 'https://www.apache.org/licenses/LICENSE-2.0',
};

const HEADER = `# Manual downloads

These files need a login or a manual choice on the source site, so the script never fetches them.
Download each file as described, then put it at the exact path shown. The folder content is git-ignored; only this README is tracked.
Run \`node tools/fetch-assets.mjs\` afterwards. Missing files are listed by name and skipped.

How to use this list:

- The site gives your download its own file name. Rename it to the Expected file name shown in each block. The script looks for exactly that name.
- Sketchfab files are named \`<id>.zip\`. Freesound files are named \`<id>.<ext>\` with the original extension shown on the sound page (wav, mp3 or m4a).
- Sketchfab and Freesound both need a free login to download. Do not use the Freesound preview MP3; download the original file.
- Everything under \`tools/cache/manual/\` except this README is git-ignored. Never use \`git add -f\`.
- Credit-line titles follow the names recorded in \`reference/candidates/README.md\` and the model or sound page; if a title differs slightly on the site, the site wording wins.
- The Poly Haven, OpenGameArt and Rocketbox picks are downloaded by the script and are not listed here (see the last section).
`;

const FOOTER = `## Automatic, do not download

The script fetches these itself: all Poly Haven picks (including \`polyhaven-large-castle-door\`, \`polyhaven-dark-brick-wall\`, \`polyhaven-slate-floor\` and \`polyhaven-hessian-230\`), the OpenGameArt pick \`oga-blood-splatter-exilegl\`, and all Rocketbox avatars and animations (pinned SHA \`0943055db6ec570bcef9f2c8b41c9e5467c808f9\`). The handprint and drag-mark decals come from our own generator. \`${HOOK_ID}\` was rejected and is not listed.
`;

const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Picks that get a block: manual ones; the hook only when its check passed. */
export function manualPicks(picks, { hookCheckPassed = false } = {}) {
  return picks
    .filter((p) => p && (p.manual === true || p.source?.type === 'manual'))
    .filter((p) => p.id !== HOOK_ID || hookCheckPassed === true)
    .slice()
    .sort(byId);
}

function candidateLine(p) {
  const detail = p.role ? `${p.group}, ${p.role}` : p.group;
  return `${p.id} (${detail})`;
}

function authorText(p) {
  const { author } = p.credits;
  return p.id.startsWith('freesound-') ? `${author} (Freesound user)` : author;
}

function creditLine(p) {
  const c = p.credits;
  const url = LICENSE_URLS[c.license];
  const lic = url ? `${c.license} (${url})` : c.license;
  return `"${c.title}" by ${authorText(p)}, ${lic}, ${c.sourceUrl}`;
}

function targetPath(p) {
  return `${p.targetFolder}/${p.expectedFile}`;
}

function block(p) {
  return [
    `### ${p.id}`,
    `- Candidate: ${candidateLine(p)}`,
    `- Title: ${p.credits.title}`,
    `- Source page: ${p.source.pageUrl}`,
    `- Download option: ${p.source.downloadOption}`,
    `- Expected file name: ${p.expectedFile}`,
    `- Put it at: ${targetPath(p)}`,
    `- Credit line: ${creditLine(p)}`,
    `- Notes: ${p.source.note ?? 'No edits planned.'}`,
  ].join('\n');
}

function checklist(list) {
  const sk = list.filter((p) => p.id.startsWith('sketchfab-')).length;
  const fs = list.filter((p) => p.id.startsWith('freesound-')).length;
  const parts = [];
  if (sk) parts.push(`${sk} Sketchfab zips`);
  if (fs) parts.push(`${fs} Freesound sounds`);
  const lines = list.map((p) => `- [ ] \`${p.targetFolder.split('/').pop()}/${p.expectedFile}\``);
  return `## Checklist\n\nFiles to download: **${list.length}** (${parts.join(', ')}).\n\n${lines.join('\n')}\n`;
}

/** Render the whole README for the given picks. Deterministic and pure. */
export function render(picks, options = {}) {
  const list = manualPicks(picks, options);
  return [
    HEADER,
    checklist(list),
    `## Downloads\n\n${list.map(block).join('\n\n')}\n`,
    FOOTER,
  ].join('\n');
}

/**
 * Compare an existing README with the picks. A pick is "present" when its
 * `### <id>` block exists; it is "incomplete" when the block lacks its source
 * URL, expected file name or target path. Entries with ids not in the picks
 * are "extra". `upToDate` also requires an exact text match with render().
 */
export function check(picks, existingText, options = {}) {
  const list = manualPicks(picks, options);
  const text = String(existingText ?? '').replace(/\r\n/g, '\n');
  const blocks = new Map();
  const dupes = [];
  const parts = text.split(/^### /m).slice(1);
  for (const part of parts) {
    const nl = part.indexOf('\n');
    const id = (nl === -1 ? part : part.slice(0, nl)).trim();
    const body = part.split(/^## /m)[0];
    if (blocks.has(id)) dupes.push(id);
    blocks.set(id, body);
  }
  const wanted = new Set(list.map((p) => p.id));
  const missing = list.filter((p) => !blocks.has(p.id)).map((p) => p.id);
  const extra = [...blocks.keys()].filter((id) => !wanted.has(id)).sort();
  const incomplete = [];
  for (const p of list) {
    const body = blocks.get(p.id);
    if (body === undefined) continue;
    const need = [
      `- Source page: ${p.source.pageUrl}`,
      `- Expected file name: ${p.expectedFile}`,
      `- Put it at: ${targetPath(p)}`,
      `- Download option: ${p.source.downloadOption}`,
    ];
    if (need.some((n) => !body.includes(n))) incomplete.push(p.id);
  }
  const rendered = render(picks, options).replace(/\s+$/, '');
  const exact = rendered === text.replace(/\s+$/, '');
  return {
    missing,
    extra,
    duplicates: dupes,
    incomplete,
    upToDate: missing.length + extra.length + dupes.length + incomplete.length === 0 && exact,
    entriesMatch: missing.length + extra.length + dupes.length + incomplete.length === 0,
  };
}

/** First differing lines between two texts (for reporting). */
export function diffLines(a, b) {
  const x = a.replace(/\r\n/g, '\n').split('\n');
  const y = b.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if (x[i] !== y[i]) out.push({ line: i + 1, generated: x[i], existing: y[i] });
  }
  return out;
}
