import { notFound } from '@jperezmart/next-casl';

import type { ArticleInput } from '../../../lib/articles';
import {
  findArticle,
  removeArticle,
  updateArticle,
} from '../../../lib/articles';
import { casl } from '../../../lib/casl';

/**
 * `GET`, `PATCH` and `DELETE /api/articles/:id`. Each follows the Denial rule
 * in three steps: check the subject type (403 for a user who may act on no
 * article, before anything is loaded), load the article (`notFound()` for a
 * missing one), and check the article itself with `casl.assertCan`: 404 when
 * the user cannot read it either, 403 otherwise. The check is always against
 * the stored record, never the request body.
 */
export default casl.apiRoute((req, res, { ability }) => {
  const action = ACTIONS[req.method ?? ''];
  if (!action) {
    res.setHeader('allow', 'GET, PATCH, DELETE').status(405).end();
    return;
  }

  casl.assertCan(ability, action, 'Article');
  const id = String(req.query['id']);
  const article = findArticle(id);
  // The same 404 as a hidden article's, so the two cannot be told apart.
  if (!article) notFound();
  casl.assertCan(ability, action, article);

  switch (action) {
    case 'read':
      res.status(200).json(article);
      return;
    case 'update':
      res
        .status(200)
        .json(updateArticle(article, req.body as Partial<ArticleInput>));
      return;
    case 'delete':
      res.status(200).json(removeArticle(id));
  }
});

/** The action each method checks. */
const ACTIONS: Partial<Record<string, 'read' | 'update' | 'delete'>> = {
  GET: 'read',
  PATCH: 'update',
  DELETE: 'delete',
};
