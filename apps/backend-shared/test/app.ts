import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';

/**
 * Boots the real Nest app before each test of the calling suite and closes it
 * after, so each test starts from the same in-memory seed: the mutating cases
 * (create/update/delete) would otherwise leak state into later tests and
 * couple the suite to declaration order.
 *
 * Returns `api(user)`, an HTTP client authenticated as that demo user (the
 * `x-user-id` header), or anonymous when no user is given.
 */
export function useApp(): (user?: string) => request.Agent {
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
