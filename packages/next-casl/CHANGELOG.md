# @jperezmart/next-casl

## 0.1.0

### Minor Changes

- [#49](https://github.com/jperezmart/casl-adapters/pull/49) [`a3b1005`](https://github.com/jperezmart/casl-adapters/commit/a3b100574405e0e544516cffe63c48ae9b15cafa) Thanks [@jperezmart](https://github.com/jperezmart)! - First release of `@jperezmart/next-casl`, the Next.js Pages Router Adapter of `@jperezmart/casl-core`, on the Node runtime. `createNextCasl({ getUser, permissions, superuserRole?, detectSubjectType?, readAction?, onUnauthenticated?, onForbidden? })` returns:
  
  - `getServerSideProps(handler)`, which finds the request's Authorizable user with `getUser(req)`, builds their Ability through the core and hands `{ ability, user }` to the page's `getServerSideProps`. A denial answers by the Denial rule (ADR 0004): not found with Next.js's `{ notFound: true }`, forbidden and unauthenticated with the response status 403 or 401 and a denial prop;
  - `apiRoute(handler)`, the same for an API route handler, which gets `{ ability, user }` as a third argument. A denial answers 404, 403 or 401 with a JSON `{ statusCode, message }`;
  - `assertCan(ability, action, subject)`, which inside those wrappers answers by the Denial rule. The Access conditions' refusal (`NoRecordAllowedError`) answers as forbidden;
  - `rulesEndpoint`, the Rules endpoint as a ready-made API route handler: `{ rules }` with the packed rules of the user's Ability, and 401 for an Unauthenticated request.
  
  `withDenialPage(App, { ErrorPage? })` wraps the custom App so a page answered with the denial prop renders Next.js's error page (or the app's own) instead. `notFound()` answers a missing record exactly as a hidden one. `onUnauthenticated` and `onForbidden` answer those denials with a redirect instead; not found is not overridable, so existence stays hidden. `@jperezmart/casl-core`, `@casl/ability`, `next` and `react` are peer dependencies.

### Patch Changes

- [#51](https://github.com/jperezmart/casl-adapters/pull/51) [`b47ec8a`](https://github.com/jperezmart/casl-adapters/commit/b47ec8a3a25207cfa9507e847735de4d802fae2a) Thanks [@jperezmart](https://github.com/jperezmart)! - The repository is now `jperezmart/casl-adapters`: the package metadata (`homepage`, `bugs`, `repository`) and the README links point at it. GitHub redirects the old URLs.

- [#49](https://github.com/jperezmart/casl-adapters/pull/49) [`2018122`](https://github.com/jperezmart/casl-adapters/commit/20181229f45a6c42afaf2a546546657eb6986ccc) Thanks [@jperezmart](https://github.com/jperezmart)! - `withDenialPage(App)` keeps the custom App's `getInitialProps`. It used to return a component without it, so Next.js silently stopped running an App-level gate placed there (a login redirect, a tenant check), and pages that relied on it were served to anyone.

- [#49](https://github.com/jperezmart/casl-adapters/pull/49) [`7c64eb6`](https://github.com/jperezmart/casl-adapters/commit/7c64eb613ec70e414453a5649900f28d2100d769) Thanks [@jperezmart](https://github.com/jperezmart)! - Every Rules endpoint answers with `Cache-Control: private, no-store` (`RULES_CACHE_CONTROL`, exported by `@jperezmart/casl-core`), so a CDN or a shared proxy can no longer store one user's rules and serve them to another, and the browser keeps no copy that outlives a change of user. `CaslModule.forRulesEndpoint`, `rulesEndpoint` (Next.js) and both `rulesHandler`s (Hono, TanStack Start) set it on the 401 too. `@jperezmart/orpc-casl`'s `rulesProcedure` and `implementRules` set it through oRPC's `ResponseHeadersPlugin`, the only way a procedure sets a response header: add `new ResponseHeadersPlugin()` to your handler's `plugins`.
- Updated dependencies [[`61eff21`](https://github.com/jperezmart/casl-adapters/commit/61eff218adadee3b95ec3b8150963e491962d20c), [`b47ec8a`](https://github.com/jperezmart/casl-adapters/commit/b47ec8a3a25207cfa9507e847735de4d802fae2a), [`7c64eb6`](https://github.com/jperezmart/casl-adapters/commit/7c64eb613ec70e414453a5649900f28d2100d769), [`f1a0088`](https://github.com/jperezmart/casl-adapters/commit/f1a00884e1542a3edf7878e2a431f742d37429e3)]:
  - @jperezmart/casl-core@0.1.0
