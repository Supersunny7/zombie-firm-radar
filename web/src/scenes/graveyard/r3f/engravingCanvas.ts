/**
 * Canvas side of the engravings (design Section 5): font loading with a cap and the 2D
 * drawing of one stone face. No three or React imports.
 */
import type { FirmStatus } from '../../../types/data';
import { engravingText, type EngravingInput } from '../model/engravingText';

export const TEX_W = 256;
export const TEX_H = 384;
export const FONT_CAP_MS = 300;

const SERIF_FAMILY = '"Cormorant Garamond", Georgia, serif';
const MONO_FAMILY = '"JetBrains Mono", ui-monospace, monospace';
const INK = '#14110f';
const EDGE = 'rgba(230, 226, 214, 0.3)';
const MARGIN = 20;

let fontsPromise: Promise<void> | null = null;

/**
 * Loads Cormorant Garamond and JetBrains Mono, waiting at most 300 ms. After the cap the
 * generic serif/mono fallbacks are used (requirement 5.9). The result is cached.
 */
export function ensureEngravingFonts(capMs: number = FONT_CAP_MS): Promise<void> {
  fontsPromise ??= (async () => {
    const fonts = typeof document === 'undefined' ? undefined : document.fonts;
    if (!fonts || typeof fonts.load !== 'function') return;
    const load = Promise.all([
      fonts.load(`600 28px "Cormorant Garamond"`),
      fonts.load(`500 20px "JetBrains Mono"`),
    ]).then(
      () => undefined,
      () => undefined,
    );
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cap = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, capMs);
    });
    await Promise.race([load, cap]);
    clearTimeout(timer);
  })();
  return fontsPromise;
}

export interface EngravingContent extends EngravingInput {
  status: FirmStatus;
}

export function clearEngraving(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, TEX_W, TEX_H);
}

/** Carved look: a light edge offset by one pixel under dark ink. */
function carve(ctx: CanvasRenderingContext2D, draw: () => void): void {
  ctx.save();
  ctx.translate(1, 1);
  ctx.fillStyle = EDGE;
  ctx.strokeStyle = EDGE;
  draw();
  ctx.restore();
  ctx.fillStyle = INK;
  ctx.strokeStyle = INK;
  draw();
}

/** Fixed jagged line from the top to the bottom of the face; same for every firm. */
export const CRACK_POINTS: ReadonlyArray<readonly [number, number]> = [
  [150, 14],
  [128, 92],
  [158, 150],
  [118, 214],
  [146, 276],
  [112, 336],
  [130, 372],
];

/** Draws name, year and ICR text (and a crack for endangered firms) on a transparent canvas. */
export function drawEngraving(ctx: CanvasRenderingContext2D, content: EngravingContent): void {
  clearEngraving(ctx);
  const layout = engravingText(content, TEX_W - 2 * MARGIN);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = TEX_W / 2;

  // Small cross above the name.
  carve(ctx, () => {
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, 40);
    ctx.lineTo(cx, 84);
    ctx.moveTo(cx - 14, 54);
    ctx.lineTo(cx + 14, 54);
    ctx.stroke();
  });

  const lineH = layout.namePx * 1.15;
  const nameTop = 130;
  layout.nameLines.forEach((line, i) => {
    carve(ctx, () => {
      ctx.font = `600 ${layout.namePx}px ${SERIF_FAMILY}`;
      ctx.fillText(line, cx, nameTop + i * lineH, TEX_W - 2 * MARGIN);
    });
  });

  const monoTop = nameTop + 2 * lineH + 28;
  carve(ctx, () => {
    ctx.font = `500 20px ${MONO_FAMILY}`;
    ctx.fillText(layout.year, cx, monoTop, TEX_W - 2 * MARGIN);
    ctx.fillText(layout.icrText, cx, monoTop + 34, TEX_W - 2 * MARGIN);
  });

  if (content.status === 'endangered') {
    carve(ctx, () => {
      ctx.lineWidth = 3;
      ctx.lineJoin = 'miter';
      ctx.beginPath();
      CRACK_POINTS.forEach(([x, y], i) => {
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
  }
}
