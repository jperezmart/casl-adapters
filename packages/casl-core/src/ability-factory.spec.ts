import { subject } from '@casl/ability';

import type { RolePermissions } from './index.js';
import { createAbilityFactory } from './index.js';

interface User {
  id: string;
  roles: string[];
}

describe('createAbilityFactory', () => {
  it('applies a role permission definition with conditions', () => {
    const factory = createAbilityFactory<User>({
      permissions: [
        {
          author: (user, { can }) => {
            can('read', 'Article', { published: true });
            can('update', 'Article', { authorId: user.id });
          },
        },
      ],
    });

    const ability = factory.createForUser({ id: 'u1', roles: ['author'] });

    expect(ability.can('update', subject('Article', { authorId: 'u1' }))).toBe(
      true,
    );
    expect(ability.can('update', subject('Article', { authorId: 'u2' }))).toBe(
      false,
    );
    expect(ability.can('read', subject('Article', { published: true }))).toBe(
      true,
    );
  });

  it('grants everything to the Superuser role, skipping the Role permissions', () => {
    const factory = createAbilityFactory<User>({
      permissions: [
        {
          everyone: (_user, { cannot }) => {
            cannot('delete', 'Anything');
          },
        },
      ],
      superuserRole: 'admin',
    });

    const ability = factory.createForUser({ id: 'a', roles: ['admin'] });

    expect(ability.can('delete', 'Anything')).toBe(true);
    expect(ability.can('manage', 'all')).toBe(true);
  });

  it('grants everything to a Role whose permissions are `true`', () => {
    const factory = createAbilityFactory({ permissions: [{ editor: true }] });

    const ability = factory.createForUser({ roles: ['editor'] });

    expect(ability.can('delete', 'Anything')).toBe(true);
    expect(ability.can('manage', 'all')).toBe(true);
  });

  it('grants nothing to a Role whose permissions are `false`', () => {
    const factory = createAbilityFactory({ permissions: [{ banned: false }] });

    const ability = factory.createForUser({ roles: ['banned'] });

    expect(ability.can('read', 'Article')).toBe(false);
  });

  it('grants nothing through an untyped `everyone: true`, rather than everything', () => {
    // The types reject it; a consumer without them can still slip it through.
    const factory = createAbilityFactory({
      permissions: [{ everyone: true } as never],
    });

    const ability = factory.createForUser({ roles: [] });

    expect(ability.can('read', 'Article')).toBe(false);
  });

  it('resolves subject types with the configured detectSubjectType', () => {
    const factory = createAbilityFactory<User>({
      permissions: [
        {
          author: (user, { can }) => {
            can('update', 'Article', { authorId: user.id });
          },
        },
      ],
      detectSubjectType: subject => (subject as { kind: string }).kind,
    });

    const ability = factory.createForUser({ id: 'u1', roles: ['author'] });

    // A plain object, tagged by `kind` rather than wrapped with `subject()`.
    expect(ability.can('update', { kind: 'Article', authorId: 'u1' })).toBe(
      true,
    );
    expect(ability.can('update', { kind: 'Article', authorId: 'u2' })).toBe(
      false,
    );
  });

  it('grants nothing for Roles no Role permissions map declares', () => {
    const factory = createAbilityFactory({ permissions: [] });

    const ability = factory.createForUser({ roles: ['ghost'] });

    expect(ability.can('read', 'Article')).toBe(false);
  });

  it('merges the Role permissions maps of the list', () => {
    const factory = createAbilityFactory({
      permissions: [
        { author: (_user, { can }) => can('read', 'Article') },
        { author: (_user, { can }) => can('create', 'Comment') },
      ],
    });

    const ability = factory.createForUser({ roles: ['author'] });

    expect(ability.can('read', 'Article')).toBe(true);
    expect(ability.can('create', 'Comment')).toBe(true);
  });

  it('combines the rules of every Role the user holds', () => {
    const factory = createAbilityFactory({
      permissions: [
        {
          author: (_user, { can }) => can('create', 'Article'),
          moderator: (_user, { can }) => can('delete', 'Comment'),
        },
      ],
    });

    const ability = factory.createForUser({ roles: ['author', 'moderator'] });

    expect(ability.can('create', 'Article')).toBe(true);
    expect(ability.can('delete', 'Comment')).toBe(true);
  });

  it('does not see a change to the list made after it was created', () => {
    const permissions: RolePermissions[] = [];
    const factory = createAbilityFactory({ permissions });

    permissions.push({ author: true });

    expect(factory.createForUser({ roles: ['author'] }).can('read', 'X')).toBe(
      false,
    );
  });

  describe('Everyone permissions', () => {
    const permissions: RolePermissions<string, User>[] = [
      {
        everyone(user, { can }) {
          can('read', 'Profile', { ownerId: user.id });
          can('read', 'Comment');
        },
        // Laid down after `everyone`, so its `cannot` wins.
        muted(_user, { cannot }) {
          cannot('read', 'Comment');
        },
      },
      {
        everyone(_user, { can }) {
          can('read', 'Tag');
        },
      },
    ];
    const factory = createAbilityFactory({ permissions });

    it('apply to a user who holds no Roles', () => {
      const ability = factory.createForUser({ id: 'u1', roles: [] });

      expect(ability.can('read', subject('Profile', { ownerId: 'u1' }))).toBe(
        true,
      );
      expect(ability.can('read', subject('Profile', { ownerId: 'u2' }))).toBe(
        false,
      );
      expect(ability.can('read', 'Comment')).toBe(true);
    });

    it('merge across the maps of the list', () => {
      const ability = factory.createForUser({ id: 'u1', roles: [] });

      expect(ability.can('read', 'Tag')).toBe(true);
    });

    it('apply before the Roles, so a Role restricts them', () => {
      const ability = factory.createForUser({ id: 'u1', roles: ['muted'] });

      expect(ability.can('read', 'Comment')).toBe(false);
    });

    it('are unreachable through a foreign Role named `everyone`', () => {
      // Applied again after `muted`, they would undo its `cannot`.
      const ability = factory.createForUser({
        id: 'u1',
        roles: ['muted', 'everyone'],
      });

      expect(ability.can('read', 'Comment')).toBe(false);
    });
  });

  describe('tolerates malformed Roles instead of throwing', () => {
    const factory = createAbilityFactory({
      permissions: [
        {
          everyone: (_user, { can }) => can('read', 'Tag'),
          author: (_user, { can }) => can('read', 'Article'),
        },
      ],
      superuserRole: 'admin',
    });

    it('treats missing Roles as none, keeping the Everyone permissions', () => {
      // A truthy user whose JWT had no `roles` claim. Must not throw.
      const ability = factory.createForUser({ id: 'x' } as unknown as User);

      expect(ability.can('read', 'Article')).toBe(false);
      expect(ability.can('manage', 'all')).toBe(false);
      expect(ability.can('read', 'Tag')).toBe(true);
    });

    it('treats a string as no Roles, never a substring match', () => {
      // A bare string must not substring-match the superuser role
      // ('superadmin'.includes('admin')) into an escalation.
      const ability = factory.createForUser({
        id: 'x',
        roles: 'superadmin',
      } as unknown as User);

      expect(ability.can('manage', 'all')).toBe(false);
      expect(ability.can('read', 'Tag')).toBe(true);
    });
  });
});
