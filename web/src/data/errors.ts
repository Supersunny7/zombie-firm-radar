/**
 * Load errors and their display format. Pure TypeScript: no React or three imports.
 */
import type { GuardFailure } from './guards';

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export type LoadErrorStatus = number | 'network error' | 'invalid json' | 'invalid data';

export interface LoadError {
  /** Path or URL of the failing file, e.g. `/data/firms_index.json`. */
  file: string;
  status: LoadErrorStatus;
  /** Guard failure when `status` is `invalid data` because a guard rejected the file. */
  detail?: GuardFailure;
  /** Extra human-readable note, e.g. for a rejected CIK. */
  message?: string;
}

export function formatLoadError(e: LoadError): { title: string; file: string; reason: string } {
  let reason: string;
  switch (e.status) {
    case 'network error':
      reason = 'network error';
      break;
    case 'invalid json':
      reason = 'The file is not valid JSON.';
      break;
    case 'invalid data':
      reason = e.detail
        ? `Invalid data at ${e.detail.path}: expected ${e.detail.expected}, got ${e.detail.actual}.`
        : (e.message ?? 'The file does not match the data contract.');
      break;
    default:
      reason = `HTTP ${e.status}`;
  }
  if (e.message && e.status !== 'invalid data') reason = `${reason}. ${e.message}`;
  return { title: 'Could not load the feed', file: e.file, reason };
}
