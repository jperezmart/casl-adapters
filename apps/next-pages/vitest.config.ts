import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.{test,spec}.ts'],
    // Each suite boots Next.js's dev server, which compiles a route the first
    // time it is requested. Only one dev server may run per app directory (it
    // holds a lock), so the suites run one after another.
    fileParallelism: false,
    hookTimeout: 120_000,
    testTimeout: 60_000,
    // Randomize test order to keep the suite honest: each e2e test resets the
    // in-memory seed, so order must never matter. Vitest prints the seed on
    // failure — reproduce with `vitest run --sequence.seed=<n>`.
    sequence: { shuffle: true },
  },
});
