import type { MongoQuery } from '@casl/ability';
import { accessConditions } from '@jperezmart/casl-core';
import { contract } from '@jperezmart/orpc-contract';
import type { Article } from '@jperezmart/orpc-domain';
import { implement, ORPCError } from '@orpc/server';

import {
  createArticle,
  findArticle,
  findArticles,
  removeArticle,
  updateArticle,
} from './articles';
import type { AppContext } from './casl';
import { orpcCasl as casl } from './casl';

const os = implement(contract).$context<AppContext>();

/** Every article procedure runs with the user's Ability in its context. */
const authed = os.use(casl.middleware);

/**
 * The contract's procedures, authorized by `@jperezmart/orpc-casl`, as in the
 * NestJS oRPC example. `casl.middleware` puts the user's Ability in the context
 * (or answers `UNAUTHORIZED`). A handler then follows the Denial rule: check
 * the subject type (`FORBIDDEN` for a user who may act on no article, before
 * anything is loaded), load the article from the validated `input` (a missing
 * one is a genuine `NOT_FOUND`), and check the article itself: `NOT_FOUND`
 * when the user cannot read it either, `FORBIDDEN` otherwise.
 */
export const router = os.router({
  articles: {
    list: authed.articles.list.handler(({ context }) => {
      casl.assertCan(context.ability, 'read', 'Article');
      const conditions = accessConditions<MongoQuery<Article>>(
        context.ability,
        'read',
        'Article',
      );
      return findArticles(conditions.toMongo());
    }),

    get: authed.articles.get.handler(({ input, context }) => {
      casl.assertCan(context.ability, 'read', 'Article');
      const article = findArticle(input.id);
      if (!article) throw new ORPCError('NOT_FOUND');
      casl.assertCan(context.ability, 'read', article);
      return article;
    }),

    create: authed.articles.create.handler(({ input, context }) => {
      casl.assertCan(context.ability, 'create', 'Article');
      return createArticle(input, context.user.id);
    }),

    update: authed.articles.update.handler(({ input, context }) => {
      casl.assertCan(context.ability, 'update', 'Article');
      const { id, ...patch } = input;
      const article = findArticle(id);
      if (!article) throw new ORPCError('NOT_FOUND');
      casl.assertCan(context.ability, 'update', article);
      return updateArticle(article, patch);
    }),

    remove: authed.articles.remove.handler(({ input, context }) => {
      casl.assertCan(context.ability, 'delete', 'Article');
      const article = findArticle(input.id);
      if (!article) throw new ORPCError('NOT_FOUND');
      casl.assertCan(context.ability, 'delete', article);
      return removeArticle(input.id);
    }),
  },

  me: {
    get: authed.me.get.handler(({ context }) => context.user),
    // The Rules endpoint, ready-made, implementing the contract's procedure.
    abilities: casl.implementRules(contract.me.abilities),
  },
});
