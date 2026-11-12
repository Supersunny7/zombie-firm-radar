import { useStore } from '../../state/store';

const btn =
  'rounded-panel border border-panel-border bg-panel px-3 py-1 text-sm text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text';

/** HUD sound toggle. Shows "Sound off" while the browser blocks audio. */
export function SoundButton() {
  const sound = useStore((s) => s.settings.sound);
  const audioBlocked = useStore((s) => s.audioBlocked);
  const setSetting = useStore((s) => s.setSetting);
  const effective = sound && !audioBlocked;

  return (
    <button type="button" className={btn} onClick={() => setSetting('sound', !sound)}>
      {effective ? 'Sound on' : 'Sound off'}
    </button>
  );
}
