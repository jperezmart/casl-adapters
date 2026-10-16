import type { INestApplication, Provider } from '@nestjs/common';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import type { RolePermissions } from '../src/index.js';
import {
  AccessGuard,
  AllowWithoutAbility,
  CaslModule,
  UseAbility,
} from '../src/index.js';

type Role = 'reader';

interface User {
  id: string;
  roles: Role[];
}

const permissions: RolePermissions<Role, User> = {
  reader(_user, { can }) {
    can('read', 'Doc');
  },
};

/** Every route under the guard: per controller here, or global below. */
@Controller('guarded')
@UseGuards(AccessGuard)
class GuardedController {
  @Get('checked')
  @UseAbility('read', 'Doc')
  checked(): { ok: true } {
    return { ok: true };
  }

  /** Neither `@UseAbility` nor `@AllowWithoutAbility()`: a forgotten check. */
  @Get('forgotten')
  forgotten(): { ok: true } {
    return { ok: true };
  }

  @Get('open')
  @AllowWithoutAbility()
  open(): { ok: true } {
    return { ok: true };
  }
}

/** A whole controller opened on purpose. */
@Controller('public')
@UseGuards(AccessGuard)
@AllowWithoutAbility()
class PublicController {
  @Get()
  index(): { ok: true } {
    return { ok: true };
  }
}

/** Checked as a whole, with one handler opened on purpose. */
@Controller('checked-class')
@UseAbility('read', 'Doc')
class CheckedClassController {
  @Get()
  index(): { ok: true } {
    return { ok: true };
  }

  @Get('open')
  @AllowWithoutAbility()
  open(): { ok: true } {
    return { ok: true };
  }
}

/** Not under any guard of its own: only a global guard reaches it. */
@Controller('plain')
class PlainController {
  @Get('forgotten')
  forgotten(): { ok: true } {
    return { ok: true };
  }

  @Get('open')
  @AllowWithoutAbility()
  open(): { ok: true } {
    return { ok: true };
  }
}

async function appWith(providers: Provider[]): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      CaslModule.forRoot({
        getUserFromRequest: (req: { headers: Record<string, unknown> }) => {
          const id = req.headers['x-id'];
          return typeof id === 'string'
            ? { id, roles: ['reader'] as Role[] }
            : undefined;
        },
      }),
      CaslModule.forFeature<User>({ permissions }),
      CaslModule.forRulesEndpoint({ path: 'me/abilities' }),
    ],
    controllers: [
      GuardedController,
      PublicController,
      CheckedClassController,
      PlainController,
    ],
    providers,
  }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

describe.each([
  { guard: 'per controller', providers: [] },
  {
    guard: 'global APP_GUARD',
    providers: [{ provide: APP_GUARD, useClass: AccessGuard }],
  },
])('AccessGuard denies by default, $guard', ({ providers }) => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await appWith(providers);
  });

  afterAll(async () => {
    await app.close();
  });

  const api = () =>
    request(app.getHttpServer() as Parameters<typeof request>[0]);

  it('checks a route with @UseAbility', async () => {
    await api().get('/guarded/checked').set('x-id', 'u1').expect(200);
    await api().get('/guarded/checked').expect(401);
  });

  it('answers 403 to a route without @UseAbility', () =>
    api().get('/guarded/forgotten').set('x-id', 'u1').expect(403));

  it('lets a handler marked @AllowWithoutAbility() through, with or without a user', async () => {
    await api().get('/guarded/open').expect(200, { ok: true });
    await api().get('/guarded/open').set('x-id', 'u1').expect(200);
  });

  it('lets every route of a controller marked @AllowWithoutAbility() through', () =>
    api().get('/public').expect(200, { ok: true }));

  it('lets a handler marked @AllowWithoutAbility() through under a class-level @UseAbility', async () => {
    await api().get('/checked-class').expect(401);
    await api().get('/checked-class/open').expect(200, { ok: true });
  });

  it('keeps the Rules endpoint reachable, so it answers its own 401', async () => {
    await api().get('/me/abilities').expect(401);
    await api().get('/me/abilities').set('x-id', 'u1').expect(200);
  });
});

describe('AccessGuard as a global APP_GUARD', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await appWith([{ provide: APP_GUARD, useClass: AccessGuard }]);
  });

  afterAll(async () => {
    await app.close();
  });

  const api = () =>
    request(app.getHttpServer() as Parameters<typeof request>[0]);

  it('answers 403 to a route of a controller that never mentions the guard', () =>
    api().get('/plain/forgotten').set('x-id', 'u1').expect(403));

  it('lets such a route marked @AllowWithoutAbility() through', () =>
    api().get('/plain/open').expect(200, { ok: true }));
});
