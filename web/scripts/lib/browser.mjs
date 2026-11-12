// Shared headed-Chrome launcher for the measurement and screenshot scripts.
import { chromium } from 'playwright';

/** Launch installed Google Chrome, headed. No fallback to bundled Chromium. */
export async function launchChrome() {
  return chromium.launch({ channel: 'chrome', headless: false });
}

/** Resolves true if the URL answers HTTP 200 within `timeoutMs` (default 10 s). */
export async function isReachable(url, timeoutMs = 10_000) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return res.status === 200;
  } catch {
    return false;
  }
}
