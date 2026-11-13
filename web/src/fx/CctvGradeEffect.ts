import { BlendFunction, Effect, EffectAttribute } from 'postprocessing';
import { Uniform, Vector3 } from 'three';
import { LOOK_CCTV_GRADE } from '../scenes/graveyard/look';
import { TRACKING_GLITCH_SHIFT_GLSL, trackingGlitchSeed } from './TrackingGlitchEffect';

/**
 * CCTV_Grade (Requirement 23.11), lights off only, placed after `ToneMapping` in its own
 * EffectPass so `inputBuffer` holds the tone-mapped image (CctvPass uses mergeMode "none").
 *
 * Colour space: the composer's frame buffers are HalfFloat and linear, so `inputColor` and
 * `texture2D(inputBuffer, ...)` are linear. The shader converts to sRGB first, so the numbers of
 * steps (a) to (f) mean what `gradeColour.ts` means (display-referred channels in [0, 1], as in
 * the prototype after its OutputPass), clamps, and converts back to linear at the end; the
 * composer's last pass then encodes linear to sRGB for the screen.
 *
 * Steps, in order: (a) saturation, (b) gain/lift/gamma, (c) vignette, (d) gaussian grain,
 * (e) scanline rows, (f) red ghost from the pre-(a) input sampled 2 px to the left.
 * `EffectAttribute.CONVOLUTION` because step (f) reads a neighbour texel; such an effect cannot
 * share a pass with a `mainUv` effect, and at most one convolution effect fits in one pass.
 *
 * Tracking glitch (task 3.23): the band shift of `TrackingGlitchEffect` (shared GLSL) is applied
 * to the sample uv inside `mainImage`, for the main sample and the red-ghost sample, with no RGB
 * split, so lights off needs no separate glitch pass. `driveGlitch()` takes the glitch scheduler
 * amount; Reduced_Motion passes 0.
 */
const fragmentShader = /* glsl */ `
uniform float uSaturation;
uniform vec3 uLumaWeights;
uniform float uGain;
uniform float uLift;
uniform float uGamma;
uniform float uVignetteStrength;
uniform float uVignettePower;
uniform float uGrainSigma;
uniform float uGrainSeed;
uniform float uScanlinePeriod;
uniform float uScanlineFactor;
uniform float uRedGhostMix;
uniform float uRedGhostOffsetPx;
uniform float uGlitchAmount;
uniform float uGlitchSeed;
${TRACKING_GLITCH_SHIFT_GLSL}
vec3 gradeLinearToSrgb(vec3 c) {
  c = max(c, vec3(0.0));
  return mix(1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, c * 12.92, vec3(lessThanEqual(c, vec3(0.0031308))));
}

vec3 gradeSrgbToLinear(vec3 c) {
  return mix(pow((c + 0.055) / 1.055, vec3(2.4)), c / 12.92, vec3(lessThanEqual(c, vec3(0.04045))));
}

// Sine-free hash (Hoskins), stable on mobile GPUs for large inputs.
float gradeHash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Tracking glitch (lights off, 23.12): the band shift moves the sample uv of the main sample and
  // of the red-ghost sample, with no RGB split. A convolution effect may not define a uv
  // transform, so the shifted image is read here from inputBuffer; with no glitch running,
  // inputColor is the same texel and no extra read is made.
  vec2 sampleUv = trackingGlitchShift(uv, uGlitchAmount, uGlitchSeed);
  vec3 sampled = uGlitchAmount > 0.0 ? texture2D(inputBuffer, sampleUv).rgb : inputColor.rgb;

  // Pre-(a) input: tone-mapped, converted to sRGB.
  vec3 src = gradeLinearToSrgb(sampled);

  // (a) saturation: mix(luma, colour, s), i.e. (1 - s) luma + s colour.
  vec3 c = mix(vec3(dot(src, uLumaWeights)), src, uSaturation);

  // (b) gain and lift, clamp, gamma.
  c = pow(clamp(c * uGain + uLift, 0.0, 1.0), vec3(uGamma));

  // (c) vignette, r = 0 at the centre and 1 at the edge midpoints (gradeColour.vignetteRadius).
  // Screen position, not the glitch-shifted uv, as in the Prototype.
  float r = length(uv * 2.0 - 1.0);
  c *= clamp(1.0 - uVignetteStrength * pow(r, uVignettePower), 0.0, 1.0);

  // (d) gaussian grain (Box-Muller), one value for all channels; uGrainSeed changes every frame
  // unless Reduced_Motion freezes it.
  vec2 seedOffset = vec2(uGrainSeed * 61.7, uGrainSeed * 23.3);
  float u1 = max(gradeHash12(gl_FragCoord.xy + seedOffset), 1e-6);
  float u2 = gradeHash12(gl_FragCoord.xy + seedOffset + vec2(113.1, 71.9));
  float n = sqrt(-2.0 * log(u1)) * cos(6.28318530718 * u2);
  c += uGrainSigma * n;

  // (e) every third pixel row (gl_FragCoord.y = 0.5, 3.5, 6.5, ...) multiplied by the factor.
  if (mod(gl_FragCoord.y, uScanlinePeriod) < 1.0) c *= uScanlineFactor;

  // (f) red ghost: red sampled 2 px to the left of the (glitch-shifted) sample from the
  // tone-mapped pre-(a) input.
  vec2 ghostUv = sampleUv - vec2(uRedGhostOffsetPx * texelSize.x, 0.0);
  float ghostRed = gradeLinearToSrgb(texture2D(inputBuffer, ghostUv).rgb).r;
  c.r = mix(c.r, ghostRed, uRedGhostMix);

  outputColor = vec4(gradeSrgbToLinear(clamp(c, 0.0, 1.0)), inputColor.a);
}
`;

/** Grain seed wraps here so `seed * 61.7` stays well inside float precision. */
const GRAIN_SEED_WRAP = 1024;

export class CctvGradeEffect extends Effect {
  private grainFrozen = false;

  /** True while the grain pattern is static (Reduced_Motion, 23.13). */
  get frozen(): boolean {
    return this.grainFrozen;
  }

  /** Reduced_Motion: true stops the grain seed, so the pattern does not change between frames. */
  setFrozen(value: boolean): void {
    this.grainFrozen = value;
  }

  constructor() {
    const g = LOOK_CCTV_GRADE;
    super('CctvGradeEffect', fragmentShader, {
      attributes: EffectAttribute.CONVOLUTION,
      blendFunction: BlendFunction.SRC,
      uniforms: new Map<string, Uniform>([
        ['uSaturation', new Uniform(g.saturation)],
        ['uLumaWeights', new Uniform(new Vector3(...g.lumaWeights))],
        ['uGain', new Uniform(g.gain)],
        ['uLift', new Uniform(g.lift)],
        ['uGamma', new Uniform(g.gamma)],
        ['uVignetteStrength', new Uniform(g.vignetteStrength)],
        ['uVignettePower', new Uniform(g.vignettePower)],
        ['uGrainSigma', new Uniform(g.grainSigma)],
        ['uGrainSeed', new Uniform(0)],
        ['uScanlinePeriod', new Uniform(g.scanlinePeriod)],
        ['uScanlineFactor', new Uniform(g.scanlineFactor)],
        ['uRedGhostMix', new Uniform(g.redGhostMix)],
        ['uRedGhostOffsetPx', new Uniform(g.redGhostOffsetPx)],
        ['uGlitchAmount', new Uniform(0)],
        ['uGlitchSeed', new Uniform(0)],
      ]),
    });
  }

  /** Tracking-glitch strength, 0 (no shift) to 1. */
  get glitchAmount(): number {
    return (this.uniforms.get('uGlitchAmount') as Uniform<number>).value;
  }

  /** Band pattern of the current glitch step. */
  get glitchSeed(): number {
    return (this.uniforms.get('uGlitchSeed') as Uniform<number>).value;
  }

  /**
   * Per-frame glitch update with the scheduler amount: picks new bands whenever the amount steps
   * (same rule as `TrackingGlitchEffect.drive`), then applies the amount clamped to [0, 1].
   */
  driveGlitch(amount: number, time: number): void {
    const a = Math.min(1, Math.max(0, amount));
    const u = this.uniforms.get('uGlitchAmount') as Uniform<number>;
    if (a !== u.value) {
      (this.uniforms.get('uGlitchSeed') as Uniform<number>).value = trackingGlitchSeed(time);
    }
    u.value = a;
  }

  /** Current grain seed; changes once per rendered frame unless `frozen`. */
  get grainSeed(): number {
    return (this.uniforms.get('uGrainSeed') as Uniform<number>).value;
  }

  /** Called by the EffectPass once per rendered frame: new grain pattern unless frozen. */
  override update(): void {
    if (this.grainFrozen) return;
    const u = this.uniforms.get('uGrainSeed') as Uniform<number>;
    u.value = (u.value + 1) % GRAIN_SEED_WRAP;
  }
}
