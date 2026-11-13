import { useMemo } from 'react';
import { computeLayout, type GraveyardLayout } from '../scenes/graveyard/layout/layout';
import { useStore } from './store';

/** Layout of the loaded firms; same pure function the scene uses. Empty layout before data loads. */
export function useLayout(): GraveyardLayout {
  const firms = useStore((s) => s.data?.index.firms);
  return useMemo(() => computeLayout(firms ?? []), [firms]);
}
