import { describe, expect, it } from 'vitest';
import { clipFlap } from './clipFlap';
import { modelFor } from './modelFor';
import { STONE_MODELS } from './stoneModels';

describe('modelFor', () => {
  it('maps status to model', () => {
    expect(modelFor('healthy', false)).toBe('intact');
    expect(modelFor('insufficient_data', false)).toBe('intact');
    expect(modelFor('endangered', false)).toBe('cracked');
    expect(modelFor('zombie', false)).toBe('broken');
  });
  it('uses broken for newly undead, base model otherwise', () => {
    expect(modelFor('healthy', true)).toBe('broken');
    expect(modelFor('endangered', true)).toBe('broken');
    expect(modelFor('healthy', false)).toBe('intact');
  });
});

describe('STONE_MODELS', () => {
  it('has the documented flap clips', () => {
    expect(STONE_MODELS.intact.flapClip).toEqual({ zMin: 8, yMax: 14 });
    expect(STONE_MODELS.cracked.flapClip).toEqual({ zMin: 8, yMax: 18 });
    expect(STONE_MODELS.broken.flapClip).toBeNull();
  });
});

describe('clipFlap', () => {
  // v0..v2 body, v3..v5 flap (z 10, y 5), v6 body at z 10 but high y.
  const pos = [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 5, 10, 1, 5, 10, 0, 6, 10, 0, 20, 10];
  const clip = { zMin: 8, yMax: 14 };
  it('drops triangles touching the flap and returns a new list', () => {
    const idx = [0, 1, 2, 3, 4, 5, 2, 5, 6, 0, 1, 3];
    const copy = [...idx];
    const out = clipFlap(pos, idx, clip);
    expect(Array.from(out)).toEqual([0, 1, 2]);
    expect(out).not.toBe(idx);
    expect(idx).toEqual(copy);
  });
  it('handles a non-indexed geometry', () => {
    expect(Array.from(clipFlap(pos.slice(0, 18), null, clip))).toEqual([0, 1, 2]);
  });
});
