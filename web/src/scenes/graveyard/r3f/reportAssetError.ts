import { useStore } from '../../../state/store';

/** Logs a failed asset and posts a non-blocking HUD notice (requirement 4.9). */
export function reportAssetError(key: string, error?: unknown): void {
  console.warn(`[graveyard] asset failed: ${key}`, error);
  useStore.getState().pushNotice(`A model failed to load: ${key}`);
}
