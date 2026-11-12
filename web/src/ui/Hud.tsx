import type { ReactNode } from 'react';
import { useStore } from '../state/store';
import { Clock } from './Clock';
import { LightsButton } from './controls/LightsButton';
import { SoundButton } from './controls/SoundButton';
import { SettingsMenu } from './SettingsMenu';
import { SkipLink, TABLE_BUTTON_ID } from './SkipLink';
import { SkipSlot } from './SkipSlot';

const panel = 'rounded-panel border border-panel-border bg-panel';
const btn =
  'rounded-panel border border-panel-border bg-panel px-3 py-1 text-sm text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text';

export const FOOTER_TEXT = 'Data: SEC EDGAR. Not investment advice.';

/**
 * Frame around the stage. Panels dock to the top-left, right and bottom edges and
 * never cover the center; below 900px they stack under the stage.
 */
export function Hud({ children }: { children?: ReactNode }) {
  const source = useStore((s) => s.data?.source ?? null);
  const toggleOverlay = useStore((s) => s.toggleOverlay);
  const dataLabel =
    source === 'mock'
      ? 'Mock data'
      : source === 'fixture' || source === 'sample'
        ? 'Sample data'
        : null;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col font-ui text-text max-[900px]:static max-[900px]:min-h-screen">
      <SkipLink />

      <header className="pointer-events-auto m-3 self-start">
        <div className={`${panel} flex items-center gap-3 px-3 py-2`}>
          <span aria-hidden="true" className="inline-block size-2.5 rounded-full bg-rec" />
          <span className="font-mono text-sm">REC · CAM 03</span>
          <Clock />
        </div>
      </header>

      {/* Stage spacer: keeps the center free; stage sits behind on desktop. */}
      <div className="flex-1 max-[900px]:h-[60vh] max-[900px]:flex-none">
        {children && <div className="pointer-events-auto">{children}</div>}
      </div>

      <aside
        aria-label="Controls"
        className="pointer-events-auto m-3 flex flex-wrap items-center justify-end gap-2 min-[901px]:absolute min-[901px]:top-3 min-[901px]:right-0 min-[901px]:flex-col min-[901px]:items-end"
      >
        <SkipSlot />
        <LightsButton />
        <SoundButton />
        <SettingsMenu />
        <button id={TABLE_BUTTON_ID} type="button" className={btn} onClick={toggleOverlay}>
          Table view
        </button>
        {dataLabel && (
          <span className={`${panel} border-status-endangered px-3 py-1 text-sm text-text`}>
            {dataLabel}
          </span>
        )}
      </aside>

      <footer className="pointer-events-auto relative z-[60] m-3 self-start">
        <p className={`${panel} px-3 py-1 text-sm text-text-2`}>{FOOTER_TEXT}</p>
      </footer>
    </div>
  );
}
