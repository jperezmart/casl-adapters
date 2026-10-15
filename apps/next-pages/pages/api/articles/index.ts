import type { MongoQuery } from '@casl/ability';
import { accessConditions } from '@jperezmart/casl-core';
import type { Article } from '@jperezmart/example-shared';

import { createArticle, findArticles } from '../../../lib/articles';
import { casl } from '../../../lib/casl';

interface ArticleBody {
  title: string;
  published?: boolean;
}

/**
 * `GET /api/articles` lists the articles the user may read, filtered by the
 * Access conditions; `POST /api/articles` creates one as its author.
 */
export default casl.apiRoute((req, res, { ability, user }) => {
  switch (req.method) {
    case 'GET': {
      casl.assertCan(ability, 'read', 'Article');
      // On a store that does not speak Mongo, translate `toAst()` instead.
      // See "Filtering lists" in the casl-core README.
      const conditions = accessConditions<MongoQuery<Article>>(
        ability,
        'read',
        'Article',
      );
      res.status(200).json(findArticles(conditions.toMongo()));
      return;
    }
    case 'POST': {
      // `create Article` is the whole check: the author is the user.
      casl.assertCan(ability, 'create', 'Article');
      res.status(201).json(createArticle(req.body as ArticleBody, user.id));
      return;
    }
    default:
      res.setHeader('allow', 'GET, POST').status(405).end();
  }
});
