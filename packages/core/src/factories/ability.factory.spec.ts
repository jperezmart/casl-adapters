import { subject } from '@casl/ability';

import { AbilityFactory } from './ability.factory.js';

// The Ability construction is tested in @jperezmart/casl-core; this covers the
// per-feature registration that accumulates the core's list, and the root
// options it forwards.

interface User {
  id: string;
  roles: string[];
}

describe('AbilityFactory', () => {
  it('merges permissions registered across several features', () => {
    const factory = new AbilityFactory({});
    factory.registerPermissions({
      author: (_user, { can }) => {
        can('read', 'Article');
      },
    });
    factory.registerPermissions({
      author: (_user, { can }) => {
        can('create', 'Comment');
      },
    });

    const ability = factory.createForUser<User>({ id: 'u', roles: ['author'] });

    expect(ability.can('read', 'Article')).toBe(true);
    expect(ability.can('create', 'Comment')).toBe(true);
  });

  it('takes in a feature registered after an ability was built', () => {
    const factory = new AbilityFactory({});
    factory.registerPermissions({ author: (_u, { can }) => can('read', 'A') });
    factory.createForUser<User>({ id: 'u', roles: ['author'] });

    factory.registerPermissions({ author: (_u, { can }) => can('read', 'B') });
    const ability = factory.createForUser<User>({ id: 'u', roles: ['author'] });

    expect(ability.can('read', 'A')).toBe(true);
    expect(ability.can('read', 'B')).toBe(true);
  });

  it('grants everything to the superuser role of forRoot', () => {
    const factory = new AbilityFactory({ superuserRole: 'admin' });

    const ability = factory.createForUser<User>({ id: 'a', roles: ['admin'] });

    expect(ability.can('manage', 'all')).toBe(true);
  });

  it('resolves subject types with the detectSubjectType of forRoot', () => {
    const factory = new AbilityFactory({
      detectSubjectType: subject => (subject as { kind: string }).kind,
    });
    factory.registerPermissions({
      author: (user: User, { can }) => {
        can('update', 'Article', { authorId: user.id });
      },
    });

    const ability = factory.createForUser<User>({
      id: 'u1',
      roles: ['author'],
    });

    expect(ability.can('update', { kind: 'Article', authorId: 'u1' })).toBe(
      true,
    );
    expect(ability.can('update', subject('Article', { authorId: 'u2' }))).toBe(
      false,
    );
  });
});
