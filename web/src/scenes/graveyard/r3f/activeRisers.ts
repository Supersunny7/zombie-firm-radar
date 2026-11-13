/**
 * Ciks whose Risen_Zombie is rising or lowering. A torn mound is never removed under such a
 * character (7.5). No character exists before Batch 3a, so the set is empty; the rise pool
 * will call `setActiveRiserCiks` and the mounds already follow it.
 */
import { useSyncExternalStore } from 'react';

const EMPTY: ReadonlySet<string> = new Set();
let current: ReadonlySet<string> = EMPTY;
const listeners = new Set<() => void>();

export function setActiveRiserCiks(ciks: Iterable<string>): void {
  const next = new Set(ciks);
  if (next.size === current.size && [...next].every((c) => current.has(c))) return;
  current = next.size === 0 ? EMPTY : next;
  for (const l of [...listeners]) l();
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useActiveRiserCiks(): ReadonlySet<string> {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => EMPTY,
  );
}
