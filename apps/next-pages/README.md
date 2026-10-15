# next-pages

A Next.js **Pages Router** app over REST, authorized by
[`@jperezmart/next-casl`](../../packages/next-casl): the plain
backend-for-frontend setup, where the app's own server holds the session and
builds the Ability, with no NestJS service in between.

- [`lib/casl.ts`](lib/casl.ts) creates the Adapter once: the Role permissions of
  [`@jperezmart/example-shared`](../../packages/example-shared) and a `getUser`
  that reads the demo session from the request.
- The API routes under [`pages/api/articles`](pages/api/articles) use
  `casl.apiRoute`: the list is filtered by the Access conditions, and one article
  is checked by the Denial rule (403, or 404 for an article the user cannot read).
- [`pages/api/me/abilities.ts`](pages/api/me/abilities.ts) is the Rules endpoint,
  `casl.rulesEndpoint`, at the path `@jperezmart/casl-react` fetches by default.
- The article pages, [`pages/articles/[id]`](pages/articles/[id]), authorize in
  `casl.getServerSideProps`: 401 or 403 renders Next.js's error page through
  `withDenialPage` in [`pages/_app.tsx`](pages/_app.tsx), and an article the user
  cannot read is Next.js's own 404.
- In the browser, `<AbilityProvider>` (in `_app.tsx`) fetches the rules with
  **its default fetch**, and `<Can>` gates the tester's buttons. The Client
  ability only decides what the UI shows; the API routes decide what is allowed.

**Demo session:** switching user sets a `demo-user` cookie (as a login would set
a session cookie) and refreshes the rules. "Signed out" clears it: the Rules
endpoint answers 401 and the Client ability allows nothing.

## Run

```bash
pnpm build                          # build the package graph first
pnpm --filter next-pages dev        # http://localhost:3010
```

## What to try

- Switch between **Admin / Alice / Bob / Carol** and watch the article list, the
  enabled buttons and the rules panel change.
- As **Alice**, open `/articles/3/edit` (Bob's article, which she can read): 403.
  `/articles/4/edit` (Bob's draft, which she cannot read): 404, the same as
  `/articles/999/edit`.
- **Signed out**, open `/articles/1`: 401.

## Tests

`pnpm --filter next-pages test` boots the app's dev server in the test process
and drives it over HTTP. `articles`, `me` and `users` are the same suites as the
NestJS REST examples'; `pages` covers the pages' `getServerSideProps`.
