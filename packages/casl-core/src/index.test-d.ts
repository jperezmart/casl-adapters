import type {
  AbilityBuilder,
  InferSubjects,
  MongoAbility,
} from '@casl/ability';
import { createMongoAbility } from '@casl/ability';

import type { Decision, RolePermissions } from './index.js';
import { createAbilityFactory, decide } from './index.js';

interface Article {
  readonly kind: 'Article';
  id: string;
  authorId: string;
}

type Action = 'read' | 'view' | 'update';
type AppAbility = MongoAbility<[Action, InferSubjects<Article> | 'all']>;

const ability = createMongoAbility<AppAbility>();
const article: Article = { kind: 'Article', id: '1', authorId: 'u1' };

// No `id`, Roles from a shared identity provider, and a field of its own.
interface TenantUser {
  username: string;
  roles: string[];
  tenants: string[];
}

describe('decide types', () => {
  it('accepts the actions and subjects of a typed Ability', () => {
    expectTypeOf(decide(ability, 'update', article)).toEqualTypeOf<Decision>();
    decide(ability, 'read', 'Article');
    decide(ability, 'update', article, { readAction: 'view' });
  });

  it('accepts no Ability, for an Unauthenticated request', () => {
    const none = null as AppAbility | null;
    decide(none, 'read', 'Article');
    // @ts-expect-error — 'frobnicate' is not an Action
    decide(none, 'frobnicate', 'Article');
  });

  it('rejects a wrong action', () => {
    // @ts-expect-error — 'frobnicate' is not an Action
    decide(ability, 'frobnicate', article);
    // @ts-expect-error — 'peek' is not an Action
    decide(ability, 'update', article, { readAction: 'peek' });
  });

  it('rejects a wrong subject', () => {
    // @ts-expect-error — 'Ghost' is not a subject
    decide(ability, 'read', 'Ghost');
    // @ts-expect-error — not an Article
    decide(ability, 'read', { kind: 'Ghost' });
  });

  it('accepts any action and subject on a loose Ability', () => {
    const loose = createMongoAbility();
    decide(loose, 'frobnicate', 'Ghost');
    decide(loose, 'frobnicate', { any: 'thing' }, { readAction: 'peek' });
  });

  it('narrows a denial to its kind and message', () => {
    const decision = decide(ability, 'read', 'Article');
    if (!decision.allowed) {
      expectTypeOf(decision.kind).toEqualTypeOf<
        'unauthenticated' | 'forbidden' | 'not-found'
      >();
      expectTypeOf(decision.message).toEqualTypeOf<string>();
    }
  });
});

describe('createAbilityFactory types', () => {
  const permissions: RolePermissions<'editor', TenantUser, AppAbility> = {
    editor(user, { can }: AbilityBuilder<AppAbility>) {
      can('read', 'Article');
      void user.tenants;
    },
  };

  it('infers the user and ability from the Role permissions', () => {
    const factory = createAbilityFactory({ permissions: [permissions] });
    expectTypeOf(
      factory.createForUser({ username: 'a', roles: ['editor'], tenants: [] }),
    ).toEqualTypeOf<AppAbility>();
  });

  it('rejects a user of another shape', () => {
    const factory = createAbilityFactory({ permissions: [permissions] });
    // @ts-expect-error — `tenants` is missing
    factory.createForUser({ username: 'x', roles: [] });
  });

  it('takes a Superuser role the maps do not declare', () => {
    createAbilityFactory({
      permissions: [permissions],
      superuserRole: 'admin',
    });
  });

  it('rejects `everyone: true`', () => {
    createAbilityFactory({
      // @ts-expect-error — `everyone: true` would open everything to everyone
      permissions: [{ everyone: true }],
    });
  });
});
