import { useEffect } from 'react';
import { riseEvents } from '../scenes/graveyard/riseEvents';
import { useStore } from '../state/store';
import { createAudioEngine, type AudioEngine, type AudioEngineOptions } from './audioEngine';

/**
 * Delay between playLeave() and dispose() when the graveyard unmounts. dispose() closes the
 * AudioContext immediately, which would cut the iron-gate sound, so the close is deferred.
 * The delay is a fixed ceiling for the gate sound; dispose() itself is synchronous and closes
 * the context without waiting, so it completes within 200 ms of this delayed call.
 */
export const LEAVE_DISPOSE_DELAY_MS = 1500;

export type AudioEngineFactory = (opts: AudioEngineOptions) => AudioEngine;

// Module-level registry so the Sound button can retry resume() without React context.
let current: AudioEngine | null = null;

/** The engine of the mounted graveyard, or null. */
export function getAudioEngine(): AudioEngine | null {
  return current;
}

/** Retry a blocked start (16.12). Safe to call with no engine. Call from a user gesture. */
export function retryAudioResume(): void {
  void current?.resume();
}

/**
 * Creates the audio engine once for the lifetime of the graveyard, plays the dig sound per
 * rise event, mirrors settings.sound, reports blocked playback to the store, and plays the
 * leave sound on unmount before disposing.
 */
export function useGraveyardAudio(createEngine: AudioEngineFactory = createAudioEngine): void {
  useEffect(() => {
    const engine = createEngine({
      sound: useStore.getState().settings.sound,
      onBlockedChange: (blocked) => useStore.getState().setAudioBlocked(blocked),
    });
    current = engine;
    const unsubRise = riseEvents.subscribe(() => engine.playDig());
    let lastSound = useStore.getState().settings.sound;
    const unsubStore = useStore.subscribe((s) => {
      if (s.settings.sound === lastSound) return;
      lastSound = s.settings.sound;
      engine.setSound(lastSound);
    });
    return () => {
      unsubRise();
      unsubStore();
      if (current === engine) current = null;
      engine.playLeave();
      setTimeout(() => engine.dispose(), LEAVE_DISPOSE_DELAY_MS);
      useStore.getState().setAudioBlocked(false);
    };
    // The engine is created once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
