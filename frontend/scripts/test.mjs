// Load the test configuration directly, without bundling the app's Vite config.
import { startVitest } from 'vitest/node';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const context = await startVitest(
  'test',
  process.argv.slice(2),
  {
    root,
    config: false,
    run: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    pool: 'forks',
    minWorkers: 1,
    maxWorkers: 2,
  },
  { esbuild: { jsx: 'automatic' } },
);
if (context) await context.close();
else process.exitCode = 1;
