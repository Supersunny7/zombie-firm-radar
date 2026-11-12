// License allow-list enforcement (design: "License allow-list enforcement").
// Pure module: no I/O.

export const FORBIDDEN_HOSTS = ['mixamo.com', 'cgtrader.com', 'fab.com', 'turbosquid.com'];

/** Alias table: canonical name -> accepted normalised strings (whole-string match). */
export const LICENSE_ALIASES = {
  CC0: ['cc0', 'cc0 1.0', 'cc0-1.0', 'creative commons zero'],
  'CC BY': [
    'cc by',
    'cc by 4.0',
    'cc-by-4.0',
    'cc by 3.0',
    'cc-by-3.0',
    'attribution 4.0 international',
  ],
  MIT: ['mit', 'mit license'],
  'Apache-2.0': ['apache-2.0', 'apache 2.0', 'apache license 2.0'],
  'SIL OFL': ['sil ofl', 'ofl-1.1', 'sil open font license 1.1'],
  'Own work': ['own work', 'our own work'],
  'CMU Graphics Lab motion capture': ['cmu graphics lab motion capture'],
};

const ALIAS_LOOKUP = new Map();
for (const [canonical, aliases] of Object.entries(LICENSE_ALIASES)) {
  for (const alias of aliases) ALIAS_LOOKUP.set(alias, canonical);
}

const NC_TOKEN = /(^|[\s-])nc([\s-]|$)/;
const NON_COMMERCIAL = /non[\s-]?commercial/;

/** Trim, `_` to space, collapse whitespace, case-fold. */
export function normalizeLicense(value) {
  return String(value ?? '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/** True when the URL host is a forbidden host or a subdomain of one. */
export function isForbiddenHost(sourceUrl) {
  const url = parseUrl(String(sourceUrl ?? '').trim());
  if (!url) return false;
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  return FORBIDDEN_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

function isBlank(v) {
  return typeof v !== 'string' || v.trim() === '';
}

/**
 * Credits fields live in `pick.credits` in the version 2 recipe; fall back to
 * top-level fields of the same name (version 1 picks).
 */
function creditField(pick, field) {
  const fromCredits = pick?.credits?.[field];
  return fromCredits !== undefined ? fromCredits : pick?.[field];
}

/**
 * @param {object} pick
 * @returns {{ ok: true, canonical: string } | { ok: false, reason: string }}
 */
export function checkLicense(pick) {
  const sourceUrl = creditField(pick, 'sourceUrl');
  const author = creditField(pick, 'author');
  const license = creditField(pick, 'license');

  for (const [field, value] of [
    ['sourceUrl', sourceUrl],
    ['author', author],
    ['license', license],
  ]) {
    if (isBlank(value)) return { ok: false, reason: `missing field: ${field}` };
  }

  const norm = normalizeLicense(license);
  if (NC_TOKEN.test(norm) || NON_COMMERCIAL.test(norm) || isForbiddenHost(sourceUrl)) {
    return { ok: false, reason: 'forbidden' };
  }

  const canonical = ALIAS_LOOKUP.get(norm);
  if (!canonical) return { ok: false, reason: 'not on allow list' };

  if (canonical === 'CC BY') {
    const url = parseUrl(sourceUrl.trim());
    if (!url || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
      return { ok: false, reason: 'CC BY needs an http(s) sourceUrl' };
    }
  }

  return { ok: true, canonical };
}
