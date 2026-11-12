import { useEffect, useRef, useState } from 'react';
import { loadCredits } from './loadCredits';
import { useFocusTrap } from './useFocusTrap';

const EMPTY_TEXT = 'No credits are available.';

export interface CreditsDialogProps {
  onClose: () => void;
}

/** Modal dialog showing the repository CREDITS.md as plain pre-wrapped text. */
export function CreditsDialog({ onClose }: CreditsDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadCredits().then((t) => {
      if (!cancelled) setText(t);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusTrap(dialogRef, { onEscape: onClose, initialFocus: () => closeRef.current });

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Credits"
        className="flex max-h-[80vh] w-full max-w-3xl flex-col gap-3 rounded-panel border border-panel-border bg-[#06080b] p-4 text-text"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">Credits</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-panel border border-panel-border bg-panel px-3 py-1 text-sm text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
          >
            Close
          </button>
        </div>
        {text === null ? (
          <p className="text-sm text-text-2">Loading credits...</p>
        ) : text.trim() === '' ? (
          <p className="text-sm text-text-2">{EMPTY_TEXT}</p>
        ) : (
          <pre
            tabIndex={0}
            aria-label="Credits text"
            className="overflow-auto rounded-panel border border-panel-border p-3 font-mono text-xs whitespace-pre-wrap text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
          >
            {text}
          </pre>
        )}
      </div>
    </div>
  );
}
