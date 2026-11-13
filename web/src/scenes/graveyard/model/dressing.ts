/**
 * Dressing plan (pure, no React or three imports): which stones get a mound and
 * how many blood quads each undead stone carries. Design section 6.
 */
import { fnv1a32 } from '../../../engine/hash';
import { mulberry32 } from '../../../engine/rng';
import type { ShockBatch } from '../../../engine/shock';

/** Structural subset of a firm index entry. */
export interface DressingInput {
  readonly cik: string;
  readonly status: 'zombie' | 'endangered' | 'healthy' | 'insufficient_data';
}

export type DressingLights = 'off' | 'on';

export interface BloodPlan {
  /** Index into the firm list. */
  readonly firm: number;
  /** 1 to 5 quads (6.1). */
  readonly count: number;
  /** One unsigned 32-bit seed per quad (atlas cell, offset, rotation, scale). */
  readonly seeds: readonly number[];
}

export interface DressingPlan {
  /** Firm indices: zombie at delta 0 or newly undead, ascending. */
  readonly undead: readonly number[];
  /** Equals `undead` exactly (7.10, 14.1). */
  readonly mounds: readonly number[];
  /** Empty in lights on (6.2); other stones never appear (6.4). */
  readonly blood: readonly BloodPlan[];
}

export const MIN_BLOOD_QUADS = 1;
export const MAX_BLOOD_QUADS = 5;

/** Quad count for a CIK: 1 + hash % 5, so always within 1..5. */
export function bloodCountFor(cik: string): number {
  return MIN_BLOOD_QUADS + (fnv1a32(cik) % MAX_BLOOD_QUADS);
}

/** Per-quad seeds for a CIK; deterministic. */
export function bloodSeedsFor(cik: string, count: number): number[] {
  const next = mulberry32(fnv1a32(cik));
  const seeds: number[] = [];
  for (let i = 0; i < count; i++) seeds.push(Math.floor(next() * 4294967296) >>> 0);
  return seeds;
}

export function planDressing(
  firms: readonly DressingInput[],
  batch: Pick<ShockBatch, 'newlyUndead'>,
  lights: DressingLights,
): DressingPlan {
  const undead: number[] = [];
  firms.forEach((f, i) => {
    if (f.status === 'zombie' || batch.newlyUndead[i] === 1) undead.push(i);
  });
  const blood: BloodPlan[] = [];
  if (lights === 'off') {
    for (const i of undead) {
      const cik = firms[i]?.cik ?? '';
      const count = bloodCountFor(cik);
      blood.push({ firm: i, count, seeds: bloodSeedsFor(cik, count) });
    }
  }
  return { undead, mounds: undead.slice(), blood };
}
