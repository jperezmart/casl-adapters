# @jperezmart/orpc-casl

[![npm version](https://img.shields.io/npm/v/@jperezmart/orpc-casl.svg)](https://www.npmjs.com/package/@jperezmart/orpc-casl)
[![license](https://img.shields.io/npm/l/@jperezmart/orpc-casl.svg)](./LICENSE)

The [oRPC](https://orpc.dev) Adapter of [`@jperezmart/casl-core`](https://github.com/jperezmart/nest-casl/tree/main/packages/casl-core): it finds the Authorizable user of a request, builds their [CASL](https://casl.js.org) Ability and answers denials with oRPC's own `UNAUTHORIZED`, `FORBIDDEN` and `NOT_FOUND`, following the Denial rule ([ADR 0004](https://github.com/jperezmart/nest-casl/blob/main/docs/adr/0004-hide-what-the-user-cannot-read.md)).

It works the same wherever oRPC is mounted: a NestJS controller (`@orpc/nest`), a Next.js API route or a TanStack Start server route. It offers:

- a **middleware** that adds the request's Ability (and user) to the procedure context;
- an **`assertCan`** that throws oRPC's errors by the Denial rule;
- the **Rules endpoint** as a ready-made procedure, for the browser to rebuild a Client ability.

## Install

```bash
pnpm add @jperezmart/orpc-casl @jperezmart/casl-core @casl/ability @orpc/server
```

`@jperezmart/casl-core`, `@casl/ability@^7` and `@orpc/server@^1.14` are peer dependencies, so an app that also uses another Adapter (oRPC inside Next.js, say) has exactly one copy of the core.

## Set up: `createOrpcCasl`

Create the Adapter once, with the Role permissions and a `getUser` that finds the Authorizable user in the procedure context your oRPC handler is given:

```ts
import type { InferSubjects, MongoAbility } from '@casl/ability';
import type { RolePermissions } from '@jperezmart/casl-core';
import { createOrpcCasl } from '@jperezmart/orpc-casl';

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

/** What your handler passes as `context` (here, the request headers). */
interface AppContext {
  headers: Headers;
}

declare function findSessionUser(headers: Headers): Promise<AppUser | null>;

const permissions: RolePermissions<'author', AppUser, AppAbility> = {
  everyone(_user, { can }) {
    can('read', 'Article', { published: true });
  },
  author(user, { can }) {
    can('read', 'Article', { authorId: user.id });
    can('update', 'Article', { authorId: user.id });
  },
};

export const casl = createOrpcCasl<AppContext, AppUser, AppAbility>({
  getUser: context => findSessionUser(context.headers),
  permissions: [permissions],
  superuserRole: 'admin',
  detectSubjectType: subject => (subject as Article).kind,
});
```

| Option              | Type                                     | Effect                                                                                      |
| ------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| `getUser`           | `(context) => user \| null`, maybe async | Finds the Authorizable user; `null` or `undefined` is an Unauthenticated request.           |
| `permissions`       | `RolePermissions[]`                      | Every Role permissions map of the app, merged in order, as `createAbilityFactory` takes it. |
| `superuserRole`     | `string`                                 | A user holding this Role may do everything.                                                 |
| `detectSubjectType` | `(subject: object) => string`            | Custom subject-type detection, forwarded to the built Ability.                              |
| `readAction`        | an action of the Ability                 | The action that decides whether a denied instance is hidden. Defaults to `'read'`.          |
| `onUnauthenticated` | `(denial) => Error`                      | Answers an Unauthenticated request instead of `UNAUTHORIZED`.                               |
| `onForbidden`       | `(denial) => Error`                      | Answers a forbidden denial instead of `FORBIDDEN`.                                          |

## The middleware

`casl.middleware` calls `getUser`, builds the user's Ability and adds `{ ability, user }` to the context. An Unauthenticated request is answered `UNAUTHORIZED` before the handler runs, so procedures open to Unauthenticated requests do not use it ([Unauthenticated requests](#unauthenticated-requests)).

```ts
import { os } from '@orpc/server';

const authed = os.$context<AppContext>().use(casl.middleware);

export const whoAmI = authed.handler(({ context }) => context.user);
```

In a contract-first app, use it on the implementer: `implement(contract).$context<AppContext>().use(casl.middleware)`, or per procedure.

## Checking: `casl.assertCan`

`casl.assertCan(ability, action, subject)` returns when the Ability allows the check and otherwise throws by the Denial rule:

| Denial                                                     | Error          |
| ---------------------------------------------------------- | -------------- |
| no Ability (Unauthenticated request)                       | `UNAUTHORIZED` |
| the action is denied on the subject type                   | `FORBIDDEN`    |
| the instance is denied, and the user cannot read it either | `NOT_FOUND`    |
| the instance is denied, but the user can read it           | `FORBIDDEN`    |

There is no load-then-check helper: check the subject type, load the instance, then check the instance. Checking the type first answers `FORBIDDEN` to a user who may act on no article, the same for every id, before anything is loaded.

```ts
import { ORPCError } from '@orpc/server';
import { z } from 'zod';

declare function findArticle(id: string): Promise<Article | undefined>;

export const updateArticle = authed
  .input(z.object({ id: z.string(), title: z.string() }))
  .handler(async ({ input, context }) => {
    casl.assertCan(context.ability, 'update', 'Article');
    const article = await findArticle(input.id);
    if (!article) throw new ORPCError('NOT_FOUND');
    casl.assertCan(context.ability, 'update', article);
    // … update it
  });
```

`NOT_FOUND` carries oRPC's default message, so a hidden record answers exactly like a missing one (`new ORPCError('NOT_FOUND')`). `UNAUTHORIZED` and `FORBIDDEN` carry the core's message. Pass `{ readAction }` as a fourth argument to override the read action for one check.

### Filtering lists

Use the core's `accessConditions` with the context's Ability. When the user may act on no record at all, it throws `NoRecordAllowedError`; the middleware answers that `FORBIDDEN` (or with `onForbidden`):

```ts
import { accessConditions } from '@jperezmart/casl-core';

declare function findArticles(query: object): Promise<Article[]>;

export const listArticles = authed.handler(({ context }) =>
  findArticles(accessConditions(context.ability, 'read', 'Article').toMongo()),
);
```

## Unauthenticated requests

`casl.middleware` and the Rules endpoint procedures answer an Unauthenticated request (`UNAUTHORIZED`, or `onUnauthenticated`'s error) before the handler runs, so a handler under them always has an Ability and a user and never checks for a missing one. This is deliberate: an Unauthenticated request gets no Ability at all, unlike a user who holds no Roles, so there is nothing to check it against. A procedure open to Unauthenticated requests (a public listing, a login) simply does not use them.

## Overriding the answers

`onUnauthenticated` and `onForbidden` receive the core's denial (`{ kind, message }`) and return (or throw) the error to throw instead, for example to add a payload:

```ts
import { ORPCError } from '@orpc/server';

export const customCasl = createOrpcCasl<AppContext, AppUser, AppAbility>({
  getUser: context => findSessionUser(context.headers),
  permissions: [permissions],
  onUnauthenticated: () =>
    new ORPCError('UNAUTHORIZED', { data: { login: '/login' } }),
  onForbidden: denial =>
    new ORPCError('FORBIDDEN', { data: { reason: denial.message } }),
});
```

Not found has no hook: it always answers `NOT_FOUND`, so existence stays hidden.

## The Rules endpoint

The Rules endpoint answers `{ rules }`, the packed rules (`packRules` from `@casl/ability/extra`) of the user's Ability, for the browser to rebuild a Client ability. An Unauthenticated request gets `UNAUTHORIZED`. Its type is `RulesResponse<AppAbility>`, declared by `@jperezmart/casl-core` for every Adapter and re-exported here.

In a router-first app, mount `casl.rulesProcedure` under any key:

```ts
export const router = {
  me: {
    rules: casl.rulesProcedure.route({ method: 'GET', path: '/me/rules' }),
  },
  articles: { update: updateArticle, list: listArticles },
};
```

In a contract-first app, declare the procedure in your contract, with an output that accepts `{ rules }`, and implement it with `casl.implementRules`:

```ts
import { oc } from '@orpc/contract';
import { implement } from '@orpc/server';

export const contract = {
  me: {
    rules: oc
      .route({ method: 'GET', path: '/me/rules' })
      .output(z.object({ rules: z.array(z.unknown()) })),
  },
};

export const contractRouter = implement(contract)
  .$context<AppContext>()
  .router({ me: { rules: casl.implementRules(contract.me.rules) } });
```

Both answer with `Cache-Control: private, no-store`, so no CDN or proxy stores one user's rules and serves them to someone else, but a procedure can only set a response header through oRPC's `ResponseHeadersPlugin`. Give it to your handler, and let your context take the headers it adds:

```ts
import { OpenAPIHandler } from '@orpc/openapi/fetch';
import type { ResponseHeadersPluginContext } from '@orpc/server/plugins';
import { ResponseHeadersPlugin } from '@orpc/server/plugins';

interface AppContext extends ResponseHeadersPluginContext {
  request: Request;
}

const handler = new OpenAPIHandler(router, {
  plugins: [new ResponseHeadersPlugin()],
});
```

The Client ability only decides what the UI shows; what the server allows is decided by the server's Ability alone ([ADR 0006](https://github.com/jperezmart/nest-casl/blob/main/docs/adr/0006-each-app-builds-its-own-ability.md)).

## Mounted in NestJS

With `@orpc/nest`, give the procedures the request as their context and read the user from it. The [`backend-orpc` example](https://github.com/jperezmart/nest-casl/tree/main/apps/backend-orpc) does this:

```ts
import { Module } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { ORPCModule } from '@orpc/nest';

declare module '@orpc/nest' {
  interface ORPCGlobalContext {
    request: { headers?: Record<string, unknown> };
  }
}

@Module({
  imports: [
    ORPCModule.forRootAsync({
      useFactory: (request: { headers?: Record<string, unknown> }) => ({
        context: { request },
      }),
      inject: [REQUEST],
    }),
  ],
})
export class AppModule {}
```

Then create the Adapter with `createOrpcCasl<ORPCGlobalContext, AppUser, AppAbility>({ getUser: ({ request }) => …, … })` and use `casl.middleware` on each `implement(contract.…)` your `@Implement` methods return.

## Testing

Call procedures with oRPC's server-side `call` and a test context; build abilities for unit tests of your Role permissions with [`@jperezmart/casl-testing`](https://github.com/jperezmart/nest-casl/tree/main/packages/casl-testing).

```ts
import { call } from '@orpc/server';

await call(
  updateArticle,
  { id: '1', title: 'New' },
  {
    context: { headers: new Headers({ cookie: 'session=…' }) },
  },
);
```

## License

[MIT](./LICENSE)
