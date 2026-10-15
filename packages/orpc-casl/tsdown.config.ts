import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // Runs wherever oRPC runs: a NestJS controller, a Next.js API route or a
  // TanStack Start server route.
  platform: 'neutral',
  target: 'es2022',
  // Keep .js (ESM) + .cjs (CJS) to match the package.json `exports` map.
  fixedExtension: false,
  // @casl/ability, @jperezmart/casl-core and @orpc/server are peers →
  // auto-externalized, never bundled.
});
