import { useEffect } from 'react';
import { useStore } from '../state/store';

/**
 * Reserved for cinematics. Hidden (and so not a dead tab stop) until a handler is
 * registered. Esc calls the handler once per key press, unless another widget
 * (Settings menu, Table view) already handled the key.
 */
export function SkipSlot() {
  const handler = useStore((s) => s.skipHandler);

  useEffect(() => {
    if (!handler) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || e.repeat) return;
      handler();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handler]);

  return (
    <button
      type="button"
      hidden={!handler}
      aria-disabled={handler ? undefined : true}
      onClick={() => handler?.()}
      className="rounded-panel border border-panel-border bg-panel px-3 py-1 text-sm text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
    >
      Skip
    </button>
  );
}
