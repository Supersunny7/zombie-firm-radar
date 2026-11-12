// Pure model choice per firm (requirements 4.1, 4.2, 4.5, 4.6). No react or three imports.
import type { StoneModelId } from './stoneModels';

export type StoneStatus = 'zombie' | 'endangered' | 'healthy' | 'insufficient_data';

/**
 * healthy -> intact, endangered -> cracked, zombie -> broken, insufficient_data -> intact
 * (the renderer greys it with an instance colour). A newly undead firm uses broken and goes
 * back to its base model as soon as it is no longer newly undead.
 */
export function modelFor(status: StoneStatus, newlyUndead: boolean): StoneModelId {
  if (newlyUndead) return 'broken';
  switch (status) {
    case 'zombie':
      return 'broken';
    case 'endangered':
      return 'cracked';
    default:
      return 'intact';
  }
}
