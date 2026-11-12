import { useStore } from '../../../state/store';

export const ENVIRONMENT_NOTICE = 'An environment asset failed to load.';

/** Logs a failed ground or sky asset and posts the HUD notice (7.13). Deduped by the store. */
export function reportEnvironmentFailure(error?: unknown): void {
  console.warn('[graveyard] environment asset failed', error);
  useStore.getState().pushNotice(ENVIRONMENT_NOTICE);
}
