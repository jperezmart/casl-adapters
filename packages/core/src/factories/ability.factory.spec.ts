import { subject } from '@casl/ability';

import { AbilityFactory } from './ability.factory.js';

interface User {
  id: string;
  roles: string[];
}

describe('AbilityFactory', () => {
  it('applies a role permission definition with conditions', () => {
    const factory = new AbilityFactory({});
    factory.registerPermissions({
      author: (user: User, { can }) => {
        can('read', 'Article', { published: true });
        can('update', 'Article', { authorId: user.id });
      },
    });

    const ability = factory.createForUser<User>({
      id: 'u1',
      roles: ['author'],
    });

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

  it('grants everything to the superuser role', () => {
    const factory = new AbilityFactory({ superuserRole: 'admin' });

    const ability = factory.createForUser<User>({ id: 'a', roles: ['admin'] });

    expect(ability.can('delete', 'Anything')).toBe(true);
    expect(ability.can('manage', 'all')).toBe(true);
  });

  it('grants everything to a Role whose permissions are `true`', () => {
    const factory = new AbilityFactory({});
    factory.registerPermissions({ editor: true });

    const ability = factory.createForUser<User>({ id: 'e', roles: ['editor'] });

    expect(ability.can('delete', 'Anything')).toBe(true);
    expect(ability.can('manage', 'all')).toBe(true);
  });

  it('grants nothing to a Role whose permissions are `false`', () => {
    const factory = new AbilityFactory({});
    factory.registerPermissions({ banned: false });

    const ability = factory.createForUser<User>({ id: 'b', roles: ['banned'] });

    expect(ability.can('read', 'Article')).toBe(false);
  });

  it('grants nothing through an untyped `everyone: true`, rather than everything', () => {
    const factory = new AbilityFactory({});
    // The types reject it; a consumer without them can still slip it through.
    factory.registerPermissions({ everyone: true } as never);

    const ability = factory.createForUser<User>({ id: 'u', roles: [] });

    expect(ability.can('read', 'Article')).toBe(false);
  });

  it('resolves subject types with the configured detectSubjectType', () => {
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

    // A plain object, tagged by `kind` rather than wrapped with `subject()`.
    expect(ability.can('update', { kind: 'Article', authorId: 'u1' })).toBe(
      true,
    );
    expect(ability.can('update', { kind: 'Article', authorId: 'u2' })).toBe(
      false,
    );
  });

  it('grants nothing for roles without registered permissions', () => {
    const factory = new AbilityFactory({});

    const ability = factory.createForUser<User>({ id: 'g', roles: ['ghost'] });

    expect(ability.can('read', 'Article')).toBe(false);
  });

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

  describe('#5 — tolerates a malformed `roles` field instead of throwing', () => {
    it('does not throw and grants nothing when `roles` is undefined', () => {
      const factory = new AbilityFactory({ superuserRole: 'admin' });
      factory.registerPermissions({
        author: (_user, { can }) => can('read', 'Article'),
      });

      // A truthy user whose JWT had no `roles` claim. Must NOT 500.
      const user = { id: 'x' } as unknown as User;
      const ability = factory.createForUser<User>(user);

      expect(ability.can('read', 'Article')).toBe(false);
      expect(ability.can('manage', 'all')).toBe(false);
    });

    it('does not throw when `roles` is a string (not an array) and grants nothing', () => {
      const factory = new AbilityFactory({ superuserRole: 'admin' });

      // A bare string must not substring-match the superuser role
      // ('superadmin'.includes('admin')) into an escalation.
      const user = { id: 'x', roles: 'superadmin' } as unknown as User;
      const ability = factory.createForUser<User>(user);

      expect(ability.can('manage', 'all')).toBe(false);
    });
  });

  it('combines the rules of every role the user holds', () => {
    const factory = new AbilityFactory({});
    factory.registerPermissions({
      author: (_user, { can }) => {
        can('create', 'Article');
      },
      moderator: (_user, { can }) => {
        can('delete', 'Comment');
      },
    });

    const ability = factory.createForUser<User>({
      id: 'u',
      roles: ['author', 'moderator'],
    });

    expect(ability.can('create', 'Article')).toBe(true);
    expect(ability.can('delete', 'Comment')).toBe(true);
  });
});
