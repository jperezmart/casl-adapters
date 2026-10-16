import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import type { RolePermissions } from '../src/index.js';
import { CaslModule } from '../src/index.js';

type Role = 'admin' | 'reader';

interface User {
  id: string;
  roles: Role[];
}

const permissions: RolePermissions<Role, User> = {
  everyone(_user, { can }) {
    can('read', 'Notice');
  },
  reader(user, { can, cannot }) {
    can('read', 'Doc', { ownerId: user.id });
    cannot('read', 'Doc', { archived: true });
  },
};

describe('CaslModule.forRulesEndpoint', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        CaslModule.forRoot({
          superuserRole: 'admin',
          // An async lookup, as an app's own `getUserFromRequest` may be.
          getUserFromRequest: async (req: {
            headers: Record<string, unknown>;
          }) => {
            const id = req.headers['x-id'];
            const roles = req.headers['x-roles'];
            if (typeof id !== 'string') return undefined;
            return {
              id,
              roles:
                typeof roles === 'string' ? (roles.split(',') as Role[]) : [],
            };
          },
        }),
        CaslModule.forFeature({ permissions }),
        CaslModule.forRulesEndpoint({ path: 'me/abilities' }),
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const api = () =>
    request(app.getHttpServer() as Parameters<typeof request>[0]);

  it("serves the user's packed rules at the given path", async () => {
    const res = await api()
      .get('/me/abilities')
      .set('x-id', 'u1')
      .set('x-roles', 'reader')
      .expect(200);

    // The trailing 1 is packRules' flag for an inverted (`cannot`) rule.
    expect(res.body).toEqual({
      rules: [
        ['read', 'Notice'],
        ['read', 'Doc', { ownerId: 'u1' }],
        ['read', 'Doc', { archived: true }, 1],
      ],
    });
  });

  it('serves the Everyone permissions to a user with no Roles', async () => {
    const res = await api().get('/me/abilities').set('x-id', 'u2').expect(200);

    expect(res.body).toEqual({ rules: [['read', 'Notice']] });
  });

  it('serves everything to the Superuser role', async () => {
    const res = await api()
      .get('/me/abilities')
      .set('x-id', 'root')
      .set('x-roles', 'admin')
      .expect(200);

    expect(res.body).toEqual({ rules: [['manage', 'all']] });
  });

  it('keeps every answer out of shared caches', async () => {
    const ok = await api().get('/me/abilities').set('x-id', 'u1').expect(200);
    const unauthenticated = await api().get('/me/abilities').expect(401);

    expect(ok.headers['cache-control']).toBe('private, no-store');
    expect(unauthenticated.headers['cache-control']).toBe('private, no-store');
  });

  it('answers an Unauthenticated request with 401', async () => {
    const res = await api().get('/me/abilities').expect(401);

    expect(res.body.message).toBe(
      'No authenticated user available for the CASL ability check.',
    );
  });
});
