import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ webgl: true, labFail: false, labLoads: 0 }));

vi.mock('@react-three/fiber', () => ({
  Canvas: () => <div data-testid="canvas" />,
}));

vi.mock('./webgl', () => ({ hasWebGL: () => h.webgl }));

type HostModule = typeof import('./SceneHost');
type StoreModule = typeof import('../state/store');

async function setup(): Promise<{
  SceneHost: HostModule['default'];
  useStore: StoreModule['useStore'];
}> {
  // doMock + resetModules gives a fresh factory call per import attempt (vi.mock caches its result).
  vi.doMock('./lab/LabScene', async () => {
    h.labLoads += 1;
    if (h.labFail) throw new Error('chunk boom');
    const ScenePlaceholder = (await import('./ScenePlaceholder')).default;
    return { default: () => <ScenePlaceholder label="Lab scene placeholder" /> };
  });
  const host = await import('./SceneHost');
  const { useStore } = await import('../state/store');
  return { SceneHost: host.default, useStore };
}

const CIK = '9000000001';

beforeEach(() => {
  vi.resetModules();
  h.webgl = true;
  h.labFail = false;
  h.labLoads = 0;
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('SceneHost', () => {
  it('shows the Loading feed… fallback, then the graveyard scene with one canvas', async () => {
    const { SceneHost } = await setup();
    render(<SceneHost />);
    expect(screen.getByText('Loading feed…')).toBeInTheDocument();
    expect(await screen.findByText('Graveyard scene placeholder')).toBeInTheDocument();
    expect(screen.getAllByTestId('canvas')).toHaveLength(1);
    expect(screen.queryByText('Loading feed…')).not.toBeInTheDocument();
  });

  it('selects the scene per state with exactly one canvas', async () => {
    const { SceneHost, useStore } = await setup();
    render(<SceneHost />);
    await screen.findByText('Graveyard scene placeholder');

    act(() => void useStore.getState().selectFirm(CIK));
    expect(useStore.getState().machine.state).toBe('capture');
    expect(await screen.findByText('Graveyard scene placeholder')).toBeInTheDocument();
    expect(screen.getAllByTestId('canvas')).toHaveLength(1);

    act(() => void useStore.getState().send({ type: 'captureDone' }));
    expect(useStore.getState().machine.state).toBe('lab');
    expect(await screen.findByText('Lab scene placeholder')).toBeInTheDocument();
    expect(screen.queryByText('Graveyard scene placeholder')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('canvas')).toHaveLength(1);

    act(
      () => void useStore.getState().send({ type: 'pullSwitch', treatment: [], result: 'revived' }),
    );
    expect(useStore.getState().machine.state).toBe('outcome');
    expect(await screen.findByText('Lab scene placeholder')).toBeInTheDocument();
    expect(screen.getAllByTestId('canvas')).toHaveLength(1);
  });

  it('preloads the lab chunk only after the first capture, never at start', async () => {
    const { SceneHost, useStore } = await setup();
    render(<SceneHost />);
    await screen.findByText('Graveyard scene placeholder');
    expect(h.labLoads).toBe(0);

    act(() => void useStore.getState().selectFirm(CIK));
    await vi.waitFor(() => expect(h.labLoads).toBe(1));
  });

  it('shows an error boundary on chunk failure and Retry recovers', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const user = userEvent.setup();
    const { SceneHost, useStore } = await setup();
    h.labFail = true;
    render(<SceneHost />);
    await screen.findByText('Graveyard scene placeholder');

    act(() => void useStore.getState().selectFirm(CIK));
    act(() => void useStore.getState().send({ type: 'captureDone' }));
    expect(await screen.findByTestId('scene-error')).toBeInTheDocument();
    const retry = screen.getByRole('button', { name: 'Retry' });

    h.labFail = false;
    await user.click(retry);
    expect(await screen.findByText('Lab scene placeholder')).toBeInTheDocument();
    expect(screen.queryByTestId('scene-error')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('canvas')).toHaveLength(1);
  });
});

describe('ScenePlaceholder', () => {
  it('shows the unavailable message and no canvas without WebGL', async () => {
    h.webgl = false;
    const { SceneHost } = await setup();
    render(<SceneHost />);
    expect(await screen.findByText('3D view unavailable. Use Table view.')).toBeInTheDocument();
    expect(screen.queryByTestId('canvas')).not.toBeInTheDocument();
  });

  it('adds the Low quality label when the setting is on', async () => {
    const { SceneHost, useStore } = await setup();
    act(() => useStore.getState().setSetting('lowQuality', true));
    render(<SceneHost />);
    expect(await screen.findByText('Graveyard scene placeholder Low quality')).toBeInTheDocument();
  });

  it('omits the Low quality label by default', async () => {
    const { SceneHost } = await setup();
    render(<SceneHost />);
    const label = await screen.findByText('Graveyard scene placeholder');
    expect(label.textContent).not.toMatch(/Low quality/);
  });
});
