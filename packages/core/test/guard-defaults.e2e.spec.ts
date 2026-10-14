import type { MongoQuery } from '@casl/ability';
import type {
  INestApplication,
  MiddlewareConsumer,
  NestModule,
} from '@nestjs/common';
import { Controller, Get, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import type { ConditionsProxy, RolePermissions } from '../src/index.js';
import {
  AccessGuard,
  CaslConditions,
  CaslModule,
  UseAbility,
} from '../src/index.js';

type Role = 'reader';

interface User {
  id: string;
  roles: Role[];
}

const permissions: RolePermissions<Role, User> = {
  reader(user, { can }) {
    can('read', 'Doc', { ownerId: user.id });
  },
};

@Controller()
class DocsController {
  /** No `@UseAbility`: the global guard has nothing to check here. */
  @Get('health')
  health(): { ok: true } {
    return { ok: true };
  }

  @Get('docs')
  @UseAbility('read', 'Doc')
  list(
    @CaslConditions()
    conditions: ConditionsProxy<MongoQuery<{ ownerId: string }>>,
  ): MongoQuery<{ ownerId: string }> {
    return conditions.toMongo();
  }
}

/** Stands in for an auth layer that puts the user on `req.user`. */
function attachUser(
  req: { headers: Record<string, unknown>; user?: User },
  _res: unknown,
  next: () => void,
): void {
  const id = req.headers['x-id'];
  if (typeof id === 'string') req.user = { id, roles: ['reader'] };
  next();
}

@Module({
  imports: [CaslModule.forFeature<User>({ permissions })],
  controllers: [DocsController],
  // AccessGuard on every route, not only those with `@UseAbility`.
  providers: [{ provide: APP_GUARD, useClass: AccessGuard }],
})
class DocsModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(attachUser).forRoutes('*');
  }
}

describe('AccessGuard defaults', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      // No `getUserFromRequest`: the guard reads `req.user`.
      imports: [CaslModule.forRoot<Role>({}), DocsModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer() as Parameters<typeof request>[0];

  it('reads the user from `req.user` when no getUserFromRequest is configured', async () => {
    const res = await request(server())
      .get('/docs')
      .set('x-id', 'ana')
      .expect(200);
    // @CaslConditions() hands over the Access conditions for `read Doc`.
    expect(res.body).toEqual({ ownerId: 'ana' });
  });

  it('401s when `req.user` is missing', () =>
    request(server()).get('/docs').expect(401));

  it('lets a route without @UseAbility through, even registered as a global guard', () =>
    request(server()).get('/health').expect(200, { ok: true }));
});
