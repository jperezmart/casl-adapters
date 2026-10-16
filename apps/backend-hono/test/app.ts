import { createServer } from 'node:http';

import { getRequestListener } from '@hono/node-server';
import request from 'supertest';

import { createApp } from '../src/app.ts';

/**
 * The one e2e file that differs between the example backends: the suites
 * (`articles.e2e.spec.ts`, `me.e2e.spec.ts`, `users.e2e.spec.ts`) are the same
 * file in every app and read what sets this one apart from here.
 */
export const APP = {
  name: 'backend-hono',
  /** Status of a successful create: what the route answers. */
  createdStatus: 201,
};

export type Api = Pick<request.Agent, 'get' | 'post' | 'patch' | 'delete'>;

/**
 * Creates the real Hono app before each test of the calling suite, each with
 * its own in-memory store seeded afresh, so the mutating cases
 * (create/update/delete) never leak into later tests. It is served by a bare
 * Node server, as `@hono/node-server` serves it in `main.ts`.
 *
 * Returns `api(user)`, an HTTP client authenticated as that demo user (the
 * `x-user-id` header), or unauthenticated when no user is given.
 */
export function useApp(): (user?: string) => Api {
  let server: ReturnType<typeof createServer>;

  beforeEach(() => {
    server = createServer(getRequestListener(createApp().fetch));
  });

  return user => {
    const agent = request.agent(server);
    return user ? agent.set('x-user-id', user) : agent;
  };
}
