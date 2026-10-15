import { accessConditions } from '@jperezmart/casl-core';
import type { Article } from '@jperezmart/example-shared';
import { createFileRoute } from '@tanstack/react-router';

import { casl } from '../../../casl';
import { findArticles } from '../../../server/articles';

// REST: the articles the user may read, filtered by the Access conditions.
export const Route = createFileRoute('/api/articles/')({
  server: {
    middleware: [casl.routeMiddleware],
    handlers: {
      GET: ({ context }) =>
        Response.json(
          findArticles(
            accessConditions<Partial<Article>>(
              context.ability,
              'read',
              'Article',
            ).toMongo(),
          ),
        ),
    },
  },
});
