import type { INestApplication } from '@nestjs/common';
import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import type {
  AuthorizableRequest,
  RolePermissions,
  SubjectBeforeFilterHook,
} from '../src/index.js';
import { CaslModule, CaslUser, UseAbility } from '../src/index.js';

// A user the library has no say over: no `id`, Roles handed out by a shared
// identity provider (most belong to other apps), and a field of its own.
interface TenantUser {
  username: string;
  roles: string[];
  tenants: string[];
}

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

const ana: TenantUser = {
  username: 'ana',
  roles: ['billing:admin', 'editor', 'hr:viewer'],
  tenants: ['t1'],
};
const ben: TenantUser = {
  username: 'ben',
  roles: ['billing:admin'],
  tenants: ['t1'],
};
const USERS: Record<string, TenantUser> = { ana, ben };

describe('a user shaped by its identity provider (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        CaslModule.forRoot({
          getUserFromRequest: (req: { headers: Record<string, unknown> }) => {
            const name = req.headers['x-user'];
            return typeof name === 'string' ? USERS[name] : undefined;
          },
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

  it('applies the Role it declares and ignores the foreign ones', () =>
    request(server()).get('/notes/t1').set('x-user', 'ana').expect(200));

  it('scopes by the field of its own', () =>
    request(server()).get('/notes/t2').set('x-user', 'ana').expect(404));

  it('grants nothing when every Role is foreign', () =>
    request(server()).get('/notes/t1').set('x-user', 'ben').expect(403));

  it('hands the handler the user untouched', () =>
    request(server()).get('/me').set('x-user', 'ana').expect(200).expect(ana));
});
