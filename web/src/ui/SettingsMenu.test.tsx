import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { initialMachine } from '../state/machine';
import { DEFAULT_SETTINGS } from '../state/settings';
import { readSettings } from '../state/settingsStorage';
import { useStore } from '../state/store';
import { SettingsMenu } from './SettingsMenu';

function reset(): void {
  window.localStorage.clear();
  useStore.setState({
    machine: initialMachine(),
    settings: { ...DEFAULT_SETTINGS },
    overlay: 'none',
    systemReducedMotion: false,
  });
}

beforeEach(reset);
afterEach(() => {
  cleanup();
  reset();
});

async function openMenu() {
  const user = userEvent.setup();
  const utils = render(<SettingsMenu />);
  const button = screen.getByRole('button', { name: 'Settings' });
  await user.click(button);
  return { user, button, ...utils };
}

describe('SettingsMenu', () => {
  it('is closed by default with aria-expanded=false', () => {
    render(<SettingsMenu />);
    const button = screen.getByRole('button', { name: 'Settings' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens a dialog wired by aria-controls with four labelled checkboxes', async () => {
    const { button } = await openMenu();
    const dialog = screen.getByRole('dialog');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAttribute('aria-controls', dialog.id);
    for (const name of ['Lights on', 'Sound', 'Low quality', 'Reduced motion']) {
      expect(within(dialog).getByRole('checkbox', { name: new RegExp(name) })).toBeInTheDocument();
    }
    expect(within(dialog).getAllByRole('checkbox')).toHaveLength(4);
  });

  it('shows On/Off text and the Follow system note', async () => {
    await openMenu();
    const lights = screen.getByRole('checkbox', { name: /Lights on/ });
    expect(lights.closest('label')).toHaveTextContent('Off');
    expect(screen.getByText('Follow system')).toBeInTheDocument();
    await userEvent.click(lights);
    expect(lights.closest('label')).toHaveTextContent('On');
    await userEvent.click(screen.getByRole('checkbox', { name: /Reduced motion/ }));
    expect(screen.queryByText('Follow system')).not.toBeInTheDocument();
  });

  it('moves focus into the panel on open', async () => {
    await openMenu();
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement);
  });

  it('traps Tab and Shift+Tab inside the panel', async () => {
    const { user } = await openMenu();
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes[0]).toHaveFocus();
    await user.tab({ shift: true });
    expect(boxes[3]).toHaveFocus();
    await user.tab();
    expect(boxes[0]).toHaveFocus();
  });

  it('closes on Esc and restores focus to the button', async () => {
    const { user, button } = await openMenu();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });

  it('toggles update the store and persist to localStorage', async () => {
    const { user } = await openMenu();
    await user.click(screen.getByRole('checkbox', { name: /Lights on/ }));
    await user.click(screen.getByRole('checkbox', { name: /Sound/ }));
    await user.click(screen.getByRole('checkbox', { name: /Low quality/ }));
    await user.click(screen.getByRole('checkbox', { name: /Reduced motion/ }));

    const s = useStore.getState().settings;
    expect(s).toEqual({ lights: 'on', sound: false, lowQuality: true, reducedMotion: true });
    expect(readSettings()).toEqual(s);
  });

  it('has no axe violations with the menu open', async () => {
    const { container } = await openMenu();
    expect((await axe(container)).violations).toEqual([]);
  });
});
