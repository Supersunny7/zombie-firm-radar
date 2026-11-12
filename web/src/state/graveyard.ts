import type { StateCreator } from 'zustand';

export type CardOpener = 'pointer' | 'keyboard' | 'table';

/**
 * Graveyard UI state. `rateShock` is not here: it stays in `machine.ctx.rateShock`
 * and is changed through `setRateShock`. `lights` and `sound` stay in `settings`.
 */
export interface GraveyardSlice {
  /** 0-based plot index, or 'overview'. */
  framedPlot: number | 'overview';
  hoveredCik: string | null;
  /** Keyboard focus on a stone. */
  focusedCik: string | null;
  /** Open File_Card. */
  cardCik: string | null;
  cardOpener: CardOpener | null;
  /** Polite live region text. */
  liveMessage: string;
  /** Non-blocking asset notices. */
  notices: string[];
  /** Browser refused to start audio. */
  audioBlocked: boolean;
  setFramedPlot(p: number | 'overview'): void;
  setHovered(cik: string | null): void;
  setFocused(cik: string | null): void;
  openCard(cik: string, by: CardOpener): void;
  closeCard(): void;
  announce(msg: string): void;
  pushNotice(msg: string): void;
  setAudioBlocked(v: boolean): void;
}

export const INITIAL_GRAVEYARD = {
  framedPlot: 0,
  hoveredCik: null,
  focusedCik: null,
  cardCik: null,
  cardOpener: null,
  liveMessage: '',
  notices: [] as string[],
  audioBlocked: false,
} as const;

export const createGraveyardSlice: StateCreator<GraveyardSlice, [], [], GraveyardSlice> = (
  set,
) => ({
  ...INITIAL_GRAVEYARD,
  notices: [],

  // Setters skip the update when nothing changes, so subscribers are not woken needlessly.
  setFramedPlot: (framedPlot) => set((s) => (s.framedPlot === framedPlot ? s : { framedPlot })),
  setHovered: (hoveredCik) => set((s) => (s.hoveredCik === hoveredCik ? s : { hoveredCik })),
  setFocused: (focusedCik) => set((s) => (s.focusedCik === focusedCik ? s : { focusedCik })),
  openCard: (cik, by) => set({ cardCik: cik, cardOpener: by }),
  closeCard: () => set({ cardCik: null }),
  announce: (liveMessage) => set({ liveMessage }),
  pushNotice: (msg) => set((s) => (s.notices.includes(msg) ? s : { notices: [...s.notices, msg] })),
  setAudioBlocked: (audioBlocked) =>
    set((s) => (s.audioBlocked === audioBlocked ? s : { audioBlocked })),
});
