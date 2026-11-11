import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { useStore } from '../state/store';
import { hasWebGL } from './webgl';

const STAGE_BACKGROUND = '#05070A';

interface ScenePlaceholderProps {
  /** Placeholder label, for example "Graveyard scene placeholder". */
  label: string;
}

/**
 * Empty full-screen canvas with an HTML label outside it.
 * Reads only from the store. Unmounting releases the WebGL context (R3F disposes the renderer).
 */
export default function ScenePlaceholder({ label }: ScenePlaceholderProps) {
  const lowQuality = useStore((s) => s.settings.lowQuality);
  const webgl = useMemo(() => hasWebGL(), []);
  const text = lowQuality ? `${label} Low quality` : label;

  return (
    <div className="fixed inset-0" style={{ background: STAGE_BACKGROUND }}>
      {webgl ? (
        <Canvas
          frameloop="demand"
          gl={{ antialias: !lowQuality }}
          style={{ background: STAGE_BACKGROUND }}
          aria-hidden="true"
        />
      ) : null}
      <div className="pointer-events-none absolute bottom-16 left-4 font-mono text-sm text-text-2">
        <p>{text}</p>
        {webgl ? null : <p role="status">3D view unavailable. Use Table view.</p>}
      </div>
    </div>
  );
}
