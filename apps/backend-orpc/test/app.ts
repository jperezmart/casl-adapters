import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';

/**
 * The one e2e file that differs between the example backends: the suites
 * (`articles.e2e.spec.ts`, `me.e2e.spec.ts`) are the same file in every app and
 * read what sets this one apart from here.
 */
export const APP = {
  name: 'backend-orpc',
  /** Status of a successful create: oRPC's default for every procedure. */
  createdStatus: 200,
};

export type Api = Pick<request.Agent, 'get' | 'post' | 'patch' | 'delete'>;

/**
 * Boots the real Nest app before each test of the calling suite and closes it
 * after, so each test starts from the same in-memory seed: the mutating cases
 * (create/update/delete) would otherwise leak state into later tests and
 * couple the suite to declaration order.
 *
 * Returns `api(user)`, an HTTP client authenticated as that demo user (the
 * `x-user-id` header), or unauthenticated when no user is given. Its paths omit the
 * contract's `/api` prefix, so they read like the REST examples'.
 */
export function useApp(): (user?: string) => Api {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    // oRPC owns body parsing (mirrors main.ts).
    app = moduleRef.createNestApplication({ bodyParser: false });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  return user => {
    const agent = request.agent(
      app.getHttpServer() as Parameters<typeof request>[0],
    );
    if (user) agent.set('x-user-id', user);
    return {
      get: (path: string) => agent.get(`/api${path}`),
      post: (path: string) => agent.post(`/api${path}`),
      patch: (path: string) => agent.patch(`/api${path}`),
      delete: (path: string) => agent.delete(`/api${path}`),
    };
  };
}
