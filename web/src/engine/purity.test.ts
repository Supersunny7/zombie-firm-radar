// @vitest-environment node
// Requirements 2.2, 2.3, 12.9, 12.16: static purity scan of web/src/engine.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const engineDir = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(engineDir, '..');
const selfPath = fileURLToPath(import.meta.url);

const FORBIDDEN_DIRS = ['scenes', 'fx', 'ui'].map((d) => join(srcDir, d));

/** Blank out comments (keeping strings and line numbers) so prose cannot trip the scan. */
export function stripComments(source: string): string {
  let out = '';
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') i++;
    } else if (ch === '/' && next === '*') {
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
        out += source[i] === '\n' ? '\n' : ' ';
        i++;
      }
      i += 2;
    } else if (ch === "'" || ch === '"' || ch === '`') {
      out += ch;
      i++;
      while (i < source.length && source[i] !== ch) {
        if (source[i] === '\\') {
          out += source[i];
          i++;
        }
        if (ch !== '`' && source[i] === '\n') break;
        out += source[i];
        i++;
      }
      if (i < source.length) {
        out += source[i];
        i++;
      }
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

function isForbiddenSpecifier(spec: string, fromFile: string): boolean {
  if (
    spec === 'react' ||
    spec === 'react-dom' ||
    spec === 'three' ||
    spec.startsWith('react/') ||
    spec.startsWith('three/') ||
    spec.startsWith('@react-three/')
  ) {
    return true;
  }
  if (spec.startsWith('.')) {
    const target = resolve(dirname(fromFile), spec);
    return FORBIDDEN_DIRS.some((d) => {
      const rel = relative(d, target);
      return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
    });
  }
  return false;
}

const SPECIFIER_PATTERNS: RegExp[] = [
  /\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\bimport\s*['"]([^'"]+)['"]/g,
];

const CALL_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\bMath\.random\b/, label: 'Math.random' },
  { re: /\bDate\.now\b/, label: 'Date.now' },
  { re: /\bperformance\.now\b/, label: 'performance.now' },
  { re: /\bnew\s+Date\s*\(\s*\)/, label: 'new Date()' },
];

export interface Violation {
  line: number;
  message: string;
}

export function scanSource(source: string, filePath: string): Violation[] {
  const lines = stripComments(source).split('\n');
  const violations: Violation[] = [];
  lines.forEach((text, idx) => {
    const line = idx + 1;
    for (const pattern of SPECIFIER_PATTERNS) {
      for (const m of text.matchAll(new RegExp(pattern.source, 'g'))) {
        const spec = m[1];
        if (spec !== undefined && isForbiddenSpecifier(spec, filePath)) {
          violations.push({ line, message: `forbidden import of '${spec}'` });
        }
      }
    }
    for (const { re, label } of CALL_PATTERNS) {
      if (re.test(text)) violations.push({ line, message: `forbidden ${label}` });
    }
    if (/^(?:export\s+)?(?:let|var)\s/.test(text)) {
      violations.push({ line, message: 'top-level let/var (module-level mutable state)' });
    }
  });
  return violations;
}

function listTsFiles(dir: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) result.push(...listTsFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.ts')) result.push(full);
  }
  return result;
}

describe('rescue-engine purity scan', () => {
  it('flags violations in in-memory snippets (scanner self-test)', () => {
    const f = join(engineDir, 'x.ts');
    const bad = [
      "import x from 'three';",
      "import { a } from 'react-dom';",
      "import { a } from 'react/jsx-runtime';",
      "import { a } from '@react-three/fiber';",
      "import { a } from '../scenes/graveyard/x';",
      "import { a } from '../ui';",
      "const m = await import('three/examples/x');",
      "const r = require('react');",
      'let n = 0;',
      'var n = 0;',
      'const r = Math.random();',
      'const t = Date.now();',
      'const t = performance.now();',
      'const d = new Date( );',
    ];
    for (const snippet of bad) {
      expect(scanSource(snippet, f), snippet).not.toHaveLength(0);
    }
    const good = [
      "import { a } from './icr';",
      "import { a } from '../data/x';",
      'const d = new Date(0);',
      '  let n = 0;',
      '// Math.random() in a comment',
      "/* import x from 'three' */",
      'const s = `${a}`; const n = 1;',
    ];
    for (const snippet of good) {
      expect(scanSource(snippet, f), snippet).toHaveLength(0);
    }
    expect(scanSource('\n\nlet n = 0;', f)[0]?.line).toBe(3);
  });

  it('finds no impure code in any engine .ts file', () => {
    const files = listTsFiles(engineDir).filter((p) => p !== selfPath);
    expect(files.length).toBeGreaterThan(0);
    const hits: string[] = [];
    for (const file of files) {
      for (const v of scanSource(readFileSync(file, 'utf8'), file)) {
        hits.push(`${relative(srcDir, file)}:${v.line}: ${v.message}`);
      }
    }
    expect(hits, hits.join('\n')).toEqual([]);
  });

  it('worker/simulate.worker.ts imports only ../simulate (runtime) and ./protocol (types)', () => {
    const file = join(engineDir, 'worker', 'simulate.worker.ts');
    const code = stripComments(readFileSync(file, 'utf8'));
    const runtime: string[] = [];
    const typeOnly: string[] = [];
    for (const m of code.matchAll(/^\s*import\s+(type\s+)?[^;]*?from\s*['"]([^'"]+)['"]/gms)) {
      const spec = m[2];
      if (spec !== undefined) (m[1] ? typeOnly : runtime).push(spec);
    }
    for (const m of code.matchAll(/^\s*import\s*['"]([^'"]+)['"]/gm)) {
      const spec = m[1];
      if (spec !== undefined) runtime.push(spec);
    }
    for (const m of code.matchAll(/\b(?:import|require)\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      const spec = m[1];
      if (spec !== undefined) runtime.push(spec);
    }
    expect(runtime.every((s) => s === '../simulate' || s === './protocol')).toBe(true);
    expect(runtime).toContain('../simulate');
    expect(typeOnly.every((s) => s === './protocol')).toBe(true);
  });
});
