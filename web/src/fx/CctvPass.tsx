import { useEffect, useMemo } from 'react';
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
import { cctvParams } from './cctvParams';
import { createGlitchScheduler } from './glitchScheduler';
import { TrackingGlitchEffect } from './TrackingGlitchEffect';

const GLITCH_SEED = 0x7c3a11;

/**
 * Camera look for the graveyard (design section 11). Lives inside the Canvas, so HUD text is untouched.
 * Tone mapping: the composer sets the renderer to NoToneMapping while it is mounted, so the
 * ToneMapping effect below is the only ACES step (no double mapping).
 */
export function CctvPass() {
  const lights = useStore((s) => s.settings.lights);
  const lowQuality = useStore((s) => s.settings.lowQuality);
  const p = cctvParams(lights, lowQuality);

  const glitch = useMemo(() => new TrackingGlitchEffect(), []);
  const scheduler = useMemo(() => createGlitchScheduler(mulberry32(GLITCH_SEED)), []);
  const offset = useMemo(
    () => new Vector2(p.chromaticAberration, p.chromaticAberration),
    [p.chromaticAberration],
  );

  useEffect(() => () => glitch.dispose(), [glitch]);

  useFrame((state) => {
    const st = useStore.getState();
    const cfg = cctvParams(st.settings.lights, st.settings.lowQuality);
    const enabled = cfg.glitch && !effectiveReducedMotion(st);
    const amount = scheduler.update(state.clock.elapsedTime, enabled);
    glitch.drive(amount, state.clock.elapsedTime);
  });

  return (
    <EffectComposer multisampling={0} mergeMode="auto">
      {p.bloom ? (
        <Bloom
          mipmapBlur
          intensity={p.bloom.intensity}
          radius={p.bloom.radius}
          luminanceThreshold={p.bloom.luminanceThreshold}
        />
      ) : (
        <></>
      )}
      {p.chromaticAberration > 0 ? (
        <ChromaticAberration offset={offset} radialModulation modulationOffset={0.15} />
      ) : (
        <></>
      )}
      <HueSaturation saturation={-p.desaturation} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette darkness={p.vignette} offset={0.3} />
      <Noise opacity={p.grain} premultiply blendFunction={BlendFunction.OVERLAY} />
      <Scanline density={1.25} opacity={p.scanlineOpacity} />
      <primitive object={glitch} />
    </EffectComposer>
  );
}
