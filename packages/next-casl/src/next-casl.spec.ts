import type { IncomingMessage, ServerResponse } from 'node:http';
import { createServer } from 'node:http';

import type { InferSubjects, MongoAbility } from '@casl/ability';
import type { RolePermissions } from '@jperezmart/casl-core';
import { accessConditions } from '@jperezmart/casl-core';
import type {
  GetServerSidePropsContext,
  NextApiHandler,
  NextApiRequest,
  NextApiResponse,
} from 'next';
import request from 'supertest';

import { createNextCasl, DENIAL_PROP, notFound } from './index.js';

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

/** The demo session: the `x-user-id` header names the user. */
const getUser = (req: IncomingMessage) =>
  USERS[String(req.headers['x-user-id'])] ?? null;

const casl = createNextCasl<User, AppAbility>({
  getUser,
  permissions: [permissions],
  detectSubjectType: subject => (subject as Article).kind,
});

/** A `getServerSideProps` context for `user` (an Unauthenticated request without one). */
function pageContext(
  id: string,
  user?: string,
): GetServerSidePropsContext<{ id: string }> {
  const req = { headers: user ? { 'x-user-id': user } : {} };
  const res = { statusCode: 200 };
  return {
    req: req as unknown as IncomingMessage & {
      cookies: Partial<Record<string, string>>;
    },
    res: res as unknown as ServerResponse,
    params: { id },
    query: { id },
    resolvedUrl: `/articles/${id}`,
  };
}

/**
 * An HTTP client of an API route handler, served by a bare Node server: the
 * Node request/response pair Next.js would hand it, without booting Next.js.
 */
function serve(handler: NextApiHandler) {
  return request(
    createServer((req, res) => {
      void handler(req as NextApiRequest, res as NextApiResponse);
    }),
  );
}

/** Answers JSON on a bare Node response. */
function json(res: ServerResponse, body: unknown): void {
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

describe('createNextCasl', () => {
  describe('getServerSideProps', () => {
    /** Checks the subject type, loads the article, then checks the article. */
    const editPage = casl.getServerSideProps<
      { article: Article },
      { id: string }
    >(({ ability, params }) => {
      casl.assertCan(ability, 'update', 'Article');
      const article = ARTICLES.find(a => a.id === params?.id);
      if (!article) return { notFound: true };
      casl.assertCan(ability, 'update', article);
      return { props: { article } };
    });

    it('hands the Ability to the page and returns its result when allowed', async () => {
      const context = pageContext('1', 'alice');
      await expect(editPage(context)).resolves.toEqual({
        props: { article: ARTICLES[0] },
      });
      expect(context.res.statusCode).toBe(200);
    });

    it("answers Next.js's not-found result for an instance the user cannot read, like a missing one", async () => {
      await expect(editPage(pageContext('999', 'alice'))).resolves.toEqual({
        notFound: true,
      });
      await expect(editPage(pageContext('4', 'alice'))).resolves.toEqual({
        notFound: true,
      });
    });

    it("answers a forbidden denial with status 403 and the denial prop, with the core's message", async () => {
      const context = pageContext('3', 'alice');
      await expect(editPage(context)).resolves.toEqual({
        props: {
          [DENIAL_PROP]: {
            statusCode: 403,
            message: 'Insufficient permissions to update Article.',
          },
        },
      });
      expect(context.res.statusCode).toBe(403);
    });

    it('answers an Unauthenticated request with status 401 and the denial prop, before the page runs', async () => {
      const handler = vi.fn();
      const context = pageContext('1');
      await expect(casl.getServerSideProps(handler)(context)).resolves.toEqual({
        props: {
          [DENIAL_PROP]: {
            statusCode: 401,
            message:
              'No authenticated user available for the CASL ability check.',
          },
        },
      });
      expect(context.res.statusCode).toBe(401);
      expect(handler).not.toHaveBeenCalled();
    });

    describe('with onUnauthenticated and onForbidden', () => {
      const redirecting = createNextCasl<User, AppAbility>({
        getUser,
        permissions: [permissions],
        detectSubjectType: subject => (subject as Article).kind,
        onUnauthenticated: (_denial, req) => ({
          destination: `/login?from=${req.url}`,
          permanent: false,
        }),
        onForbidden: denial => ({
          destination: `/denied?reason=${encodeURIComponent(denial.message)}`,
          statusCode: 303,
        }),
      });
      const redirectingEditPage = redirecting.getServerSideProps<
        { article: Article },
        { id: string }
      >(({ ability, params }) => {
        const article = ARTICLES.find(a => a.id === params?.id);
        if (!article) return { notFound: true };
        redirecting.assertCan(ability, 'update', article);
        return { props: { article } };
      });

      it('answers an Unauthenticated request with the redirect onUnauthenticated returns', async () => {
        const context = pageContext('1');
        context.req.url = '/articles/1/edit';
        await expect(redirectingEditPage(context)).resolves.toEqual({
          redirect: {
            destination: '/login?from=/articles/1/edit',
            permanent: false,
          },
        });
      });

      it('answers a forbidden denial with the redirect onForbidden returns', async () => {
        await expect(
          redirectingEditPage(pageContext('3', 'alice')),
        ).resolves.toEqual({
          redirect: {
            destination:
              '/denied?reason=Insufficient%20permissions%20to%20update%20Article.',
            statusCode: 303,
          },
        });
      });

      it('still answers not found, which has no hook', async () => {
        await expect(
          redirectingEditPage(pageContext('4', 'alice')),
        ).resolves.toEqual({ notFound: true });
      });
    });
  });

  describe('API routes', () => {
    /** `PATCH /articles/:id`: checks the type, loads, checks the article. */
    const updateRoute = casl.apiRoute((req, res, { ability }) => {
      casl.assertCan(ability, 'update', 'Article');
      const article = ARTICLES.find(a => `/articles/${a.id}` === req.url);
      if (!article) notFound();
      casl.assertCan(ability, 'update', article);
      json(res, article);
    });

    it('hands the Ability to the handler and lets it answer when allowed', async () => {
      const res = await serve(updateRoute)
        .patch('/articles/1')
        .set('x-user-id', 'alice')
        .expect(200);
      expect(res.body).toEqual(ARTICLES[0]);
    });

    it('answers 404 for an instance the user cannot read, the same as for a missing one', async () => {
      const genuine = await serve(updateRoute)
        .patch('/articles/999')
        .set('x-user-id', 'alice')
        .expect(404);
      const hidden = await serve(updateRoute)
        .patch('/articles/4')
        .set('x-user-id', 'alice')
        .expect(404);
      expect(hidden.body).toEqual(genuine.body);
      expect(hidden.body).toEqual({ statusCode: 404, message: 'Not Found' });
    });

    it("answers 403, with the core's message, for an instance the user can read", async () => {
      const res = await serve(updateRoute)
        .patch('/articles/3')
        .set('x-user-id', 'alice')
        .expect(403);
      expect(res.body).toEqual({
        statusCode: 403,
        message: 'Insufficient permissions to update Article.',
      });
    });

    it('answers 401 for an Unauthenticated request, before the handler runs', async () => {
      const handler = vi.fn();
      const res = await serve(casl.apiRoute(handler)).get('/').expect(401);
      expect(res.body).toEqual({
        statusCode: 401,
        message: 'No authenticated user available for the CASL ability check.',
      });
      expect(handler).not.toHaveBeenCalled();
    });

    it('answers 403 when the Access conditions allow no record', async () => {
      const editable = casl.apiRoute((_req, res, { ability }) => {
        json(res, accessConditions(ability, 'update', 'Article').toMongo());
      });
      const res = await serve(editable)
        .get('/')
        .set('x-user-id', 'carol')
        .expect(403);
      expect(res.body).toEqual({
        statusCode: 403,
        message: 'No record of Article is allowed for update.',
      });
    });

    describe('with onUnauthenticated and onForbidden', () => {
      const redirecting = createNextCasl<User, AppAbility>({
        getUser,
        permissions: [permissions],
        detectSubjectType: subject => (subject as Article).kind,
        // Redirects pages only: API clients keep the 401.
        onUnauthenticated: (_denial, req) =>
          req.url?.startsWith('/api/')
            ? undefined
            : { destination: '/login', permanent: false },
        onForbidden: () => ({ destination: '/denied', statusCode: 303 }),
      });
      const route = redirecting.apiRoute((_req, res, { ability }) => {
        redirecting.assertCan(ability, 'update', ARTICLES[2]!);
        json(res, ARTICLES[2]);
      });

      it('redirects with what onUnauthenticated returns', async () => {
        const res = await serve(route).get('/articles/3').expect(307);
        expect(res.headers['location']).toBe('/login');
      });

      it('keeps the 401 when onUnauthenticated returns nothing', () =>
        serve(route).get('/api/articles/3').expect(401));

      it('redirects with what onForbidden returns', async () => {
        const res = await serve(route)
          .get('/articles/3')
          .set('x-user-id', 'alice')
          .expect(303);
        expect(res.headers['location']).toBe('/denied');
      });
    });
  });

  describe('the Rules endpoint', () => {
    it("answers the packed rules of the user's Ability", async () => {
      const res = await serve(casl.rulesEndpoint)
        .get('/api/me/abilities')
        .set('x-user-id', 'carol')
        .expect(200);
      expect(res.body).toEqual({
        rules: [['read', 'Article', { published: true }]],
      });
    });

    it('answers 401 for an Unauthenticated request, even with onUnauthenticated', async () => {
      const redirecting = createNextCasl<User, AppAbility>({
        getUser,
        permissions: [permissions],
        onUnauthenticated: () => ({ destination: '/login', permanent: false }),
      });
      await serve(redirecting.rulesEndpoint)
        .get('/api/me/abilities')
        .expect(401);
    });

    it('keeps every answer out of shared caches', async () => {
      const ok = await serve(casl.rulesEndpoint)
        .get('/api/me/abilities')
        .set('x-user-id', 'carol')
        .expect(200);
      const unauthenticated = await serve(casl.rulesEndpoint)
        .get('/api/me/abilities')
        .expect(401);

      expect(ok.headers['cache-control']).toBe('private, no-store');
      expect(unauthenticated.headers['cache-control']).toBe(
        'private, no-store',
      );
    });

    it('answers 405 to any method but GET', async () => {
      const res = await serve(casl.rulesEndpoint)
        .post('/api/me/abilities')
        .set('x-user-id', 'carol')
        .expect(405);
      expect(res.headers['allow']).toBe('GET');
    });
  });
});
