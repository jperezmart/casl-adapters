# backend-orpc-hono

The oRPC example's contract ([`@jperezmart/orpc-contract`](../../packages/orpc-contract))
mounted on [Hono](https://hono.dev) instead of NestJS, authorized by the same
oRPC Adapter, [`@jperezmart/orpc-casl`](../../packages/orpc-casl), with the Role
permissions from `@jperezmart/orpc-abilities/server`. It implements the same
contract as [`backend-orpc`](../backend-orpc), so
[`frontend-orpc`](../frontend-orpc) works against either. In-memory, no
database.

## Run

```bash
pnpm --filter backend-orpc-hono dev     # http://localhost:3004 (PORT to override), Node's own TypeScript support, in watch mode
pnpm --filter backend-orpc-hono build   # then: pnpm --filter backend-orpc-hono start
pnpm --filter backend-orpc-hono test    # e2e: backend-orpc's suites, over HTTP
API_TARGET=http://127.0.0.1:3004 pnpm --filter frontend-orpc dev
```

The demo user is the `x-user-id` header (`admin`, `alice`, `bob` or `carol`),
as `frontend-orpc` sends it.

## How it fits together

- [`src/casl.ts`](./src/casl.ts) creates the Adapter with
  `createOrpcCasl<AppContext, AppUser, AppAbility>`, where `AppContext` is
  `{ request: Request }` and `getUser` reads the header from it.
- [`src/router.ts`](./src/router.ts) implements the contract router-first with
  `implement(contract).$context<AppContext>().use(casl.middleware)`: check the
  subject type, load from the validated `input`, check the loaded article
  (`FORBIDDEN` or `NOT_FOUND` by the Denial rule). `me.abilities` is the
  Adapter's ready-made Rules endpoint, `casl.implementRules(contract.me.abilities)`.
- [`src/app.ts`](./src/app.ts) mounts oRPC's fetch `OpenAPIHandler` on
  `/api/*` (the contract carries the prefix), handing each procedure
  `{ request: c.req.raw }` as its context.

Plain Hono routes would use [`@jperezmart/hono-casl`](../../packages/hono-casl)
instead; see [`backend-hono`](../backend-hono).

The e2e suites under `test/` (`articles`, `me`) are byte-identical copies of
`backend-orpc`'s; only `test/app.ts` differs.
