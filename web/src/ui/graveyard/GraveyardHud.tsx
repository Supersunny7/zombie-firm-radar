import type { Loader } from '../../data/loader';
import { useStore } from '../../state/store';
import { FileCard } from './FileCard';
import { LiveRegion } from './LiveRegion';
import { ShockPanel } from './ShockPanel';

/** Non-blocking asset notices (for example a failed environment asset). Renders nothing when empty. */
function Notices() {
  const notices = useStore((s) => s.notices);
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="graveyard-notices"
      className="pointer-events-none flex flex-col gap-1 font-mono text-xs text-text-2"
    >
      {notices.map((n) => (
        <p key={n} className="rounded-panel border border-panel-border bg-panel px-2 py-1">
          {n}
        </p>
      ))}
    </div>
  );
}

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
      <Notices />
      <LiveRegion />
    </div>
  );
}
