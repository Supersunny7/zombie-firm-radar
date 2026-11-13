import { describe, expect, it } from 'vitest';
import { blendParams, cameraFarEdgeDistance } from './lightsBlend';

describe('cameraFarEdgeDistance', () => {
  it('measures the top view ray to the ground for the 60 degree overview', () => {
    // Height 93.3 at 60 degrees pitch, FOV 52: top ray 34 degrees down, 93.3 / sin(34 deg).
    const h = 93.3;
    const pos = [0, h, h / Math.tan(Math.PI / 3)];
    const d = cameraFarEdgeDistance(pos, [0, 0, 0], 52, 360);
    expect(d).toBeCloseTo(h / Math.sin(((60 - 26) * Math.PI) / 180), 6);
  });
  it('caps a flat plot view at the max distance', () => {
    expect(cameraFarEdgeDistance([0, 2.15, 9.4], [0, 0.2, -2], 52, 360)).toBe(360);
  });
});

describe('blendParams with overview distance', () => {
  it('passes the distance to the overview fog and leaves the plot fog alone', () => {
    const overview = { from: 'overview', to: 'overview', progress: 1 } as const;
    const plot = { from: 1, to: 1, progress: 1 } as const;
    expect(blendParams(0, 0, overview, 160).fogDensity).toBeCloseTo(0.01, 12);
    expect(blendParams(0, 0, plot, 160).fogDensity).toBe(0.085);
    expect(blendParams(1, 0, plot, 160).fogDensity).toBe(0.05);
  });
});
