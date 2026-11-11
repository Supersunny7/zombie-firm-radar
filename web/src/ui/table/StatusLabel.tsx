import type { FirmStatus } from '../../types/data';

const LABELS: Record<FirmStatus, { text: string; glyph: string }> = {
  zombie: { text: 'Zombie', glyph: '✝' },
  endangered: { text: 'Endangered', glyph: '▲' },
  healthy: { text: 'Healthy', glyph: '●' },
  insufficient_data: { text: 'Not enough data', glyph: '○' },
};

/** Text and glyph for a status; the glyph never stands alone. */
export function statusLabel(s: FirmStatus): { text: string; glyph: string } {
  return LABELS[s];
}

const COLOR_CLASS: Record<FirmStatus, string> = {
  zombie: 'text-status-zombie',
  endangered: 'text-status-endangered',
  healthy: 'text-status-healthy',
  insufficient_data: 'text-status-insufficient',
};

export function StatusLabel({ status }: { status: FirmStatus }) {
  const { text, glyph } = statusLabel(status);
  return (
    <span className={`inline-flex items-center gap-1.5 ${COLOR_CLASS[status]}`}>
      <span aria-hidden="true">{glyph}</span>
      <span>{text}</span>
    </span>
  );
}
