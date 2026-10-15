import { defineConfig } from 'tsdown';

export default defineConfig({
  // The `/tanstack-query` subpath is its own entry, so an app without
  // TanStack Query never imports it.
  entry: ['src/index.ts', 'src/tanstack-query.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  platform: 'browser',
  target: 'es2022',
  // Keep .js (ESM) + .cjs (CJS) to match the package.json `exports` map.
  fixedExtension: false,
  // react, @casl/ability, @jperezmart/casl-core and @tanstack/react-query
  // are peers → auto-externalized, never bundled.
});
