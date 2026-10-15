import { OpenAPIHandler } from '@orpc/openapi/fetch';
import { createFileRoute } from '@tanstack/react-router';

import { router } from '../../server/router';

const handler = new OpenAPIHandler(router);

/**
 * oRPC mounted in a server route: every method under /api (the contract's
 * prefix) goes to the handler, with the web `Request` as the procedures'
 * context, from which `getUser` reads the session cookie.
 */
async function handle({ request }: { request: Request }): Promise<Response> {
  const { matched, response } = await handler.handle(request, {
    context: { request },
  });
  return matched ? response : new Response('Not Found', { status: 404 });
}

export const Route = createFileRoute('/api/$')({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
      PATCH: handle,
      DELETE: handle,
    },
  },
});
