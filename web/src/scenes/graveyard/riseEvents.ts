/**
 * Tiny typed emitter for hand rise events (design Section 16). Not a store field, so events
 * can never replay: a listener only receives events emitted after it subscribed.
 */
export interface RiseEvent {
  cik: string;
  /** World position of the hand at the mound, metres. */
  position: readonly [number, number, number];
}

export type RiseListener = (event: RiseEvent) => void;

const listeners = new Set<RiseListener>();

export const riseEvents = {
  /** Calls every current listener once, in subscription order. */
  emit(event: RiseEvent): void {
    for (const l of [...listeners]) l(event);
  },
  /** Returns an unsubscribe function. Past events are never replayed. */
  subscribe(listener: RiseListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
