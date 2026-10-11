import type { INestApplication } from '@nestjs/common';
import {
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Patch,
  Post,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import type {
  AuthorizableRequest,
  CaslModuleOptions,
  RolePermissions,
  SubjectBeforeFilterHook,
} from '../src/index.js';
import { CaslModule, CaslSubject, UseAbility } from '../src/index.js';

// ADR 0004: denied on the subject type is a 403, before the hook runs; then a
// denied instance the user cannot read is a 404, anything else 403.

type Role = 'reader' | 'owner' | 'viewer' | 'lurker';

interface User {
  id: string;
  roles: Role[];
}

class Doc {
  constructor(
    public id: string,
    public ownerId: string,
  ) {}
}

@Injectable()
class DocsService {
  private readonly docs = [new Doc('1', 'alice')];

  find(id: string): Doc | undefined {
    return this.docs.find(doc => doc.id === id);
  }
}

@Injectable()
class DocHook implements SubjectBeforeFilterHook<Doc> {
  constructor(private readonly docs: DocsService) {}

  run(req: AuthorizableRequest): Doc | undefined {
    const id = req.params?.['id'];
    return id ? this.docs.find(id) : undefined;
  }
}

const permissions: RolePermissions<Role, User> = {
  // Reads every doc, changes only their own.
  reader(user, { can }) {
    can('read', 'Doc');
    can('update', 'Doc', { ownerId: user.id });
  },
  // Reads and changes only their own docs.
  owner(user, { can }) {
    can('read', 'Doc', { ownerId: user.id });
    can('update', 'Doc', { ownerId: user.id });
  },
  // An app whose read action is `view`: sees every doc, changes only their own.
  viewer(user, { can }) {
    can('view', 'Doc');
    can('update', 'Doc', { ownerId: user.id });
  },
  // Reads only their own docs and changes none.
  lurker(user, { can }) {
    can('read', 'Doc', { ownerId: user.id });
  },
};

@Controller('docs')
class DocsController {
  @Get(':id')
  @UseAbility('read', 'Doc', DocHook)
  read(@CaslSubject() doc: Doc): Doc {
    return doc;
  }

  @Patch(':id')
  @UseAbility('update', 'Doc', DocHook)
  update(@CaslSubject() doc: Doc): Doc {
    return doc;
  }

  @Post()
  @UseAbility('create', 'Doc')
  create(): string {
    return 'created';
  }
}

/** Not guarded: the 404 an app answers for a record that does not exist. */
@Controller('genuine')
class GenuineController {
  @Get('missing')
  missing(): never {
    throw new NotFoundException();
  }
}

@Module({
  imports: [CaslModule.forFeature<User>({ permissions })],
  controllers: [DocsController, GenuineController],
  providers: [DocsService, DocHook],
})
class DocsModule {}

function readUser(req: unknown): User | undefined {
  const headers = (req as { headers: Record<string, string | undefined> })
    .headers;
  const id = headers['x-id'];
  if (!id) return undefined;
  return { id, roles: (headers['x-roles'] ?? '').split(',') as Role[] };
}

async function createApp(
  options: CaslModuleOptions<Role, User> = {},
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      CaslModule.forRoot<Role, User>({
        getUserFromRequest: readUser,
        ...options,
      }),
      DocsModule,
    ],
  }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

const as = (id: string, role: Role) => ({ 'x-id': id, 'x-roles': role });

describe('AccessGuard denial rule (ADR 0004)', () => {
  let app: INestApplication;
  const server = () => app.getHttpServer() as Parameters<typeof request>[0];

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('404 for an instance the user can neither act on nor read', () =>
    request(server()).patch('/docs/1').set(as('bob', 'owner')).expect(404));

  it("answers that 404 with exactly a genuine not-found's body", async () => {
    const genuine = await request(server()).get('/genuine/missing').expect(404);
    const hidden = await request(server())
      .patch('/docs/1')
      .set(as('bob', 'owner'))
      .expect(404);
    expect(hidden.body).toEqual(genuine.body);
  });

  it('403 for an instance the user can read but not act on', () =>
    request(server()).patch('/docs/1').set(as('carol', 'reader')).expect(403));

  it('404 when the subject hook loads nothing, even for a user who reads everything', async () => {
    const genuine = await request(server()).get('/genuine/missing').expect(404);
    const res = await request(server())
      .get('/docs/999')
      .set(as('carol', 'reader'))
      .expect(404);
    expect(res.body).toEqual(genuine.body);
  });

  it('403 for an instance when the user may change no doc at all, even one they cannot read', () =>
    request(server()).patch('/docs/1').set(as('bob', 'lurker')).expect(403));

  it('403 before the subject hook runs when the user may change no doc at all', () =>
    // The hook would load nothing (404); a user denied on the type is answered first.
    request(server()).patch('/docs/999').set(as('bob', 'lurker')).expect(403));

  it('403 for a denial against the subject type (no hook)', () =>
    request(server()).post('/docs').set(as('carol', 'reader')).expect(403));

  it('still 401 without a user, even for a missing instance', () =>
    request(server()).get('/docs/999').expect(401));

  it('allows what the rules allow', () =>
    request(server())
      .patch('/docs/1')
      .set(as('alice', 'owner'))
      .expect(200)
      .expect(res => expect(res.body).toEqual({ id: '1', ownerId: 'alice' })));
});

describe('AccessGuard denial rule with a custom read action', () => {
  let app: INestApplication;
  const server = () => app.getHttpServer() as Parameters<typeof request>[0];

  beforeAll(async () => {
    app = await createApp({ readAction: 'view' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('403 when the user may perform the configured read action', () =>
    request(server()).patch('/docs/1').set(as('vic', 'viewer')).expect(403));

  it("404 when the user may only `read`, which this app doesn't use for visibility", () =>
    request(server()).patch('/docs/1').set(as('carol', 'reader')).expect(404));
});
