import { lazy, Suspense, useEffect, useState } from 'react';
import { createLoader, type Loader } from './data/loader';
import { devLoadFixture } from './data/source';
import type { LoadError } from './data/errors';
import SceneHost from './scenes/SceneHost';
import { effectiveReducedMotion, useStore } from './state/store';
import { ErrorScreen } from './ui/ErrorScreen';
import { Hud } from './ui/Hud';
import { TableView } from './ui/table/TableView';
import { ThemeSync } from './ui/ThemeSync';

const DebugBar = lazy(() => import('./ui/DebugBar'));

let defaultLoader: Loader | null = null;
function getDefaultLoader(): Loader {
  defaultLoader ??= createLoader({
    fetch: (...args) => fetch(...args),
    isDev: import.meta.env.DEV,
    loadFixture: devLoadFixture,
  });
  return defaultLoader;
}

export interface AppProps {
  /** Injectable for tests; defaults to a loader using the real `fetch`. */
  loader?: Loader;
}

export default function App({ loader: injected }: AppProps = {}) {
  const loader = injected ?? getDefaultLoader();

  const hasData = useStore((s) => s.data !== null);
  const setData = useStore((s) => s.setData);
  const setFirm = useStore((s) => s.setFirm);
  const lightsOn = useStore((s) => s.settings.lights === 'on');
  const reducedMotion = useStore(effectiveReducedMotion);
  const setSystemReducedMotion = useStore((s) => s.setSystemReducedMotion);
  const debugBar = useStore((s) => s.debugBar);
  const gameState = useStore((s) => s.machine.state);
  const cik = useStore((s) => s.machine.ctx.cik);

  const [error, setError] = useState<LoadError | null>(null);
  const [firmAttempt, setFirmAttempt] = useState(0);

  const [startupRun, setStartupRun] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void loader.loadStartup().then((res) => {
      if (cancelled) return;
      if (res.ok) setData(res.value);
      else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [loader, setData, startupRun]);
  // Follow the system reduced-motion preference.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setSystemReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [setSystemReducedMotion]);

  // Load the firm file when entering the lab.
  useEffect(() => {
    if (gameState === 'graveyard') {
      setFirm(null);
      return;
    }
    if (gameState !== 'lab' || cik === null) return;
    let cancelled = false;
    void loader.loadFirm(cik).then((res) => {
      if (cancelled) return;
      if (res.ok) setFirm(res.value);
      else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [loader, gameState, cik, setFirm, firmAttempt]);

  const onRetry = () => {
    loader.retry();
    setError(null);
    if (hasData) setFirmAttempt((n) => n + 1);
    else setStartupRun((n) => n + 1);
  };

  const themeSync = <ThemeSync lightsOn={lightsOn} reducedMotion={reducedMotion} />;

  if (error) {
    return (
      <>
        {themeSync}
        <Hud>
          <ErrorScreen error={error} onRetry={onRetry} />
        </Hud>
      </>
    );
  }

  if (!hasData) {
    return (
      <>
        {themeSync}
        <Hud>
          <p role="status" className="m-3 text-text-2">
            Loading feed…
          </p>
        </Hud>
      </>
    );
  }

  return (
    <>
      {themeSync}
      <SceneHost />
      <Hud />
      <TableView />
      {debugBar && (
        <Suspense fallback={null}>
          <DebugBar />
        </Suspense>
      )}
    </>
  );
}
