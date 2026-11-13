// Audio engine for the graveyard (design Section 16, Requirement 16). Web Audio only: no React, no three.
// No AudioContext exists before the Interaction_Gate. Motion settings are never read (16.7).
import { ASSET_KEYS, assetUrl, pickAudioKey } from '../scenes/graveyard/assets';
import { nextCrowDelay } from './scheduler';

/** Minimal structural subset of the Web Audio API that the engine uses. */
export interface AudioParamLike {
  value: number;
  setTargetAtTime(target: number, startTime: number, timeConstant: number): unknown;
  cancelScheduledValues(startTime: number): unknown;
}
export interface AudioNodeLike {
  connect(dest: unknown): unknown;
  disconnect(): unknown;
}
export interface GainNodeLike extends AudioNodeLike {
  gain: AudioParamLike;
}
export interface SourceNodeLike extends AudioNodeLike {
  buffer: unknown;
  loop: boolean;
  loopStart?: number;
  loopEnd?: number;
  start(when?: number): unknown;
  stop(when?: number): unknown;
}
export interface AudioContextLike {
  readonly state: string;
  readonly currentTime: number;
  readonly destination: unknown;
  createGain(): GainNodeLike;
  createBufferSource(): SourceNodeLike;
  decodeAudioData(data: ArrayBuffer): Promise<{ duration: number }>;
  resume(): Promise<void>;
  close(): Promise<void>;
}
export interface FetchResponseLike {
  ok: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface GateTarget {
  addEventListener(type: string, fn: () => void, options?: boolean | { capture: boolean }): void;
  removeEventListener(type: string, fn: () => void, options?: boolean | { capture: boolean }): void;
}

export interface AudioEngineOptions {
  createContext?: () => AudioContextLike;
  fetch?: (url: string) => Promise<FetchResponseLike>;
  setTimeout?: (fn: () => void, ms: number) => unknown;
  clearTimeout?: (id: unknown) => void;
  rand?: () => number;
  canPlay?: (type: string) => string;
  /** Where the gate listeners go; defaults to window. */
  gateTarget?: GateTarget;
  /** Initial value of settings.sound (default true, 16.13). */
  sound?: boolean;
  onBlockedChange?: (blocked: boolean) => void;
}

export interface AudioEngine {
  /** Apply settings.sound. Callable before the gate (only stores the flag). */
  setSound(on: boolean): void;
  playDig(): void;
  playLeave(): void;
  /** Retry after blocked playback (16.12). */
  resume(): Promise<void>;
  isBlocked(): boolean;
  hasContext(): boolean;
  dispose(): void;
}

const GATE_EVENTS = ['pointerdown', 'touchstart', 'keydown'] as const;
const WIND_GAIN = 0.35;
const MUTE_TIME_CONSTANT = 0.01; // 5 time constants = 50 ms to silence
type SoundName = 'wind' | 'crows' | 'digging' | 'gate';
const SOUND_NAMES: readonly SoundName[] = ['wind', 'crows', 'digging', 'gate'];

export function createAudioEngine(opts: AudioEngineOptions = {}): AudioEngine {
  const createContext =
    opts.createContext ??
    ((): AudioContextLike => new AudioContext() as unknown as AudioContextLike);
  const doFetch = opts.fetch ?? ((url: string) => fetch(url) as Promise<FetchResponseLike>);
  const setT = opts.setTimeout ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
  const clearT = opts.clearTimeout ?? ((id: unknown) => clearTimeout(id as number));
  const rand = opts.rand ?? Math.random;
  const target: GateTarget | undefined =
    opts.gateTarget ?? (typeof window === 'undefined' ? undefined : window);

  let sound = opts.sound ?? true;
  let disposed = false;
  let ctx: AudioContextLike | null = null;
  let master: GainNodeLike | null = null;
  let blocked = false;
  let wind: { src: SourceNodeLike; gain: GainNodeLike } | null = null;
  let crowTimer: unknown = null;
  const buffers: Partial<Record<SoundName, unknown>> = {};

  const setBlocked = (b: boolean): void => {
    if (blocked === b) return;
    blocked = b;
    opts.onBlockedChange?.(b);
  };

  const active = (): boolean => !disposed && ctx !== null && sound && !blocked;

  function connectOut(node: AudioNodeLike): void {
    if (master) node.connect(master);
  }

  function playOnce(name: SoundName): void {
    if (!ctx || !master || !active()) return;
    const buffer = buffers[name];
    if (!buffer) return;
    try {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      connectOut(src);
      src.start();
    } catch {
      /* skipped silently */
    }
  }

  function startWind(): void {
    if (!ctx || !master || wind || !active()) return;
    const buffer = buffers.wind as { duration: number } | undefined;
    if (!buffer) return;
    try {
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = WIND_GAIN;
      src.buffer = buffer;
      src.loop = true;
      src.loopStart = 0;
      src.loopEnd = buffer.duration;
      src.connect(gain);
      connectOut(gain);
      src.start();
      wind = { src, gain };
    } catch {
      wind = null;
    }
  }

  function stopWind(): void {
    if (!wind) return;
    try {
      wind.src.stop();
      wind.src.disconnect();
      wind.gain.disconnect();
    } catch {
      /* ignore */
    }
    wind = null;
  }

  function cancelCrow(): void {
    if (crowTimer !== null) {
      clearT(crowTimer);
      crowTimer = null;
    }
  }

  function armCrow(): void {
    cancelCrow();
    if (!active()) return;
    crowTimer = setT(
      () => {
        crowTimer = null;
        if (!active()) return;
        playOnce('crows');
        armCrow();
      },
      nextCrowDelay(rand) * 1000,
    );
  }

  async function loadAll(context: AudioContextLike): Promise<void> {
    const results = await Promise.allSettled(
      SOUND_NAMES.map(async (name) => {
        const url = assetUrl(pickAudioKey(ASSET_KEYS.audio[name], opts.canPlay));
        if (url === null) throw new Error(`not in manifest: ${name}`);
        const res = await doFetch(url);
        if (!res.ok) throw new Error(`fetch failed: ${name}`);
        const decoded = await context.decodeAudioData(await res.arrayBuffer());
        return [name, decoded] as const;
      }),
    );
    if (disposed || ctx !== context) return;
    for (const r of results) {
      if (r.status === 'fulfilled') buffers[r.value[0]] = r.value[1];
      else console.debug('[audio] skipped a sound', r.reason);
    }
    startWind();
  }

  async function tryResume(context: AudioContextLike): Promise<void> {
    try {
      await context.resume();
    } catch {
      /* state check below decides */
    }
    if (disposed || ctx !== context) return;
    const nowBlocked = context.state === 'suspended';
    setBlocked(nowBlocked);
    if (!nowBlocked) {
      startWind();
      if (crowTimer === null) armCrow();
    }
  }

  function removeGate(): void {
    if (!target) return;
    for (const type of GATE_EVENTS) target.removeEventListener(type, onGate, true);
  }

  function onGate(): void {
    removeGate();
    if (disposed || ctx) return;
    try {
      ctx = createContext();
      master = ctx.createGain();
      master.gain.value = sound ? 1 : 0;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
      master = null;
      return;
    }
    const context = ctx;
    void tryResume(context); // called synchronously inside the user-activation event
    void loadAll(context);
    armCrow(); // the first crow interval starts at the gate
  }

  if (target) for (const type of GATE_EVENTS) target.addEventListener(type, onGate, true);

  return {
    setSound(on) {
      if (disposed || on === sound) return;
      sound = on;
      if (!ctx || !master) return;
      master.gain.cancelScheduledValues(ctx.currentTime);
      if (!on) {
        master.gain.setTargetAtTime(0, ctx.currentTime, MUTE_TIME_CONSTANT);
        stopWind();
        cancelCrow();
      } else {
        master.gain.value = 1;
        startWind();
        armCrow();
      }
    },
    playDig() {
      playOnce('digging');
    },
    playLeave() {
      playOnce('gate');
    },
    async resume() {
      if (disposed || !ctx) return;
      await tryResume(ctx);
    },
    isBlocked: () => blocked,
    hasContext: () => ctx !== null,
    dispose() {
      if (disposed) return;
      removeGate();
      stopWind();
      cancelCrow();
      disposed = true;
      const context = ctx;
      ctx = null;
      master = null;
      if (context) {
        try {
          void context.close().catch(() => undefined);
        } catch {
          /* ignore */
        }
      }
    },
  };
}
