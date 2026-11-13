import type { Loader } from '../../data/loader';
import { useStore } from '../../state/store';
import { FileCard } from './FileCard';
import { LiveRegion } from './LiveRegion';
import { PlotNav } from './PlotNav';
import { ShockPanel } from './ShockPanel';
import { StoneFocusProxy } from './StoneFocusProxy';

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
 * Graveyard panels. Desktop: plot chips in one row under the REC line, shock panel wide at
 * the bottom centre. Under 900 px everything stacks below the stage. Mountable on its own.
 */
export function GraveyardHud({ loader }: GraveyardHudProps) {
  return (
    <div className="pointer-events-none relative z-[60] flex flex-col gap-3 p-3 min-[900px]:absolute min-[900px]:inset-0 min-[900px]:p-0">
      <div className="min-w-0 min-[900px]:absolute min-[900px]:top-14 min-[900px]:right-44 min-[900px]:left-3">
        <PlotNav />
      </div>
      <StoneFocusProxy />
      <div className="min-[900px]:absolute min-[900px]:bottom-14 min-[900px]:left-1/2 min-[900px]:w-[min(52rem,calc(100%-2rem))] min-[900px]:-translate-x-1/2">
        <ShockPanel />
      </div>
      <FileCard loader={loader} />
      <div className="min-[900px]:absolute min-[900px]:top-24 min-[900px]:left-3">
        <Notices />
      </div>
      <LiveRegion />
    </div>
  );
}
