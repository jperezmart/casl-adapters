import { subject } from '@casl/ability';
import type { RolePermissions } from '@jperezmart/casl-core';

import { buildAbilityForTest } from './index.js';

interface User {
  id: string;
  roles: string[];
}

const permissions: RolePermissions<string, User> = {
  author(user, { can }) {
    can('read', 'Article', { published: true });
    can('update', 'Article', { authorId: user.id });
  },
};

describe('buildAbilityForTest', () => {
  it('builds an ability from a permissions map', () => {
    const ability = buildAbilityForTest(permissions, {
      id: '1',
      roles: ['author'],
    });

    expect(ability.can('update', subject('Article', { authorId: '1' }))).toBe(
      true,
    );
    expect(ability.can('update', subject('Article', { authorId: '2' }))).toBe(
      false,
    );
  });

  it('honours the superuserRole option', () => {
    const ability = buildAbilityForTest(
      {},
      { id: 'a', roles: ['admin'] },
      { superuserRole: 'admin' },
    );

    expect(ability.can('delete', 'Anything')).toBe(true);
  });

  it('applies the Everyone permissions before the Roles', () => {
    const ability = buildAbilityForTest<User>(
      {
        everyone: (_user, { can }) => can('read', 'Comment'),
        muted: (_user, { cannot }) => cannot('read', 'Comment'),
      },
      { id: 'm', roles: ['muted'] },
    );

    expect(ability.can('read', 'Comment')).toBe(false);
  });

  it('honours the detectSubjectType option', () => {
    const ability = buildAbilityForTest(
      permissions,
      { id: '1', roles: ['author'] },
      { detectSubjectType: subject => (subject as { kind: string }).kind },
    );

    expect(ability.can('update', { kind: 'Article', authorId: '1' })).toBe(
      true,
    );
  });
});
