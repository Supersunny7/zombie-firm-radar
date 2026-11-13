import { describe, expect, it } from 'vitest';
import { nextCrowDelay } from './scheduler';

describe('nextCrowDelay', () => {
  it('maps the injected rand onto 20..60 seconds', () => {
    expect(nextCrowDelay(() => 0)).toBe(20);
    expect(nextCrowDelay(() => 0.5)).toBe(40);
    expect(nextCrowDelay(() => 0.999999)).toBeLessThanOrEqual(60);
  });

  it('calls rand exactly once per delay', () => {
    let calls = 0;
    nextCrowDelay(() => {
      calls += 1;
      return 0.25;
    });
    expect(calls).toBe(1);
  });
});
