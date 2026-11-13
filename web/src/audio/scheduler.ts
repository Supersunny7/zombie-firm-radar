/**
 * Pure crow scheduler (Requirement 16.3). No React, three or Web Audio imports.
 * Returns the next crow delay in seconds, 20 to 60 inclusive of the lower bound.
 * `rand` is an injected source returning a number in [0, 1).
 */
export function nextCrowDelay(rand: () => number): number {
  return 20 + 40 * rand();
}
