/** Pure CCTV pass values (design section 11, scene-reference.md). No three.js or React. */
import { LOOK_TONE_MAPPING } from '../scenes/graveyard/look';

export interface CctvParams {
  /** Film grain opacity. */
  grain: number;
  /** Desaturation amount, 0 to 1. */
  desaturation: number;
  /** Vignette darkness. */
  vignette: number;
  /** Chromatic aberration offset; 0 means the effect is off. */
  chromaticAberration: number;
  /** Bloom settings; null means bloom is off. */
  bloom: { intensity: number; radius: number; luminanceThreshold: number } | null;
  /** Scanline opacity, at most 0.15. */
  scanlineOpacity: number;
  /**
   * Whether the tracking glitch may run (lights off only, inside the grade; Reduced_Motion is
   * checked by the caller).
   */
  glitch: boolean;
}

export const CHROMATIC_ABERRATION = 0.0022;
export const SCANLINE_OPACITY = 0.12;
export const BLOOM = { intensity: 0.55, radius: 0.6, luminanceThreshold: 0.82 } as const;

export function cctvParams(lights: 'off' | 'on', lowQuality: boolean): CctvParams {
  const off = lights === 'off';
  return {
    grain: off ? 0.11 : 0.05,
    desaturation: off ? 0.45 : 0.3,
    vignette: off ? 1.15 : 0.95,
    chromaticAberration: lowQuality ? 0 : CHROMATIC_ABERRATION,
    bloom: lowQuality ? null : { ...BLOOM },
    scanlineOpacity: SCANLINE_OPACITY,
    glitch: off,
  };
}

/** Tone-mapping operator and exposure of the ToneMapping effect in the CCTV_Pass. */
export interface CctvToneMapping {
  readonly mode: 'ACESFilmic';
  /** Written to `renderer.toneMappingExposure`, which three uploads as the shader uniform. */
  readonly exposure: number;
}

/** Base_Spec lights-on tone mapping (7.9): ACES with the renderer default exposure 1.0. */
export const BASE_TONE_MAPPING: CctvToneMapping = { mode: 'ACESFilmic', exposure: 1 };

/** Lights off: LOOK_TONE_MAPPING, ACES filmic, exposure 1.0 (23.15). Lights on: Base_Spec (23.16). */
export function cctvToneMapping(lights: 'off' | 'on'): CctvToneMapping {
  return lights === 'off'
    ? { mode: LOOK_TONE_MAPPING.mode, exposure: LOOK_TONE_MAPPING.exposure }
    : BASE_TONE_MAPPING;
}

/** One effect of the CCTV_Pass chain, in render order. */
export type CctvEffectId =
  | 'bloom'
  | 'chromaticAberration'
  | 'hueSaturation'
  | 'toneMapping'
  | 'vignette'
  | 'noise'
  | 'scanline'
  | 'grade'
  | 'trackingGlitch';

export interface CctvChain {
  /** Effects in render order. */
  effects: readonly CctvEffectId[];
  /**
   * EffectComposer merge mode. Lights off uses "none" so ToneMapping and the grade get separate
   * passes and the grade's red-ghost sample reads the tone-mapped image (23.11 f).
   */
  mergeMode: 'auto' | 'none';
  /** Whether the grade's grain seed is frozen (Reduced_Motion, 23.13). */
  grainFrozen: boolean;
}

/**
 * Which effects CctvPass mounts. Lights off: ToneMapping + CCTV_Grade, no bloom and no
 * chromatic aberration (23.11, 23.12), with all six grade steps in low quality too (23.13).
 * Lights off has no separate tracking-glitch effect: the grade applies the band shift to its
 * sample uv, with no RGB split (23.12). Lights on: the Base_Spec chain (23.16), with bloom and
 * aberration dropped in low quality, ending with the tracking-glitch effect.
 */
export function cctvChain(
  lights: 'off' | 'on',
  lowQuality: boolean,
  reducedMotion: boolean,
): CctvChain {
  if (lights === 'off') {
    return {
      effects: ['toneMapping', 'grade'],
      mergeMode: 'none',
      grainFrozen: reducedMotion,
    };
  }
  const p = cctvParams(lights, lowQuality);
  const effects: CctvEffectId[] = [];
  if (p.bloom) effects.push('bloom');
  if (p.chromaticAberration > 0) effects.push('chromaticAberration');
  effects.push('hueSaturation', 'toneMapping', 'vignette', 'noise', 'scanline', 'trackingGlitch');
  return { effects, mergeMode: 'auto', grainFrozen: reducedMotion };
}
