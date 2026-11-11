import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import App from './App';
import { createLoader, type Loader } from './data/loader';
import { fixtureBundle } from './dev/fixtures';
import { initialMachine } from './state/machine';
import { DEFAULT_SETTINGS } from './state/settings';
import { useStore } from './state/store';

vi.mock('@react-three/fiber', () => ({
  Canvas: () => <div data-testid="canvas" />,
}));
vi.mock('./scenes/webgl', () => ({ hasWebGL: () => true }));

const FOOTER = 'Data: SEC EDGAR. Not investment advice.';
const firms = fixtureBundle.index.firms;
const FIRST = firms[0]!.cik;

type Routes = Record<string, unknown>;

/** A fetch that serves `routes` (URL -> JSON body) and 404s everything else. */
function fakeFetch(routes: Routes) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (!(url in routes)) return new Response('not found', { status: 404 });
    return new Response(JSON.stringify(routes[url]), { status: 200 });
  });
}

function routesFor(base: string): Routes {
  const r: Routes = {
    [`${base}firms_index.json`]: fixtureBundle.index,
    [`${base}macro.json`]: fixtureBundle.macro,
  };
  for (const [cik, firm] of Object.entries(fixtureBundle.firms))
    r[`${base}firms/${cik}.json`] = firm;
  return r;
}

function makeLoader(
  kind: 'mock' | 'fixture' | 'real' | 'none',
  fetchImpl = fakeFetch(
    kind === 'mock' ? routesFor('/data/mock/') : kind === 'real' ? routesFor('/data/') : {},
  ),
): { loader: Loader; fetchMock: ReturnType<typeof fakeFetch> } {
  const loader = createLoader({
    fetch: fetchImpl as unknown as typeof fetch,
    isDev: kind !== 'real' && kind !== 'none',
    loadFixture: async () => fixtureBundle,
  });
  return { loader, fetchMock: fetchImpl };
}

function resetStore(): void {
  window.localStorage.clear();
  useStore.setState({
    machine: initialMachine(),
    settings: { ...DEFAULT_SETTINGS },
    overlay: 'none',
    lastRejection: null,
    data: null,
    firm: null,
    debugBar: true,
  });
}

beforeEach(resetStore);
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  resetStore();
});

const footer = () => screen.getByText(FOOTER);

describe('App startup', () => {
  it('shows Loading feed… with the footer until data arrives', async () => {
    let release!: (r: Response) => void;
    const pending = new Promise<Response>((res) => (release = res));
    const fetchImpl = vi.fn(() => pending);
    const { loader } = makeLoader('real', fetchImpl as never);
    render(<App loader={loader} />);
    expect(screen.getByText('Loading feed…')).toBeInTheDocument();
    expect(footer()).toBeInTheDocument();
    expect(screen.queryByTestId('canvas')).not.toBeInTheDocument();
    await act(async () => {
      release(new Response('nope', { status: 500 }));
      await pending;
    });
  });

  it.each([
    ['mock', true],
    ['fixture', true],
    ['real', false],
  ] as const)('renders the graveyard from the %s source', async (kind, mockLabel) => {
    const { loader } = makeLoader(kind);
    render(<App loader={loader} />);
    expect(await screen.findByText('Graveyard scene placeholder')).toBeInTheDocument();
    expect(useStore.getState().data?.source).toBe(kind);
    expect(screen.queryByText('Loading feed…')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('canvas')).toHaveLength(1);
    if (mockLabel) expect(screen.getByText('Mock data')).toBeInTheDocument();
    else expect(screen.queryByText('Mock data')).not.toBeInTheDocument();
    expect(footer()).toBeInTheDocument();
  });
});

describe('App error handling', () => {
  it('shows the Error screen instead of any Scene, keeps the footer, and Retry recovers', async () => {
    const user = userEvent.setup();
    let healthy = false;
    const good = fakeFetch(routesFor('/data/'));
    const flaky = vi.fn((input: RequestInfo | URL) =>
      healthy ? good(input) : Promise.resolve(new Response('boom', { status: 500 })),
    );
    const { loader } = makeLoader('real', flaky as never);
    render(<App loader={loader} />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByTestId('canvas')).not.toBeInTheDocument();
    expect(screen.queryByText(/scene placeholder/)).not.toBeInTheDocument();
    expect(footer()).toBeInTheDocument();

    healthy = true;
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Graveyard scene placeholder')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(footer()).toBeInTheDocument();
  });

  it('shows the Error screen in production when neither real nor mock data exists', async () => {
    const { loader } = makeLoader('none');
    render(<App loader={loader} />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByTestId('canvas')).not.toBeInTheDocument();
    expect(footer()).toBeInTheDocument();
  });
});

describe('App game flow via the Debug bar', () => {
  it('walks graveyard -> capture -> lab -> outcome -> graveyard and loads the firm in the lab', async () => {
    const user = userEvent.setup();
    const { loader, fetchMock } = makeLoader('mock');
    render(<App loader={loader} />);
    const bar = await screen.findByRole('region', { name: 'Debug bar' });
    const click = (name: string) => user.click(within(bar).getByRole('button', { name }));
    const state = () => useStore.getState().machine.state;

    expect(await screen.findByText('Graveyard scene placeholder')).toBeInTheDocument();
    expect(useStore.getState().firm).toBeNull();

    await click('Capture');
    expect(state()).toBe('capture');
    expect(await screen.findByText('Graveyard scene placeholder')).toBeInTheDocument();
    expect(footer()).toBeInTheDocument();

    await click('Lab');
    expect(state()).toBe('lab');
    expect(await screen.findByText('Lab scene placeholder')).toBeInTheDocument();
    expect(screen.queryByText('Graveyard scene placeholder')).not.toBeInTheDocument();
    await waitFor(() => expect(useStore.getState().firm?.cik).toBe(FIRST));
    expect(fetchMock).toHaveBeenCalledWith(`/data/mock/firms/${FIRST}.json`);
    expect(footer()).toBeInTheDocument();

    await click('Outcome');
    expect(state()).toBe('outcome');
    expect(await screen.findByText('Lab scene placeholder')).toBeInTheDocument();
    expect(footer()).toBeInTheDocument();

    await click('Graveyard');
    expect(state()).toBe('graveyard');
    expect(await screen.findByText('Graveyard scene placeholder')).toBeInTheDocument();
    expect(screen.queryByText('Lab scene placeholder')).not.toBeInTheDocument();
    await waitFor(() => expect(useStore.getState().firm).toBeNull());
    expect(footer()).toBeInTheDocument();
  });

  it('does not render the Debug bar when debugBar is false (production without debug=1)', async () => {
    useStore.setState({ debugBar: false });
    const { loader } = makeLoader('real');
    render(<App loader={loader} />);
    await screen.findByText('Graveyard scene placeholder');
    expect(screen.queryByRole('region', { name: 'Debug bar' })).not.toBeInTheDocument();
    expect(footer()).toBeInTheDocument();
  });
});

describe('App accessibility', () => {
  it('has no axe violations when loaded with the Debug bar', async () => {
    const { loader } = makeLoader('mock');
    const { container } = render(<App loader={loader} />);
    await screen.findByRole('region', { name: 'Debug bar' });
    await screen.findByText('Graveyard scene placeholder');
    expect((await axe(container)).violations).toEqual([]);
  });

  it('has no axe violations on the Error screen', async () => {
    const { loader } = makeLoader('none');
    const { container } = render(<App loader={loader} />);
    await screen.findByRole('alert');
    expect((await axe(container)).violations).toEqual([]);
  });
});
