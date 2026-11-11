import { Component, createElement, lazy, Suspense, useEffect, useState } from 'react';
import type { ComponentType, ErrorInfo, LazyExoticComponent, ReactNode } from 'react';
import { useStore } from '../state/store';

type Factory = () => Promise<{ default: ComponentType }>;

export interface RetryableLazy {
  /** Current lazy component. Replaced by `reset()` after a failed load. */
  get(): LazyExoticComponent<ComponentType>;
  /** Start loading the chunk (memoised; a failure clears the memo). */
  preload(): Promise<unknown>;
  /** Drop the cached rejected promise so the next render imports again. */
  reset(): void;
}

/**
 * React caches a rejected lazy promise forever, so Retry needs a fresh `lazy`
 * and a fresh import promise.
 */
export function lazyWithRetry(factory: Factory): RetryableLazy {
  let pending: ReturnType<Factory> | null = null;
  const load: Factory = () => {
    pending ??= factory().catch((err: unknown) => {
      pending = null;
      throw err;
    });
    return pending;
  };
  let current = lazy(load);
  return {
    get: () => current,
    preload: () => load(),
    reset() {
      pending = null;
      current = lazy(load);
    },
  };
}

const graveyardScene = lazyWithRetry(() => import('./graveyard/GraveyardScene'));
const labScene = lazyWithRetry(() => import('./lab/LabScene'));

/** Starts downloading the lab chunk. Called on first `capture`, never at start. */
export const preloadLab = (): Promise<unknown> => labScene.preload();

type SceneKey = 'graveyard' | 'lab';

interface BoundaryProps {
  children: ReactNode;
  onRetry: () => void;
}
interface BoundaryState {
  error: Error | null;
}

class SceneBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.warn('[scene] failed to load', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        className="fixed inset-0 flex items-center justify-center bg-ink p-4 text-text"
        data-testid="scene-error"
      >
        <div className="rounded-panel border border-panel-border bg-panel p-4">
          <p role="alert">The scene failed to load: {this.state.error.message}</p>
          <button
            type="button"
            className="mt-3 rounded-panel border border-panel-border px-3 py-1 focus-visible:outline-2 focus-visible:outline-text"
            onClick={() => {
              this.props.onRetry();
              this.setState({ error: null });
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
}

const SCENES: Record<SceneKey, RetryableLazy> = { graveyard: graveyardScene, lab: labScene };

export default function SceneHost() {
  const gameState = useStore((s) => s.machine.state);
  const [attempt, setAttempt] = useState(0);
  const sceneKey: SceneKey = gameState === 'lab' || gameState === 'outcome' ? 'lab' : 'graveyard';

  useEffect(() => {
    if (gameState === 'capture') preloadLab().catch(() => undefined);
  }, [gameState]);

  return (
    <SceneBoundary
      key={`${sceneKey}-${attempt}`}
      onRetry={() => {
        SCENES[sceneKey].reset();
        setAttempt((n) => n + 1);
      }}
    >
      <Suspense fallback={<p className="fixed left-4 bottom-16 text-text-2">Loading feed…</p>}>
        {createElement(SCENES[sceneKey].get())}
      </Suspense>
    </SceneBoundary>
  );
}
