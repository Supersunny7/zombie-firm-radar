import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { fixtureBundle } from '../../dev/fixtures';
import { initialMachine } from '../../state/machine';
import { DEFAULT_SETTINGS } from '../../state/settings';
import { useStore } from '../../state/store';
import type { FirmsIndex } from '../../types/data';
import { TABLE_BUTTON_ID } from '../SkipLink';
import { SELECT_ONLY_IN_GRAVEYARD, TableView } from './TableView';

const ASHGROVE = '9000000001';

function load(index: FirmsIndex = fixtureBundle.index): void {
  useStore.setState({
    data: { index, macro: fixtureBundle.macro, source: 'fixture' },
  });
}

function reset(): void {
  window.localStorage.clear();
  useStore.setState({
    machine: initialMachine(),
    settings: { ...DEFAULT_SETTINGS },
    overlay: 'none',
    data: null,
    firm: null,
    lastRejection: null,
  });
}

beforeEach(reset);
afterEach(() => {
  cleanup();
  reset();
});

/** Renders a stand-in "Table view" button plus the overlay, then opens it. */
async function openTable(index?: FirmsIndex) {
  load(index);
  const user = userEvent.setup();
  const utils = render(
    <>
      <button type="button" id={TABLE_BUTTON_ID}>
        Table view
      </button>
      <TableView />
    </>,
  );
  const trigger = screen.getByRole('button', { name: 'Table view' });
  trigger.focus();
  act(() => useStore.getState().toggleOverlay());
  return { user, trigger, ...utils };
}

const rowNames = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((r) => within(r).getAllByRole('cell')[0]!.textContent);

describe('TableView', () => {
  it('renders nothing while the overlay is closed', () => {
    load();
    render(<TableView />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the five columns and one row per fixture firm', async () => {
    await openTable();
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers.slice(0, 5)).toEqual(['Name', 'Sector', 'Status', 'ICR', 'Debt']);
    expect(rowNames()).toEqual(['Ashgrove Works', 'Larkmoor Textiles', 'Brindlemere Foods']);
    expect(screen.getByText('Zombie')).toBeInTheDocument();
  });

  it('moves focus into the dialog on open', async () => {
    await openTable();
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement);
  });

  it('reaches every header and Select button by Tab', async () => {
    const { user } = await openTable();
    const stops = [
      ...screen.getAllByRole('button', { name: /^(Name|Sector|Status|ICR|Debt)/ }),
      ...screen.getAllByRole('button', { name: /^Select / }),
    ];
    const seen = new Set<Element>();
    for (let i = 0; i < 20; i++) {
      if (document.activeElement) seen.add(document.activeElement);
      await user.tab();
    }
    for (const el of stops) expect(seen.has(el)).toBe(true);
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement);
  });

  it('sorts with Enter and Space on header buttons and updates aria-sort', async () => {
    const { user } = await openTable();
    const nameTh = screen.getByRole('columnheader', { name: /Name/ });
    const nameBtn = within(nameTh).getByRole('button');
    expect(nameTh).not.toHaveAttribute('aria-sort');

    nameBtn.focus();
    await user.keyboard('{Enter}');
    expect(nameTh).toHaveAttribute('aria-sort', 'ascending');
    expect(rowNames()).toEqual(['Ashgrove Works', 'Brindlemere Foods', 'Larkmoor Textiles']);

    await user.keyboard(' ');
    expect(nameTh).toHaveAttribute('aria-sort', 'descending');
    expect(rowNames()).toEqual(['Larkmoor Textiles', 'Brindlemere Foods', 'Ashgrove Works']);

    const statusTh = screen.getByRole('columnheader', { name: /Status/ });
    within(statusTh).getByRole('button').focus();
    await user.keyboard('{Enter}');
    expect(statusTh).toHaveAttribute('aria-sort', 'ascending');
    expect(nameTh).not.toHaveAttribute('aria-sort');
    expect(rowNames()[0]).toBe('Ashgrove Works');
  });

  it('selecting in the graveyard dispatches selectFirm and closes the table', async () => {
    const { user, trigger } = await openTable();
    await user.click(screen.getByRole('button', { name: 'Select Ashgrove Works' }));
    const { machine, overlay } = useStore.getState();
    expect(machine.state).toBe('capture');
    expect(machine.ctx.cik).toBe(ASHGROVE);
    expect(overlay).toBe('none');
    expect(trigger).toHaveFocus();
  });

  it('offers Select only for rescue-eligible firms', async () => {
    const index: FirmsIndex = {
      ...fixtureBundle.index,
      firms: fixtureBundle.index.firms.map((f) =>
        f.cik === ASHGROVE ? { ...f, rescue_eligible: false } : f,
      ),
    };
    await openTable(index);
    expect(screen.queryByRole('button', { name: 'Select Ashgrove Works' })).toBeNull();
    expect(screen.getAllByRole('button', { name: /^Select / })).toHaveLength(2);
  });

  it('outside the graveyard shows a status message and does not dispatch', async () => {
    const { user } = await openTable();
    act(() => {
      useStore.getState().selectFirm(ASHGROVE);
    });
    const before = useStore.getState().machine;
    expect(before.state).toBe('capture');

    await user.click(screen.getByRole('button', { name: 'Select Larkmoor Textiles' }));
    expect(screen.getByRole('status')).toHaveTextContent(SELECT_ONLY_IN_GRAVEYARD);
    expect(useStore.getState().machine).toBe(before);
    expect(useStore.getState().overlay).toBe('table');
  });

  it('shows an empty-state row when there are no firms', async () => {
    await openTable({ ...fixtureBundle.index, firms: [] });
    expect(screen.getByRole('cell', { name: 'No firms in the data set' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Select / })).toBeNull();
  });

  it('Esc closes and restores focus to the Table view button', async () => {
    const { user, trigger } = await openTable();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(useStore.getState().overlay).toBe('none');
    expect(trigger).toHaveFocus();
  });

  it('Close button closes and restores focus to the Table view button', async () => {
    const { user, trigger } = await openTable();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('open, sort and close leave the game machine untouched', async () => {
    const before = useStore.getState().machine;
    const { user } = await openTable();
    await user.click(within(screen.getByRole('columnheader', { name: /ICR/ })).getByRole('button'));
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(useStore.getState().machine).toBe(before);
  });

  it('has no axe violations with the fixture', async () => {
    const { container } = await openTable();
    expect((await axe(container)).violations).toEqual([]);
  });
});
