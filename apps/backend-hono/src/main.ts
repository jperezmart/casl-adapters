import { serve } from '@hono/node-server';

import { createApp } from './app.ts';

// 3003 by default: the NestJS examples hold 3000 and 3002.
const port = Number(process.env['PORT'] ?? 3003);

serve({ fetch: createApp().fetch, port }, ({ port }) => {
  // eslint-disable-next-line no-console
  console.log(`backend-hono listening on http://localhost:${port}`);
});
