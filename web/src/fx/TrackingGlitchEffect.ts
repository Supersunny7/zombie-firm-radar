import { BlendFunction, Effect } from 'postprocessing';
import { Uniform } from 'three';

/**
 * Horizontal band displacement ("tracking glitch") with a small RGB split.
 * Everything scales with `amount` in [0, 1]; 0 returns the input colour unchanged.
 * The effect is a band offset, not a full-screen luminance flip (3-flashes rule).
 */
const fragmentShader = /* glsl */ `
uniform float uAmount;
uniform float uSeed;

float hash11(float n) {
  return fract(sin(n * 127.1 + uSeed * 311.7) * 43758.5453);
}

void mainUv(inout vec2 uv) {
  if (uAmount <= 0.0) return;
  float band = floor(uv.y * 28.0);
  float on = step(0.6, hash11(band));
  float shift = (hash11(band + 17.0) - 0.5) * 0.09 * uAmount * on;
  uv.x = fract(uv.x + shift);
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
    if (amount !== this.amount) this.seed = Math.floor(time * 4) % 97;
    this.amount = amount;
  }
}
