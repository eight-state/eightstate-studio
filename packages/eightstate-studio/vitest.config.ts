import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const playgroundRoot = path.resolve(packageRoot, '../playground');

export default defineConfig({
  resolve: {
    alias: [
      { find: '@', replacement: path.join(playgroundRoot, 'src') },
      {
        find: '@eightstate/upstream-studio-config',
        replacement: path.join(playgroundRoot, 'src/domains/configuration/context/studio-config-state.ts'),
      },
      { find: 'react', replacement: path.join(playgroundRoot, 'node_modules/react') },
      { find: 'react-dom', replacement: path.join(playgroundRoot, 'node_modules/react-dom') },
    ],
  },
  test: {
    name: 'unit:packages/eightstate-studio',
    environment: 'jsdom',
    setupFiles: [path.join(playgroundRoot, 'vitest.setup.ts')],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**'],
  },
});
