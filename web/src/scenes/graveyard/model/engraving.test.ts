import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { deriveFaceAnchor } from './deriveFaceAnchor';
import { ELLIPSIS, engravingText, fitName, NAME_MIN_PX } from './engravingText';

/** Unindexed box with flat normals, centred at (cx, cy, cz). */
function box(w: number, h: number, d: number, cx = 0, cy = 0, cz = 0) {
  const pos: number[] = [];
  const nor: number[] = [];
  const hx = w / 2;
  const hy = h / 2;
  const hz = d / 2;
  const faces: [number[], number[][]][] = [
    [
      [0, 0, 1],
      [
        [-hx, -hy, hz],
        [hx, -hy, hz],
        [hx, hy, hz],
        [-hx, hy, hz],
      ],
    ],
    [
      [0, 0, -1],
      [
        [hx, -hy, -hz],
        [-hx, -hy, -hz],
        [-hx, hy, -hz],
        [hx, hy, -hz],
      ],
    ],
    [
      [1, 0, 0],
      [
        [hx, -hy, hz],
        [hx, -hy, -hz],
        [hx, hy, -hz],
        [hx, hy, hz],
      ],
    ],
    [
      [-1, 0, 0],
      [
        [-hx, -hy, -hz],
        [-hx, -hy, hz],
        [-hx, hy, hz],
        [-hx, hy, -hz],
      ],
    ],
    [
      [0, 1, 0],
      [
        [-hx, hy, hz],
        [hx, hy, hz],
        [hx, hy, -hz],
        [-hx, hy, -hz],
      ],
    ],
    [
      [0, -1, 0],
      [
        [-hx, -hy, -hz],
        [hx, -hy, -hz],
        [hx, -hy, hz],
        [-hx, -hy, hz],
      ],
    ],
  ];
  for (const [n, q] of faces) {
    for (const i of [0, 1, 2, 0, 2, 3]) {
      pos.push(q[i]![0]! + cx, q[i]![1]! + cy, q[i]![2]! + cz);
      nor.push(n[0]!, n[1]!, n[2]!);
    }
  }
  return { pos: new Float32Array(pos), nor: new Float32Array(nor) };
}

describe('deriveFaceAnchor', () => {
  it('finds the front of a box (property)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.2, max: 5, noNaN: true }),
        fc.double({ min: 0.2, max: 5, noNaN: true }),
        fc.double({ min: 0.2, max: 5, noNaN: true }),
        fc.double({ min: -3, max: 3, noNaN: true }),
        (w, h, d, cy) => {
          const b = box(w, h, d, 0, cy, 0);
          const a = deriveFaceAnchor(b.pos, b.nor);
          expect(a).not.toBeNull();
          expect(a!.size.width).toBeCloseTo(w, 3);
          expect(a!.size.height).toBeCloseTo(h, 3);
          expect(a!.centreY).toBeCloseTo(cy, 3);
          expect(Math.abs(a!.z)).toBeCloseTo(d / 2, 3);
        },
      ),
    );
  });

  it('reports frontSign -1 when only the back face is larger', () => {
    const b = box(1, 1, 1);
    // Shrink the +z face by collapsing its y extent a little (first 6 vertices).
    for (let i = 0; i < 6; i++) b.pos[i * 3 + 1] = b.pos[i * 3 + 1]! * 0.5;
    const a = deriveFaceAnchor(b.pos, b.nor);
    expect(a?.frontSign).toBe(-1);
    expect(a?.z).toBeCloseTo(-0.5);
  });

  it('works with an index buffer', () => {
    const pos = new Float32Array([-1, 0, 1, 1, 0, 1, 1, 2, 1, -1, 2, 1]);
    const nor = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]);
    const a = deriveFaceAnchor(pos, nor, new Uint16Array([0, 1, 2, 0, 2, 3]));
    expect(a).toMatchObject({ frontSign: 1, z: 1, centreY: 1 });
    expect(a?.size).toEqual({ width: 2, height: 2 });
  });

  it('returns null for a roof-only geometry', () => {
    const pos = new Float32Array([0, 0, 0, 1, 0, 0, 0, 0, 1]);
    const nor = new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0]);
    expect(deriveFaceAnchor(pos, nor)).toBeNull();
  });
});

describe('engravingText', () => {
  it('formats year and ICR', () => {
    const t = engravingText({ name: 'Ashgrove Works', firstFilingYear: 2001, icr: 0.5 }, 200);
    expect(t.year).toBe('2001');
    expect(t.icrText).toBe('ICR 0.50');
    expect(t.nameLines).toEqual(['Ashgrove Works']);
  });

  it('uses n/a for missing values', () => {
    const t = engravingText({ name: 'X', firstFilingYear: null, icr: null }, 200);
    expect(t.icrText).toBe('ICR n/a');
    expect(t.year).toBe('n/a');
  });

  it('wraps and shrinks long names, is deterministic, and never exceeds two lines', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 120 }), fc.integer({ min: 60, max: 300 }), (name, w) => {
        const a = fitName(name, w);
        expect(a).toEqual(fitName(name, w));
        expect(a.lines.length).toBeLessThanOrEqual(2);
        expect(a.px).toBeGreaterThanOrEqual(NAME_MIN_PX);
      }),
    );
  });

  it('truncates with an ellipsis when nothing fits', () => {
    const { lines, px } = fitName(
      'Extraordinarily Long Holdings International Corporation Group',
      120,
    );
    expect(px).toBe(NAME_MIN_PX);
    expect(lines[lines.length - 1]!.endsWith(ELLIPSIS)).toBe(true);
  });
});
