import type { MongoQuery } from '@casl/ability';
import type { ConditionsProxy } from '@jperezmart/nest-casl';
import {
  assertCan,
  CaslAbility,
  CaslConditions,
  CaslUser,
} from '@jperezmart/nest-casl';
import type { AppAbility } from '@jperezmart/orpc-abilities';
import { contract } from '@jperezmart/orpc-contract';
import type { AppUser, Article } from '@jperezmart/orpc-domain';
import { Controller } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { ORPCError } from '@orpc/server';

import { UseAbility } from '../casl.js';
import { ArticlesService } from './articles.service.js';

/**
 * The CASL ↔ oRPC bridge (per-procedure `@Implement`).
 *
 * Two layers:
 * - **`@UseAbility(action, 'Article')`** — the coarse, role-level gate. Its guard
 *   runs before the oRPC interceptor and injects the built ability
 *   (`@CaslAbility`), its Access conditions (`@CaslConditions`) or the user
 *   (`@CaslUser`). No subject hook here: the guard runs before oRPC has parsed
 *   the request, so it shouldn't reach into raw `req.params`.
 * - **inside the handler** — the per-record check, against the subject loaded from
 *   the **validated `input`** (oRPC has done its parsing/validation by now, so the
 *   id is guaranteed present and well-formed). A missing record is a real 404, and
 *   we authorize against the server-loaded record, never the request body, with
 *   `assertCan`: 404 when the user cannot read the record either, 403 otherwise.
 *   (A user with no rule for the action never gets here: the guard's type
 *   check answers 403 first.)
 *   `AppModule` translates its Nest exceptions into `ORPCError`s.
 */
@Controller()
export class ArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  /** List — gated at the role level, then filtered by the Access conditions. */
  @Implement(contract.articles.list)
  @UseAbility('read', 'Article')
  list(
    // The type asserts the conditions' shape; the decorator does not check it.
    @CaslConditions() conditions: ConditionsProxy<MongoQuery<Article>>,
  ) {
    // On a store that does not speak Mongo, translate `conditions.toAst()`
    // instead. See "Filtering lists" in the core README.
    return implement(contract.articles.list).handler(() =>
      this.articles.findMany(conditions.toMongo()),
    );
  }

  /** Read one — load from the validated input, then the per-record `read` check. */
  @Implement(contract.articles.get)
  @UseAbility('read', 'Article')
  get(@CaslAbility() ability: AppAbility) {
    return implement(contract.articles.get).handler(({ input }) => {
      const article = this.articles.findById(input.id);
      if (!article) throw new ORPCError('NOT_FOUND');
      assertCan(ability, 'read', article);
      return article;
    });
  }

  /** Create — `create Article` is the type-level gate; author comes from the user. */
  @Implement(contract.articles.create)
  @UseAbility('create', 'Article')
  create(@CaslUser() user: AppUser) {
    return implement(contract.articles.create).handler(({ input }) =>
      this.articles.create(input, user.id),
    );
  }

  /** Update — coarse gate, then the per-record ownership check on the loaded record. */
  @Implement(contract.articles.update)
  @UseAbility('update', 'Article')
  update(@CaslAbility() ability: AppAbility) {
    return implement(contract.articles.update).handler(({ input }) => {
      const { id, ...patch } = input;
      const existing = this.articles.findById(id);
      if (!existing) throw new ORPCError('NOT_FOUND');
      assertCan(ability, 'update', existing);
      return this.articles.update(id, patch) ?? existing;
    });
  }

  /** Delete — same coarse gate + per-record ownership rule as update. */
  @Implement(contract.articles.remove)
  @UseAbility('delete', 'Article')
  remove(@CaslAbility() ability: AppAbility) {
    return implement(contract.articles.remove).handler(({ input }) => {
      const existing = this.articles.findById(input.id);
      if (!existing) throw new ORPCError('NOT_FOUND');
      assertCan(ability, 'delete', existing);
      return this.articles.remove(input.id);
    });
  }
}
