import { defineConfig } from 'vitest/config';

// Vitest reads this file instead of vite.config.ts: the Start plugin builds
// the app (in test/global-setup.ts), not the tests.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.{test,spec}.ts'],
    globalSetup: ['test/global-setup.ts'],
    hookTimeout: 120_000,
  },
});
