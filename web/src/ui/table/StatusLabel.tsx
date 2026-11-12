import type { FirmStatus } from '../../types/data';

import { statusLabel } from './format';

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
