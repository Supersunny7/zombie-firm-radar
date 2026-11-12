import {
  fail,
  invalidTreatment,
  ok,
  duplicateTool,
  paramOutOfRange,
  tooManyTools,
  unknownTool,
  type EngineResult,
} from './errors';
import { TOOL_REGISTRY, type ToolSpec } from './tools';
import type { ToolChoice, Treatment } from './types';

const MAX_TOOLS = 3;

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function v1Spec(name: string): ToolSpec | undefined {
  return TOOL_REGISTRY.find((s) => s.status === 'v1' && s.name === name);
}

/** Returns the checked params (fresh object, -0 normalised) or an error. */
function checkParams(spec: ToolSpec, raw: unknown): EngineResult<Record<string, number>> {
  if (raw !== undefined && !isPlainObject(raw)) {
    return fail(paramOutOfRange(spec.name, 'params', raw));
  }
  const given: Record<string, unknown> = raw ?? {};
  const keys = Object.keys(given);
  const allowed = spec.params.map((p) => p.key);

  for (const p of spec.params) {
    if (!Object.hasOwn(given, p.key)) {
      return fail(paramOutOfRange(spec.name, p.key, undefined, p));
    }
  }
  for (const k of keys) {
    if (!allowed.includes(k)) {
      return fail(paramOutOfRange(spec.name, k, given[k]));
    }
  }

  const out: Record<string, number> = {};
  for (const p of spec.params) {
    const v = given[p.key];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < p.min || v > p.max) {
      return fail(paramOutOfRange(spec.name, p.key, v, p));
    }
    out[p.key] = v === 0 ? 0 : v; // normalise -0
  }
  return ok(out);
}

export function parseTreatment(input: unknown): EngineResult<Treatment> {
  if (!Array.isArray(input)) return fail(invalidTreatment(undefined, input));
  const entries: readonly unknown[] = input;
  if (entries.length > MAX_TOOLS) return fail(tooManyTools(entries.length));

  const specs: ToolSpec[] = [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (!isPlainObject(e) || typeof e.name !== 'string') {
      return fail(invalidTreatment(i, e));
    }
    const spec = v1Spec(e.name);
    if (!spec) return fail(unknownTool(e.name, i));
    specs.push(spec);
  }

  const seen = new Set<string>();
  for (const s of specs) {
    if (seen.has(s.name)) return fail(duplicateTool(s.name));
    seen.add(s.name);
  }

  const checked: { spec: ToolSpec; params: Record<string, number> }[] = [];
  for (let i = 0; i < entries.length; i++) {
    const spec = specs[i] as ToolSpec;
    const e = entries[i] as Record<string, unknown>;
    const r = checkParams(spec, e.params);
    if (!r.ok) return fail(r.error);
    checked.push({ spec, params: r.value });
  }

  checked.sort((a, b) => a.spec.order - b.spec.order);
  const result = checked.map(
    ({ spec, params }) => ({ name: spec.name, params }) as unknown as ToolChoice,
  );
  return ok(result);
}

export function serialiseTreatment(t: Treatment): string {
  const sorted = [...t].sort((a, b) => (v1Spec(a.name)?.order ?? 0) - (v1Spec(b.name)?.order ?? 0));
  return sorted
    .map((tool) => {
      const params = tool.params as Readonly<Record<string, number>>;
      const parts = Object.keys(params)
        .sort()
        .map((k) => `,${k}=${String(params[k])}`);
      return `${tool.name}${parts.join('')}`;
    })
    .join(';');
}

export function deserialiseTreatment(s: string): EngineResult<Treatment> {
  if (s === '') return parseTreatment([]);
  const tools = s.split(';').map((part) => {
    const [name = '', ...kvs] = part.split(',');
    const params: Record<string, number> = {};
    for (const kv of kvs) {
      const eq = kv.indexOf('=');
      const key = eq < 0 ? kv : kv.slice(0, eq);
      const text = eq < 0 ? '' : kv.slice(eq + 1);
      params[key] = text === '' ? Number.NaN : Number(text);
    }
    return { name, params };
  });
  return parseTreatment(tools);
}
