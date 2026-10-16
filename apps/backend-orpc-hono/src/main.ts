import { serve } from '@hono/node-server';

import { createApp } from './app.ts';

// 3004 by default: the NestJS examples hold 3000 and 3002, backend-hono 3003.
const port = Number(process.env['PORT'] ?? 3004);

serve({ fetch: createApp().fetch, port }, ({ port }) => {
  // eslint-disable-next-line no-console
  console.log(`backend-orpc-hono listening on http://localhost:${port}`);
});
