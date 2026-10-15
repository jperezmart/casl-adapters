import type { AbilityBuilder, MongoAbility } from '@casl/ability';
import type { RolePermissions } from '@jperezmart/casl-core';

import { buildAbilityForTest } from './index.js';

type AppAbility = MongoAbility<[string, string]>;

// No `id`, Roles from a shared identity provider, and a field of its own.
interface TenantUser {
  username: string;
  roles: string[];
  tenants: string[];
}

const permissions: RolePermissions<'editor', TenantUser, AppAbility> = {
  editor(user, { can }: AbilityBuilder<AppAbility>) {
    can('read', 'Note');
    void user.tenants;
  },
};

const ana: TenantUser = {
  username: 'ana',
  roles: ['billing:admin', 'editor'],
  tenants: ['t1'],
};

describe('buildAbilityForTest types', () => {
  it('infers the user and ability from the Role permissions', () => {
    expectTypeOf(
      buildAbilityForTest(permissions, ana),
    ).toEqualTypeOf<AppAbility>();
  });

  it('takes a superuser Role the map does not declare', () => {
    buildAbilityForTest(permissions, ana, { superuserRole: 'admin' });
    buildAbilityForTest({}, ana, { superuserRole: 'admin' });
  });

  it('infers the user from the Everyone permissions alone', () => {
    buildAbilityForTest(
      {
        everyone(user: TenantUser, { can }: AbilityBuilder<AppAbility>) {
          can('read', 'Note');
          void user.tenants;
        },
      },
      ana,
    );
    buildAbilityForTest(
      { everyone(_user: TenantUser) {} },
      // @ts-expect-error — `tenants` is missing
      { username: 'x', roles: [] },
    );
  });

  it('rejects a user of another shape', () => {
    // @ts-expect-error — `tenants` is missing
    buildAbilityForTest(permissions, { username: 'x', roles: [] });
  });
});
