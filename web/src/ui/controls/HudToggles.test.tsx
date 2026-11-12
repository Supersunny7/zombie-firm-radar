import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DEFAULT_SETTINGS } from '../../state/settings';
import { useStore } from '../../state/store';
import { LightsButton } from './LightsButton';
import { SoundButton } from './SoundButton';

function reset(): void {
  window.localStorage.clear();
  useStore.setState({ settings: { ...DEFAULT_SETTINGS }, audioBlocked: false });
}

beforeEach(reset);
afterEach(() => {
  vi.useRealTimers();
  cleanup();
  reset();
});

describe('LightsButton', () => {
  it('names the target mode', () => {
    useStore.setState({ settings: { ...DEFAULT_SETTINGS, lights: 'off' } });
    render(<LightsButton />);
    expect(screen.getByRole('button', { name: 'Lights on' })).toBeInTheDocument();
    act(() => useStore.getState().setSetting('lights', 'on'));
    expect(screen.getByRole('button', { name: 'Lights off' })).toBeInTheDocument();
  });

  it('ignores clicks within 350 ms of the last change', () => {
    vi.useFakeTimers();
    useStore.setState({ settings: { ...DEFAULT_SETTINGS, lights: 'off' } });
    render(<LightsButton />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(useStore.getState().settings.lights).toBe('on');
    act(() => void vi.advanceTimersByTime(349));
    fireEvent.click(button);
    expect(useStore.getState().settings.lights).toBe('on');
    act(() => void vi.advanceTimersByTime(1));
    fireEvent.click(button);
    expect(useStore.getState().settings.lights).toBe('off');
  });
});

describe('SoundButton', () => {
  it('shows Sound on / Sound off from sound and audioBlocked', () => {
    render(<SoundButton />);
    expect(screen.getByRole('button', { name: 'Sound on' })).toBeInTheDocument();
    act(() => useStore.getState().setAudioBlocked(true));
    expect(screen.getByRole('button', { name: 'Sound off' })).toBeInTheDocument();
    act(() => {
      useStore.getState().setAudioBlocked(false);
      useStore.getState().setSetting('sound', false);
    });
    expect(screen.getByRole('button', { name: 'Sound off' })).toBeInTheDocument();
  });

  it('toggles settings.sound on click', () => {
    render(<SoundButton />);
    fireEvent.click(screen.getByRole('button'));
    expect(useStore.getState().settings.sound).toBe(false);
    fireEvent.click(screen.getByRole('button'));
    expect(useStore.getState().settings.sound).toBe(true);
  });
});
