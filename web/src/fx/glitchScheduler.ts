/** Pure tracking-glitch scheduler. Time is in seconds, randomness is injected. */
export interface GlitchState {
  nextAt: number;
  endAt: number | null;
}

export const MAX_GLITCH_SECONDS = 0.4;
const STEPS = [0.5, 1, 0.35] as const;

export interface GlitchScheduler {
  /** Returns the glitch amount in [0, 1]. */
  update(now: number, enabled: boolean): number;
  reset(now: number): void;
}

export function createGlitchScheduler(rand: () => number): GlitchScheduler {
  let nextAt: number | null = null;
  let startAt = 0;
  let endAt: number | null = null;

  const gap = () => 20 + 40 * rand();

  return {
    reset() {
      nextAt = null;
      endAt = null;
    },
    update(now, enabled) {
      if (!enabled) {
        nextAt = null;
        endAt = null;
        return 0;
      }
      if (nextAt === null && endAt === null) nextAt = now + gap();
      if (endAt !== null) {
        if (now >= endAt) {
          nextAt = endAt + gap();
          endAt = null;
          return 0;
        }
        const f = (now - startAt) / (endAt - startAt);
        return STEPS[Math.min(STEPS.length - 1, Math.max(0, Math.floor(f * STEPS.length)))] ?? 0;
      }
      if (nextAt !== null && now >= nextAt) {
        startAt = now;
        endAt = now + Math.min(MAX_GLITCH_SECONDS, 0.15 + 0.25 * rand());
        nextAt = null;
        return STEPS[0];
      }
      return 0;
    },
  };
}
