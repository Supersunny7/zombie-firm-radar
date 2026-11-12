import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

/**
 * Error boundary for one model. A failed model renders nothing and the rest of the scene
 * keeps going. `onError` lets the caller raise a HUD notice.
 */
export class ModelBoundary extends Component<
  { children: ReactNode; name?: string; onError?: (error: Error) => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.warn(
        `[graveyard] model "${this.props.name ?? '?'}" failed`,
        error,
        info.componentStack,
      );
    }
    this.props.onError?.(error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
