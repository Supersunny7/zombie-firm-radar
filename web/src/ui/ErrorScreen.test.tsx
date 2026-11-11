import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { LoadError } from '../data/errors';
import { ErrorScreen } from './ErrorScreen';

const error = { file: '/data/firms_index.json', status: 404 } as const;

describe('ErrorScreen', () => {
  afterEach(cleanup);

  it('shows title, file and reason in an alert', () => {
    render(<ErrorScreen error={error} onRetry={() => {}} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('/data/firms_index.json');
    expect(alert).toHaveTextContent('HTTP 404');
    expect(screen.getByRole('heading', { name: 'Could not load the feed' })).toBeInTheDocument();
  });

  it('focuses Retry on mount and calls onRetry from the keyboard', async () => {
    const onRetry = vi.fn();
    render(<ErrorScreen error={error} onRetry={onRetry} />);
    const retry = screen.getByRole('button', { name: 'Retry' });
    expect(retry).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      'an invalid file',
      {
        file: '/data/firms_index.json',
        status: 'invalid data',
        detail: { path: '$.firms[0].cik', expected: '10-digit string', actual: 'number' },
      },
      'Invalid data at $.firms[0].cik',
    ],
    [
      'production with no index',
      { file: '/data/mock/firms_index.json', status: 404, message: 'No data index found.' },
      'HTTP 404',
    ],
  ] as const)('shows alert and Retry for %s', async (_name, loadError, text) => {
    const onRetry = vi.fn();
    render(<ErrorScreen error={loadError as LoadError} onRetry={onRetry} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(loadError.file);
    expect(alert).toHaveTextContent(text);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('is axe-clean', async () => {
    const { container } = render(<ErrorScreen error={error} onRetry={() => {}} />);
    expect((await axe(container)).violations).toEqual([]);
  });
});
