import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import { axe } from 'vitest-axe';
import { fixtureBundle } from '../../dev/fixtures';
import { initialMachine } from '../../state/machine';
import { DEFAULT_SETTINGS } from '../../state/settings';
import { useStore } from '../../state/store';
import type { FirmsIndex } from '../../types/data';
import { TABLE_BUTTON_ID } from '../SkipLink';
import {
  EXCLUDED_FROM_SHOCK,
  NO_SECTOR_MATCH,
  SELECT_ONLY_IN_GRAVEYARD,
  TableView,
} from './TableView';

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
    cardCik: null,
    cardOpener: null,
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
    for (let i = 0; i < 40; i++) {
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
    expect(screen.getByText(SELECT_ONLY_IN_GRAVEYARD)).toHaveAttribute('role', 'status');
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
    await user.click(
      within(screen.getByRole('columnheader', { name: /^ICR/ })).getByRole('button'),
    );
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(useStore.getState().machine).toBe(before);
  });

  it('has no axe violations with the fixture', async () => {
    const { container } = await openTable();
    expect((await axe(container)).violations).toEqual([]);
  });
});

describe('TableView caption follows the Data_Source', () => {
  const MOCK_CAPTION = 'Fictional firms (mock data). Sort by activating a column header.';
  const REAL_CAPTION = 'Firms from SEC EDGAR filings. Sort by activating a column header.';

  function openWith(source: 'real' | 'mock' | 'fixture') {
    useStore.setState({
      data: { index: fixtureBundle.index, macro: fixtureBundle.macro, source },
    });
    render(<TableView />);
    act(() => useStore.getState().toggleOverlay());
    return screen.getByRole('table');
  }

  it('says the firms are fictional for every non-real source (property)', () => {
    fc.assert(
      fc.property(fc.constantFrom('mock', 'fixture'), (source) => {
        cleanup();
        reset();
        const table = openWith(source);
        expect(within(table).getByText(MOCK_CAPTION)).toBeInTheDocument();
        expect(table.textContent).not.toContain('SEC EDGAR');
      }),
      { numRuns: 10 },
    );
  });

  it('matches the expected caption for every source and keeps one sort hint (property)', () => {
    const SORT_HINT = 'Sort by activating a column header.';
    const expected = {
      real: REAL_CAPTION,
      mock: MOCK_CAPTION,
      fixture: MOCK_CAPTION,
    } as const;
    fc.assert(
      fc.property(fc.constantFrom('real', 'mock', 'fixture'), (source) => {
        cleanup();
        reset();
        const table = openWith(source);
        const caption = table.querySelector('caption')!.textContent ?? '';
        expect(caption).toBe(expected[source]);
        expect(caption.endsWith(SORT_HINT)).toBe(true);
        expect(caption.includes('SEC EDGAR')).toBe(source === 'real');
      }),
      { numRuns: 15 },
    );
  });

  it('keeps the SEC EDGAR caption for real data', () => {
    const table = openWith('real');
    expect(within(table).getByText(REAL_CAPTION)).toBeInTheDocument();
  });

  describe.each(['off', 'on'] as const)('with lights %s', (lights) => {
    beforeEach(() => {
      useStore.setState({ settings: { ...DEFAULT_SETTINGS, lights } });
    });

    it.each(['mock', 'fixture'] as const)('shows the fictional caption for %s data', (source) => {
      const table = openWith(source);
      expect(useStore.getState().settings.lights).toBe(lights);
      expect(within(table).getByText(MOCK_CAPTION)).toBeInTheDocument();
      expect(table.textContent).not.toContain('SEC EDGAR');
    });

    it('shows the SEC EDGAR caption for real data', () => {
      const table = openWith('real');
      expect(useStore.getState().settings.lights).toBe(lights);
      expect(within(table).getByText(REAL_CAPTION)).toBeInTheDocument();
    });
  });
});

describe('TableView shock parity', () => {
  it('shows Shocked ICR and Newly undead columns and the shared counters', async () => {
    await openTable();
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toContain('Shocked ICR');
    expect(headers).toContain('Newly undead');
    expect(screen.getByText(/Risen from the grave: \d+/)).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Interest rate shock' })).toBeInTheDocument();
  });

  it('marks ineligible rows as excluded from the shock', async () => {
    const index: FirmsIndex = {
      ...fixtureBundle.index,
      firms: fixtureBundle.index.firms.map((f) =>
        f.cik === ASHGROVE ? { ...f, shock_eligible: false } : f,
      ),
    };
    await openTable(index);
    const row = screen.getByRole('cell', { name: 'Ashgrove Works' }).closest('tr')!;
    expect(within(row).getByText(EXCLUDED_FROM_SHOCK)).toBeInTheDocument();
  });

  it('reaches slider, lights, sound and sector select by Tab', async () => {
    const { user } = await openTable();
    const stops = [
      screen.getByRole('slider', { name: 'Interest rate shock' }),
      screen.getByRole('button', { name: /^Lights (on|off)$/ }),
      screen.getByRole('button', { name: /^Sound (on|off)$/ }),
      screen.getByRole('combobox', { name: 'Sector' }),
    ];
    const seen = new Set<Element>();
    for (let i = 0; i < 40; i++) {
      if (document.activeElement) seen.add(document.activeElement);
      await user.tab();
    }
    for (const el of stops) expect(seen.has(el)).toBe(true);
  });

  it('filters by sector and shows a message when nothing matches', async () => {
    const { user } = await openTable();
    const select = screen.getByRole('combobox', { name: 'Sector' });
    const sector = fixtureBundle.index.firms[0]!.sector;
    await user.selectOptions(select, sector);
    for (const n of rowNames()) {
      const f = fixtureBundle.index.firms.find((x) => x.name === n)!;
      expect(f.sector).toBe(sector);
    }
    expect(screen.queryByText(NO_SECTOR_MATCH)).toBeNull();
  });

  it('shows the no-match message for an empty sector result', async () => {
    const index: FirmsIndex = {
      ...fixtureBundle.index,
      firms: fixtureBundle.index.firms.map((f) => ({ ...f, sector: 'Mining' })),
    };
    await openTable(index);
    const select = screen.getByRole('combobox', { name: 'Sector' });
    // Force a sector value with no rows by removing it from the data after selection.
    await userEvent.selectOptions(select, 'Mining');
    expect(rowNames()).toHaveLength(3);
    act(() => load({ ...index, firms: index.firms.map((f) => ({ ...f, sector: 'Other' })) }));
    expect(screen.getByText(NO_SECTOR_MATCH)).toBeInTheDocument();
  });

  it('opens one File card by click, Enter and Space on a row', async () => {
    const { user } = await openTable();
    const row = () => screen.getByRole('cell', { name: 'Ashgrove Works' }).closest('tr')!;
    await user.click(row());
    expect(useStore.getState().cardCik).toBe(ASHGROVE);
    expect(useStore.getState().cardOpener).toBe('table');
    expect(screen.getAllByLabelText('File card')).toHaveLength(1);

    act(() => useStore.getState().closeCard());
    row().focus();
    await user.keyboard('{Enter}');
    expect(useStore.getState().cardCik).toBe(ASHGROVE);

    act(() => useStore.getState().closeCard());
    row().focus();
    await user.keyboard(' ');
    expect(useStore.getState().cardCik).toBe(ASHGROVE);
    expect(screen.getAllByLabelText('File card')).toHaveLength(1);
  });

  it('Select button does not also open the card', async () => {
    const { user } = await openTable();
    await user.click(screen.getByRole('button', { name: 'Select Ashgrove Works' }));
    expect(useStore.getState().cardCik).toBeNull();
  });
});
