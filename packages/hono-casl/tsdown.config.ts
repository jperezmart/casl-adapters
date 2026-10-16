import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // Hono runs on every JavaScript runtime (Node, Bun, Deno, Workers…), and so
  // does this Adapter: it only uses web standards and Hono's own exports.
  platform: 'neutral',
  target: 'es2022',
  // Keep .js (ESM) + .cjs (CJS) to match the package.json `exports` map.
  fixedExtension: false,
  // @casl/ability, @jperezmart/casl-core and hono are peers → auto-externalized,
  // never bundled.
});
