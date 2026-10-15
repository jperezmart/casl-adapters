import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // The Pages Router on the Node runtime only (the Edge runtime is out of
  // scope), and bundled by Next.js into the app's pages and API routes.
  platform: 'node',
  target: 'es2022',
  // Keep .js (ESM) + .cjs (CJS) to match the package.json `exports` map.
  fixedExtension: false,
  // @casl/ability, @jperezmart/casl-core, next and react are peers →
  // auto-externalized, never bundled.
});
