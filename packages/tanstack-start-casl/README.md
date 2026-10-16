# @jperezmart/tanstack-start-casl

[![npm version](https://img.shields.io/npm/v/@jperezmart/tanstack-start-casl.svg)](https://www.npmjs.com/package/@jperezmart/tanstack-start-casl)
[![license](https://img.shields.io/npm/l/@jperezmart/tanstack-start-casl.svg)](./LICENSE)

The [TanStack Start](https://tanstack.com/start) Adapter of [`@jperezmart/casl-core`](https://github.com/jperezmart/nest-casl/tree/main/packages/casl-core): it finds the Authorizable user of a request, builds their [CASL](https://casl.js.org) Ability and answers denials the way Start does, following the Denial rule ([ADR 0004](https://github.com/jperezmart/nest-casl/blob/main/docs/adr/0004-hide-what-the-user-cannot-read.md)).

It covers server functions and server routes, and works unchanged in SPA mode, where both still run on the server. It offers:

- a **middleware** for server functions and one for server routes, each adding the request's Ability (and user) to the context;
- an **`assertCan`** that answers by the Denial rule: the router's not-found, or a 401 / 403 with a typed `DenialError`;
- the **Rules endpoint** as a ready-made server route handler, for the browser to rebuild a Client ability.

## Install

```bash
pnpm add @jperezmart/tanstack-start-casl @jperezmart/casl-core @casl/ability
```

`@jperezmart/casl-core`, `@casl/ability@^7`, `@tanstack/react-start@^1.169` and `@tanstack/react-router@^1.170` are peer dependencies, so an app that also uses another Adapter (oRPC inside Start, say) has exactly one copy of the core.

## Two entry points

- **`@jperezmart/tanstack-start-casl/server`** holds `createStartCasl`, the Adapter. It reaches Start's server-only module, so import it only from modules the client bundle never loads, or only inside `.server(…)` steps, which Start strips from the client.
- **`@jperezmart/tanstack-start-casl`**, the root, is client-safe: `DenialError`, `isDenialError`, `denialErrorAdapter` and the types. Error components and `src/start.ts` import from here. `/server` re-exports all of it too.

Importing the Adapter from client code would drag Start's server code into the browser, and in `vite dev` the page would not hydrate.

## Set up: `createStartCasl`

Create the Adapter once, with the Role permissions and a `getUser` that finds the Authorizable user of a web `Request` (from its session cookie, say):

```ts
// src/casl.ts
import type { InferSubjects, MongoAbility } from '@casl/ability';
import type { RolePermissions } from '@jperezmart/casl-core';
import { createStartCasl } from '@jperezmart/tanstack-start-casl/server';

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

export const casl = createStartCasl<AppUser, AppAbility>({
  getUser: request => findSessionUser(request),
  permissions: [permissions],
  superuserRole: 'admin',
  detectSubjectType: subject => (subject as Article).kind,
});
```

| Option              | Type                                     | Effect                                                                                      |
| ------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| `getUser`           | `(request) => user \| null`, maybe async | Finds the Authorizable user; `null` or `undefined` is an Unauthenticated request.           |
| `permissions`       | `RolePermissions[]`                      | Every Role permissions map of the app, merged in order, as `createAbilityFactory` takes it. |
| `superuserRole`     | `string`                                 | A user holding this Role may do everything.                                                 |
| `detectSubjectType` | `(subject: object) => string`            | Custom subject-type detection, forwarded to the built Ability.                              |
| `readAction`        | an action of the Ability                 | The action that decides whether a denied instance is hidden. Defaults to `'read'`.          |
| `onUnauthenticated` | `(denial) => unknown`                    | Answers an Unauthenticated request instead of the default: returns what to throw.           |
| `onForbidden`       | `(denial) => unknown`                    | Answers a forbidden denial instead of the default: returns what to throw.                   |

## Server functions

Server functions are referenced from client code, so their middleware is too. The Adapter therefore hands you the middleware's server step, `casl.functionMiddlewareServer`, and you create the middleware with it. Start strips `.server(…)` from the client bundle, and with it the import of `./casl`: the Adapter and your Role permissions stay on the server.

```ts
// src/middleware.ts
import { createMiddleware } from '@tanstack/react-start';

import { casl } from './casl';

export const caslMiddleware = createMiddleware({ type: 'function' }).server(
  casl.functionMiddlewareServer,
);
```

It calls `getUser` with the request, builds the user's Ability and adds `{ ability, user }` to the context. An Unauthenticated request is answered before the handler runs, so server functions open to Unauthenticated requests do not use it ([Unauthenticated requests](#unauthenticated-requests)).

Before that, it refuses as forbidden (403, a `DenialError`) a call the browser marks as cross-site, by `Sec-Fetch-Site` or else `Origin`, so another site cannot call a server function with the user's session cookie. It is a second line: register Start's own CSRF middleware in `src/start.ts` too ([below](#recognising-the-denial-in-an-error-component)).

Then check with `casl.assertCan(ability, action, subject)`. There is no load-then-check helper: check the subject type, load the instance, then check the instance. Checking the type first answers 403 to a user who may act on no article, the same for every id, before anything is loaded.

```ts
// src/articles.functions.ts
import { notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';

import { casl } from './casl';
import { caslMiddleware } from './middleware';

declare function findArticle(id: string): Promise<Article | undefined>;

export const getArticle = createServerFn()
  .middleware([caslMiddleware])
  .validator((data: { id: string }) => data)
  .handler(async ({ context, data }) => {
    casl.assertCan(context.ability, 'read', 'Article');
    const article = await findArticle(data.id);
    if (!article) throw notFound();
    casl.assertCan(context.ability, 'read', article);
    return article;
  });
```

`assertCan` returns when the Ability allows the check and otherwise throws:

| Denial                                                     | In a server function                                   |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| no Ability (Unauthenticated request)                       | response status 401, throws `DenialError`              |
| the action is denied on the subject type                   | response status 403, throws `DenialError`              |
| the instance is denied, and the user cannot read it either | throws `notFound()`, exactly as for a missing instance |
| the instance is denied, but the user can read it           | response status 403, throws `DenialError`              |

The status is that of the whole response: a server function call answers 401 or 403, and so does a page whose loader called it during server rendering, even if the loader catches the error. Not found is the router's own, so the nearest `notFoundComponent` renders and a hidden record answers exactly like a missing one (a 404 page).

### Recognising the denial in an error component

`DenialError` carries the denial's `kind` (`'unauthenticated'` or `'forbidden'`), its `status` (401 or 403) and the core's message. Start keeps only an error's message across the wire, so register the package's serialization adapter for the error to reach the browser as itself. A `startInstance` of your own replaces Start's default CSRF middleware, so register that again too:

```ts
// src/start.ts
import { denialErrorAdapter } from '@jperezmart/tanstack-start-casl';
import { createCsrfMiddleware, createStart } from '@tanstack/react-start';

export const startInstance = createStart(() => ({
  // Server functions are same-origin RPC endpoints: refuse cross-site calls.
  requestMiddleware: [
    createCsrfMiddleware({ filter: ctx => ctx.handlerType === 'serverFn' }),
  ],
  serializationAdapters: [denialErrorAdapter],
}));
```

Then recognise it with `isDenialError`:

```tsx
import { isDenialError } from '@jperezmart/tanstack-start-casl';
import type { ErrorComponentProps } from '@tanstack/react-router';
import { ErrorComponent } from '@tanstack/react-router';

export function DenialErrorComponent(props: ErrorComponentProps) {
  if (!isDenialError(props.error)) return <ErrorComponent {...props} />;
  return props.error.kind === 'unauthenticated' ? (
    <p>Sign in to see this page.</p>
  ) : (
    <p>You may not see this page.</p>
  );
}
```

## Server routes

Server routes never reach the client, so their middleware is ready-made: `casl.routeMiddleware`. It adds the same `{ ability, user }` to the handlers' context, and answers every denial, thrown by it or by the handler's `assertCan`, with a `Response` carrying a JSON `{ message }`:

| Denial                                                     | Response |
| ---------------------------------------------------------- | -------- |
| no Ability (Unauthenticated request)                       | 401      |
| the action is denied on the subject type                   | 403      |
| the instance is denied, and the user cannot read it either | 404      |
| the instance is denied, but the user can read it           | 403      |

A `notFound()` the handler throws itself (a missing record) answers the same 404.

Before anything else, `casl.routeMiddleware` refuses with a 403 a write (`POST`, `PUT`, `PATCH` or `DELETE`) the browser marks as cross-site, by `Sec-Fetch-Site` or else `Origin`, the same check as server functions. Start's CSRF middleware never covers server routes, so without it another site could send a form or a simple `fetch` to the route with the user's session cookie. Reads (`GET`, `HEAD`, `OPTIONS`) go through: CORS decides who may read the answer. A request with neither header comes from no browser (a server, a webhook) and goes through too. A route meant to take cross-site writes from browsers does not use `casl.routeMiddleware`.

```ts
// src/routes/api/articles/$id.ts
import { createFileRoute, notFound } from '@tanstack/react-router';

import { casl } from '../../../casl';

export const Route = createFileRoute('/api/articles/$id')({
  server: {
    middleware: [casl.routeMiddleware],
    handlers: {
      GET: async ({ context, params }) => {
        casl.assertCan(context.ability, 'read', 'Article');
        const article = await findArticle(params.id);
        if (!article) throw notFound();
        casl.assertCan(context.ability, 'read', article);
        return Response.json(article);
      },
    },
  },
});
```

### Filtering lists

Use the core's `accessConditions` with the context's Ability. When the user may act on no record at all, it throws `NoRecordAllowedError`; both middlewares answer that as forbidden:

```ts
import { accessConditions } from '@jperezmart/casl-core';

declare function findArticles(query: object): Promise<Article[]>;

export const listArticles = createServerFn()
  .middleware([caslMiddleware])
  .handler(({ context }) =>
    findArticles(
      accessConditions(context.ability, 'read', 'Article').toMongo(),
    ),
  );
```

## Unauthenticated requests

The server function middleware, `casl.routeMiddleware` and `casl.rulesHandler` answer an Unauthenticated request (401, or what `onUnauthenticated` throws) before the handler runs, so a handler under them always has an Ability and a user and never checks for a missing one. This is deliberate: an Unauthenticated request gets no Ability at all, unlike a user who holds no Roles, so there is nothing to check it against. A server function or server route open to Unauthenticated requests (a public listing, a login) simply does not use them.

## Overriding the answers

`onUnauthenticated` and `onForbidden` receive the core's denial (`{ kind, message }`) and return (or throw) what to throw instead, typically a redirect. The response status is then left alone:

```ts
import { redirect } from '@tanstack/react-router';

export const redirectingCasl = createStartCasl<AppUser, AppAbility>({
  getUser: request => findSessionUser(request),
  permissions: [permissions],
  onUnauthenticated: () => redirect({ to: '/login' }),
  onForbidden: () => redirect({ to: '/forbidden' }),
});
```

In a server route, return a `Response` (a redirect is one): the route middleware answers with it. Not found has no hook: it always answers not found, so existence stays hidden.

## The Rules endpoint

`casl.rulesHandler` is the Rules endpoint as a server route handler. It answers `{ rules }`, the packed rules (`packRules` from `@casl/ability/extra`) of the user's Ability, for the browser to rebuild a Client ability, and 401 to an Unauthenticated request. Its body is `RulesResponse<AppAbility>`, declared by `@jperezmart/casl-core` for every Adapter and re-exported here. Every answer, the 401 included, carries `Cache-Control: private, no-store`: the rules are the user's own, so no CDN or proxy may store them and serve them to someone else. Mount it at `/api/me/abilities`, the path [`@jperezmart/casl-react`](https://github.com/jperezmart/nest-casl/tree/main/packages/casl-react) fetches by default, or anywhere else:

```ts
// src/routes/api/me/abilities.ts
import { createFileRoute } from '@tanstack/react-router';

import { casl } from '../../../casl';

export const Route = createFileRoute('/api/me/abilities')({
  server: { handlers: { GET: casl.rulesHandler } },
});
```

The Client ability only decides what the UI shows; what the server allows is decided by the server's Ability alone ([ADR 0006](https://github.com/jperezmart/nest-casl/blob/main/docs/adr/0006-each-app-builds-its-own-ability.md)).

## With oRPC

To serve oRPC from a Start server route, use [`@jperezmart/orpc-casl`](https://github.com/jperezmart/nest-casl/tree/main/packages/orpc-casl) in the procedures and hand them the web `Request` as their context. The [`tanstack-start-orpc` example](https://github.com/jperezmart/nest-casl/tree/main/apps/tanstack-start-orpc) does this.

## Testing

Server functions only run inside Start's runtime, so test them over HTTP against your app's server; the [`tanstack-start` example](https://github.com/jperezmart/nest-casl/tree/main/apps/tanstack-start) builds the app and drives its production server that way. Build abilities for unit tests of your Role permissions with [`@jperezmart/casl-testing`](https://github.com/jperezmart/nest-casl/tree/main/packages/casl-testing).

## License

[MIT](./LICENSE)
