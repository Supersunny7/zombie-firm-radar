import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { bundledFfmpegPath, convertAudio, buildArgs } from './convert-audio.mjs';

const ffmpeg = bundledFfmpegPath();
let tmp;
let wav;
const sha = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');

beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'convert-audio-'));
  wav = path.join(tmp, 'tone.wav');
  const r = spawnSync(ffmpeg, ['-nostdin', '-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', wav], { stdio: 'ignore' });
  expect(r.status).toBe(0);
});
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe('convertAudio', () => {
  it('writes both .ogg and .mp3 and leaves no staging folder', async () => {
    const outDir = path.join(tmp, 'out1');
    const res = await convertAudio({ input: wav, outDir, name: 'tone' });
    expect(res.files.map((f) => path.basename(f.path)).sort()).toEqual(['tone.mp3', 'tone.ogg']);
    expect(res.files.every((f) => f.bytes > 0)).toBe(true);
    expect(res.warnings).toEqual([]);
    expect(fs.readdirSync(outDir).sort()).toEqual(['tone.mp3', 'tone.ogg']);
    expect(fs.readFileSync(path.join(outDir, 'tone.ogg')).subarray(0, 4).toString()).toBe('OggS');
  });

  it('is byte-identical across runs and carries no encoder tags', async () => {
    const a = path.join(tmp, 'runA');
    const b = path.join(tmp, 'runB');
    await convertAudio({ input: wav, outDir: a, name: 'tone' });
    await convertAudio({ input: wav, outDir: b, name: 'tone' });
    for (const ext of ['ogg', 'mp3']) expect(sha(path.join(a, `tone.${ext}`))).toBe(sha(path.join(b, `tone.${ext}`)));
    const mp3 = fs.readFileSync(path.join(a, 'tone.mp3')).toString('latin1');
    expect(mp3.startsWith('ID3')).toBe(false);
    expect(mp3).not.toContain('Lavf');
    expect(fs.readFileSync(path.join(a, 'tone.ogg')).toString('latin1')).not.toContain('Lavf');
  });

  it('trims the source to the requested duration', async () => {
    const full = await convertAudio({ input: wav, outDir: path.join(tmp, 'full'), name: 't' });
    const cut = await convertAudio({ input: wav, outDir: path.join(tmp, 'cut'), name: 't', trim: { startSeconds: 0.2, durationSeconds: 0.3 } });
    const size = (r, ext) => r.files.find((f) => f.path.endsWith(ext)).bytes;
    expect(size(cut, '.mp3')).toBeLessThan(size(full, '.mp3'));
    expect(size(cut, '.ogg')).toBeLessThan(size(full, '.ogg'));
  });

  it('leaves no output when the source is not decodable', async () => {
    const bad = path.join(tmp, 'bad.wav');
    fs.writeFileSync(bad, 'not audio');
    const outDir = path.join(tmp, 'out-bad');
    await expect(convertAudio({ input: bad, outDir, name: 'bad' })).rejects.toMatchObject({ code: 'FfmpegFailed' });
    expect(fs.readdirSync(outDir)).toEqual([]);
  });

  it('reports a missing source and invalid parameters as typed errors', async () => {
    await expect(convertAudio({ input: path.join(tmp, 'nope.wav'), outDir: path.join(tmp, 'o'), name: 'x' })).rejects.toMatchObject({ code: 'InputMissing' });
    await expect(convertAudio({ input: wav, outDir: path.join(tmp, 'o'), name: '../x' })).rejects.toMatchObject({ code: 'InvalidName' });
    await expect(convertAudio({ input: wav, outDir: path.join(tmp, 'o'), name: 'x', trim: { durationSeconds: 0 } })).rejects.toMatchObject({ code: 'InvalidTrim' });
  });

  it('gives a clear message and no fallback when an encoder is missing', async () => {
    const calls = [];
    const spawnFn = (cmd) => {
      calls.push(cmd);
      const handlers = {};
      const stderr = { on: (ev, fn) => { if (ev === 'data') setImmediate(() => fn('Unknown encoder \'libvorbis\'')); } };
      setImmediate(() => setImmediate(() => handlers.close?.(1)));
      return { stderr, on: (ev, fn) => { handlers[ev] = fn; } };
    };
    const outDir = path.join(tmp, 'out-missing');
    await expect(convertAudio({ input: wav, outDir, name: 'x', ffmpegPath: ffmpeg, spawnFn }))
      .rejects.toMatchObject({ code: 'MissingCodec', message: expect.stringContaining('No system ffmpeg fallback') });
    expect(calls).toEqual([ffmpeg]);
    expect(fs.readdirSync(outDir)).toEqual([]);
  });

  it('builds argument arrays with bitexact flags and no metadata', () => {
    const a = buildArgs({ input: 'in.wav', oggPath: 'o.ogg', mp3Path: 'o.mp3' });
    for (const args of [a.ogg, a.mp3]) {
      expect(args).toEqual(expect.arrayContaining(['-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact']));
    }
    expect(a.ogg).toContain('libvorbis');
    expect(a.mp3).toEqual(expect.arrayContaining(['libmp3lame', '-id3v2_version', '0', '-write_xing', '0']));
  });
});
