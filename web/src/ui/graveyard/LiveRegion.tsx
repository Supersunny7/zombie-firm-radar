import { useStore } from '../../state/store';
import type { FirmStatus } from '../../types/data';
import { statusLabel } from '../table/format';

/** Sets the polite live message to "{name}, {status}". */
export function announce(firm: { name: string; status: FirmStatus }): void {
  useStore.getState().announce(`${firm.name}, ${statusLabel(firm.status).text}`);
}

/** Visually hidden polite live region for focus and selection announcements (Req 18.9). */
export function LiveRegion() {
  const message = useStore((s) => s.liveMessage);
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="graveyard-live-region"
      className="sr-only"
    >
      {message}
    </div>
  );
}

export default LiveRegion;
