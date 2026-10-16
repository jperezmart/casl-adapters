import type { MongoQuery } from '@casl/ability';
import { accessConditions } from '@jperezmart/casl-core';
import type { AppAbility } from '@jperezmart/orpc-abilities';
import { detectSubjectType } from '@jperezmart/orpc-abilities';
import { articlesPermissions } from '@jperezmart/orpc-abilities/server';
import { createOrpcCasl } from '@jperezmart/orpc-casl';
import { contract } from '@jperezmart/orpc-contract';
import type { AppUser, Article } from '@jperezmart/orpc-domain';
import { implement, ORPCError } from '@orpc/server';
import type { ResponseHeadersPluginContext } from '@orpc/server/plugins';

import {
  createArticle,
  findArticle,
  findArticles,
  removeArticle,
  updateArticle,
} from './articles';
import { parseUser } from './auth';

/**
 * What the server route hands every procedure: the web `Request`, and the
 * response headers `ResponseHeadersPlugin` adds.
 */
export interface AppContext extends ResponseHeadersPluginContext {
  request: Request;
}

/**
 * The oRPC Adapter: it finds the demo user in the request's session cookie,
 * builds their Ability and adds both to the procedure context; its
 * `assertCan` throws oRPC's `UNAUTHORIZED` / `FORBIDDEN` / `NOT_FOUND` by the
 * Denial rule.
 */
const casl = createOrpcCasl<AppContext, AppUser, AppAbility>({
  getUser: ({ request }) => parseUser(request.headers),
  permissions: [articlesPermissions],
  superuserRole: 'admin',
  detectSubjectType,
});

const os = implement(contract).$context<AppContext>();
const authed = os.use(casl.middleware);

/**
 * The contract's procedures. Each check follows the Denial rule in three
 * steps: the subject type, then load from the validated input (a missing
 * article is a genuine `NOT_FOUND`), then the article itself.
 */
export const router = os.router({
  articles: {
    list: authed.articles.list.handler(({ context }) => {
      casl.assertCan(context.ability, 'read', 'Article');
      return findArticles(
        accessConditions<MongoQuery<Article>>(
          context.ability,
          'read',
          'Article',
        ).toMongo(),
      );
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
      const { id, ...changes } = input;
      const article = findArticle(id);
      if (!article) throw new ORPCError('NOT_FOUND');
      casl.assertCan(context.ability, 'update', article);
      return updateArticle(article, changes);
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
    // The Adapter's ready-made Rules endpoint, implementing the contract's.
    abilities: casl.implementRules(contract.me.abilities),
  },
});
