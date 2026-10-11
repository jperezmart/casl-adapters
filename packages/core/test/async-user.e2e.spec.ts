import type { INestApplication } from '@nestjs/common';
import {
  Controller,
  Get,
  HttpException,
  Injectable,
  Module,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import type {
  AuthorizableRequest,
  RolePermissions,
  SubjectBeforeFilterHook,
} from '../src/index.js';
import { CaslModule, CaslUser, UseAbility } from '../src/index.js';

// The auth layer only knows who the user is and their Roles; which tenants
// they belong to lives elsewhere, behind a service the app injects.
interface BaseUser {
  username: string;
  roles: string[];
}

interface TenantUser extends BaseUser {
  tenants: string[];
}

@Injectable()
class TenantsService {
  private readonly tenants: Record<string, string[]> = { ana: ['t1'] };

  async tenantsOf(username: string): Promise<string[]> {
    await Promise.resolve();
    return this.tenants[username] ?? [];
  }
}

@Module({ providers: [TenantsService], exports: [TenantsService] })
class TenantsModule {}

class Note {
  constructor(public tenant: string) {}
}

@Injectable()
class NoteHook implements SubjectBeforeFilterHook<Note> {
  run(req: AuthorizableRequest): Note | undefined {
    const tenant = req.params?.['tenant'];
    return tenant ? new Note(tenant) : undefined;
  }
}

const permissions: RolePermissions<'editor', TenantUser> = {
  editor(user, { can }) {
    can('read', 'Note', { tenant: { $in: user.tenants } });
  },
};

@Controller()
class NotesController {
  @Get('notes/:tenant')
  @UseAbility('read', 'Note', NoteHook)
  read(): string {
    return 'ok';
  }

  @Get('me')
  @UseAbility('read', 'Note')
  me(@CaslUser() user: TenantUser): TenantUser {
    return user;
  }
}

@Module({
  imports: [CaslModule.forFeature({ permissions })],
  controllers: [NotesController],
  providers: [NoteHook],
})
class NotesModule {}

const BASE_USERS: Record<string, BaseUser> = {
  ana: { username: 'ana', roles: ['editor'] },
};

describe('an async getUserFromRequest (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        CaslModule.forRootAsync({
          imports: [TenantsModule],
          inject: [TenantsService],
          useFactory: (tenants: TenantsService) => ({
            getUserFromRequest: async (req: {
              headers: Record<string, unknown>;
            }): Promise<TenantUser | undefined> => {
              const name = req.headers['x-user'];
              if (name === 'expired') throw new UnauthorizedException();
              if (name === 'teapot') throw new HttpException('teapot', 418);
              const base =
                typeof name === 'string' ? BASE_USERS[name] : undefined;
              if (!base) return undefined;
              return {
                ...base,
                tenants: await tenants.tenantsOf(base.username),
              };
            },
          }),
        }),
        NotesModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer() as Parameters<typeof request>[0];

  it('builds the Ability from the user it resolves', () =>
    request(server()).get('/notes/t1').set('x-user', 'ana').expect(200));

  it('scopes by the field the injected service loaded', () =>
    request(server()).get('/notes/t2').set('x-user', 'ana').expect(404));

  it('hands the handler the user it resolves', () =>
    request(server())
      .get('/me')
      .set('x-user', 'ana')
      .expect(200)
      .expect({ username: 'ana', roles: ['editor'], tenants: ['t1'] }));

  it('answers 401 when it resolves to no user', () =>
    request(server()).get('/notes/t1').expect(401));

  it('lets an UnauthorizedException it rejects with answer 401', () =>
    request(server()).get('/notes/t1').set('x-user', 'expired').expect(401));

  it('lets any other HttpException it rejects with through unchanged', () =>
    request(server()).get('/notes/t1').set('x-user', 'teapot').expect(418));
});
