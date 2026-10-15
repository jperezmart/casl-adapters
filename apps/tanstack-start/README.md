# tanstack-start

A TanStack Start app on [`@jperezmart/tanstack-start-casl`](../../packages/tanstack-start-casl),
over REST: its own server holds the session and the Role permissions, with no
backend in between (ADR 0006). The Client ability comes from
[`@jperezmart/casl-react`](../../packages/casl-react) with its **default fetch**.

- **Server functions** ([`articles.functions.ts`](src/articles.functions.ts)) run
  the Adapter's middleware ([`middleware.ts`](src/middleware.ts)) and check with
  `casl.assertCan`. An article page's loader calls one: a hidden or missing
  article renders the not-found component (404), no session the error
  component, which recognises the `DenialError` (401). The edit page uses a
  second Adapter with `onUnauthenticated` and `onForbidden`, which redirect home
  or to `/forbidden`.
- **Server routes** under [`routes/api`](src/routes/api) serve the same articles
  as REST with `casl.routeMiddleware`, answering 401, 403 or 404, and the Rules
  endpoint at `/api/me/abilities` with `casl.rulesHandler`.
- [`casl.ts`](src/casl.ts) creates the Adapters; it is only imported inside
  server code, so the Role permissions never reach the client bundle.
  [`start.ts`](src/start.ts) registers `denialErrorAdapter`, so the
  `DenialError` reaches the browser as itself.

**Demo session:** the home page switches user by setting a `demo-user` cookie
(as a login would set a session cookie), which `getUser` reads with
`@jperezmart/example-shared`'s demo auth. The roles, Article and Role permissions
are the NestJS examples' (seed: alice's #1 and draft #2, bob's #3 and draft #4,
alice's archived #5).

## Run

```bash
pnpm build                              # build the package graph first
pnpm --filter tanstack-start dev        # http://localhost:3200
```

## Test

```bash
pnpm --filter tanstack-start test
```

Server functions only run inside Start's runtime, so the suites in
[`test/`](test) build the app, serve the production build on a free port and
drive it over HTTP: the server functions the way Start's client calls them (the
ids are readable, see [`vite.config.ts`](vite.config.ts)), the pages and the
REST routes.
