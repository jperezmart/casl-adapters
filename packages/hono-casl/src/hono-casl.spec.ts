import type { InferSubjects, MongoAbility } from '@casl/ability';
import type { RolePermissions } from '@jperezmart/casl-core';
import { accessConditions } from '@jperezmart/casl-core';
import type { Context } from 'hono';
import { Hono } from 'hono';

import type { HonoCaslOptions } from './index.js';
import { createHonoCasl, notFound } from './index.js';

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

const USERS: Record<string, User> = {
  carol: { id: 'carol', roles: ['user'] },
  alice: { id: 'alice', roles: ['author'] },
};

const ARTICLES: Article[] = [
  { kind: 'Article', id: '1', authorId: 'alice', published: true },
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

/** The demo session: the `x-user-id` header names the user. */
const getUser = (c: Context) => USERS[c.req.header('x-user-id') ?? ''] ?? null;

/** An app whose `PATCH /articles/:id` checks the type, loads, then checks the article. */
function appWith(
  hooks: Pick<
    HonoCaslOptions<User, AppAbility>,
    'onUnauthenticated' | 'onForbidden'
  > = {},
) {
  const casl = createHonoCasl<User, AppAbility>({
    getUser,
    permissions: [permissions],
    detectSubjectType: subject => (subject as Article).kind,
    ...hooks,
  });
  const handler = vi.fn();
  const app = new Hono()
    .get('/me/abilities', casl.rulesHandler)
    .use('/articles/*', casl.middleware)
    .patch('/articles/:id', c => {
      handler();
      casl.assertCan(c.var.ability, 'update', 'Article');
      const article = ARTICLES.find(a => a.id === c.req.param('id'));
      if (!article) notFound();
      casl.assertCan(c.var.ability, 'update', article);
      return c.json({ article, user: c.var.user.id });
    });
  return { app, handler };
}

/** `PATCH /articles/:id` as `user` (an Unauthenticated request without one). */
function patch(
  app: ReturnType<typeof appWith>['app'],
  id: string,
  user?: string,
) {
  return app.request(`/articles/${id}`, {
    method: 'PATCH',
    headers: user ? { 'x-user-id': user } : {},
  });
}

describe('createHonoCasl', () => {
  it('hands the Ability and the user to the handler, which answers when allowed', async () => {
    const { app } = appWith();
    const res = await patch(app, '1', 'alice');
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      article: ARTICLES[0],
      user: 'alice',
    });
  });

  it('answers an Unauthenticated request with 401 and JSON, before the handler runs', async () => {
    const { app, handler } = appWith();
    const res = await patch(app, '1');
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      statusCode: 401,
      message: 'No authenticated user available for the CASL ability check.',
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it("answers a forbidden denial with 403 and the core's message", async () => {
    const { app } = appWith();
    // alice may read bob's published #3, so she is told she may not update it.
    const res = await patch(app, '3', 'alice');
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      statusCode: 403,
      message: 'Insufficient permissions to update Article.',
    });
  });

  it('answers 403 on the subject type, before anything is loaded', async () => {
    const { app } = appWith();
    // carol may update no article, so a missing one is forbidden too.
    const res = await patch(app, '999', 'carol');
    expect(res.status).toBe(403);
  });

  it('answers 404 for an instance the user cannot read, the same as for a missing one', async () => {
    const { app } = appWith();
    const hidden = await patch(app, '4', 'alice');
    const missing = await patch(app, '999', 'alice');
    expect(hidden.status).toBe(404);
    expect(missing.status).toBe(404);
    const body = { statusCode: 404, message: 'Not Found' };
    await expect(hidden.json()).resolves.toEqual(body);
    await expect(missing.json()).resolves.toEqual(body);
  });

  it("answers the Access conditions' refusal (NoRecordAllowedError) as forbidden", async () => {
    const casl = createHonoCasl<User, AppAbility>({
      getUser,
      permissions: [permissions],
    });
    const app = new Hono()
      .use(casl.middleware)
      .get('/drafts', c =>
        c.json(accessConditions(c.var.ability, 'update', 'Article').toMongo()),
      );
    const res = await app.request('/drafts', {
      headers: { 'x-user-id': 'carol' },
    });
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      statusCode: 403,
      message: 'No record of Article is allowed for update.',
    });
  });

  it("answers assertCan's denial without the middleware too", async () => {
    const casl = createHonoCasl<User, AppAbility>({
      getUser,
      permissions: [permissions],
    });
    const app = new Hono().get('/public', () => {
      casl.assertCan(null, 'read', 'Article');
      return new Response('unreachable');
    });
    const res = await app.request('/public');
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ statusCode: 401 });
  });

  describe('with onUnauthenticated and onForbidden', () => {
    const { app } = appWith({
      onUnauthenticated: (_denial, c) =>
        c.redirect(`/login?from=${c.req.path}`),
      onForbidden: (denial, c) =>
        c.redirect(`/denied?reason=${encodeURIComponent(denial.message)}`, 303),
    });

    it('answers an Unauthenticated request with what onUnauthenticated returns', async () => {
      const res = await patch(app, '1');
      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toBe('/login?from=/articles/1');
    });

    it('answers a forbidden denial with what onForbidden returns', async () => {
      const res = await patch(app, '3', 'alice');
      expect(res.status).toBe(303);
      expect(res.headers.get('location')).toBe(
        '/denied?reason=Insufficient%20permissions%20to%20update%20Article.',
      );
    });

    it('keeps answering not found with 404, which has no hook', async () => {
      const res = await patch(app, '4', 'alice');
      expect(res.status).toBe(404);
    });

    it('keeps the default answer when a hook returns nothing', async () => {
      const { app: keeping } = appWith({ onForbidden: () => undefined });
      const res = await patch(keeping, '3', 'alice');
      expect(res.status).toBe(403);
      await expect(res.json()).resolves.toMatchObject({ statusCode: 403 });
    });
  });

  describe('rulesHandler (the Rules endpoint)', () => {
    it("answers the user's packed rules", async () => {
      const { app } = appWith();
      const res = await app.request('/me/abilities', {
        headers: { 'x-user-id': 'carol' },
      });
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual({
        rules: [['read', 'Article', { published: true }]],
      });
    });

    it('answers an Unauthenticated request with 401, never onUnauthenticated', async () => {
      const onUnauthenticated = vi.fn((_denial: unknown, c: Context) =>
        c.redirect('/login'),
      );
      const { app } = appWith({ onUnauthenticated });
      const res = await app.request('/me/abilities');
      expect(res.status).toBe(401);
      await expect(res.json()).resolves.toMatchObject({ statusCode: 401 });
      expect(onUnauthenticated).not.toHaveBeenCalled();
    });
  });
});
