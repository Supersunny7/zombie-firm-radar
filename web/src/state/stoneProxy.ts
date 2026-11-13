/** Marker attribute so other modules can tell whether the stone focus proxy is the active element. */
export const STONE_PROXY_ATTR = 'data-stone-proxy';

/** True while the stone focus proxy holds DOM focus (keyboard is driving the scene). */
export function isStoneProxyActive(): boolean {
  const el = document.activeElement;
  return el instanceof HTMLElement && el.hasAttribute(STONE_PROXY_ATTR);
}
