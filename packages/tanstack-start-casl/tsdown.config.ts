import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/server.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // Imported by both bundles of a Start app: the middleware's server code is
  // only ever reached on the server, the error and its serialization adapter
  // on both sides.
  platform: 'neutral',
  target: 'es2022',
  // Keep .js (ESM) + .cjs (CJS) to match the package.json `exports` map.
  fixedExtension: false,
  // @casl/ability, @jperezmart/casl-core, @tanstack/react-router and
  // @tanstack/react-start are peers → auto-externalized, never bundled.
});
