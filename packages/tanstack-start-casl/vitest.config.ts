import { defineConfig } from 'vitest/config';

// Server functions and server routes only run inside Start's runtime, so the
// Adapter's behaviour is tested over HTTP against the example apps
// (apps/tanstack-start, apps/tanstack-start-orpc). Here: that the root stays
// client-safe, and the type tests of
// the context the middleware adds.
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
