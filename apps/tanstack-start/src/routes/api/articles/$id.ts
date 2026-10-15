import { createFileRoute, notFound } from '@tanstack/react-router';

import { casl } from '../../../casl';
import { findArticle, updateArticle } from '../../../server/articles';

// REST: one article. Check the subject type, load, then check the instance;
// the middleware answers each denial with 401, 403 or 404.
export const Route = createFileRoute('/api/articles/$id')({
  server: {
    middleware: [casl.routeMiddleware],
    handlers: {
      GET: ({ context, params }) => {
        casl.assertCan(context.ability, 'read', 'Article');
        const article = findArticle(params.id);
        if (!article) throw notFound();
        casl.assertCan(context.ability, 'read', article);
        return Response.json(article);
      },

      PATCH: async ({ context, params, request }) => {
        casl.assertCan(context.ability, 'update', 'Article');
        const article = findArticle(params.id);
        if (!article) throw notFound();
        casl.assertCan(context.ability, 'update', article);
        const body = (await request.json()) as { title?: string };
        return Response.json(updateArticle(article, { title: body.title }));
      },
    },
  },
});
