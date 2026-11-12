import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import './index.css';
import App from './App';

if (import.meta.env.DEV && new URLSearchParams(location.search).get('view') === 'hand-closeup') {
  await import('./dev/handCloseup/mount');
}
const root = document.getElementById('root');
if (root && !document.body.dataset.zfr) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
