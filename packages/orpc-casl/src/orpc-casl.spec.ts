import type { InferSubjects, MongoAbility } from '@casl/ability';
import type { RolePermissions } from '@jperezmart/casl-core';
import { accessConditions } from '@jperezmart/casl-core';
import { oc } from '@orpc/contract';
import { call, ORPCError, os } from '@orpc/server';
import { z } from 'zod';

import { createOrpcCasl } from './index.js';

interface Article {
  readonly kind: 'Article';
  id: string;
  authorId: string;
  published: boolean;
}
type Action = 'manage' | 'create' | 'read' | 'update';
type AppAbility = MongoAbility<[Action, InferSubjects<Article> | 'all']>;

interface User {
  id: string;
  roles: string[];
}
/** What the app's oRPC handler puts in the context: here, who is calling. */
interface Context {
  userId?: string;
}

const USERS: Record<string, User> = {
  carol: { id: 'carol', roles: ['user'] },
  alice: { id: 'alice', roles: ['author'] },
};

const ARTICLES: Article[] = [
  { kind: 'Article', id: '1', authorId: 'alice', published: true },
  { kind: 'Article', id: '2', authorId: 'alice', published: false },
  { kind: 'Article', id: '3', authorId: 'bob', published: true },
  { kind: 'Article', id: '4', authorId: 'bob', published: false },
];

const permissions: RolePermissions<'user' | 'author', User, AppAbility> = {
  user(_user, { can }) {
    can('read', 'Article', { published: true });
  },
  author(user, { can }) {
    can('read', 'Article', { published: true });
    can('read', 'Article', { authorId: user.id });
    can('update', 'Article', { authorId: user.id });
  },
};

const casl = createOrpcCasl<Context, User, AppAbility>({
  getUser: context => USERS[context.userId ?? ''] ?? null,
  permissions: [permissions],
  detectSubjectType: subject => (subject as Article).kind,
});

const authed = os.$context<Context>().use(casl.middleware);
const idInput = z.object({ id: z.string() });

/** Checks the subject type, loads the article, then checks the article. */
const readArticle = authed.input(idInput).handler(({ input, context }) => {
  casl.assertCan(context.ability, 'read', 'Article');
  const article = ARTICLES.find(a => a.id === input.id);
  if (!article) throw new ORPCError('NOT_FOUND');
  casl.assertCan(context.ability, 'read', article);
  return article;
});

/** The same, for `update`. */
const updateArticle = authed.input(idInput).handler(({ input, context }) => {
  casl.assertCan(context.ability, 'update', 'Article');
  const article = ARTICLES.find(a => a.id === input.id);
  if (!article) throw new ORPCError('NOT_FOUND');
  casl.assertCan(context.ability, 'update', article);
  return article;
});

describe('createOrpcCasl', () => {
  it('lets a procedure answer when the Ability allows the check', async () => {
    await expect(
      call(readArticle, { id: '1' }, { context: { userId: 'carol' } }),
    ).resolves.toMatchObject({ id: '1' });
  });

  it('answers NOT_FOUND for an instance the user cannot read, like a missing one', async () => {
    const genuine = await rejection(
      call(readArticle, { id: '999' }, { context: { userId: 'carol' } }),
    );
    const hidden = await rejection(
      call(readArticle, { id: '2' }, { context: { userId: 'carol' } }),
    );
    expect(hidden).toMatchObject({ code: 'NOT_FOUND', status: 404 });
    expect(hidden.toJSON()).toEqual(genuine.toJSON());
  });

  it("answers FORBIDDEN, with the core's message, for an instance the user can read", async () => {
    const error = await rejection(
      call(updateArticle, { id: '3' }, { context: { userId: 'alice' } }),
    );
    expect(error).toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
      message: 'Insufficient permissions to update Article.',
    });
  });

  it('answers UNAUTHORIZED, before the handler runs, for an Unauthenticated request', async () => {
    const handler = vi.fn();
    const procedure = authed.handler(handler);
    const error = await rejection(call(procedure, undefined, { context: {} }));
    expect(error).toMatchObject({
      code: 'UNAUTHORIZED',
      status: 401,
      message: 'No authenticated user available for the CASL ability check.',
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('answers FORBIDDEN when the Access conditions allow no record', async () => {
    const editable = authed.handler(({ context }) =>
      accessConditions(context.ability, 'update', 'Article').toMongo(),
    );
    const error = await rejection(
      call(editable, undefined, { context: { userId: 'carol' } }),
    );
    expect(error).toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
      message: 'No record of Article is allowed for update.',
    });
  });

  describe('the Rules endpoint', () => {
    const carolsRules = [['read', 'Article', { published: true }]];

    it("rulesProcedure returns the packed rules of the user's Ability", async () => {
      await expect(
        call(casl.rulesProcedure, undefined, { context: { userId: 'carol' } }),
      ).resolves.toEqual({ rules: carolsRules });
    });

    it('rulesProcedure answers UNAUTHORIZED for an Unauthenticated request', async () => {
      const error = await rejection(
        call(casl.rulesProcedure, undefined, { context: {} }),
      );
      expect(error).toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
    });

    it("implementRules implements the app's own contract procedure", async () => {
      const rules = oc
        .route({ method: 'GET', path: '/me/rules' })
        .output(z.object({ rules: z.array(z.unknown()) }));
      const procedure = casl.implementRules(rules);
      await expect(
        call(procedure, undefined, { context: { userId: 'carol' } }),
      ).resolves.toEqual({ rules: carolsRules });
      expect(procedure['~orpc'].route).toEqual({
        method: 'GET',
        path: '/me/rules',
      });
    });
  });

  describe('with override hooks', () => {
    const custom = createOrpcCasl<Context, User, AppAbility>({
      getUser: context => USERS[context.userId ?? ''] ?? null,
      permissions: [permissions],
      detectSubjectType: subject => (subject as Article).kind,
      onUnauthenticated: denial =>
        new ORPCError('UNAUTHORIZED', {
          data: { login: '/login', reason: denial.message },
        }),
      onForbidden: denial =>
        new ORPCError('FORBIDDEN', { data: { reason: denial.message } }),
    });
    const customAuthed = os.$context<Context>().use(custom.middleware);
    const update = customAuthed.input(idInput).handler(({ input, context }) => {
      const article = ARTICLES.find(a => a.id === input.id);
      if (!article) throw new ORPCError('NOT_FOUND');
      custom.assertCan(context.ability, 'update', article);
      return article;
    });

    it('onUnauthenticated answers an Unauthenticated request', async () => {
      const error = await rejection(call(update, { id: '1' }, { context: {} }));
      expect(error).toMatchObject({
        code: 'UNAUTHORIZED',
        data: {
          login: '/login',
          reason: 'No authenticated user available for the CASL ability check.',
        },
      });
    });

    it('onForbidden answers a forbidden denial', async () => {
      const error = await rejection(
        call(update, { id: '3' }, { context: { userId: 'alice' } }),
      );
      expect(error).toMatchObject({
        code: 'FORBIDDEN',
        data: { reason: 'Insufficient permissions to update Article.' },
      });
    });

    it('not found stays NOT_FOUND, so existence stays hidden', async () => {
      const error = await rejection(
        call(update, { id: '4' }, { context: { userId: 'alice' } }),
      );
      expect(error).toMatchObject({ code: 'NOT_FOUND', status: 404 });
    });
  });
});

/** The `ORPCError` a call rejects with. */
async function rejection(
  promise: Promise<unknown>,
): Promise<ORPCError<string, unknown>> {
  const error: unknown = await promise.then(
    () => expect.fail('expected the call to be rejected'),
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(ORPCError);
  return error as ORPCError<string, unknown>;
}
