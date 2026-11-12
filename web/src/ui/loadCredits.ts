let creditsPromise: Promise<string> | null = null;

/** Loads the repository CREDITS.md once, on first call. A failed load resolves to ''. */
export function loadCredits(): Promise<string> {
  creditsPromise ??= import('../../../CREDITS.md?raw').then(
    (m) => m.default,
    () => '',
  );
  return creditsPromise;
}
