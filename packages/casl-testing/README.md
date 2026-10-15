# @jperezmart/casl-testing

[![npm version](https://img.shields.io/npm/v/@jperezmart/casl-testing.svg)](https://www.npmjs.com/package/@jperezmart/casl-testing)
[![license](https://img.shields.io/npm/l/@jperezmart/casl-testing.svg)](./LICENSE)

Testing utilities for [`@jperezmart/casl-core`](https://github.com/jperezmart/nest-casl/tree/main/packages/casl-core)
and every Adapter built on it, such as [`@jperezmart/nest-casl`](https://github.com/jperezmart/nest-casl/tree/main/packages/core).
Build the Ability straight from your Role permissions and a user, so they can
be unit-tested without booting any framework.

It replaces `@jperezmart/nest-casl-testing`, which now only re-exports it.

## Install

```bash
pnpm add -D @jperezmart/casl-testing
```

`@casl/ability` and `@jperezmart/casl-core` are peer dependencies.

## `buildAbilityForTest(permissions, user, options?)`

Takes a Role permissions map (the one you pass to `CaslModule.forFeature` in
NestJS, for example) and the user you would otherwise have to authenticate,
and returns the Ability the app's server would build:

```ts
import { buildAbilityForTest } from '@jperezmart/casl-testing';
import type { RolePermissions } from '@jperezmart/casl-core';
import { subject } from '@casl/ability';

interface AppUser {
  id: string;
  roles: string[];
}

const permissions: RolePermissions<'author', AppUser> = {
  author: (user, { can }) => {
    can('read', 'Article');
    can('update', 'Article', { authorId: user.id });
  },
};

const ability = buildAbilityForTest(permissions, {
  id: '1',
  roles: ['author'],
});

expect(ability.can('read', 'Article')).toBe(true);
expect(ability.can('update', subject('Article', { authorId: '1' }))).toBe(true);
expect(ability.can('update', subject('Article', { authorId: '2' }))).toBe(
  false,
);
```

It builds through `createAbilityFactory` from `@jperezmart/casl-core`, the same
code every Adapter runs, so there is no second implementation to drift from.

### Options

Both are the core's own options, so a test builds the same Ability the running
application would:

| Option              | Type                          | Effect                                                                               |
| ------------------- | ----------------------------- | ------------------------------------------------------------------------------------ |
| `superuserRole`     | `string`                      | A user holding this role gets `can('manage', 'all')` and no other rule is evaluated. |
| `detectSubjectType` | `(subject: object) => string` | Custom subject-type detection, for subjects CASL cannot name on its own.             |

A role whose definition is `true` rather than a function also grants
`manage all`. The `everyone` entry applies to every user before their Roles,
and a role named `everyone` on the user is ignored. A user whose `roles` is
missing or not an array is treated as having no roles (the Everyone
permissions still apply).

## License

MIT
