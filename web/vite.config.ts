import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { dataPlugin } from './plugins/dataPlugin';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dataPlugin({ dataDir: fileURLToPath(new URL('../data', import.meta.url)) }),
  ],
  build: { manifest: true },
});
