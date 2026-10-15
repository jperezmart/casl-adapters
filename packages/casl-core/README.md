# @jperezmart/casl-core

[![npm version](https://img.shields.io/npm/v/@jperezmart/casl-core.svg)](https://www.npmjs.com/package/@jperezmart/casl-core)
[![license](https://img.shields.io/npm/l/@jperezmart/casl-core.svg)](./LICENSE)

The framework-free core of the [jperezmart CASL Adapters](https://github.com/jperezmart/nest-casl): the Role permissions, the Ability construction, the Denial rule and the Access conditions, on top of [CASL](https://casl.js.org) v7. It depends only on CASL, so it is safe to import from any runtime.

You rarely use it on its own: an Adapter such as [`@jperezmart/nest-casl`](https://github.com/jperezmart/nest-casl/tree/main/packages/core) finds the request's user, builds their Ability with this core and turns its answers into its framework's own 401, 403 or 404. The core never throws a framework's error: it says which answer a denial is, and the Adapter answers it ([ADR 0005](https://github.com/jperezmart/nest-casl/blob/main/docs/adr/0005-a-core-that-decides-an-adapter-per-framework.md)).

## Install

```bash
pnpm add @jperezmart/casl-core @casl/ability
```

`@casl/ability@^7` is a peer dependency. Every Adapter declares this core as a peer dependency too, so an app that uses two Adapters at once has exactly one copy of it.

## Role permissions

A Role permissions map says what each Role may do: `true` (everything), `false` (nothing) or a function that declares CASL rules for the user. The `everyone` entry holds the Everyone permissions, applied to every authenticated user before the rules of their Roles; it only takes a function, and no Role can be named `everyone`.

```ts
import type { RolePermissions } from '@jperezmart/casl-core';

interface AppUser {
  id: string;
  roles: string[];
}

type Role = 'author' | 'editor';

const permissions: RolePermissions<Role, AppUser> = {
  everyone(_user, { can }) {
    can('read', 'Article', { published: true });
  },
  author(user, { can }) {
    can('read', 'Article', { authorId: user.id });
    can('update', 'Article', { authorId: user.id });
  },
  editor: true,
};
```

Only the Roles the map declares are typed; the user's own `roles` are plain strings, and Roles no map declares are ignored. The user needs nothing but its `roles` (`AuthorizableUser`).

## The Ability: `createAbilityFactory`

```ts
import { createAbilityFactory } from '@jperezmart/casl-core';

const abilities = createAbilityFactory({
  permissions: [permissions],
  superuserRole: 'admin',
});

const ability = abilities.createForUser({ id: 'u1', roles: ['author'] });
```

| Option              | Type                          | Effect                                                                                       |
| ------------------- | ----------------------------- | -------------------------------------------------------------------------------------------- |
| `permissions`       | `RolePermissions[]`           | Every Role permissions map of the app, merged in order. Read once, when the factory is made. |
| `superuserRole`     | `string`                      | A user holding this Role gets `can('manage', 'all')` and no Role permissions are evaluated.  |
| `detectSubjectType` | `(subject: object) => string` | Custom subject-type detection, forwarded to the built Ability.                               |

`createForUser` lays down the Everyone permissions of every map first, then the permissions of each Role the user holds, so a Role can restrict what everyone may do with `cannot`. A user whose `roles` is missing or not an array holds no Roles and still gets the Everyone permissions; a user holding a Role named `everyone` does not get them twice.

An Unauthenticated request has no user, so it gets no Ability at all, which is different from a user who holds no Roles.

## The Denial rule: `decide`

`decide(ability, action, subject, options?)` returns whether the check is allowed, and when it is not, which answer it is:

```ts
import { decide } from '@jperezmart/casl-core';
import { subject } from '@casl/ability';

const decision = decide(
  ability,
  'update',
  subject('Article', { id: '7', authorId: 'u2', published: false }),
);

if (!decision.allowed) {
  decision.kind; // 'unauthenticated' | 'forbidden' | 'not-found'
  decision.message; // e.g. 'Insufficient permissions to update Article.'
}
```

The first row that matches decides ([ADR 0004](https://github.com/jperezmart/nest-casl/blob/main/docs/adr/0004-hide-what-the-user-cannot-read.md)):

| Check                                                         | Answer            |
| ------------------------------------------------------------- | ----------------- |
| no Ability (`null` or `undefined`)                            | `unauthenticated` |
| allowed                                                       | allowed           |
| denied against the subject type                               | `forbidden`       |
| denied against an instance whose type the action is denied on | `forbidden`       |
| denied against an instance the user **cannot** read either    | `not-found`       |
| denied against an instance the user **can** read              | `forbidden`       |

Check the subject type before loading an instance: a user whose rules allow the action on no record gets the same `forbidden` for every id, so it reveals nothing and nothing is loaded. "Can read" means the `'read'` action unless you pass another as `readAction`:

```ts
decide(ability, 'update', subject('Article', { id: '7' }), {
  readAction: 'view',
});
```

The action and subject are typed by your Ability type, as in CASL.

## The Access conditions: `accessConditions`

`accessConditions(ability, action, subjectType)` gives what a record must satisfy for the Ability to allow the action on it, so a query filtered by them returns exactly the records the user may act on:

```ts
import { accessConditions } from '@jperezmart/casl-core';

const conditions = accessConditions(ability, 'read', 'Article');

conditions.hasConditions; // false only when every record is allowed
conditions.toMongo(); // Mongo query; {} when every record is allowed
conditions.get(); // the same, or undefined when every record is allowed
conditions.toAst(); // a @ucast/core Condition, for SQL, Prisma or your own store
```

When the Ability allows no record at all, `get()`, `toMongo()` and `toAst()` throw a `NoRecordAllowedError` rather than hand back conditions that let records through. An Adapter answers it as forbidden.

## The Rules endpoint: `rulesResponse`

Every Adapter serves a Rules endpoint with the same shape, so the browser builds its Client ability ([`@jperezmart/casl-react`](https://github.com/jperezmart/nest-casl/tree/main/packages/casl-react)) the same way whatever the server. `rulesResponse(ability)` is that answer: an object whose `rules` holds the Ability's rules, packed with CASL's `packRules`. Its type is `RulesResponse<TAbility>`. An Unauthenticated request gets a 401 instead.

```ts
import { rulesResponse } from '@jperezmart/casl-core';

rulesResponse(ability); // { rules: [['read', 'Article', { published: true }]] }
```

It is an object rather than a bare array so fields can be added later without breaking clients.

## Testing

[`@jperezmart/casl-testing`](https://github.com/jperezmart/nest-casl/tree/main/packages/casl-testing) builds an Ability from your Role permissions through this core, without booting any framework.

## License

MIT
