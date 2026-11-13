// @vitest-environment node
// Requirement 23.17: every look value that `reference/graveyard/horror-direction-params.md`
// lists for criteria 1, 4, 5, 7 to 11, 14 and 15 equals the constant in `look.ts`.
// The expected numbers are parsed from the markdown, never typed a second time here.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  LOOK_BACKGROUND,
  LOOK_CAMERA,
  LOOK_CCTV_GRADE,
  LOOK_FLASHLIGHT,
  LOOK_HEMISPHERE,
  LOOK_LANTERN,
  LOOK_MOON,
  LOOK_PLOT_FOG,
  LOOK_STONE_COLOR_FACTOR,
  LOOK_TONE_MAPPING,
} from './look';

const PARAMS_REL = join('reference', 'graveyard', 'horror-direction-params.md');

/** Walks up from this test file until the repo folder holding the params file is found. */
function findParamsFile(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    const candidate = join(dir, PARAMS_REL);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`${PARAMS_REL} not found above ${import.meta.url}`);
    dir = parent;
  }
}

/** Splits the markdown into `## ` sections keyed by heading text. */
function sections(markdown: string): Map<string, string> {
  const out = new Map<string, string>();
  let heading = '';
  let body: string[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) {
      if (heading) out.set(heading, body.join('\n'));
      heading = m[1]!;
      body = [];
    } else {
      body.push(line);
    }
  }
  if (heading) out.set(heading, body.join('\n'));
  return out;
}

function section(all: Map<string, string>, prefix: string): string {
  for (const [heading, body] of all) if (heading.startsWith(prefix)) return body;
  throw new Error(`section "${prefix}" missing from ${PARAMS_REL}`);
}

/** Bullet (`- `) and numbered (`1. `) list items of a section, without their markers. */
function items(body: string): string[] {
  return body
    .split('\n')
    .map((l) => /^\s*(?:-|\d+\.)\s+(.*)$/.exec(l)?.[1])
    .filter((l): l is string => l !== undefined);
}

/** Table body rows keyed by their first cell (header and separator rows dropped). */
function tableRows(body: string): Map<string, string[]> {
  const rows = body
    .split('\n')
    .filter((l) => l.trim().startsWith('|'))
    .map((l) =>
      l
        .trim()
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((c) => c.trim()),
    )
    .filter((cells) => !cells.every((c) => /^:?-+:?$/.test(c)));
  return new Map(rows.slice(1).map((cells) => [cells[0]!, cells.slice(1)]));
}

/** The first list item containing `needle`; fails loudly if the file no longer lists it. */
function item(list: string[], needle: string): string {
  const hit = list.find((l) => l.includes(needle));
  if (hit === undefined) throw new Error(`no list item containing "${needle}"`);
  return hit;
}

function row(rows: Map<string, string[]>, prefix: string): string[] {
  for (const [key, cells] of rows) if (key.startsWith(prefix)) return cells;
  throw new Error(`no light row starting with "${prefix}"`);
}

/** Capture group 1 of `re` in `text`; throws when absent so a reworded file fails the test. */
function capture(text: string, re: RegExp): string {
  const m = re.exec(text);
  if (m?.[1] === undefined) throw new Error(`${String(re)} did not match "${text}"`);
  return m[1];
}

const NUM = String.raw`([+-]?\d+(?:\.\d+)?)`;
const HEX = '(#[0-9a-fA-F]{6})';

function num(text: string, before: string, after = ''): number {
  return Number(capture(text, new RegExp(`${before}\\s*${NUM}${after}`)));
}

function hex(text: string, before = ''): string {
  return capture(text, new RegExp(`${before}\\s*${HEX}`)).toLowerCase();
}

function tuple(text: string, before: string): number[] {
  return capture(text, new RegExp(`${before}\\s*\\(([^)]*)\\)`))
    .split(',')
    .map((s) => Number(s.trim()));
}

const ORDINALS: Record<string, number> = { second: 2, third: 3, fourth: 4, fifth: 5 };

const all = sections(readFileSync(findParamsFile(), 'utf8'));

describe('look.ts matches horror-direction-params.md (Requirement 23.17)', () => {
  it('camera: FOV, eye height and look height (23.1)', () => {
    const cam = item(items(section(all, 'Camera')), 'FOV');
    expect(LOOK_CAMERA.fovDeg).toBe(num(cam, 'FOV'));
    // Only the heights are taken from the prototype tuples. The x and z of the position
    // (-0.55, _, 1.35) and look-at (0.35, _, -2.0), the hero grave at (0.4, 0, -1.75) and the
    // "about 3.2 m" distance belong to the prototype's single hand-placed shot; look.ts derives
    // its own back and ahead distances per Plot (design section 6), so they are skipped.
    expect(LOOK_CAMERA.eyeHeight).toBe(tuple(cam, 'Position')[1]);
    expect(LOOK_CAMERA.eyeHeight).toBe(num(cam, 'eye height', ' m'));
    expect(LOOK_CAMERA.lookHeight).toBe(tuple(cam, 'look-at')[1]);
  });

  it('fog and background (23.4, 23.5)', () => {
    const fog = item(items(section(all, 'Fog and tone')), 'FogExp2');
    expect(LOOK_PLOT_FOG.type).toBe('FogExp2');
    expect(LOOK_PLOT_FOG.color).toBe(hex(fog, 'colour'));
    expect(LOOK_PLOT_FOG.density).toBe(num(fog, 'density'));
    expect(fog).toMatch(/background is the same colour/);
    expect(LOOK_BACKGROUND).toBe(hex(fog, 'colour'));
  });

  it('tone mapping (23.15)', () => {
    const tone = item(items(section(all, 'Fog and tone')), 'tone mapping');
    expect(tone).toMatch(/ACES filmic/);
    expect(LOOK_TONE_MAPPING.mode).toBe('ACESFilmic');
    expect(LOOK_TONE_MAPPING.exposure).toBe(num(tone, 'exposure'));
  });

  const lights = tableRows(section(all, 'Lights'));

  it('hemisphere (23.7)', () => {
    const [colour, intensity] = row(lights, 'Hemisphere');
    expect(LOOK_HEMISPHERE.skyColor).toBe(hex(colour!, 'sky'));
    expect(LOOK_HEMISPHERE.groundColor).toBe(hex(colour!, 'ground'));
    expect(LOOK_HEMISPHERE.intensity).toBe(Number(intensity));
  });

  it('moon (23.8)', () => {
    const [colour, intensity, notes] = row(lights, 'Moon');
    expect(LOOK_MOON.color).toBe(hex(colour!));
    expect(LOOK_MOON.intensity).toBe(Number(intensity));
    expect([...LOOK_MOON.offset]).toEqual(tuple(notes!, 'from'));
    expect(notes).toMatch(/casts shadows/);
    expect(LOOK_MOON.castShadow).toBe(true);
  });

  it('flashlight (23.9)', () => {
    const [colour, intensity, notes] = row(lights, 'Flashlight');
    expect(LOOK_FLASHLIGHT.color).toBe(hex(colour!));
    expect(LOOK_FLASHLIGHT.intensity).toBe(Number(intensity));
    expect(LOOK_FLASHLIGHT.distance).toBe(num(notes!, 'distance'));
    expect(LOOK_FLASHLIGHT.angle).toBe(num(notes!, 'angle'));
    expect(LOOK_FLASHLIGHT.penumbra).toBe(num(notes!, 'penumbra'));
    expect(LOOK_FLASHLIGHT.decay).toBe(num(notes!, 'decay'));
    expect(notes).toMatch(/casts shadows/);
    expect(LOOK_FLASHLIGHT.castShadow).toBe(true);
    // Shadow bias and flicker values are not listed in the params file (23.9 only), so not checked here.
  });

  it('lantern (23.10)', () => {
    const [colour, intensity, notes] = row(lights, 'Lantern');
    expect(LOOK_LANTERN.color).toBe(hex(colour!));
    expect(LOOK_LANTERN.intensity).toBe(Number(intensity));
    expect(LOOK_LANTERN.distance).toBe(num(notes!, 'distance'));
    expect(LOOK_LANTERN.decay).toBe(num(notes!, 'decay'));
    expect(LOOK_LANTERN.height).toBe(num(notes!, '', ' m above ground'));
    // "1.5 m left of the hero grave" is skipped: the lantern prop's placement comes from the
    // plot layout, not from look.ts.
  });

  it('CCTV grade steps (a) to (f) (23.11)', () => {
    const steps = items(section(all, 'CCTV grade'));
    const sat = item(steps, 'Saturation');
    expect(LOOK_CCTV_GRADE.saturation).toBe(num(sat, 'Saturation'));
    // "mix 40% luma": the luma share is 1 - saturation.
    expect(1 - LOOK_CCTV_GRADE.saturation).toBeCloseTo(num(sat, 'mix', '%') / 100, 12);

    const tone = item(steps, 'Gain');
    expect(LOOK_CCTV_GRADE.gain).toBe(num(tone, 'Gain'));
    expect(LOOK_CCTV_GRADE.lift).toBe(num(tone, 'lift'));
    expect(LOOK_CCTV_GRADE.gamma).toBe(num(tone, 'gamma'));

    const vig = item(steps, 'Vignette');
    expect(LOOK_CCTV_GRADE.vignetteStrength).toBe(num(vig, '1 - '));
    expect(LOOK_CCTV_GRADE.vignettePower).toBe(num(vig, 'r\\^'));

    const grain = item(steps, 'Grain');
    expect(LOOK_CCTV_GRADE.grainSigma).toBe(num(grain, 'sigma'));

    const scan = item(steps, 'Scanlines');
    expect(LOOK_CCTV_GRADE.scanlinePeriod).toBe(ORDINALS[capture(scan, /every (\w+) row/)]);
    expect(LOOK_CCTV_GRADE.scanlineFactor).toBe(num(scan, 'row x'));

    const ghost = item(steps, 'Red channel ghost');
    expect(LOOK_CCTV_GRADE.redGhostMix).toBeCloseTo(num(ghost, 'ghost:', '%') / 100, 12);
    expect(LOOK_CCTV_GRADE.redGhostOffsetPx).toBe(num(ghost, 'shifted', ' px'));
  });

  it('stone base-colour factor (23.14)', () => {
    const stone = item(items(section(all, 'Stones')), 'Base colour');
    expect(LOOK_STONE_COLOR_FACTOR).toBe(num(stone, 'multiplied by'));
    // The other Stones bullets (row and column spacing, jitter, heights, tilts, the hero
    // stone lean), the Torn mound, Zombies and Sound sections are not look values of
    // criteria 1, 4, 5, 7 to 11, 14 or 15 and are not held by look.ts; skipped.
  });
});
