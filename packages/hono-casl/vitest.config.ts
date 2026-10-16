import { defineConfig } from 'vitest/config';

// The Adapter is tested through Hono's own public contract: an app built with
// it, driven with `app.request(…)`. The type tests cover the context typing.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    typecheck: {
      enabled: true,
      include: ['src/**/*.test-d.ts'],
    },
  },
});
