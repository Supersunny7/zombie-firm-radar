import { useId, useRef, useState } from 'react';
import { effectiveReducedMotion, useStore } from '../state/store';
import { CreditsDialog } from './CreditsDialog';
import { useFocusTrap } from './useFocusTrap';

const btn =
  'rounded-panel border border-panel-border bg-panel px-3 py-1 text-sm text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text';
const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text';

interface RowProps {
  label: string;
  checked: boolean;
  note?: string;
  onChange: (checked: boolean) => void;
}

function Row({ label, checked, note, onChange }: RowProps) {
  return (
    <label className="flex items-center gap-2 py-1 text-sm text-text">
      <input
        type="checkbox"
        className={`size-4 ${focusRing}`}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
      <span className="ml-auto font-mono text-text-2">{checked ? 'On' : 'Off'}</span>
      {note && <span className="text-xs text-text-2">{note}</span>}
    </label>
  );
}

/** HUD settings button with a dialog panel holding the four global settings. */
export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const creditsButtonRef = useRef<HTMLButtonElement>(null);
  const [creditsOpen, setCreditsOpen] = useState(false);

  const settings = useStore((s) => s.settings);
  const reducedMotion = useStore(effectiveReducedMotion);
  const setSetting = useStore((s) => s.setSetting);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const closeCredits = () => {
    setCreditsOpen(false);
    creditsButtonRef.current?.focus();
  };

  useFocusTrap(panelRef, { active: open, onEscape: close });

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        className={btn}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={() => (open ? close() : setOpen(true))}
      >
        Settings
      </button>
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label="Settings"
          className="absolute top-full right-0 z-20 mt-2 w-60 rounded-panel border border-panel-border bg-panel p-3"
        >
          <Row
            label="Lights on"
            checked={settings.lights === 'on'}
            onChange={(c) => setSetting('lights', c ? 'on' : 'off')}
          />
          <Row label="Sound" checked={settings.sound} onChange={(c) => setSetting('sound', c)} />
          <Row
            label="Low quality"
            checked={settings.lowQuality}
            onChange={(c) => setSetting('lowQuality', c)}
          />
          <Row
            label="Reduced motion"
            checked={reducedMotion}
            note={settings.reducedMotion === null ? 'Follow system' : undefined}
            onChange={(c) => setSetting('reducedMotion', c)}
          />
          <button
            ref={creditsButtonRef}
            type="button"
            className={`${btn} mt-2 w-full`}
            aria-haspopup="dialog"
            onClick={() => setCreditsOpen(true)}
          >
            Credits
          </button>
        </div>
      )}
      {creditsOpen && <CreditsDialog onClose={closeCredits} />}
    </div>
  );
}
