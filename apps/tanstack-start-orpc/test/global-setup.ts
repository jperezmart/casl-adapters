import { fileURLToPath } from 'node:url';

import { createBuilder, preview } from 'vite';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    /** Origin of the example's production server, e.g. `http://localhost:41234`. */
    origin: string;
  }
}

/**
 * Builds the app and serves the production build on a free port: server
 * functions only run inside Start's runtime, so the suites drive the real
 * server over HTTP.
 */
export default async function setup(project: TestProject) {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const builder = await createBuilder({ root, logLevel: 'warn' });
  await builder.buildApp();

  const server = await preview({
    root,
    logLevel: 'warn',
    preview: { port: 0, strictPort: false, open: false },
  });
  const url = server.resolvedUrls?.local[0];
  if (!url) throw new Error('The preview server did not report its URL');
  project.provide('origin', new URL(url).origin);

  return () => server.close();
}
