import { accessConditions } from '@jperezmart/casl-core';
import type { Article } from '@jperezmart/example-shared';
import { notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';

import { casl, redirectingCasl } from './casl';
import { caslMiddleware, redirectingCaslMiddleware } from './middleware';
import { findArticle, findArticles, updateArticle } from './server/articles';

/** The articles the user may read, filtered by the Access conditions. */
export const listArticles = createServerFn()
  .middleware([caslMiddleware])
  .handler(({ context }) =>
    findArticles(
      accessConditions<Partial<Article>>(
        context.ability,
        'read',
        'Article',
      ).toMongo(),
    ),
  );

/**
 * One article. Check the subject type, load, then check the instance: a user
 * who cannot read it gets the router's not-found, as for a missing one.
 */
export const getArticle = createServerFn()
  .middleware([caslMiddleware])
  .validator((data: { id: string }) => data)
  .handler(({ context, data }) => {
    casl.assertCan(context.ability, 'read', 'Article');
    const article = findArticle(data.id);
    if (!article) throw notFound();
    casl.assertCan(context.ability, 'read', article);
    return article;
  });

/** Renames an article: forbidden (403) when the user may read but not update it. */
export const renameArticle = createServerFn({ method: 'POST' })
  .middleware([caslMiddleware])
  .validator((data: { id: string; title: string }) => data)
  .handler(({ context, data }) => {
    casl.assertCan(context.ability, 'update', 'Article');
    const article = findArticle(data.id);
    if (!article) throw notFound();
    casl.assertCan(context.ability, 'update', article);
    return updateArticle(article, { title: data.title });
  });

/**
 * The article to edit, for the edit page: with the redirecting Adapter, an
 * Unauthenticated request goes home to sign in and a forbidden one to the
 * forbidden page.
 */
export const getArticleToEdit = createServerFn()
  .middleware([redirectingCaslMiddleware])
  .validator((data: { id: string }) => data)
  .handler(({ context, data }) => {
    redirectingCasl.assertCan(context.ability, 'update', 'Article');
    const article = findArticle(data.id);
    if (!article) throw notFound();
    redirectingCasl.assertCan(context.ability, 'update', article);
    return article;
  });
