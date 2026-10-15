---
'@jperezmart/next-casl': minor
---

First release of `@jperezmart/next-casl`, the Next.js Pages Router Adapter of `@jperezmart/casl-core`, on the Node runtime. `createNextCasl({ getUser, permissions, superuserRole?, detectSubjectType?, readAction?, onUnauthenticated?, onForbidden? })` returns:

- `getServerSideProps(handler)`, which finds the request's Authorizable user with `getUser(req)`, builds their Ability through the core and hands `{ ability, user }` to the page's `getServerSideProps`. A denial answers by the Denial rule (ADR 0004): not found with Next.js's `{ notFound: true }`, forbidden and unauthenticated with the response status 403 or 401 and a denial prop;
- `apiRoute(handler)`, the same for an API route handler, which gets `{ ability, user }` as a third argument. A denial answers 404, 403 or 401 with a JSON `{ statusCode, message }`;
- `assertCan(ability, action, subject)`, which inside those wrappers answers by the Denial rule. The Access conditions' refusal (`NoRecordAllowedError`) answers as forbidden;
- `rulesEndpoint`, the Rules endpoint as a ready-made API route handler: `{ rules }` with the packed rules of the user's Ability, and 401 for an Unauthenticated request.

`withDenialPage(App, { ErrorPage? })` wraps the custom App so a page answered with the denial prop renders Next.js's error page (or the app's own) instead. `notFound()` answers a missing record exactly as a hidden one. `onUnauthenticated` and `onForbidden` answer those denials with a redirect instead; not found is not overridable, so existence stays hidden. `@jperezmart/casl-core`, `@casl/ability`, `next` and `react` are peer dependencies.
