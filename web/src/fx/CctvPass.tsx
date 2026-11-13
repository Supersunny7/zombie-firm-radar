import { Fragment, useEffect, useMemo } from 'react';
import type { ReactElement } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  HueSaturation,
  Noise,
  Scanline,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import { Vector2 } from 'three';
import { mulberry32 } from '../engine';
import { effectiveReducedMotion, useStore } from '../state/store';
import { CctvGradeEffect } from './CctvGradeEffect';
import { cctvChain, cctvParams, cctvToneMapping } from './cctvParams';
import type { CctvEffectId, CctvToneMapping } from './cctvParams';
import { createGlitchScheduler } from './glitchScheduler';
import { TrackingGlitchEffect } from './TrackingGlitchEffect';

const GLITCH_SEED = 0x7c3a11;

/** postprocessing operator for each tone-mapping mode of `cctvToneMapping`. */
const TONE_MAPPING_MODE: Readonly<Record<CctvToneMapping['mode'], ToneMappingMode>> = {
  ACESFilmic: ToneMappingMode.ACES_FILMIC,
};

/**
 * Camera look for the graveyard (design section 11). Lives inside the Canvas, so HUD text is untouched.
 * Tone mapping: the composer sets the renderer to NoToneMapping while it is mounted, so the
 * ToneMapping effect below is the only ACES step (no double mapping). Its shader uses three's
 * `ACESFilmicToneMapping`, which scales by the `toneMappingExposure` uniform that three fills from
 * `renderer.toneMappingExposure`; the exposure of `cctvToneMapping` is written there (23.15).
 * Lights off: ToneMapping, then the CCTV_Grade in its own pass (mergeMode "none"), 2 passes; the
 * grade applies the tracking-glitch band shift itself. Lights on: the Base_Spec chain, ending with
 * the TrackingGlitchEffect.
 */
export function CctvPass() {
  const lights = useStore((s) => s.settings.lights);
  const lowQuality = useStore((s) => s.settings.lowQuality);
  const reducedMotion = useStore(effectiveReducedMotion);
  const p = cctvParams(lights, lowQuality);
  const chain = cctvChain(lights, lowQuality, reducedMotion);
  const toneMapping = cctvToneMapping(lights);

  const glitch = useMemo(() => new TrackingGlitchEffect(), []);
  const grade = useMemo(() => new CctvGradeEffect(), []);
  const scheduler = useMemo(() => createGlitchScheduler(mulberry32(GLITCH_SEED)), []);
  const offset = useMemo(
    () => new Vector2(p.chromaticAberration, p.chromaticAberration),
    [p.chromaticAberration],
  );

  useEffect(() => () => glitch.dispose(), [glitch]);
  useEffect(() => () => grade.dispose(), [grade]);

  useFrame((state) => {
    const st = useStore.getState();
    const cfg = cctvParams(st.settings.lights, st.settings.lowQuality);
    const reduced = effectiveReducedMotion(st);
    // Exposure of the ToneMapping effect: three uploads it as the `toneMappingExposure` uniform.
    state.gl.toneMappingExposure = cctvToneMapping(st.settings.lights).exposure;
    const enabled = cfg.glitch && !reduced;
    // Reduced_Motion or lights on: the scheduler returns 0, so neither effect shifts bands.
    const amount = scheduler.update(state.clock.elapsedTime, enabled);
    // Lights off: the band shift runs inside the grade (no RGB split, 23.12).
    grade.driveGlitch(amount, state.clock.elapsedTime);
    // Lights on: the Base_Spec TrackingGlitchEffect (mounted only in the lights-on chain).
    glitch.drive(amount, state.clock.elapsedTime);
    // Reduced_Motion: static grain (23.13). The grade's update() then keeps its seed.
    grade.setFrozen(reduced);
  });

  const element = (id: CctvEffectId): ReactElement => {
    switch (id) {
      case 'bloom':
        return (
          <Bloom
            key={id}
            mipmapBlur
            intensity={p.bloom?.intensity}
            radius={p.bloom?.radius}
            luminanceThreshold={p.bloom?.luminanceThreshold}
          />
        );
      case 'chromaticAberration':
        return (
          <ChromaticAberration key={id} offset={offset} radialModulation modulationOffset={0.15} />
        );
      case 'hueSaturation':
        return <HueSaturation key={id} saturation={-p.desaturation} />;
      case 'toneMapping':
        return <ToneMapping key={id} mode={TONE_MAPPING_MODE[toneMapping.mode]} />;
      case 'vignette':
        return <Vignette key={id} darkness={p.vignette} offset={0.3} />;
      case 'noise':
        return (
          <Noise key={id} opacity={p.grain} premultiply blendFunction={BlendFunction.OVERLAY} />
        );
      case 'scanline':
        return <Scanline key={id} density={1.25} opacity={p.scanlineOpacity} />;
      case 'grade':
        return <primitive key={id} object={grade} />;
      case 'trackingGlitch':
        return <primitive key={id} object={glitch} />;
    }
  };

  return (
    <EffectComposer multisampling={0} mergeMode={chain.mergeMode}>
      {/* Keyed by Lights_Mode so a switch remounts the chain in its own order. */}
      <Fragment key={lights}>{chain.effects.map(element)}</Fragment>
    </EffectComposer>
  );
}
