import { create } from 'zustand';
import type { LoadedData } from '../data/loader';
import type { Firm } from '../types/data';
import { initialMachine, transition } from './machine';
import type { GameEvent, Machine, Rejection, TransitionOutcome } from './types';
import { type Settings } from './settings';
import { readSettings, writeSettings } from './settingsStorage';
import { createGraveyardSlice, type GraveyardSlice } from './graveyard';

export type Overlay = 'none' | 'table';

export interface StoreState extends GraveyardSlice {
  machine: Machine;
  settings: Settings;
  overlay: Overlay;
  debugBar: boolean;
  data: LoadedData | null;
  firm: Firm | null;
  skipHandler: (() => void) | null;
  lastRejection: Rejection | null;
  /** Value of the `prefers-reduced-motion: reduce` media query, kept up to date by App. */
  systemReducedMotion: boolean;

  /** The only way to change `machine`. */
  send(e: GameEvent): TransitionOutcome;
  selectFirm(cik: unknown): TransitionOutcome;
  setRateShock(value: unknown): TransitionOutcome;
  setTreatment(treatment: unknown): TransitionOutcome;
  setResult(result: unknown): TransitionOutcome;
  setSetting<K extends keyof Settings>(k: K, v: Settings[K]): void;
  toggleOverlay(): void;
  closeOverlay(): void;
  toggleDebugBar(): void;
  setData(d: LoadedData): void;
  setFirm(f: Firm | null): void;
  registerSkip(fn: (() => void) | null): void;
  setSystemReducedMotion(v: boolean): void;
}

/** Debug bar is on in development, or in any build with `?debug=1`. */
export function initialDebugBar(isDev: boolean, search: string): boolean {
  return isDev || new URLSearchParams(search).get('debug') === '1';
}

/** Explicit user choice wins; otherwise follow the system media query. */
export const effectiveReducedMotion = (s: Pick<StoreState, 'settings' | 'systemReducedMotion'>) =>
  s.settings.reducedMotion ?? s.systemReducedMotion;

const IS_DEV = import.meta.env.DEV;

function currentSearch(): string {
  return typeof window === 'undefined' ? '' : window.location.search;
}

export const useStore = create<StoreState>()((set, get, api) => ({
  ...createGraveyardSlice(set, get, api),
  machine: initialMachine(),
  settings: readSettings(),
  overlay: 'none',
  debugBar: initialDebugBar(IS_DEV, currentSearch()),
  data: null,
  firm: null,
  skipHandler: null,
  lastRejection: null,
  systemReducedMotion: false,

  send(e) {
    const outcome = transition(get().machine, e);
    if (outcome.ok) {
      // Context-only events may return a new object; a rejected event keeps the old reference.
      set({ machine: outcome.machine, lastRejection: null });
    } else {
      if (IS_DEV) console.warn('[game-flow] rejected event', outcome.rejected);
      set({ lastRejection: outcome.rejected });
    }
    return outcome;
  },
  selectFirm: (cik) => get().send({ type: 'selectFirm', cik }),
  setRateShock: (value) => get().send({ type: 'setRateShock', value }),
  setTreatment: (treatment) => get().send({ type: 'setTreatment', treatment }),
  setResult: (result) => get().send({ type: 'setResult', result }),

  setSetting(k, v) {
    set((s) => ({ settings: { ...s.settings, [k]: v } }));
  },
  toggleOverlay: () => set((s) => ({ overlay: s.overlay === 'table' ? 'none' : 'table' })),
  closeOverlay: () => set({ overlay: 'none' }),
  toggleDebugBar: () => set((s) => ({ debugBar: !s.debugBar })),
  setData: (data) => set({ data }),
  setFirm: (firm) => set({ firm }),
  registerSkip: (skipHandler) => set({ skipHandler }),
  setSystemReducedMotion: (systemReducedMotion) => set({ systemReducedMotion }),
}));

// Persist settings whenever they change. A failed write is ignored.
useStore.subscribe((state, prev) => {
  if (state.settings !== prev.settings) writeSettings(state.settings);
});
