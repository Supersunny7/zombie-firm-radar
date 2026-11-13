/**
 * Lantern_Light intensity (Requirement 23.10). Pure: no React or three imports.
 * intensity(t) = I * (base + amp * sin(fA * t) * sin(fB * t)), t in seconds of the render-loop
 * clock; constant I while Reduced_Motion is true. All numbers come from LOOK_LANTERN.
 */
import { LOOK_LANTERN } from '../look';

export function lanternIntensity(t: number, reducedMotion: boolean): number {
  const L = LOOK_LANTERN;
  if (reducedMotion) return L.intensity;
  const flicker = Math.sin(L.flickerFreqA * t) * Math.sin(L.flickerFreqB * t);
  return L.intensity * (L.flickerBase + L.flickerAmplitude * flicker);
}
