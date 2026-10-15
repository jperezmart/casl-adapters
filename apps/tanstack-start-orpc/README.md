# tanstack-start-orpc

A TanStack Start app over oRPC: the example's contract
([`@jperezmart/orpc-contract`](../../packages/orpc-contract)) is served from the
app's own server, authorized by
[`@jperezmart/orpc-casl`](../../packages/orpc-casl), and the Client ability
comes from [`@jperezmart/casl-react/tanstack-query`](../../packages/casl-react).

- [`routes/api/$.ts`](src/routes/api/$.ts) is a Start server route that hands
  every request under `/api` (the contract's prefix) to oRPC's
  `OpenAPIHandler`, with the web `Request` as the procedures' context.
- [`server/router.ts`](src/server/router.ts) implements the contract. The
  oRPC Adapter's `getUser` reads the session cookie from that `Request`; its
  middleware adds the Ability to each procedure's context and its `assertCan`
  answers `UNAUTHORIZED`, `FORBIDDEN` or `NOT_FOUND` by the Denial rule.
  `me.abilities` is the Adapter's ready-made Rules endpoint
  (`casl.implementRules`).
- [`routes/__root.tsx`](src/routes/__root.tsx) builds the Client ability with
  `useQueryAbility(casl, orpc.me.abilities.queryOptions())`. Switching user
  invalidates every query, the rules among them.

The Role permissions live on the server only: the client imports the
abilities package's client-safe barrel (the Ability type and
`detectSubjectType`).

**Demo session:** the home page switches user by setting a `demo-user` cookie
(as a login would set a session cookie). Same seed as the other examples.

## Run

```bash
pnpm build                                  # build the package graph first
pnpm --filter tanstack-start-orpc dev       # http://localhost:3201
```

## Test

```bash
pnpm --filter tanstack-start-orpc test
```

The suite builds the app, serves the production build on a free port and
calls the Rules endpoint procedure and a protected procedure over HTTP.
