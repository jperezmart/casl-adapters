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
  name: 'backend-simple',
  /** Status of a successful create: Nest's default for `@Post()`. */
  createdStatus: 201,
};

export type Api = Pick<request.Agent, 'get' | 'post' | 'patch' | 'delete'>;

/**
 * Boots the real Nest app before each test of the calling suite and closes it
 * after, so each test starts from the same in-memory seed: the mutating cases
 * (create/update/delete) would otherwise leak state into later tests and
 * couple the suite to declaration order.
 *
 * Returns `api(user)`, an HTTP client authenticated as that demo user (the
 * `x-user-id` header), or unauthenticated when no user is given.
 */
export function useApp(): (user?: string) => Api {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  return user => {
    const agent = request.agent(
      app.getHttpServer() as Parameters<typeof request>[0],
    );
    return user ? agent.set('x-user-id', user) : agent;
  };
}
