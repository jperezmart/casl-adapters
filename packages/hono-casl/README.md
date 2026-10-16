# @jperezmart/hono-casl

[![npm version](https://img.shields.io/npm/v/@jperezmart/hono-casl.svg)](https://www.npmjs.com/package/@jperezmart/hono-casl)
[![license](https://img.shields.io/npm/l/@jperezmart/hono-casl.svg)](./LICENSE)

The [Hono](https://hono.dev) Adapter of [`@jperezmart/casl-core`](https://github.com/jperezmart/casl-adapters/tree/main/packages/casl-core): it finds the Authorizable user of a request, builds their [CASL](https://casl.js.org) Ability and answers denials with HTTP responses, following the Denial rule ([ADR 0004](https://github.com/jperezmart/casl-adapters/blob/main/docs/adr/0004-hide-what-the-user-cannot-read.md)).

It offers:

- a **middleware** that puts the request's Ability (and user) in the Hono context, typed;
- an **`assertCan`** that answers by the Denial rule: 401, 403 or 404, with a JSON body;
- the **Rules endpoint** as a ready-made handler, for the browser to rebuild a Client ability.

It uses only web standards and Hono's own exports, so it runs wherever Hono runs (Node, Bun, Deno, Cloudflare Workers…).

## Install

```bash
pnpm add @jperezmart/hono-casl @jperezmart/casl-core @casl/ability hono
```

`@jperezmart/casl-core`, `@casl/ability@^7` and `hono@^4` are peer dependencies, so an app that also uses another Adapter (oRPC mounted on Hono, say) has exactly one copy of the core.

## Set up: `createHonoCasl`

Create the Adapter once, with the Role permissions and a `getUser` that finds the Authorizable user of a request from its Hono context (from its session cookie, say):

```ts
// src/casl.ts
import type { InferSubjects, MongoAbility } from '@casl/ability';
import type { RolePermissions } from '@jperezmart/casl-core';
import { createHonoCasl } from '@jperezmart/hono-casl';

interface AppUser {
  id: string;
  roles: string[];
}

interface Article {
  readonly kind: 'Article';
  id: string;
  authorId: string;
  published: boolean;
}

type AppAbility = MongoAbility<
  ['read' | 'create' | 'update' | 'delete', InferSubjects<Article> | 'all']
>;

declare function findSessionUser(request: Request): Promise<AppUser | null>;

const permissions: RolePermissions<'author', AppUser, AppAbility> = {
  everyone(_user, { can }) {
    can('read', 'Article', { published: true });
  },
  author(user, { can }) {
    can('read', 'Article', { authorId: user.id });
    can('update', 'Article', { authorId: user.id });
  },
};

export const casl = createHonoCasl<AppUser, AppAbility>({
  getUser: c => findSessionUser(c.req.raw),
  permissions: [permissions],
  superuserRole: 'admin',
  detectSubjectType: subject => (subject as Article).kind,
});
```

| Option              | Type                                   | Effect                                                                                      |
| ------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------- |
| `getUser`           | `(c) => user \| null`, maybe async     | Finds the Authorizable user; `null` or `undefined` is an Unauthenticated request.           |
| `permissions`       | `RolePermissions[]`                    | Every Role permissions map of the app, merged in order, as `createAbilityFactory` takes it. |
| `superuserRole`     | `string`                               | A user holding this Role may do everything.                                                 |
| `detectSubjectType` | `(subject: object) => string`          | Custom subject-type detection, forwarded to the built Ability.                              |
| `readAction`        | an action of the Ability               | The action that decides whether a denied instance is hidden. Defaults to `'read'`.          |
| `onUnauthenticated` | `(denial, c) => Response \| undefined` | Answers an Unauthenticated request instead of the default 401, maybe async.                 |
| `onForbidden`       | `(denial, c) => Response \| undefined` | Answers a forbidden denial instead of the default 403, maybe async.                         |

When an authentication middleware runs first and puts the user (or session) in the context, give its env as the third type argument and read it in `getUser`:

```ts
interface AuthEnv {
  Variables: { session: { user: AppUser } | null };
}

export const sessionCasl = createHonoCasl<AppUser, AppAbility, AuthEnv>({
  getUser: c => c.var.session?.user,
  permissions: [permissions],
});
```

## The middleware

`casl.middleware` calls `getUser`, builds the user's Ability and puts `{ ability, user }` in the context, so the routes after it read `c.var.ability` and `c.var.user`, typed by your Ability and user. An Unauthenticated request is answered before the handler runs, so routes open to Unauthenticated requests do not use it ([Unauthenticated requests](#unauthenticated-requests)).

```ts
// src/app.ts
import { notFound } from '@jperezmart/hono-casl';
import { Hono } from 'hono';

import { casl } from './casl';

declare function findArticle(id: string): Promise<Article | undefined>;

export const app = new Hono()
  .use('/articles/*', casl.middleware)
  .get('/articles/:id', async c => {
    casl.assertCan(c.var.ability, 'read', 'Article');
    const article = await findArticle(c.req.param('id'));
    if (!article) notFound();
    casl.assertCan(c.var.ability, 'read', article);
    return c.json(article);
  });
```

A route can also take it on its own: `app.get('/articles/:id', casl.middleware, c => …)`.

## `assertCan` and the Denial rule

Check with `casl.assertCan(ability, action, subject)`. There is no load-then-check helper: check the subject type, load the instance, then check the instance. Checking the type first answers 403 to a user who may act on no article, the same for every id, before anything is loaded.

`assertCan` returns when the Ability allows the check, and otherwise throws Hono's `HTTPException` carrying the answer, a JSON `{ statusCode, message }`:

| Denial                                                     | Response                                         |
| ---------------------------------------------------------- | ------------------------------------------------ |
| no Ability (Unauthenticated request)                       | 401                                              |
| the action is denied on the subject type                   | 403                                              |
| the instance is denied, and the user cannot read it either | 404 `Not Found`, exactly as for a missing record |
| the instance is denied, but the user can read it           | 403                                              |

For a record that does not exist, call `notFound()` from `@jperezmart/hono-casl`: it throws the same 404, so a hidden record and a missing one cannot be told apart. (Hono's own `c.notFound()` answers a plain-text 404, which can.)

Hono's default error handler answers an `HTTPException` with its response. If your app sets `app.onError`, return `err.getResponse()` for an `HTTPException`, as Hono's docs recommend; behind `casl.middleware` the denial's answer replaces whatever the error handler returned anyway.

### Filtering lists

Use the core's `accessConditions` with the context's Ability. When the user may act on no record at all, it throws `NoRecordAllowedError`; `casl.middleware` answers that as forbidden (403), after Hono's error handler has seen (and logged) it:

```ts
import { accessConditions } from '@jperezmart/casl-core';

declare function findArticles(query: object): Promise<Article[]>;

app.get('/articles', async c =>
  c.json(
    await findArticles(
      accessConditions(c.var.ability, 'read', 'Article').toMongo(),
    ),
  ),
);
```

## Unauthenticated requests

`casl.middleware` and `casl.rulesHandler` answer an Unauthenticated request (401, or `onUnauthenticated`'s answer for the middleware) before the handler runs, so a handler behind the middleware always has an Ability and a user and never checks for a missing one. This is deliberate: an Unauthenticated request gets no Ability at all, unlike a user who holds no Roles, so there is nothing to check it against. A route open to Unauthenticated requests (a public listing, a login) simply does not use the middleware.

## Overriding the answers

`onUnauthenticated` and `onForbidden` receive the core's denial (`{ kind, message }`) and the context, and return the `Response` to answer with, typically a redirect, or nothing to keep the default:

```ts
export const redirectingCasl = createHonoCasl<AppUser, AppAbility>({
  getUser: c => findSessionUser(c.req.raw),
  permissions: [permissions],
  onUnauthenticated: (_denial, c) => c.redirect(`/login?from=${c.req.path}`),
  onForbidden: (_denial, c) => c.redirect('/forbidden'),
});
```

They apply to what `casl.middleware` answers: the Unauthenticated request it stops, and the denials the handlers behind it throw. Not found has no hook: it always answers 404, so existence stays hidden.

## The Rules endpoint

`casl.rulesHandler` is the Rules endpoint as a Hono handler. It answers `{ rules }`, the packed rules (`packRules` from `@casl/ability/extra`) of the user's Ability, for the browser to rebuild a Client ability, and 401 to an Unauthenticated request (never `onUnauthenticated`'s answer, so the browser can tell there is no session). Its body is `RulesResponse<AppAbility>`, declared by `@jperezmart/casl-core` for every Adapter and re-exported here. Every answer, the 401 included, carries `Cache-Control: private, no-store`: the rules are the user's own, so no CDN or proxy may store them and serve them to someone else. Mount it where [`@jperezmart/casl-react`](https://github.com/jperezmart/casl-adapters/tree/main/packages/casl-react) fetches it (`/api/me/abilities` by default), or anywhere else:

```ts
app.get('/api/me/abilities', casl.rulesHandler);
```

The Client ability only decides what the UI shows; what the server allows is decided by the server's Ability alone ([ADR 0006](https://github.com/jperezmart/casl-adapters/blob/main/docs/adr/0006-each-app-builds-its-own-ability.md)).

## With oRPC

To serve an oRPC contract from Hono, use [`@jperezmart/orpc-casl`](https://github.com/jperezmart/casl-adapters/tree/main/packages/orpc-casl) in the procedures and hand them the request as their context; this Adapter is for plain Hono routes. The [`backend-orpc-hono` example](https://github.com/jperezmart/casl-adapters/tree/main/apps/backend-orpc-hono) does this, and [`backend-hono`](https://github.com/jperezmart/casl-adapters/tree/main/apps/backend-hono) uses this Adapter for a REST API.

## Testing

Drive your app with Hono's `app.request(…)`, as this package's own tests do. Build abilities for unit tests of your Role permissions with [`@jperezmart/casl-testing`](https://github.com/jperezmart/casl-adapters/tree/main/packages/casl-testing).

## License

[MIT](./LICENSE)
