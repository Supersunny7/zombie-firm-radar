import { BlendFunction, Effect } from 'postprocessing';
import { Uniform } from 'three';

/**
 * Tracking-glitch band shift, shared by this lights-on effect and the lights-off
 * `CctvGradeEffect` (task 3.23), so both use the same bands and amplitude:
 * 28 horizontal bands, about 40 % of them move, by at most +-0.045 x amount of the width,
 * wrapped with `fract`. `amount` 0 returns `uv` unchanged.
 */
export const TRACKING_GLITCH_SHIFT_GLSL = /* glsl */ `
float trackingGlitchHash(float n, float seed) {
  return fract(sin(n * 127.1 + seed * 311.7) * 43758.5453);
}

vec2 trackingGlitchShift(vec2 uv, float amount, float seed) {
  if (amount <= 0.0) return uv;
  float band = floor(uv.y * 28.0);
  float on = step(0.6, trackingGlitchHash(band, seed));
  float shift = (trackingGlitchHash(band + 17.0, seed) - 0.5) * 0.09 * amount * on;
  return vec2(fract(uv.x + shift), uv.y);
}
`;

/** Band pattern seed for a glitch step at `time` seconds; picked when the amount changes. */
export function trackingGlitchSeed(time: number): number {
  return Math.floor(time * 4) % 97;
}

/**
 * Lights-on tracking glitch: the band shift above plus a small RGB split.
 * Everything scales with `amount` in [0, 1]; 0 returns the input colour unchanged.
 * The effect is a band offset, not a full-screen luminance flip (3-flashes rule).
 * Lights off does not mount this effect: the grade applies the band shift itself, with no RGB
 * split (23.12).
 */
const fragmentShader = /* glsl */ `
uniform float uAmount;
uniform float uSeed;
${TRACKING_GLITCH_SHIFT_GLSL}
void mainUv(inout vec2 uv) {
  uv = trackingGlitchShift(uv, uAmount, uSeed);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (uAmount <= 0.0) {
    outputColor = inputColor;
    return;
  }
  float split = 0.004 * uAmount;
  float r = texture2D(inputBuffer, uv + vec2(split, 0.0)).r;
  float b = texture2D(inputBuffer, uv - vec2(split, 0.0)).b;
  outputColor = vec4(r, inputColor.g, b, inputColor.a);
}
`;

export class TrackingGlitchEffect extends Effect {
  constructor() {
    super('TrackingGlitchEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ['uAmount', new Uniform(0)],
        ['uSeed', new Uniform(0)],
      ]),
    });
  }

  /** Glitch strength, 0 (identity) to 1. */
  get amount(): number {
    return (this.uniforms.get('uAmount') as Uniform<number>).value;
  }

  set amount(value: number) {
    (this.uniforms.get('uAmount') as Uniform<number>).value = Math.min(1, Math.max(0, value));
  }

  /** Changes which bands move; set once per glitch step. */
  set seed(value: number) {
    (this.uniforms.get('uSeed') as Uniform<number>).value = value;
  }

  /** Per-frame update: picks new bands whenever the amount steps, then applies the amount. */
  drive(amount: number, time: number): void {
    if (amount !== this.amount) this.seed = trackingGlitchSeed(time);
    this.amount = amount;
  }
}
