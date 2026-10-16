import { createServer } from 'node:http';

import { getRequestListener } from '@hono/node-server';
import request from 'supertest';

import { createApp } from '../src/app.ts';

/**
 * The one e2e file that differs between the example backends: the suites
 * (`articles.e2e.spec.ts`, `me.e2e.spec.ts`) are the same file in every app and
 * read what sets this one apart from here.
 */
export const APP = {
  name: 'backend-orpc-hono',
  /** Status of a successful create: oRPC's default for every procedure. */
  createdStatus: 200,
};

export type Api = Pick<request.Agent, 'get' | 'post' | 'patch' | 'delete'>;

/**
 * Creates the real Hono app before each test of the calling suite, each with
 * its own in-memory store seeded afresh, so the mutating cases
 * (create/update/delete) never leak into later tests. It is served by a bare
 * Node server, as `@hono/node-server` serves it in `main.ts`.
 *
 * Returns `api(user)`, an HTTP client authenticated as that demo user (the
 * `x-user-id` header), or unauthenticated when no user is given. Its paths omit
 * the contract's `/api` prefix, so they read like the REST examples'.
 */
export function useApp(): (user?: string) => Api {
  let server: ReturnType<typeof createServer>;

  beforeEach(() => {
    server = createServer(getRequestListener(createApp().fetch));
  });

  return user => {
    const agent = request.agent(server);
    if (user) agent.set('x-user-id', user);
    return {
      get: (path: string) => agent.get(`/api${path}`),
      post: (path: string) => agent.post(`/api${path}`),
      patch: (path: string) => agent.patch(`/api${path}`),
      delete: (path: string) => agent.delete(`/api${path}`),
    };
  };
}
