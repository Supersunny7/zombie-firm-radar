import { describe, expect, it } from 'vitest';
import { groundFogDrawn, groundFogScale } from './groundFogLook';
import { sceneParams, type CameraFogState } from './sceneParams';

const plot: CameraFogState = { from: 1, to: 1, progress: 1 };
const overview: CameraFogState = { from: 'overview', to: 'overview', progress: 1 };

describe('groundFogLook (23.19)', () => {
  it('draws no Ground_Fog layer in a lights-off framed Plot', () => {
    const look = sceneParams('off', 0, plot).plotLook;
    expect(groundFogDrawn(look)).toBe(false);
    expect(groundFogScale(look)).toBe(0);
  });

  it('draws the layers unchanged in the lights-off overview, lights-on plot and lights-on overview', () => {
    const cases = [
      ['off', overview],
      ['on', plot],
      ['on', overview],
    ] as const;
    for (const [lights, cam] of cases) {
      const look = sceneParams(lights, 0, cam).plotLook;
      expect(groundFogDrawn(look)).toBe(true);
      expect(groundFogScale(look)).toBe(1);
    }
  });

  it('fades over the camera move and is gone when the move ends (23.18)', () => {
    const half = sceneParams('off', 0, { from: 'overview', to: 1, progress: 0.5 }).plotLook;
    expect(groundFogScale(half)).toBe(0.5);
    const done = sceneParams('off', 0, { from: 'overview', to: 1, progress: 1 }).plotLook;
    expect(groundFogDrawn(done)).toBe(false);
  });
});
