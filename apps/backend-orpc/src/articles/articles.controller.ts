import type { MongoQuery } from '@casl/ability';
import { accessConditions } from '@jperezmart/casl-core';
import { contract } from '@jperezmart/orpc-contract';
import type { Article } from '@jperezmart/orpc-domain';
import { Controller } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { ORPCError } from '@orpc/server';

import { casl } from '../casl.js';
import { ArticlesService } from './articles.service.js';

/**
 * The articles procedures, authorized by `@jperezmart/orpc-casl`.
 *
 * Each procedure runs `casl.middleware`, which puts the user's Ability in the
 * context (or answers `UNAUTHORIZED`). The handler then follows the Denial
 * rule in three steps: check the subject type (`FORBIDDEN` for a user who may
 * act on no article, before anything is loaded), load the article from the
 * validated `input` (a missing one is a genuine `NOT_FOUND`), and check the
 * article itself with `casl.assertCan`: `NOT_FOUND` when the user cannot read
 * it either, `FORBIDDEN` otherwise. The check is always against the
 * server-loaded record, never the request body.
 */
@Controller()
export class ArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  /** List — gated on the subject type, then filtered by the Access conditions. */
  @Implement(contract.articles.list)
  list() {
    return implement(contract.articles.list)
      .use(casl.middleware)
      .handler(({ context }) => {
        casl.assertCan(context.ability, 'read', 'Article');
        // On a store that does not speak Mongo, translate `toAst()` instead.
        // See "Filtering lists" in the casl-core README.
        const conditions = accessConditions<MongoQuery<Article>>(
          context.ability,
          'read',
          'Article',
        );
        return this.articles.findMany(conditions.toMongo());
      });
  }

  /** Read one — type check, load from the validated input, instance check. */
  @Implement(contract.articles.get)
  get() {
    return implement(contract.articles.get)
      .use(casl.middleware)
      .handler(({ input, context }) => {
        casl.assertCan(context.ability, 'read', 'Article');
        const article = this.articles.findById(input.id);
        if (!article) throw new ORPCError('NOT_FOUND');
        casl.assertCan(context.ability, 'read', article);
        return article;
      });
  }

  /** Create — `create Article` is the whole check; the author is the user. */
  @Implement(contract.articles.create)
  create() {
    return implement(contract.articles.create)
      .use(casl.middleware)
      .handler(({ input, context }) => {
        casl.assertCan(context.ability, 'create', 'Article');
        return this.articles.create(input, context.user.id);
      });
  }

  /** Update — type check, then the ownership check on the loaded record. */
  @Implement(contract.articles.update)
  update() {
    return implement(contract.articles.update)
      .use(casl.middleware)
      .handler(({ input, context }) => {
        casl.assertCan(context.ability, 'update', 'Article');
        const { id, ...patch } = input;
        const existing = this.articles.findById(id);
        if (!existing) throw new ORPCError('NOT_FOUND');
        casl.assertCan(context.ability, 'update', existing);
        return this.articles.update(id, patch) ?? existing;
      });
  }

  /** Delete — same as update. */
  @Implement(contract.articles.remove)
  remove() {
    return implement(contract.articles.remove)
      .use(casl.middleware)
      .handler(({ input, context }) => {
        casl.assertCan(context.ability, 'delete', 'Article');
        const existing = this.articles.findById(input.id);
        if (!existing) throw new ORPCError('NOT_FOUND');
        casl.assertCan(context.ability, 'delete', existing);
        return this.articles.remove(input.id);
      });
  }
}
