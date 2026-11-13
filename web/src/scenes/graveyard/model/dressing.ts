/**
 * Dressing plan (pure, no React or three imports): which stones get a closed or torn
 * mound, how many blood quads and ground stains each undead stone carries. Design section 6.
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

export interface StainPlan {
  /** Index into the firm list; always a torn mound. */
  readonly firm: number;
  /** 0 to 3 flat stains on the heap top (7.11). */
  readonly count: number;
  readonly seeds: readonly number[];
}

export interface DressingPlan {
  /** Firm indices: zombie at delta 0 or newly undead, ascending. */
  readonly undead: readonly number[];
  /** Equals `undead` exactly (7.10, 14.1). */
  readonly mounds: readonly number[];
  /** Torn-open graves: equals `undead` (7.4, 7.6). */
  readonly torn: readonly number[];
  /** Every other firm; `torn` and `closed` partition all firms (7.1). */
  readonly closed: readonly number[];
  /** One entry per torn mound in lights off, count 0..3; empty in lights on (7.10, 7.11). */
  readonly stains: readonly StainPlan[];
  /** Empty in lights on (6.2); other stones never appear (6.4). */
  readonly blood: readonly BloodPlan[];
}

export const MIN_BLOOD_QUADS = 1;
export const MAX_BLOOD_QUADS = 5;
export const MAX_STAINS = 3;

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

/** Stain count for a CIK: hash % 4, so 0..3. */
export function stainCountFor(cik: string): number {
  return fnv1a32(cik) % (MAX_STAINS + 1);
}

/** Per-stain seeds for a CIK; deterministic and independent of the blood seeds. */
export function stainSeedsFor(cik: string, count: number): number[] {
  const next = mulberry32(fnv1a32(cik + ':stain'));
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
  const closed: number[] = [];
  firms.forEach((f, i) => {
    if (f.status === 'zombie' || batch.newlyUndead[i] === 1) undead.push(i);
    else closed.push(i);
  });
  const blood: BloodPlan[] = [];
  const stains: StainPlan[] = [];
  if (lights === 'off') {
    for (const i of undead) {
      const cik = firms[i]?.cik ?? '';
      const count = bloodCountFor(cik);
      blood.push({ firm: i, count, seeds: bloodSeedsFor(cik, count) });
      const sc = stainCountFor(cik);
      stains.push({ firm: i, count: sc, seeds: stainSeedsFor(cik, sc) });
    }
  }
  return { undead, mounds: undead.slice(), torn: undead.slice(), closed, blood, stains };
}
