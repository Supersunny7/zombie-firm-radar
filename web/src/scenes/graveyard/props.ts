/**
 * Prop placement (pure, design Section 8). No react or three imports.
 * props.json stores offsets relative to named anchors; resolveProps turns them into world
 * positions from the layout, so the same layout always gives the same positions.
 */
import type { GraveyardLayout } from './layout/layout';
import { FIRST_ROW_Z } from './layout/layout';
import raw from './props.json';

export interface PropEntry {
  readonly anchor: string;
  readonly offset: readonly [number, number, number];
  readonly yaw?: number;
  readonly scale: number;
}
export interface StumpEntry extends PropEntry {
  /** Index into ASSET_KEYS.stumps. */
  readonly model: number;
}
export interface CobwebEntry extends PropEntry {
  /** Index of the mesh (card variant) inside the cobweb pack. */
  readonly mesh: number;
}
export interface LanternLight {
  readonly color: string;
  readonly intensity: number;
  readonly distance: number;
  readonly decay: number;
  /** Light height above the lantern base, metres. */
  readonly height: number;
}
export interface LanternEntry extends PropEntry {
  readonly light: LanternLight;
}
export interface PropsConfig {
  readonly gate: PropEntry;
  readonly statue: PropEntry;
  readonly trunk: PropEntry;
  readonly stumps: readonly StumpEntry[];
  readonly lantern: LanternEntry;
  readonly rubble: readonly PropEntry[];
  readonly cobwebs: readonly CobwebEntry[];
}

export const propsConfig = raw as unknown as PropsConfig;

/** Count ranges from requirement 8.2. */
export const PROP_COUNTS = {
  stumps: [2, 8],
  rubble: [10, 60],
  cobwebs: [2, 10],
} as const;

export interface Placement {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  readonly scale: number;
}
export interface ResolvedStump extends Placement {
  readonly model: number;
}
export interface ResolvedCobweb extends Placement {
  readonly mesh: number;
}
export interface ResolvedLantern extends Placement {
  readonly light: LanternLight;
  /** World position of the point light. */
  readonly lightPosition: readonly [number, number, number];
}
export interface ResolvedProps {
  readonly gate: Placement;
  readonly statue: Placement;
  readonly trunk: Placement;
  readonly stumps: readonly ResolvedStump[];
  readonly lantern: ResolvedLantern;
  readonly rubble: readonly Placement[];
  readonly cobwebs: readonly ResolvedCobweb[];
}

const ANCHOR_RE = /^(world|behindLast|plot:\d+)$/;

/** Returns human-readable problems; empty when the config is valid (8.2, 8.3). */
export function validateProps(config: PropsConfig = propsConfig): string[] {
  const problems: string[] = [];
  const range = (name: keyof typeof PROP_COUNTS, n: number): void => {
    const [lo, hi] = PROP_COUNTS[name];
    if (n < lo || n > hi) problems.push(`${name}: ${n} entries, expected ${lo} to ${hi}`);
  };
  range('stumps', config.stumps.length);
  range('rubble', config.rubble.length);
  range('cobwebs', config.cobwebs.length);
  const all: [string, PropEntry][] = [
    ['gate', config.gate],
    ['statue', config.statue],
    ['trunk', config.trunk],
    ['lantern', config.lantern],
    ...config.stumps.map((e, i): [string, PropEntry] => [`stumps[${i}]`, e]),
    ...config.rubble.map((e, i): [string, PropEntry] => [`rubble[${i}]`, e]),
    ...config.cobwebs.map((e, i): [string, PropEntry] => [`cobwebs[${i}]`, e]),
  ];
  for (const [name, e] of all) {
    if (!ANCHOR_RE.test(e.anchor)) problems.push(`${name}: bad anchor "${e.anchor}"`);
    if (!(e.scale > 0) || !e.offset.every(Number.isFinite)) problems.push(`${name}: bad numbers`);
  }
  const l = config.lantern.light;
  if (!/^#ff9a4a$/i.test(l.color)) problems.push('lantern: light colour must be #ff9a4a');
  if (!(l.intensity > 0)) problems.push('lantern: intensity must be positive');
  if (!(l.distance > 0 && Number.isFinite(l.distance))) {
    problems.push('lantern: distance must be positive and finite');
  }
  return problems;
}

/** Anchor point (x, z) for an anchor name. Missing plots fall back to the last plot, then origin. */
export function anchorPoint(layout: GraveyardLayout, anchor: string): { x: number; z: number } {
  const { plots, bounds } = layout;
  if (anchor === 'behindLast') {
    if (plots.length === 0) return { x: 0, z: 0 };
    return { x: (bounds.x0 + bounds.x1) / 2, z: bounds.z0 };
  }
  if (anchor.startsWith('plot:')) {
    const n = Number(anchor.slice(5));
    const plot = plots[Math.min(Math.max(0, Number.isFinite(n) ? n : 0), plots.length - 1)];
    return plot ? { x: plot.centerX, z: plot.frontZ } : { x: 0, z: FIRST_ROW_Z };
  }
  return { x: 0, z: 0 };
}

function place(layout: GraveyardLayout, e: PropEntry): Placement {
  const a = anchorPoint(layout, e.anchor);
  return {
    x: a.x + e.offset[0],
    y: e.offset[1],
    z: a.z + e.offset[2],
    yaw: e.yaw ?? 0,
    scale: e.scale,
  };
}

/** Resolve every prop to world coordinates. Pure and deterministic. */
export function resolveProps(
  layout: GraveyardLayout,
  config: PropsConfig = propsConfig,
): ResolvedProps {
  const lantern = place(layout, config.lantern);
  return {
    gate: place(layout, config.gate),
    statue: place(layout, config.statue),
    trunk: place(layout, config.trunk),
    stumps: config.stumps.map((s) => ({ ...place(layout, s), model: s.model })),
    lantern: {
      ...lantern,
      light: config.lantern.light,
      lightPosition: [lantern.x, lantern.y + config.lantern.light.height, lantern.z],
    },
    rubble: config.rubble.map((r) => place(layout, r)),
    cobwebs: config.cobwebs.map((c) => ({ ...place(layout, c), mesh: c.mesh })),
  };
}
