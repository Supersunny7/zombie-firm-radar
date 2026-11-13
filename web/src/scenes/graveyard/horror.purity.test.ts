// @vitest-environment node
// Requirements 11.14, 20.8, 20.11: the horror-pass pure modules import no react or three
// and never use setTimeout or setInterval (choreography belongs to the frame clock).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/** `web/src`: this file lives in `web/src/scenes/graveyard`. */
const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Pure modules added by the horror pass, relative to `web/src`. */
export const PURE_MODULES: readonly string[] = [
  // Batch 2
  'scenes/graveyard/layout/jitter.ts',
  'scenes/graveyard/layout/extents.ts',
  'scenes/graveyard/model/tornMound.ts',
  'scenes/graveyard/model/moundPlacement.ts',
  'scenes/graveyard/model/moundSets.ts',
  'scenes/graveyard/model/grass.ts',
  'scenes/graveyard/model/grassTexture.ts',
  'scenes/graveyard/model/dressing.ts',
  // Batch 2b
  'scenes/graveyard/look.ts',
  'fx/gradeColour.ts',
  'scenes/graveyard/model/moonAnchor.ts',
  'scenes/graveyard/model/groundFogLook.ts',
  'scenes/graveyard/r3f/lanternLight.ts',
  'scenes/graveyard/r3f/flashlightState.ts',
  'fx/cctvParams.ts',
];

/** Blanks comments (keeps strings and line numbers) so prose cannot trip the scan. */
function stripComments(source: string): string {
  let out = '';
  let i = 0;
  while (i < source.length) {
    const ch = source[i]!;
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
        out += source[i] ?? '';
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

const SPECIFIER_PATTERNS: RegExp[] = [
  /\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\bimport\s*['"]([^'"]+)['"]/g,
];

function isForbiddenSpecifier(spec: string): boolean {
  return (
    spec === 'react' ||
    spec === 'react-dom' ||
    spec === 'three' ||
    spec.startsWith('react/') ||
    spec.startsWith('three/') ||
    spec.startsWith('@react-three/')
  );
}

/** Returns one message per violation, with line numbers. */
export function scanPureSource(source: string): string[] {
  const hits: string[] = [];
  stripComments(source)
    .split('\n')
    .forEach((text, idx) => {
      for (const pattern of SPECIFIER_PATTERNS) {
        for (const m of text.matchAll(pattern)) {
          if (m[1] !== undefined && isForbiddenSpecifier(m[1])) {
            hits.push(`${idx + 1}: forbidden import of '${m[1]}'`);
          }
        }
      }
      if (/\b(?:setTimeout|setInterval)\b/.test(text)) {
        hits.push(`${idx + 1}: forbidden timer`);
      }
    });
  return hits;
}

describe('horror pass purity scan', () => {
  it('flags violations in snippets (scanner self-test)', () => {
    for (const bad of [
      "import { Vector3 } from 'three';",
      "import React from 'react';",
      "import { x } from 'three/examples/jsm/y';",
      "import { x } from '@react-three/fiber';",
      'setTimeout(() => 1, 5);',
      'const t = setInterval(f, 1);',
    ]) {
      expect(scanPureSource(bad), bad).not.toHaveLength(0);
    }
    for (const good of [
      "import { a } from './jitter';",
      "// import x from 'three'; setTimeout",
      '/* setInterval */ const a = 1;',
      "const s = 'three';",
    ]) {
      expect(scanPureSource(good), good).toHaveLength(0);
    }
  });

  it.each(PURE_MODULES)('%s imports no react or three and uses no timers', (rel) => {
    const source = readFileSync(join(srcDir, rel), 'utf8');
    expect(scanPureSource(source), rel).toEqual([]);
  });
});
