import { createRoot } from 'react-dom/client';
import { HAND_CLOSEUP_MARKER, HandCloseup, parseAngle } from './HandCloseup';

const root = document.getElementById('root');
if (root) {
  document.body.dataset.zfr = HAND_CLOSEUP_MARKER;
  const angle = parseAngle(new URLSearchParams(location.search).get('angle'));
  createRoot(root).render(<HandCloseup angle={angle} />);
}
