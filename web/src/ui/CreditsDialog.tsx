import { useEffect, useRef, useState } from 'react';
import { loadCredits } from './loadCredits';
import { parseCredits, type CreditsBlock, type Inline } from './parseCredits';
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
          <CreditsBody text={text} />
        )}
      </div>
    </div>
  );
}

const LINK_CLASS =
  'text-text underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text';

function InlineText({ parts }: { parts: Inline[] }) {
  return (
    <>
      {parts.map((p, i) =>
        p.kind === 'link' ? (
          <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            {p.text}
          </a>
        ) : p.kind === 'code' ? (
          <code key={i} className="font-mono text-xs">
            {p.text}
          </code>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

function CreditsBody({ text }: { text: string }) {
  const blocks = parseCredits(text);
  // Group consecutive entries into one list.
  const groups: (CreditsBlock | CreditsBlock[])[] = [];
  for (const b of blocks) {
    const last = groups[groups.length - 1];
    if (b.type === 'entry') {
      if (Array.isArray(last)) last.push(b);
      else groups.push([b]);
    } else groups.push(b);
  }
  return (
    <div
      role="region"
      tabIndex={0}
      aria-label="Credits text"
      className="flex flex-col gap-3 overflow-auto rounded-panel border border-panel-border p-3 text-sm text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
    >
      {groups.map((g, gi) => {
        if (Array.isArray(g)) {
          return (
            <ul key={gi} className="flex flex-col gap-2">
              {g.map((e, ei) =>
                e.type === 'entry' ? (
                  <li key={ei} className="rounded-panel border border-panel-border p-2">
                    <div className="font-semibold text-text">{e.title}</div>
                    <div className="text-text-2">
                      {e.author} · {e.license}
                      {' · '}
                      {e.sourceUrl ? (
                        <a
                          href={e.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Source for ${e.title}`}
                          className={LINK_CLASS}
                        >
                          source
                        </a>
                      ) : (
                        <span>{e.sourceText || 'source n/a'}</span>
                      )}
                    </div>
                    {e.changes.length > 0 && (
                      <div className="text-xs text-text-2">
                        Changes: <InlineText parts={e.changes} />
                      </div>
                    )}
                  </li>
                ) : null,
              )}
            </ul>
          );
        }
        if (g.type === 'heading') {
          return (
            <h3
              key={gi}
              className={g.level <= 1 ? 'text-base font-semibold' : 'text-sm font-semibold'}
            >
              {g.text}
            </h3>
          );
        }
        if (g.type === 'text') {
          return (
            <p key={gi}>
              <InlineText parts={g.inline} />
            </p>
          );
        }
        return null;
      })}
    </div>
  );
}
