import type { Loader } from '../../data/loader';
import { FileCard } from './FileCard';
import { LiveRegion } from './LiveRegion';
import { ShockPanel } from './ShockPanel';

export interface GraveyardHudProps {
  loader?: Pick<Loader, 'loadFirm'>;
}

/**
 * Graveyard panels. The shock panel docks bottom-left; under 900 px everything stacks
 * below the stage. Mountable on its own; not mounted by SceneHost.
 */
export function GraveyardHud({ loader }: GraveyardHudProps) {
  return (
    <div className="pointer-events-none flex flex-col items-start gap-3 p-3 min-[900px]:absolute min-[900px]:bottom-0 min-[900px]:left-0">
      <ShockPanel />
      <FileCard loader={loader} />
      <LiveRegion />
    </div>
  );
}
