// Picks recipe (tools/picks.json, version 2): load, validate, order.
// Pure ES module; the only I/O is reading the file in loadPicks.
import { readFile } from 'node:fs/promises';

export const PICKS_VERSION = 2;
export const KINDS = ['texture', 'hdri', 'model', 'avatar', 'animation', 'audio'];
export const GROUPS = ['graveyard', 'lab'];
export const SOURCE_TYPES = ['polyhaven', 'url', 'manual', 'generated', 'derived'];
export const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

const PICK_KEYS = [
  'id', 'kind', 'category', 'group', 'source', 'manual',
  'expectedFile', 'targetFolder', 'edits', 'credits', 'role', 'description', 'sizeException',
  'forbidExtensions',
];
const CREDIT_KEYS = ['title', 'author', 'sourceUrl', 'license', 'changes'];

const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v) => typeof v === 'string' && v.trim() !== '';
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isInt = (v) => Number.isInteger(v);

// Source variants: required and optional keys with a type check per key.
const SOURCE_SPECS = {
  polyhaven: {
    required: { id: isStr, resolution: isStr },
    optional: { maps: (v) => Array.isArray(v) && v.length > 0 && v.every(isStr), format: isStr },
  },
  url: {
    required: { url: isStr },
    optional: { sha256: (v) => typeof v === 'string' && /^[0-9a-fA-F]{64}$/.test(v), archive: (v) => v === 'zip', entry: isStr },
  },
  manual: {
    required: { pageUrl: isStr, downloadOption: isStr },
    optional: { note: isStr, entry: isStr },
  },
  generated: {
    required: { generator: isStr, decal: isStr, variants: (v) => isInt(v) && v >= 1 },
    optional: {},
  },
  derived: {
    required: { script: isStr, from: isStr, seed: isInt },
    optional: {},
  },
};

const isFrac = (v) => isNum(v) && v >= 0 && v <= 1;
const isByte = (v) => isNum(v) && v >= 0 && v <= 255;

// Edit table (design.md "Edit operations"): per op required and optional params.
// `oneOf` lists keys of which exactly one must be present.
export const EDIT_SPECS = {
  decimate: { required: { triangles: (v) => isInt(v) && v > 0 }, optional: {} },
  removeNode: { required: {}, optional: { node: isStr, mesh: isStr, material: isStr }, oneOf: ['node', 'mesh', 'material'] },
  desaturate: { required: { texture: isStr, maxSaturation: isFrac }, optional: {} },
  darken: { required: { texture: isStr, maxValue: isByte }, optional: { percentile: (v) => isNum(v) && v > 0 && v <= 100 } },
  grime: { required: { texture: isStr, seed: isInt, floor: isByte }, optional: {} },
  selectVariant: { required: { variant: isStr }, optional: {} },
  splitMesh: { required: { mesh: isStr, by: (v) => v === 'node' || v === 'components', parts: validParts }, optional: {} },
  removeByVertexColor: {
    required: { mesh: isStr, hueRange: (v) => Array.isArray(v) && v.length === 2 && v.every((x) => isNum(x) && x >= 0 && x <= 360), minSat: isFrac },
    optional: { minVal: isFrac, axis: (v) => v === 'x' || v === 'y' || v === 'z', above: isNum },
  },
  joinMeshes: { required: { meshes: (v) => Array.isArray(v) && v.length >= 2 && v.every(isStr) }, optional: {} },
  raggedCut: {
    required: { axis: (v) => v === 'x' || v === 'y' || v === 'z', at: isFrac, seed: isInt, amplitude: (v) => isNum(v) && v >= 0 && v <= 0.5 },
    optional: { mesh: isStr, keep: (v) => v === 'below' || v === 'above' },
  },
  keepAnimations: { required: { names: (v) => Array.isArray(v) && v.length > 0 && v.every(isStr) }, optional: {} },
  removeAnimations: { required: {}, optional: {} },
  specGlossToMetalRough: { required: {}, optional: {} },
  tint: {
    required: { hue: (v) => isNum(v) && v >= 0 && v <= 360, maxSaturation: isFrac, meanValue: isFrac },
    optional: {
      minSaturation: isFrac,
      tolerance: (v) => isNum(v) && v >= 0 && v <= 0.5,
      hueSpread: (v) => isNum(v) && v >= 0 && v <= 180,
      meshes: (v) => Array.isArray(v) && v.length > 0 && v.every(isStr),
      texture: isStr,
    },
  },
};
export const EDIT_OPS = Object.keys(EDIT_SPECS);

function validParts(parts) {
  if (!Array.isArray(parts) || parts.length === 0) return false;
  return parts.every((p) => {
    if (!isObj(p) || !isStr(p.name)) return false;
    const keys = Object.keys(p);
    if (keys.some((k) => !['name', 'components', 'rest'].includes(k))) return false;
    if ('components' in p && !(Array.isArray(p.components) && p.components.every((c) => isInt(c) && c >= 0))) return false;
    if ('rest' in p && p.rest !== true) return false;
    return true;
  });
}

/**
 * Typed error: { id, code, field?, message }.
 * `id` is the pick id (or null for file-level errors, '#<index>' when the id is unusable).
 */
function err(id, code, message, field) {
  const e = { id, code, message };
  if (field !== undefined) e.field = field;
  return e;
}

function checkKeys(obj, allowed, id, field, errors) {
  for (const k of Object.keys(obj)) {
    if (!allowed.includes(k)) errors.push(err(id, 'UnknownKey', `Unknown key "${k}" in ${field}`, `${field}.${k}`));
  }
}

function validateSource(src, id, errors) {
  if (!isObj(src)) return errors.push(err(id, 'InvalidSource', 'source must be an object', 'source'));
  const spec = SOURCE_SPECS[src.type];
  if (!spec) {
    return errors.push(err(id, 'InvalidSource', `source.type must be one of ${SOURCE_TYPES.join(', ')}`, 'source.type'));
  }
  checkKeys(src, ['type', ...Object.keys(spec.required), ...Object.keys(spec.optional)], id, 'source', errors);
  for (const [k, check] of Object.entries(spec.required)) {
    if (!(k in src)) errors.push(err(id, 'MissingField', `source.${k} is required for type "${src.type}"`, `source.${k}`));
    else if (!check(src[k])) errors.push(err(id, 'InvalidField', `source.${k} has an invalid value`, `source.${k}`));
  }
  for (const [k, check] of Object.entries(spec.optional)) {
    if (k in src && !check(src[k])) errors.push(err(id, 'InvalidField', `source.${k} has an invalid value`, `source.${k}`));
  }
}

function validateEdits(edits, id, errors) {
  if (!Array.isArray(edits)) return errors.push(err(id, 'InvalidField', 'edits must be an array', 'edits'));
  edits.forEach((edit, i) => {
    const f = `edits[${i}]`;
    if (!isObj(edit)) return errors.push(err(id, 'InvalidEdit', `${f} must be an object`, f));
    const spec = Object.hasOwn(EDIT_SPECS, edit.op) ? EDIT_SPECS[edit.op] : null;
    if (!spec) {
      return errors.push(err(id, 'UnknownEdit', `${f}.op "${String(edit.op)}" is not in the edit table (${EDIT_OPS.join(', ')})`, `${f}.op`));
    }
    checkKeys(edit, ['op', ...Object.keys(spec.required), ...Object.keys(spec.optional)], id, f, errors);
    for (const [k, check] of Object.entries(spec.required)) {
      if (!(k in edit)) errors.push(err(id, 'InvalidEdit', `${f}.${k} is required for op "${edit.op}"`, `${f}.${k}`));
      else if (!check(edit[k])) errors.push(err(id, 'InvalidEdit', `${f}.${k} has an invalid value`, `${f}.${k}`));
    }
    for (const [k, check] of Object.entries(spec.optional)) {
      if (k in edit && !check(edit[k])) errors.push(err(id, 'InvalidEdit', `${f}.${k} has an invalid value`, `${f}.${k}`));
    }
    if (spec.oneOf) {
      const present = spec.oneOf.filter((k) => k in edit);
      if (present.length !== 1) {
        errors.push(err(id, 'InvalidEdit', `${f} needs exactly one of: ${spec.oneOf.join(', ')}`, f));
      }
    }
  });
}

/** Accepted size exception (Requirement 16.8, 17): an explicit per-pick allow-list entry. */
function validateSizeException(se, id, errors) {
  if (!isObj(se)) return errors.push(err(id, 'InvalidField', 'sizeException must be an object', 'sizeException'));
  checkKeys(se, ['maxBytes', 'reason'], id, 'sizeException', errors);
  if (!(isInt(se.maxBytes) && se.maxBytes > 0)) {
    errors.push(err(id, 'InvalidField', 'sizeException.maxBytes must be a positive integer', 'sizeException.maxBytes'));
  }
  if (!isStr(se.reason)) {
    errors.push(err(id, 'InvalidField', 'sizeException.reason must be a non-empty string', 'sizeException.reason'));
  }
}

function validateCredits(credits, id, errors) {
  if (!isObj(credits)) return errors.push(err(id, 'InvalidField', 'credits must be an object', 'credits'));
  checkKeys(credits, CREDIT_KEYS, id, 'credits', errors);
  for (const k of CREDIT_KEYS) {
    if (!isStr(credits[k])) errors.push(err(id, 'MissingField', `credits.${k} must be a non-empty string`, `credits.${k}`));
  }
}

/**
 * Validate one pick in isolation (cross-pick rules live in validatePicks).
 * Returns an array of typed errors; empty means valid.
 */
export function validatePick(p, index = 0) {
  const errors = [];
  if (!isObj(p)) return [err(`#${index}`, 'InvalidPick', 'pick must be an object')];
  const id = isStr(p.id) ? p.id : `#${index}`;

  checkKeys(p, PICK_KEYS, id, 'pick', errors);

  if (!isStr(p.id) || !ID_PATTERN.test(p.id)) {
    errors.push(err(id, 'InvalidId', `id must match ${ID_PATTERN}`, 'id'));
  }
  if (!KINDS.includes(p.kind)) errors.push(err(id, 'InvalidField', `kind must be one of ${KINDS.join(', ')}`, 'kind'));
  if (!(isInt(p.category) && p.category >= 1 && p.category <= 10)) {
    errors.push(err(id, 'InvalidField', 'category must be an integer from 1 to 10', 'category'));
  }
  if (!GROUPS.includes(p.group)) errors.push(err(id, 'InvalidField', `group must be one of ${GROUPS.join(', ')}`, 'group'));
  if ('role' in p && !isStr(p.role)) errors.push(err(id, 'InvalidField', 'role must be a non-empty string', 'role'));
  if ('description' in p && !isStr(p.description)) errors.push(err(id, 'InvalidField', 'description must be a non-empty string', 'description'));

  if ('forbidExtensions' in p && !(Array.isArray(p.forbidExtensions) && p.forbidExtensions.length > 0 && p.forbidExtensions.every(isStr))) {
    errors.push(err(id, 'InvalidField', 'forbidExtensions must be a non-empty array of non-empty strings', 'forbidExtensions'));
  }

  validateSource(p.source, id, errors);
  validateEdits(p.edits, id, errors);
  validateCredits(p.credits, id, errors);
  if ('sizeException' in p) validateSizeException(p.sizeException, id, errors);

  if (typeof p.manual !== 'boolean') {
    errors.push(err(id, 'InvalidField', 'manual must be a boolean', 'manual'));
  } else if (isObj(p.source) && SOURCE_TYPES.includes(p.source.type)) {
    const isManualSource = p.source.type === 'manual';
    if (p.manual !== isManualSource) {
      errors.push(err(id, 'ManualMismatch', `manual is ${p.manual} but source.type is "${p.source.type}"`, 'manual'));
    }
  }

  const manualSource = isObj(p.source) && p.source.type === 'manual';
  if (manualSource) {
    if (!isStr(p.expectedFile)) errors.push(err(id, 'MissingField', 'expectedFile is required for manual picks', 'expectedFile'));
    if (p.targetFolder !== `tools/cache/manual/${p.id}`) {
      errors.push(err(id, 'InvalidField', `targetFolder must be "tools/cache/manual/${p.id}"`, 'targetFolder'));
    }
  } else {
    if (p.expectedFile !== null && p.expectedFile !== undefined) {
      errors.push(err(id, 'InvalidField', 'expectedFile must be null for non-manual picks', 'expectedFile'));
    }
    if (p.targetFolder !== null && p.targetFolder !== undefined) {
      errors.push(err(id, 'InvalidField', 'targetFolder must be null for non-manual picks', 'targetFolder'));
    }
  }
  return errors;
}

/**
 * Order picks so every derived pick comes after the pick it derives from.
 * Otherwise the input order is kept (stable). Assumes ids are unique and `from` ids exist;
 * picks in a derivation cycle are left out of `ordered` and listed in `cyclic`.
 */
export function orderPicks(picks) {
  const byId = new Map(picks.map((p) => [p.id, p]));
  const ordered = [];
  const state = new Map(); // id -> 'visiting' | 'done'
  const cyclic = new Set();
  const visit = (p) => {
    const s = state.get(p.id);
    if (s === 'done') return true;
    if (s === 'visiting') return false;
    state.set(p.id, 'visiting');
    let ok = true;
    if (p.source?.type === 'derived') {
      const parent = byId.get(p.source.from);
      if (parent && !visit(parent)) ok = false;
    }
    state.set(p.id, 'done');
    if (ok) ordered.push(p);
    else cyclic.add(p.id);
    return ok;
  };
  for (const p of picks) visit(p);
  return { ordered, cyclic: [...cyclic] };
}

/**
 * Validate a parsed recipe document.
 * Returns { ok, errors, picks }. `picks` is ordered (derived after their source) and only
 * meaningful when ok is true.
 */
export function validatePicks(doc) {
  const errors = [];
  if (!isObj(doc)) return { ok: false, errors: [err(null, 'InvalidFile', 'picks file must be a JSON object')], picks: [] };
  checkKeys(doc, ['version', 'picks'], null, 'file', errors);
  if (doc.version !== PICKS_VERSION) {
    errors.push(err(null, 'InvalidVersion', `version must be ${PICKS_VERSION}`, 'version'));
  }
  if (!Array.isArray(doc.picks)) {
    errors.push(err(null, 'InvalidFile', 'picks must be an array', 'picks'));
    return { ok: false, errors, picks: [] };
  }

  const seen = new Set();
  doc.picks.forEach((p, i) => {
    errors.push(...validatePick(p, i));
    if (isObj(p) && isStr(p.id)) {
      if (seen.has(p.id)) errors.push(err(p.id, 'DuplicateId', `duplicate id "${p.id}"`, 'id'));
      seen.add(p.id);
    }
  });

  for (const p of doc.picks) {
    if (isObj(p) && isObj(p.source) && p.source.type === 'derived' && isStr(p.source.from)) {
      if (!seen.has(p.source.from)) {
        errors.push(err(p.id, 'UnknownDerivedFrom', `derived.from "${p.source.from}" is not an id in the file`, 'source.from'));
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors, picks: [] };

  const { ordered, cyclic } = orderPicks(doc.picks);
  for (const id of cyclic) errors.push(err(id, 'DerivedCycle', 'derived picks form a cycle', 'source.from'));
  if (errors.length > 0) return { ok: false, errors, picks: [] };
  return { ok: true, errors: [], picks: ordered };
}

/** Read and validate a picks file. Never throws for bad content; returns typed errors. */
export async function loadPicks(path) {
  let text;
  try {
    text = await readFile(path, 'utf8');
  } catch (e) {
    return { ok: false, errors: [err(null, 'ReadError', `cannot read ${path}: ${e.message}`)], picks: [] };
  }
  let doc;
  try {
    doc = JSON.parse(text);
  } catch (e) {
    return { ok: false, errors: [err(null, 'ParseError', `invalid JSON in ${path}: ${e.message}`)], picks: [] };
  }
  return validatePicks(doc);
}
