import { OpenAPIHandler } from '@orpc/openapi/node';
import { ResponseHeadersPlugin } from '@orpc/server/plugins';
import type { NextApiRequest, NextApiResponse } from 'next';

import { router } from '../../lib/router';

// The plugin lets the Rules endpoint keep its answer out of shared caches.
const handler = new OpenAPIHandler(router, {
  plugins: [new ResponseHeadersPlugin()],
});

/**
 * Serves the whole oRPC contract (its routes carry the `/api` prefix) from one
 * catch-all API route, handing every procedure the Node request as its context
 * so `@jperezmart/orpc-casl` finds the user in it.
 */
export default async function api(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  const { matched } = await handler.handle(req, res, { context: { req } });
  if (!matched) res.status(404).json({ message: 'Not Found' });
}

// oRPC reads and parses the request body itself.
export const config = { api: { bodyParser: false } };
