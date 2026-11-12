import { describe, expect, it } from 'vitest';
import { chooseDock, dockRect, overlapArea } from './chooseDock';

const VP = { width: 1440, height: 900 };

describe('chooseDock', () => {
  it('defaults to right with no stone rect', () => {
    expect(chooseDock(null, VP)).toBe('right');
  });

  it('stays right when the stone is clear of the right column', () => {
    expect(chooseDock({ x: 400, y: 300, width: 100, height: 200 }, VP)).toBe('right');
  });

  it('moves to bottom when the stone sits under the right column', () => {
    expect(chooseDock({ x: 1200, y: 100, width: 100, height: 200 }, VP)).toBe('bottom');
  });

  it('keeps right when bottom would overlap more', () => {
    expect(chooseDock({ x: 100, y: 700, width: 100, height: 200 }, VP)).toBe('right');
    const stone = { x: 1200, y: 700, width: 200, height: 200 };
    const r = overlapArea(stone, dockRect('right', VP));
    const b = overlapArea(stone, dockRect('bottom', VP));
    expect(chooseDock(stone, VP)).toBe(b < r ? 'bottom' : 'right');
  });
});
