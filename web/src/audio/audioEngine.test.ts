import { describe, expect, it } from 'vitest';
import {
  createAudioEngine,
  type AudioContextLike,
  type GainNodeLike,
  type SourceNodeLike,
} from './audioEngine';

class FakeCtx implements AudioContextLike {
  state = 'running';
  currentTime = 0;
  destination = {};
  closed = false;
  sources: (SourceNodeLike & { started: number; stopped: number })[] = [];
  gains: (GainNodeLike & { targets: number[] })[] = [];
  failDecodeFor = 0;
  decodeCalls = 0;
  createGain(): GainNodeLike & { targets: number[] } {
    const g = {
      targets: [] as number[],
      gain: {
        value: 1,
        setTargetAtTime: (t: number) => {
          g.targets.push(t);
        },
        cancelScheduledValues: () => undefined,
      },
      connect: () => undefined,
      disconnect: () => undefined,
    };
    this.gains.push(g);
    return g;
  }
  createBufferSource(): SourceNodeLike & { started: number; stopped: number } {
    const s = {
      buffer: null as unknown,
      loop: false,
      started: 0,
      stopped: 0,
      start: () => {
        s.started++;
      },
      stop: () => {
        s.stopped++;
      },
      connect: () => undefined,
      disconnect: () => undefined,
    };
    this.sources.push(s);
    return s;
  }
  decodeAudioData(): Promise<{ duration: number }> {
    this.decodeCalls++;
    if (this.decodeCalls === this.failDecodeFor) return Promise.reject(new Error('bad'));
    return Promise.resolve({ duration: 10 });
  }
  resume(): Promise<void> {
    return Promise.resolve();
  }
  close(): Promise<void> {
    this.closed = true;
    return Promise.resolve();
  }
}

function setup(over: { failDecodeFor?: number; sound?: boolean } = {}) {
  const target = new EventTarget();
  const timers = new Map<number, { fn: () => void; ms: number }>();
  let nextId = 1;
  let created = 0;
  const ctx = new FakeCtx();
  ctx.failDecodeFor = over.failDecodeFor ?? 0;
  const engine = createAudioEngine({
    createContext: () => {
      created++;
      return ctx;
    },
    fetch: () =>
      Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)) }),
    setTimeout: (fn, ms) => {
      const id = nextId++;
      timers.set(id, { fn, ms });
      return id;
    },
    clearTimeout: (id) => {
      timers.delete(id as number);
    },
    rand: () => 0.5,
    canPlay: () => 'probably',
    gateTarget: {
      addEventListener: (t, f, o) => target.addEventListener(t, f, o),
      removeEventListener: (t, f, o) => target.removeEventListener(t, f, o),
    },
    sound: over.sound,
  });
  const flush = async (): Promise<void> => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  };
  return { engine, ctx, target, timers, flush, created: () => created };
}

describe('audioEngine', () => {
  it('creates no context before the gate and ignores pointermove', async () => {
    const s = setup();
    s.target.dispatchEvent(new Event('pointermove'));
    s.target.dispatchEvent(new Event('mousemove'));
    s.target.dispatchEvent(new Event('wheel'));
    await s.flush();
    expect(s.created()).toBe(0);
    expect(s.engine.hasContext()).toBe(false);
    s.engine.playDig();
    expect(s.ctx.sources).toHaveLength(0);
  });

  it('keydown opens the gate, starts the wind loop and arms the crow timer', async () => {
    const s = setup();
    s.target.dispatchEvent(new Event('keydown'));
    await s.flush();
    expect(s.created()).toBe(1);
    const looping = s.ctx.sources.filter((x) => x.loop);
    expect(looping).toHaveLength(1);
    expect(looping[0]?.started).toBe(1);
    expect([...s.timers.values()].map((t) => t.ms)).toEqual([40000]);
    s.target.dispatchEvent(new Event('keydown'));
    expect(s.created()).toBe(1);
  });

  it('mute silences within 50 ms, stops wind and cancels the timer', async () => {
    const s = setup();
    s.target.dispatchEvent(new Event('pointerdown'));
    await s.flush();
    s.engine.setSound(false);
    const master = s.ctx.gains[0];
    expect(master?.targets).toEqual([0]);
    // 5 time constants of 10 ms: below 1% of the original level at 50 ms.
    expect(Math.exp(-50 / 10)).toBeLessThan(0.01);
    expect(s.ctx.sources.find((x) => x.loop)?.stopped).toBe(1);
    expect(s.timers.size).toBe(0);
  });

  it('drops a dig while muted and does not replay it after unmute', async () => {
    const s = setup();
    s.target.dispatchEvent(new Event('touchstart'));
    await s.flush();
    const before = s.ctx.sources.length;
    s.engine.setSound(false);
    s.engine.playDig();
    expect(s.ctx.sources).toHaveLength(before);
    s.engine.setSound(true);
    const oneShots = s.ctx.sources.filter((x) => !x.loop);
    expect(oneShots).toHaveLength(0);
    expect(s.ctx.sources.filter((x) => x.loop && x.started === 1 && x.stopped === 0)).toHaveLength(
      1,
    );
    expect(s.timers.size).toBe(1);
    s.engine.playDig();
    expect(s.ctx.sources.filter((x) => !x.loop)).toHaveLength(1);
  });

  it('dispose stops sources, closes the context, removes the gate and clears timers', async () => {
    const s = setup();
    s.target.dispatchEvent(new Event('keydown'));
    await s.flush();
    s.engine.dispose();
    expect(s.ctx.closed).toBe(true);
    expect(s.ctx.sources.find((x) => x.loop)?.stopped).toBe(1);
    expect(s.timers.size).toBe(0);
    s.engine.playLeave();
    expect(s.ctx.sources.filter((x) => !x.loop)).toHaveLength(0);

    const t = setup();
    t.engine.dispose();
    t.target.dispatchEvent(new Event('keydown'));
    expect(t.created()).toBe(0);
  });

  it('skips a sound whose decode fails and keeps the others working', async () => {
    const s = setup({ failDecodeFor: 3 }); // third decode = digging
    s.target.dispatchEvent(new Event('keydown'));
    await s.flush();
    expect(s.ctx.sources.filter((x) => x.loop)).toHaveLength(1);
    s.engine.playDig();
    expect(s.ctx.sources.filter((x) => !x.loop)).toHaveLength(0);
    s.engine.playLeave();
    expect(s.ctx.sources.filter((x) => !x.loop)).toHaveLength(1);
  });

  it('reports blocked playback and retries on resume()', async () => {
    const s = setup();
    s.ctx.state = 'suspended';
    s.target.dispatchEvent(new Event('keydown'));
    await s.flush();
    expect(s.engine.isBlocked()).toBe(true);
    expect(s.ctx.sources.filter((x) => x.loop)).toHaveLength(0);
    s.ctx.state = 'running';
    await s.engine.resume();
    expect(s.engine.isBlocked()).toBe(false);
    expect(s.ctx.sources.filter((x) => x.loop)).toHaveLength(1);
  });
});
