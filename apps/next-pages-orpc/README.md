# next-pages-orpc

A Next.js **Pages Router** app over [oRPC](https://orpc.dev): the contract of
[`@jperezmart/orpc-contract`](../../packages/orpc-contract) served from one API
route, authorized by [`@jperezmart/orpc-casl`](../../packages/orpc-casl), with
the Client ability from
[`@jperezmart/casl-react/tanstack-query`](../../packages/casl-react).

- [`pages/api/[[...rest]].ts`](pages/api/[[...rest]].ts) mounts oRPC's
  `OpenAPIHandler` and hands every procedure the Node request as its context.
- [`lib/router.ts`](lib/router.ts) implements the contract, the same procedures
  as the NestJS oRPC example: `casl.middleware` adds the user's Ability, and
  `casl.assertCan` answers `FORBIDDEN` or `NOT_FOUND` by the Denial rule.
  `me.abilities` is the Rules endpoint, `casl.implementRules`.
- [`pages/articles/[id].tsx`](pages/articles/[id].tsx) reads an article in
  `getServerSideProps` with [`@jperezmart/next-casl`](../../packages/next-casl).
  Both Adapters, created in [`lib/casl.ts`](lib/casl.ts), find the user with the
  same function and share the Role permissions, so a page and a procedure agree.
- In the browser, [`pages/_app.tsx`](pages/_app.tsx) builds the Client ability
  with `useQueryAbility(casl, orpc.me.abilities.queryOptions())`; invalidating
  the queries after a user switch refreshes it. The Client ability only decides
  what the UI shows; the procedures decide what is allowed.

**Demo session:** switching user sets a `demo-user` cookie (as a login would set
a session cookie), which reaches both the procedures and the pages.

## Run

```bash
pnpm build                              # build the package graph first
pnpm --filter next-pages-orpc dev       # http://localhost:3011
```

## Tests

`pnpm --filter next-pages-orpc test` boots the app's dev server in the test
process and drives it over HTTP. `articles` and `me` are the same suites as the
NestJS examples'; `pages` covers the article page's `getServerSideProps`.
