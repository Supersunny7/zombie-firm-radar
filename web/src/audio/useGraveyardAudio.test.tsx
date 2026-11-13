import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { riseEvents } from '../scenes/graveyard/riseEvents';
import { DEFAULT_SETTINGS } from '../state/settings';
import { useStore } from '../state/store';
import { SoundButton } from '../ui/controls/SoundButton';
import type { AudioEngine, AudioEngineOptions } from './audioEngine';
import { getAudioEngine, LEAVE_DISPOSE_DELAY_MS, useGraveyardAudio } from './useGraveyardAudio';

interface Fake extends AudioEngine {
  opts: AudioEngineOptions;
  calls: string[];
}

function makeFake(opts: AudioEngineOptions): Fake {
  const calls: string[] = [];
  return {
    opts,
    calls,
    setSound: (on) => void calls.push(`setSound:${on}`),
    playDig: () => void calls.push('dig'),
    playLeave: () => void calls.push('leave'),
    resume: () => {
      calls.push('resume');
      return Promise.resolve();
    },
    isBlocked: () => false,
    hasContext: () => false,
    dispose: () => void calls.push('dispose'),
  };
}

let fakes: Fake[] = [];
function first(): Fake {
  const f = fakes[0];
  if (!f) throw new Error('no engine created');
  return f;
}
const factory = (opts: AudioEngineOptions): AudioEngine => {
  const f = makeFake(opts);
  fakes.push(f);
  return f;
};

function Probe() {
  useGraveyardAudio(factory);
  return null;
}

function reset(): void {
  window.localStorage.clear();
  useStore.setState({ settings: { ...DEFAULT_SETTINGS }, audioBlocked: false });
  fakes = [];
}

beforeEach(() => {
  vi.useFakeTimers();
  reset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  reset();
});

describe('useGraveyardAudio', () => {
  it('creates one engine, plays dig per rise event and mirrors settings.sound', () => {
    render(<Probe />);
    expect(fakes).toHaveLength(1);
    expect(getAudioEngine()).toBe(first());
    act(() => riseEvents.emit({ cik: '1', position: [0, 0, 0] }));
    act(() => riseEvents.emit({ cik: '2', position: [0, 0, 0] }));
    act(() => useStore.getState().setSetting('sound', false));
    expect(first().calls).toEqual(['dig', 'dig', 'setSound:false']);
  });

  it('forwards blocked changes to the store', () => {
    render(<Probe />);
    act(() => first().opts.onBlockedChange?.(true));
    expect(useStore.getState().audioBlocked).toBe(true);
  });

  it('plays the leave sound on unmount and disposes after the delay', () => {
    const { unmount } = render(<Probe />);
    unmount();
    expect(first().calls).toEqual(['leave']);
    expect(getAudioEngine()).toBeNull();
    act(() => void vi.advanceTimersByTime(LEAVE_DISPOSE_DELAY_MS - 1));
    expect(first().calls).not.toContain('dispose');
    act(() => void vi.advanceTimersByTime(1));
    expect(first().calls).toEqual(['leave', 'dispose']);
    act(() => riseEvents.emit({ cik: '1', position: [0, 0, 0] }));
    expect(first().calls).toEqual(['leave', 'dispose']);
  });
});

describe('SoundButton retry', () => {
  it('retries resume() when blocked instead of muting', () => {
    render(
      <>
        <Probe />
        <SoundButton />
      </>,
    );
    act(() => useStore.getState().setAudioBlocked(true));
    fireEvent.click(screen.getByRole('button', { name: 'Sound off' }));
    expect(first().calls).toContain('resume');
    expect(useStore.getState().settings.sound).toBe(true);
  });
});
