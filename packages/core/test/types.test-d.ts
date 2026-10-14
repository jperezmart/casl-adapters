import type {
  AbilityBuilder,
  AnyMongoAbility,
  InferSubjects,
  MongoAbility,
} from '@casl/ability';
import type { DynamicModule, Type } from '@nestjs/common';
import { Injectable } from '@nestjs/common';

import type {
  AuthorizableRequest,
  AuthorizableUser,
  CaslModuleOptions,
  RolePermissions,
  SubjectBeforeFilterHook,
  UseAbilityMetadata,
} from '../src/index.js';
import { CaslModule, createUseAbility, UseAbility } from '../src/index.js';

// A consumer that owes nothing to nest-casl: no `id`, Roles handed out by a
// shared identity provider (so the user holds Roles this app never declares),
// and a field of its own the rules scope by.
type Role = 'author' | 'reader';

interface TenantUser {
  username: string;
  roles: string[];
  tenants: string[];
}

const rolePermissions: RolePermissions<Role, TenantUser> = {
  author(user, { can }) {
    expectTypeOf(user).toEqualTypeOf<TenantUser>();
    can('update', 'Doc', { tenant: { $in: user.tenants } });
  },
  reader: true,
};

describe('types', () => {
  it('accepts a user without an id and with Roles the app does not declare', () => {
    expectTypeOf<TenantUser>().toExtend<AuthorizableUser>();
    expectTypeOf<{
      roles: readonly string[];
    }>().toExtend<AuthorizableUser>();
  });

  it('forFeature infers the user and Roles from the Role permissions', () => {
    expectTypeOf(
      CaslModule.forFeature({ permissions: rolePermissions }),
    ).toEqualTypeOf<DynamicModule>();

    CaslModule.forFeature({
      permissions: {
        author(user: TenantUser, { can }: AbilityBuilder<AnyMongoAbility>) {
          can('read', 'Doc', { tenant: { $in: user.tenants } });
        },
      },
    });
  });

  it('rejects a misspelt Role in the Role permissions', () => {
    const wrong: RolePermissions<Role, TenantUser> = {
      // @ts-expect-error — 'autor' is not a Role
      autor: true,
    };
    void wrong;
  });

  it('takes Everyone permissions as a callback only', () => {
    const everyone: RolePermissions<Role, TenantUser> = {
      everyone(user, { can }) {
        expectTypeOf(user).toEqualTypeOf<TenantUser>();
        can('read', 'Doc', { tenant: { $in: user.tenants } });
      },
    };
    void everyone;

    const open: RolePermissions<Role, TenantUser> = {
      // @ts-expect-error — `everyone: true` would open everything to everyone
      everyone: true,
    };
    const closed: RolePermissions = {
      // @ts-expect-error — `false` is not a callback either
      everyone: false,
    };
    // @ts-expect-error — nor through forFeature
    CaslModule.forFeature({ permissions: { everyone: true } });
    void open;
    void closed;
  });

  it('rejects a role union that contains `everyone`', () => {
    // @ts-expect-error — `everyone` is reserved for the Everyone permissions
    const reserved: RolePermissions<Role | 'everyone', TenantUser> = {};
    void reserved;
  });

  it('forFeature infers the user from the Everyone permissions alone', () => {
    CaslModule.forFeature({
      permissions: {
        everyone(user: TenantUser, { can }: AbilityBuilder<AnyMongoAbility>) {
          can('read', 'Doc', { tenant: { $in: user.tenants } });
        },
      },
    });

    CaslModule.forFeature({
      permissions: {
        author(user: TenantUser, { can }: AbilityBuilder<AnyMongoAbility>) {
          can('update', 'Doc', { tenant: { $in: user.tenants } });
        },
        everyone(user, { can }) {
          expectTypeOf(user).toEqualTypeOf<TenantUser>();
          can('read', 'Doc');
        },
      },
    });
  });

  it('rejects a misspelt superuser Role', () => {
    // @ts-expect-error — 'amdin' is not a Role
    CaslModule.forRoot<Role | 'admin'>({ superuserRole: 'amdin' });

    const options: CaslModuleOptions<Role | 'admin'> = {
      superuserRole: 'admin',
    };
    void options;
  });

  it('forRootAsync types inject like any Nest async module', () => {
    @Injectable()
    class Config {
      superuser(): string {
        return 'admin';
      }
    }

    CaslModule.forRootAsync({
      inject: [Config, { token: 'OPTIONAL', optional: true }],
      useFactory: (config: Config) => ({ superuserRole: config.superuser() }),
    });

    CaslModule.forRootAsync({
      // @ts-expect-error — 42 is not an injection token
      inject: [42],
      useFactory: () => ({}),
    });
  });

  it('takes getUserFromRequest sync or async, inferring the user from either', () => {
    // The user `forRoot` infers from the options, whichever form they take.
    type UserOf<O> =
      O extends CaslModuleOptions<string, infer TUser, never> ? TUser : never;
    expectTypeOf<
      UserOf<{ getUserFromRequest: () => TenantUser | undefined }>
    >().toEqualTypeOf<TenantUser>();
    expectTypeOf<
      UserOf<{ getUserFromRequest: () => Promise<TenantUser | undefined> }>
    >().toEqualTypeOf<TenantUser>();

    type Req = AuthorizableRequest<TenantUser>;
    const tenantUser: TenantUser = { username: 'ana', roles: [], tenants: [] };

    CaslModule.forRoot({ getUserFromRequest: (req: Req) => req.user });
    CaslModule.forRoot({
      getUserFromRequest: (req: Req) => Promise.resolve(req.user),
    });
    CaslModule.forRootAsync({
      useFactory: () => ({
        getUserFromRequest: async () => tenantUser,
      }),
    });

    CaslModule.forRoot({
      // @ts-expect-error — the user it resolves carries no `roles`
      getUserFromRequest: async () => ({ username: 'ana' }),
    });
  });

  it('takes a subject hook as a class, never as a tuple', () => {
    class DocHook implements SubjectBeforeFilterHook {
      run(request: AuthorizableRequest) {
        return request.params?.['id'];
      }
    }
    const BoundUseAbility = createUseAbility<MongoAbility<['read', 'Doc']>>();

    UseAbility('read', 'Doc', DocHook);
    BoundUseAbility('read', 'Doc', DocHook);

    // @ts-expect-error — the tuple form `[Hook, args]` is gone
    UseAbility('read', 'Doc', [DocHook, { id: 'slug' }]);
    // @ts-expect-error — the tuple form `[Hook, args]` is gone
    BoundUseAbility('read', 'Doc', [DocHook, { id: 'slug' }]);

    expectTypeOf<
      NonNullable<UseAbilityMetadata['subjectHook']>
    >().toEqualTypeOf<Type<SubjectBeforeFilterHook>>();
  });

  it('binds the subject hook to the subject type when the ability types its instances', () => {
    // Tagged the way the examples tag theirs: a `readonly kind`.
    interface Doc {
      readonly kind: 'Doc';
      id: string;
    }
    interface Note {
      readonly kind: 'Note';
      id: string;
    }
    interface Comment {
      readonly kind: 'Comment';
      id: string;
    }
    class Post {
      id = '';
      title = '';
    }
    class DocHook implements SubjectBeforeFilterHook<Doc> {
      run(): Doc | undefined {
        return undefined;
      }
    }
    class NoteHook implements SubjectBeforeFilterHook<Note> {
      run(): Promise<Note | undefined> {
        return Promise.resolve(undefined);
      }
    }
    class CommentHook implements SubjectBeforeFilterHook<Comment> {
      run(): Comment | undefined {
        return undefined;
      }
    }
    class PostHook implements SubjectBeforeFilterHook<Post> {
      run(): Post | undefined {
        return undefined;
      }
    }
    const BoundUseAbility =
      createUseAbility<
        MongoAbility<['read', InferSubjects<Doc | Note | typeof Post> | 'all']>
      >();

    BoundUseAbility('read', 'Doc', DocHook);
    BoundUseAbility('read', 'Note', NoteHook);
    BoundUseAbility('read', Post, PostHook);
    // `all` names no one type, so any hook goes.
    BoundUseAbility('read', 'all', DocHook);

    // @ts-expect-error — the hook loads a Note, not the Doc the rule is about
    BoundUseAbility('read', 'Doc', NoteHook);
    // @ts-expect-error — the hook loads a Doc, not a Post
    BoundUseAbility('read', Post, DocHook);
    // A subject hook's own `kind` must not widen the subject type to every
    // type of the ability (which `all` then opens to any hook).
    const DocUseAbility =
      createUseAbility<MongoAbility<['read', InferSubjects<Doc> | 'all']>>();
    DocUseAbility('read', 'Doc', DocHook);
    // @ts-expect-error — nor a subject the ability does not know
    DocUseAbility('read', 'Doc', CommentHook);
    // The bare decorator knows no ability, so it cannot tell.
    UseAbility('read', 'Doc', NoteHook);
  });
});
