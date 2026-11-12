import { beforeEach, describe, expect, it } from 'vitest';
import { INITIAL_GRAVEYARD } from './graveyard';
import { useStore } from './store';

beforeEach(() => {
  useStore.setState({ ...INITIAL_GRAVEYARD, notices: [] });
});

describe('graveyard slice', () => {
  it('starts framed on plot 0 with nothing open', () => {
    const s = useStore.getState();
    expect(s.framedPlot).toBe(0);
    expect(s.cardCik).toBeNull();
    expect(s.cardOpener).toBeNull();
    expect(s.audioBlocked).toBe(false);
    expect(s.notices).toEqual([]);
  });

  it('opens and closes the card, remembering the opener', () => {
    useStore.getState().openCard('0000000001', 'keyboard');
    expect(useStore.getState().cardCik).toBe('0000000001');
    expect(useStore.getState().cardOpener).toBe('keyboard');
    useStore.getState().closeCard();
    expect(useStore.getState().cardCik).toBeNull();
  });

  it('keeps the state reference when a setter gets the same value', () => {
    useStore.getState().setHovered('a');
    const before = useStore.getState();
    useStore.getState().setHovered('a');
    expect(useStore.getState()).toBe(before);
  });

  it('dedupes notices and keeps rateShock in the machine', () => {
    useStore.getState().pushNotice('x');
    useStore.getState().pushNotice('x');
    expect(useStore.getState().notices).toEqual(['x']);
    expect('rateShock' in useStore.getState()).toBe(false);
  });
});
