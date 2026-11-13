// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';

const webDir = fileURLToPath(new URL('..', import.meta.url));
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

const readJson = (path: string) =>
  JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;

const pkg = readJson(`${webDir}package.json`) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  packageManager: string;
  engines: { node: string };
};
const vercel = readJson(`${repoRoot}vercel.json`);

describe('web/package.json', () => {
  it('pins every dependency exactly', () => {
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const [name, version] of Object.entries(all)) {
      expect(version, name).toMatch(/^\d+\.\d+\.\d+$/);
      expect(version, name).not.toMatch(/[\^~*<>|\s]/);
    }
  });

  it('defines the required scripts', () => {
    for (const s of ['dev', 'build', 'preview', 'test', 'lint', 'format', 'typecheck']) {
      expect(pkg.scripts[s], s).toBeTruthy();
    }
  });

  it('declares packageManager and node engine', () => {
    expect(pkg.packageManager).toBe('pnpm@12.18.0');
    expect(pkg.engines.node).toBe('>=22');
  });

  it('uses the react 19 / fiber 9 line', () => {
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(pkg.dependencies.react).toMatch(/^19\./);
    expect(pkg.dependencies['@react-three/fiber']).toMatch(/^9\./);
    const drei = all['@react-three/drei'];
    if (drei) expect(drei).not.toMatch(/^9\./);
    expect(all['@theatre/studio']).toBeUndefined();
  });
});

describe('vercel.json', () => {
  it('sets install, build and output and has no functions or rewrites', () => {
    expect(vercel.installCommand).toBeTruthy();
    expect(vercel.buildCommand).toBeTruthy();
    expect(vercel.outputDirectory).toBeTruthy();
    expect(vercel).not.toHaveProperty('functions');
    expect(vercel).not.toHaveProperty('rewrites');
  });

  // Bug condition exploration: both commands must pin the packageManager pnpm version.
  const pmMatch = /^pnpm@(\d+\.\d+\.\d+)$/.exec(pkg.packageManager);
  const expectedVersion = pmMatch?.[1];

  const foundVersions = (command: string): string[] => {
    const versions = [...command.matchAll(/\bpnpm@(\d+\.\d+\.\d+)(?![\w.-])/g)].flatMap((m) =>
      m[1] === undefined ? [] : [m[1]],
    );
    return [...new Set(versions)];
  };

  it('has a packageManager field of the form pnpm@x.y.z', () => {
    expect(
      pmMatch,
      `web/package.json packageManager "${pkg.packageManager}" does not match pnpm@<x.y.z>`,
    ).not.toBeNull();
  });

  for (const key of ['installCommand', 'buildCommand'] as const) {
    it(`${key} pins the packageManager pnpm version`, () => {
      const command = String(vercel[key] ?? '');
      const found = foundVersions(command);
      const message = `vercel.json ${key} uses pnpm@${found.length ? found.join(', pnpm@') : 'none'} but web/package.json packageManager is pnpm@${expectedVersion}`;
      expect(found, message).toEqual([expectedVersion]);
    });

    it(`${key} runs pnpm with --dir web`, () => {
      expect(String(vercel[key] ?? '')).toContain('--dir web');
    });
  }
});

describe('ESLint purity rule', () => {
  const lint = async (filePath: string, code: string) => {
    const eslint = new ESLint({ cwd: webDir });
    const [result] = await eslint.lintText(code, { filePath });
    return (result?.messages ?? []).filter((m) => m.severity === 2);
  };

  it('rejects react and three imports in src/engine', async () => {
    const react = await lint(
      'src/engine/x.ts',
      "import { useState } from 'react';\nexport const a = useState;\n",
    );
    const three = await lint(
      'src/engine/x.ts',
      "import * as THREE from 'three';\nexport const b = THREE;\n",
    );
    expect(react.some((m) => m.ruleId === 'no-restricted-imports')).toBe(true);
    expect(three.some((m) => m.ruleId === 'no-restricted-imports')).toBe(true);
  }, 30_000);

  it('allows react outside the pure modules', async () => {
    const msgs = await lint(
      'src/ui/x.ts',
      "import { useState } from 'react';\nexport const a = useState;\n",
    );
    expect(msgs.some((m) => m.ruleId === 'no-restricted-imports')).toBe(false);
  });
});
