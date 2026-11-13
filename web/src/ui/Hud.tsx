import type { ReactNode } from 'react';
import { overviewLabel, plotLabel } from '../scenes/graveyard/layout/camera';
import { useStore } from '../state/store';
import { useLayout } from '../state/useLayout';
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
  const { plots } = useLayout();
  const framedPlot = useStore((s) => s.framedPlot);
  const camLabel =
    plots.length === 0
      ? ''
      : framedPlot === 'overview'
        ? overviewLabel(plots.length)
        : plotLabel(plots, framedPlot);
  const dataLabel =
    source === 'mock'
      ? 'Mock data'
      : source === 'fixture' || source === 'sample'
        ? 'Sample data'
        : null;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col font-ui text-text max-[900px]:static max-[900px]:min-h-screen">
      <SkipLink />

      <header className="pointer-events-auto m-3 min-w-0 self-start min-[901px]:max-w-[calc(100vw-13rem)]">
        <div className={`${panel} flex min-w-0 items-center gap-3 px-3 py-2`}>
          <span aria-hidden="true" className="inline-block size-2.5 shrink-0 rounded-full bg-rec" />
          <span className="shrink-0 font-mono text-sm whitespace-nowrap">REC · CAM 03</span>
          {camLabel && (
            <span data-testid="cam-label" className="min-w-0 truncate font-mono text-sm">
              {`\u2014 ${camLabel}`}
            </span>
          )}
          <span className="shrink-0 whitespace-nowrap">
            <Clock />
          </span>
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
