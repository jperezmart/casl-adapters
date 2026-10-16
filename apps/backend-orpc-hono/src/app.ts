import { OpenAPIHandler } from '@orpc/openapi/fetch';
import { onError } from '@orpc/server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import type { ArticleStore } from './articles.ts';
import { createArticleStore } from './articles.ts';
import { createRouter } from './router.ts';

/**
 * The app: the oRPC contract mounted on Hono. The contract's routes carry the
 * `/api` prefix, so the handler serves `/api/*` as is, handing every procedure
 * the web request as its context: `casl`'s `getUser` reads the demo user from
 * it. oRPC reads the request body itself, which Hono leaves untouched.
 */
export function createApp(articles: ArticleStore = createArticleStore()) {
  const handler = new OpenAPIHandler(createRouter(articles), {
    interceptors: [
      onError((error: unknown) => {
        console.error('[orpc]', error);
      }),
    ],
  });

  return new Hono()
    .use(cors()) // allow the Vite/React tester to call the API directly
    .use('/api/*', async (c, next) => {
      const { matched, response } = await handler.handle(c.req.raw, {
        context: { request: c.req.raw },
      });
      if (matched) return c.newResponse(response.body, response);
      await next();
      return undefined;
    });
}
