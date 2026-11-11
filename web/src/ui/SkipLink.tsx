export const TABLE_BUTTON_ID = 'table-view-button';

/** First focusable element on the page. Activates the "Table view" button. */
export function SkipLink() {
  return (
    <a
      href={`#${TABLE_BUTTON_ID}`}
      onClick={(e) => {
        e.preventDefault();
        const btn = document.getElementById(TABLE_BUTTON_ID);
        btn?.focus();
        btn?.click();
      }}
      className="sr-only rounded-panel border border-panel-border bg-ink px-3 py-2 text-text focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
    >
      Skip to table view
    </a>
  );
}
