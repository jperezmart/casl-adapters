import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts', 'test/**/*.{test,spec}.ts'],
    // Randomize test order to keep the suite honest: each e2e test recreates the
    // app from a clean seed, so order must never matter. If a future change
    // couples tests, shuffling surfaces it here. Vitest prints the seed on
    // failure — reproduce with `vitest run --sequence.seed=<n>`.
    sequence: { shuffle: true },
  },
});
