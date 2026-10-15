import { defineConfig } from 'tsdown';

export default defineConfig({
  // Two entries: the default barrel is client-safe (types and detection),
  // while `./server` carries the Role permissions.
  entry: ['src/index.ts', 'src/server.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  platform: 'neutral',
  target: 'es2022',
  fixedExtension: false,
});
