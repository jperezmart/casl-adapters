# frontend-orpc

A [TanStack Router](https://tanstack.com/router) single-page app over the oRPC
example: a pure client with no server of its own, talking to
[`backend-orpc`](../backend-orpc) through a typed oRPC client and
[TanStack Query](https://tanstack.com/query).

- **The Client ability** comes from the Rules endpoint procedure
  (`me.abilities`). [`App.tsx`](src/App.tsx) passes oRPC's query options for it
  (`orpc.me.abilities.queryOptions()`, from `@orpc/tanstack-query`) to
  `useQueryAbility` of
  [`@jperezmart/casl-react/tanstack-query`](../../packages/casl-react), and hands
  the result to `<AbilityProvider state>` for `<Can>`.
- **Refreshing is invalidating.** Switching the demo user invalidates every
  query ([`Layout.tsx`](src/pages/Layout.tsx)), the rules' included, so the
  Client ability follows.
- **Route protection, by hand.** There is no router helper in the library.
  `App` puts the Client ability in the router context
  (`<RouterProvider context={{ ability }}>`) and calls `router.invalidate()`
  whenever it changes; the `/articles/new` route checks it in its `beforeLoad`
  and redirects when `create Article` is not allowed
  ([`router.tsx`](src/router.tsx)). Behind Keycloak, with no login screen, the
  same wiring works with the token in the oRPC link's headers.

The Client ability only decides what the UI shows: every oRPC procedure
authorizes again on the server with `@jperezmart/orpc-casl`.

The ability type and `detectSubjectType` come from the client-safe barrel of
[`@jperezmart/orpc-abilities`](../../packages/orpc-abilities); the Role
permissions sit under its `./server` entry, so they never reach the bundle.

## Run

```bash
pnpm build                          # build the package graph first
pnpm --filter backend-orpc dev      # :3002
pnpm --filter frontend-orpc dev     # http://localhost:5174
```

Vite proxies `/api` to the backend (see [`vite.config.ts`](vite.config.ts));
override the target with `API_TARGET`, e.g.
`API_TARGET=http://127.0.0.1:3004` for the same contract on Hono
([`backend-orpc-hono`](../backend-orpc-hono)).

## What to try

- Switch user, then open **New article**: Admin, Alice and Bob get the form;
  Carol and "Signed out" are sent back by the route's `beforeLoad`.
- Open **New article** as Alice, then switch to Carol: the route re-checks and
  redirects.
- As Alice, try **Edit** on Bob's article: the button is disabled by `<Can>`.
