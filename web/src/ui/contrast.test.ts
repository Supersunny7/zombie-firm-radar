/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ThemeSync } from './ThemeSync';

const css = readFileSync('src/index.css', 'utf8');

type Rgb = [number, number, number];

function block(selector: string): string {
  const start = css.indexOf(selector);
  const open = css.indexOf('{', start);
  return css.slice(open + 1, css.indexOf('}', open));
}

function tokens(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/--color-([\w-]+):\s*([^;]+);/g)) {
    out[m[1] as string] = (m[2] as string).trim();
  }
  return out;
}

const darkTokens = tokens(block('@theme'));
const lightsOnTokens = { ...darkTokens, ...tokens(block(':root[data-lights="on"]')) };

function parseHex(hex: string): Rgb {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
}

/** Resolves a hex or rgba() token to opaque RGB by compositing over a backdrop. */
function resolveColor(value: string, backdrop: Rgb): Rgb {
  if (value.startsWith('#')) return parseHex(value);
  const m = /rgba?\(([^)]+)\)/.exec(value);
  if (!m) throw new Error(`Unsupported color: ${value}`);
  const [r, g, b, a = 1] = (m[1] as string).split(',').map((p) => Number(p.trim())) as number[];
  const alpha = a as number;
  const fg = [r, g, b] as number[];
  return fg.map((c, i) => Math.round(c * alpha + (backdrop[i] as number) * (1 - alpha))) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  const [R, G, B] = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function ratio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const textTokens = [
  'text',
  'text-2',
  'rec',
  'status-healthy',
  'status-endangered',
  'status-zombie',
  'status-insufficient',
];

describe('WCAG contrast of HUD and Table token pairs', () => {
  it('computes known reference ratios', () => {
    expect(ratio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
    expect(ratio([119, 119, 119], [255, 255, 255])).toBeCloseTo(4.48, 1);
  });

  for (const [mode, t] of [
    ['lights off', darkTokens],
    ['lights on', lightsOnTokens],
  ] as const) {
    describe(mode, () => {
      const ink = resolveColor(t['ink'] as string, [0, 0, 0]);
      const panel = resolveColor(t['panel'] as string, ink);
      for (const [surfaceName, surface] of [
        ['panel', panel],
        ['ink', ink],
      ] as const) {
        for (const name of textTokens) {
          it(`${name} on ${surfaceName} is at least 4.5:1`, () => {
            const fg = resolveColor(t[name] as string, surface);
            expect(ratio(fg, surface)).toBeGreaterThanOrEqual(4.5);
          });
        }
      }
    });
  }
});

describe('ThemeSync', () => {
  afterEach(() => {
    cleanup();
    delete document.documentElement.dataset.lights;
    delete document.documentElement.dataset.reducedMotion;
  });

  it('sets and updates data-lights and data-reduced-motion', () => {
    const root = document.documentElement;
    const { rerender } = render(createElement(ThemeSync, { lightsOn: false, reducedMotion: false }));
    expect(root.getAttribute('data-lights')).toBe('off');
    expect(root.getAttribute('data-reduced-motion')).toBe('false');

    rerender(createElement(ThemeSync, { lightsOn: true, reducedMotion: true }));
    expect(root.getAttribute('data-lights')).toBe('on');
    expect(root.getAttribute('data-reduced-motion')).toBe('true');

    rerender(createElement(ThemeSync, { lightsOn: false, reducedMotion: true }));
    expect(root.getAttribute('data-lights')).toBe('off');
    expect(root.getAttribute('data-reduced-motion')).toBe('true');
  });
});
