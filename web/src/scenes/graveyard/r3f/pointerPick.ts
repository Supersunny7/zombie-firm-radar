/**
 * Pure pieces of pointer input (no three, no React): NDC conversion, pick wiring and a
 * tiny hover-change channel so the engraving set (task 12.2) can react to hover changes.
 */
import type { Grid } from '../layout/grid';
import type { GraveyardLayout } from '../layout/layout';
import { pickStone, type Ray } from '../layout/pick';

/** Client pixel position to normalised device coordinates (x right, y up) in a rect. */
export function ndcFromClient(
  rect: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  if (!(rect.width > 0) || !(rect.height > 0)) return null;
  return {
    x: ((clientX - rect.left) / rect.width) * 2 - 1,
    y: -((clientY - rect.top) / rect.height) * 2 + 1,
  };
}

/** Firm index of the stone under the ray, or null. */
export function pickFirmIndex(grid: Grid, layout: GraveyardLayout, ray: Ray): number | null {
  const hit = pickStone(grid, layout, ray);
  return hit ? (layout.stones[hit.stone]?.firmIndex ?? hit.stone) : null;
}

/** A tap is a click whose pointer moved no more than this many pixels since pointerdown. */
export const TAP_SLOP_PX = 8;

export function isTap(
  down: { x: number; y: number } | null,
  upX: number,
  upY: number,
  slop = TAP_SLOP_PX,
): boolean {
  if (!down) return true;
  return Math.hypot(upX - down.x, upY - down.y) <= slop;
}

export interface HoverChange {
  /** Firm index under the pointer, or null. */
  firm: number | null;
  /** The pointer ray at the time of the change. */
  ray: Ray;
}

type Listener = (change: HoverChange) => void;
const listeners = new Set<Listener>();
let lastRay: Ray | null = null;

/** Subscribe to hover changes (fires only when the hovered firm changes). Returns unsubscribe. */
export function subscribeHoverChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Most recent pointer ray, or null before any pointer movement. */
export function getLastPointerRay(): Ray | null {
  return lastRay;
}

export function emitHoverChange(change: HoverChange): void {
  lastRay = change.ray;
  listeners.forEach((fn) => fn(change));
}

/** Records the ray without notifying (hover unchanged). */
export function recordPointerRay(ray: Ray): void {
  lastRay = ray;
}
