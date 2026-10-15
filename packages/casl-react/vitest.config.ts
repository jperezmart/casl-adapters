import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    typecheck: {
      enabled: true,
      include: ['src/**/*.test-d.{ts,tsx}'],
    },
  },
});
