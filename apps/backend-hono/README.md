# backend-hono

[`backend-simple`](../backend-simple)'s REST API — same routes, same demo auth,
same seed — on [Hono](https://hono.dev) instead of NestJS, authorized by
[`@jperezmart/hono-casl`](../../packages/hono-casl). The Role permissions come
from [`@jperezmart/example-shared`](../../packages/example-shared), so the plain
Vite [`frontend`](../frontend) works against it unchanged.

## Run

```bash
pnpm --filter backend-hono dev     # http://localhost:3003 (PORT to override), Node's own TypeScript support, in watch mode
pnpm --filter backend-hono build   # then: pnpm --filter backend-hono start
pnpm --filter backend-hono test    # e2e: the NestJS examples' suites, every route, per user
API_TARGET=http://127.0.0.1:3003 pnpm --filter frontend dev
```

## Demo "auth"

As in `backend-simple`: an `x-user-id` header (one of `admin`, `alice`, `bob`,
`carol`), optionally `x-user-roles`, or a `demo-user` cookie holding the id.

## What it demonstrates

- `createHonoCasl({ getUser, permissions, superuserRole: 'admin', detectSubjectType })`
  in [`src/casl.ts`](./src/casl.ts), with `getUser` reading the request's headers
- `casl.middleware` on the article routes and `/me`, putting `c.var.ability`
  and `c.var.user` in the context (401 without a user)
- The Denial rule by hand in [`src/app.ts`](./src/app.ts): check the subject
  type, load the article (`notFound()` for a missing one), check the article
  with `casl.assertCan` — 404 when the user cannot read it, 403 otherwise
- The list filtered by the core's `accessConditions(...).toMongo()`
- The ready-made Rules endpoint, `app.get('/me/abilities', casl.rulesHandler)`

## Endpoints

| Method | Path                               | Rule                                         |
| ------ | ---------------------------------- | -------------------------------------------- |
| GET    | `/articles`                        | `read`, filtered by the Access conditions    |
| GET    | `/articles/:id`                    | `read` (type, then the loaded article)       |
| POST   | `/articles`                        | `create` (authors only)                      |
| PATCH  | `/articles/:id`                    | `update` (own, not archived; admin bypasses) |
| DELETE | `/articles/:id`                    | `delete` (own, not archived)                 |
| GET    | `/me` · `/me/abilities` · `/users` | demo helpers                                 |

The e2e suites under `test/` (`articles`, `me`, `users`) are byte-identical
copies of `backend-simple`'s; only `test/app.ts` differs.
