import { beforeEach, describe, expect, it } from 'vitest';
import { initialMachine } from './machine';
import { DEFAULT_SETTINGS } from './settings';
import { readSettings, SETTINGS_KEY } from './settingsStorage';
import { effectiveReducedMotion, useStore } from './store';

const CIK = '0000012345';

function resetStore(): void {
  window.localStorage.clear();
  useStore.setState({
    machine: initialMachine(),
    settings: { ...DEFAULT_SETTINGS },
    overlay: 'none',
    lastRejection: null,
    systemReducedMotion: false,
  });
  // setState above replaced settings and triggered a write; start storage clean.
  window.localStorage.clear();
}

beforeEach(resetStore);

describe('overlay', () => {
  it('toggles and closes without replacing the machine reference', () => {
    const before = useStore.getState().machine;
    useStore.getState().toggleOverlay();
    expect(useStore.getState().overlay).toBe('table');
    expect(useStore.getState().machine).toBe(before);
    useStore.getState().toggleOverlay();
    expect(useStore.getState().overlay).toBe('none');
    useStore.getState().toggleOverlay();
    useStore.getState().closeOverlay();
    expect(useStore.getState().overlay).toBe('none');
    expect(useStore.getState().machine).toBe(before);
  });
});

describe('actions route through transition', () => {
  it('selectFirm moves graveyard to capture', () => {
    const out = useStore.getState().selectFirm(CIK);
    expect(out.ok).toBe(true);
    const { machine, lastRejection } = useStore.getState();
    expect(machine.state).toBe('capture');
    expect(machine.ctx.cik).toBe(CIK);
    expect(lastRejection).toBeNull();
  });

  it('setRateShock updates the context in any state', () => {
    expect(useStore.getState().setRateShock(0.02).ok).toBe(true);
    expect(useStore.getState().machine.ctx.rateShock).toBe(0.02);
  });

  it('setTreatment and setResult work in the lab', () => {
    const s = useStore.getState();
    s.send({ type: 'selectFirm', cik: CIK });
    s.send({ type: 'captureDone' });
    expect(s.setTreatment([{ name: 'cut_costs', params: { c: 0.05 } }]).ok).toBe(true);
    expect(s.setResult('revived').ok).toBe(true);
    const { machine } = useStore.getState();
    expect(machine.state).toBe('lab');
    expect(machine.ctx.treatment).toHaveLength(1);
    expect(machine.ctx.result).toBe('revived');
  });

  it('send applies a valid event and clears a previous rejection', () => {
    useStore.getState().send({ type: 'continue' });
    expect(useStore.getState().lastRejection).not.toBeNull();
    useStore.getState().send({ type: 'selectFirm', cik: CIK });
    expect(useStore.getState().lastRejection).toBeNull();
    expect(useStore.getState().machine.state).toBe('capture');
  });

  it('rejected events leave the machine unchanged and set lastRejection', () => {
    const before = useStore.getState().machine;
    const cases: [() => unknown, string][] = [
      [() => useStore.getState().selectFirm('123'), 'selectFirm'],
      [() => useStore.getState().setRateShock(0.5), 'setRateShock'],
      [() => useStore.getState().setTreatment([]), 'setTreatment'],
      [() => useStore.getState().setResult('revived'), 'setResult'],
      [() => useStore.getState().send({ type: 'captureDone' }), 'captureDone'],
    ];
    for (const [run, type] of cases) {
      const out = run() as { ok: boolean };
      expect(out.ok).toBe(false);
      expect(useStore.getState().machine).toBe(before);
      expect(useStore.getState().lastRejection?.event).toBe(type);
      expect(useStore.getState().lastRejection?.state).toBe('graveyard');
    }
  });
});

describe('reduced motion', () => {
  it('follows the media query until set explicitly', () => {
    const eff = () => effectiveReducedMotion(useStore.getState());
    expect(eff()).toBe(false);
    useStore.getState().setSystemReducedMotion(true);
    expect(eff()).toBe(true);
    useStore.getState().setSystemReducedMotion(false);
    expect(eff()).toBe(false);
  });

  it('an explicit setting overrides the media query both ways', () => {
    const eff = () => effectiveReducedMotion(useStore.getState());
    useStore.getState().setSystemReducedMotion(true);
    useStore.getState().setSetting('reducedMotion', false);
    expect(eff()).toBe(false);
    useStore.getState().setSystemReducedMotion(false);
    useStore.getState().setSetting('reducedMotion', true);
    expect(eff()).toBe(true);
  });

  it('returning to null follows the media query again', () => {
    useStore.getState().setSetting('reducedMotion', false);
    useStore.getState().setSystemReducedMotion(true);
    useStore.getState().setSetting('reducedMotion', null);
    expect(effectiveReducedMotion(useStore.getState())).toBe(true);
  });
});

describe('settings persistence', () => {
  it('writes to storage when a setting changes', () => {
    useStore.getState().setSetting('lights', 'on');
    useStore.getState().setSetting('lowQuality', true);
    expect(window.localStorage.getItem(SETTINGS_KEY)).not.toBeNull();
    expect(readSettings()).toEqual({ ...DEFAULT_SETTINGS, lights: 'on', lowQuality: true });
  });

  it('persists an explicit reducedMotion value', () => {
    useStore.getState().setSetting('reducedMotion', true);
    expect(readSettings().reducedMotion).toBe(true);
  });

  it('does not write when unrelated state changes', () => {
    useStore.getState().toggleOverlay();
    useStore.getState().setSystemReducedMotion(true);
    expect(window.localStorage.getItem(SETTINGS_KEY)).toBeNull();
  });
});
