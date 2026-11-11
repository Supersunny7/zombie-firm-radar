import { useEffect, useRef } from 'react';
import { formatLoadError, type LoadError } from '../data/errors';

export interface ErrorScreenProps {
  error: LoadError;
  /** App wires this to `loader.retry()` and reruns startup. */
  onRetry: () => void;
}

/**
 * Shown instead of any Scene when a required data file fails to load.
 * It does NOT render the footer "Data: SEC EDGAR. Not investment advice.":
 * App must render the Hud (which owns the footer) around this component.
 */
export function ErrorScreen({ error, onRetry }: ErrorScreenProps) {
  const { title, file, reason } = formatLoadError(error);
  const retryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    retryRef.current?.focus();
  }, []);

  return (
    <section
      aria-labelledby="error-screen-title"
      className="mx-auto my-8 max-w-xl rounded-panel border border-panel-border bg-panel p-6 text-text"
    >
      <h1 id="error-screen-title" className="font-display text-3xl font-semibold">
        {title}
      </h1>
      <div role="alert" className="mt-4 space-y-2">
        <p>
          <span className="text-text-2">File: </span>
          <code className="font-mono break-all">{file}</code>
        </p>
        <p>
          <span className="text-text-2">Reason: </span>
          <span>{reason}</span>
        </p>
      </div>
      <button
        ref={retryRef}
        type="button"
        onClick={onRetry}
        className="mt-6 rounded-panel border border-panel-border px-4 py-2 font-medium text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
      >
        Retry
      </button>
    </section>
  );
}

export default ErrorScreen;
