import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { initialMachine } from '../state/machine';
import { DEFAULT_SETTINGS } from '../state/settings';
import { useStore } from '../state/store';

const mockState = vi.hoisted(() => ({ text: '' }));
vi.mock('./loadCredits', () => ({
  loadCredits: () => Promise.resolve(mockState.text),
}));

beforeEach(() => {
  vi.resetModules();
  window.localStorage.clear();
  useStore.setState({
    machine: initialMachine(),
    settings: { ...DEFAULT_SETTINGS },
    overlay: 'none',
    systemReducedMotion: false,
  });
});
afterEach(() => {
  cleanup();
});

async function openCredits(text: string) {
  mockState.text = text;
  const { SettingsMenu } = await import('./SettingsMenu');
  const user = userEvent.setup();
  const utils = render(<SettingsMenu />);
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  const creditsButton = screen.getByRole('button', { name: 'Credits' });
  await user.click(creditsButton);
  return { user, creditsButton, ...utils };
}

describe('CreditsDialog', () => {
  it('loads and shows the credits text with initial focus on Close', async () => {
    await openCredits('| Path |\n| a.glb |');
    const dialog = screen.getByRole('dialog', { name: 'Credits' });
    expect(dialog).toBeInTheDocument();
    expect(await screen.findByText(/a\.glb/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('shows the empty message for empty text', async () => {
    await openCredits('  ');
    expect(await screen.findByText('No credits are available.')).toBeInTheDocument();
  });

  it('traps Tab inside the dialog', async () => {
    const { user } = await openCredits('hello credits');
    await screen.findByText('hello credits');
    const dialog = screen.getByRole('dialog', { name: 'Credits' });
    for (let i = 0; i < 4; i++) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('closes on Esc and returns focus to the Credits button', async () => {
    const { user, creditsButton } = await openCredits('x');
    await screen.findByText('x');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Credits' })).not.toBeInTheDocument();
    expect(creditsButton).toHaveFocus();
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();
  });

  it('closes with the Close button', async () => {
    const { user, creditsButton } = await openCredits('x');
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog', { name: 'Credits' })).not.toBeInTheDocument();
    expect(creditsButton).toHaveFocus();
  });

  it('has no axe violations', async () => {
    const { container } = await openCredits('some text');
    await screen.findByText('some text');
    expect((await axe(container)).violations).toEqual([]);
  });
});
