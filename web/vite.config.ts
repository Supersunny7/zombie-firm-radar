import { fileURLToPath } from 'node:url';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { dataPlugin } from './plugins/dataPlugin';

/** Repository root (parent of web): holds CREDITS.md and /data. */
export const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dataPlugin({ dataDir: fileURLToPath(new URL('../data', import.meta.url)) }),
  ],
  server: {
    fs: {
      // Setting allow replaces Vite's default, so the workspace root is listed too.
      // Repository root: CREDITS.md and /data. Workspace root: pnpm's node_modules store.
      allow: [REPO_ROOT, searchForWorkspaceRoot(process.cwd())],
    },
  },
  build: { manifest: true },
});
