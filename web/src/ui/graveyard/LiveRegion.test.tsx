import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { useStore } from '../../state/store';
import { statusLabel } from '../table/format';
import { announce, LiveRegion } from './LiveRegion';

afterEach(() => {
  cleanup();
  useStore.setState({ liveMessage: '' });
});

describe('LiveRegion', () => {
  it('is a polite status region', () => {
    render(<LiveRegion />);
    const region = screen.getByRole('status');
    expect(region.getAttribute('aria-live')).toBe('polite');
  });

  it('shows "{name}, {status}" after announce', () => {
    render(<LiveRegion />);
    act(() => announce({ name: 'Ashgrove Works', status: 'zombie' }));
    expect(screen.getByRole('status').textContent).toBe(
      `Ashgrove Works, ${statusLabel('zombie').text}`,
    );
    expect(useStore.getState().liveMessage).toBe(`Ashgrove Works, ${statusLabel('zombie').text}`);
  });
});
