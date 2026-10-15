import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // Framework-free and runtime-free: safe to import from Node, the edge or a
  // browser bundle.
  platform: 'neutral',
  target: 'es2022',
  // Keep .js (ESM) + .cjs (CJS) to match the package.json `exports` map.
  fixedExtension: false,
  // @casl/ability is a peer → auto-externalized, never bundled.
});
