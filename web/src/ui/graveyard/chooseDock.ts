export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Viewport {
  readonly width: number;
  readonly height: number;
}

export type Dock = 'right' | 'bottom';

export const CARD_WIDTH = 320;
export const CARD_STRIP_WIDTH = 480;
export const CARD_STRIP_HEIGHT = 260;

/** Screen rectangle each dock occupies; right is a full-height column, bottom a strip bottom-left. */
export function dockRect(dock: Dock, vp: Viewport): Rect {
  if (dock === 'right') {
    const w = Math.min(CARD_WIDTH, vp.width);
    return { x: vp.width - w, y: 0, width: w, height: vp.height };
  }
  const h = Math.min(CARD_STRIP_HEIGHT, vp.height);
  return { x: 0, y: vp.height - h, width: Math.min(CARD_STRIP_WIDTH, vp.width), height: h };
}

/** Intersection area of two rectangles (0 when they only touch or are apart). */
export function overlapArea(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

/**
 * Picks the edge the card docks to. Right by default; bottom when the stone's projected
 * rectangle meets the right column and the bottom strip overlaps it less. With no stone
 * rectangle the default is right. Ties keep right.
 */
export function chooseDock(stone: Rect | null, vp: Viewport): Dock {
  if (stone === null) return 'right';
  const right = overlapArea(stone, dockRect('right', vp));
  if (right === 0) return 'right';
  const bottom = overlapArea(stone, dockRect('bottom', vp));
  return bottom < right ? 'bottom' : 'right';
}
