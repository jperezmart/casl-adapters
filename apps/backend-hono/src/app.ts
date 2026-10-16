import type { MongoQuery } from '@casl/ability';
import { accessConditions } from '@jperezmart/casl-core';
import type { Article } from '@jperezmart/example-shared';
import { DEMO_USERS } from '@jperezmart/example-shared/server';
import { notFound } from '@jperezmart/hono-casl';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import type { ArticleInput, ArticleStore } from './articles.ts';
import { createArticleStore } from './articles.ts';
import { casl } from './casl.ts';

/**
 * The app: `backend-simple`'s HTTP API on Hono, authorized by
 * `@jperezmart/hono-casl`. Every article route runs `casl.middleware`, which
 * puts the user's Ability in the context (or answers 401). A route on one
 * article then follows the Denial rule in three steps: check the subject type
 * (403 for a user who may act on no article, before anything is loaded), load
 * the article (`notFound()` for a missing one), and check the article itself
 * with `casl.assertCan`: 404 when the user cannot read it either, 403
 * otherwise. The check is always against the stored record, never the
 * request body.
 */
export function createApp(articles: ArticleStore = createArticleStore()) {
  /** The article `:id` names, checked for `action`; throws the denial. */
  function loadArticle(
    ability: Parameters<typeof casl.assertCan>[0],
    action: 'read' | 'update' | 'delete',
    id: string,
  ): Article {
    casl.assertCan(ability, action, 'Article');
    const article = articles.findById(id);
    // The same 404 as a hidden article's, so the two cannot be told apart.
    if (!article) notFound();
    casl.assertCan(ability, action, article);
    return article;
  }

  return (
    new Hono()
      .use(cors()) // allow the Vite/React tester to call the API directly
      .use('/articles', casl.middleware)
      .use('/articles/*', casl.middleware)

      /** List — gated on the subject type, then filtered by the Access conditions. */
      .get('/articles', c => {
        casl.assertCan(c.var.ability, 'read', 'Article');
        // On a store that does not speak Mongo, translate `toAst()` instead.
        // See "Filtering lists" in the casl-core README.
        const conditions = accessConditions<MongoQuery<Article>>(
          c.var.ability,
          'read',
          'Article',
        );
        return c.json(articles.findMany(conditions.toMongo()));
      })

      .get('/articles/:id', c =>
        c.json(loadArticle(c.var.ability, 'read', c.req.param('id'))),
      )

      /** Create — `create Article` is the whole check: the author is the user. */
      .post('/articles', async c => {
        casl.assertCan(c.var.ability, 'create', 'Article');
        const input = await c.req.json<ArticleInput>();
        return c.json(articles.create(input, c.var.user.id), 201);
      })

      .patch('/articles/:id', async c => {
        const article = loadArticle(c.var.ability, 'update', c.req.param('id'));
        const patch = await c.req.json<Partial<ArticleInput>>();
        return c.json(articles.update(article, patch));
      })

      .delete('/articles/:id', c => {
        const article = loadArticle(c.var.ability, 'delete', c.req.param('id'));
        return c.json(articles.remove(article.id));
      })

      /** The current demo user, or 401 without one. */
      .get('/me', casl.middleware, c => c.json(c.var.user))

      // The Rules endpoint, ready-made: `{ rules }` for the user `getUser`
      // finds, and 401 without one. The frontend's `@jperezmart/casl-react`
      // fetches it by default (its Vite proxy strips the `/api` prefix).
      .get('/me/abilities', casl.rulesHandler)

      /** The demo users the tester switches between (public). */
      .get('/users', c => c.json(DEMO_USERS))
  );
}
