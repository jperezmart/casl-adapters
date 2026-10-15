import type { Server } from 'node:http';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

import next from 'next';
import request from 'supertest';

/**
 * The one e2e file that differs between the example apps: the suites
 * (`articles.e2e.spec.ts`, `me.e2e.spec.ts`) are the same file in every app and
 * read what sets this one apart from here.
 */
export const APP = {
  name: 'next-pages',
  /** Status of a successful create: what the API route answers. */
  createdStatus: 201,
};

export type Api = Pick<request.Agent, 'get' | 'post' | 'patch' | 'delete'>;

/** Where `lib/articles.ts` keeps its in-memory store. */
const STORE = '__nextPagesArticles';

/**
 * Boots the real Next.js app (its dev server, in this process) once for the
 * calling suite, and resets the in-memory store to the seed before each test,
 * so the mutating cases (create/update/delete) never leak into later tests.
 *
 * Returns `api(user)`, an HTTP client authenticated as that demo user (the
 * `x-user-id` header), or anonymous when no user is given. Its paths omit the
 * API routes' `/api` prefix, so they read like the NestJS examples'.
 */
export function useApp(): (user?: string) => Api {
  const server = useNextServer();

  beforeEach(() => {
    delete (globalThis as { [STORE]?: unknown })[STORE];
  });

  return user => {
    const agent = request.agent(server());
    if (user) agent.set('x-user-id', user);
    return {
      get: (path: string) => agent.get(`/api${path}`),
      post: (path: string) => agent.post(`/api${path}`),
      patch: (path: string) => agent.patch(`/api${path}`),
      delete: (path: string) => agent.delete(`/api${path}`),
    };
  };
}

/** Starts the Next.js app for the calling suite; returns its HTTP server. */
export function useNextServer(): () => Server {
  let server: Server;
  let close: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const app = next({
      dev: true,
      dir: fileURLToPath(new URL('..', import.meta.url)),
      hostname: '127.0.0.1',
      port: 0,
    });
    await app.prepare();
    const handle = app.getRequestHandler();
    server = createServer((req, res) => void handle(req, res));
    close = () => app.close();
  });

  afterAll(async () => {
    await close?.();
  });

  return () => server;
}
