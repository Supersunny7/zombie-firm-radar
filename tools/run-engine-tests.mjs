// Runs the rescue-engine tests, or skips cleanly while the web app does not exist.
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

if (!existsSync('web/package.json')) {
  console.log('skipped: web/package.json not found');
  process.exit(0);
}
if (!existsSync('web/node_modules')) {
  console.log('skipped: web/node_modules not found (run pnpm install in web)');
  process.exit(0);
}
const r = spawnSync('pnpm --dir web exec vitest run src/engine', {
  stdio: 'inherit',
  shell: true,
});
process.exit(r.status ?? 1);
