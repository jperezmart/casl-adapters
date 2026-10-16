# @jperezmart/hono-casl

## 0.1.0

### Minor Changes

- [#49](https://github.com/jperezmart/casl-adapters/pull/49) [`627d84e`](https://github.com/jperezmart/casl-adapters/commit/627d84ec20ca3d50c8ad642eb9be51dd39a06a66) Thanks [@jperezmart](https://github.com/jperezmart)! - First release of `@jperezmart/hono-casl`, the Hono Adapter of `@jperezmart/casl-core`. `createHonoCasl({ getUser, permissions, superuserRole?, detectSubjectType?, readAction?, onUnauthenticated?, onForbidden? })`, where `getUser` finds the Authorizable user from the request's Hono context, returns:
  
  - `middleware`, which puts `{ ability, user }` in the Hono context, typed through its `Variables` (`c.var.ability`, `c.var.user`), and answers an Unauthenticated request before the handler runs;
  - `assertCan(ability, action, subject)`, which answers by the Denial rule with Hono's `HTTPException`: 401, 403 or 404, with a JSON `{ statusCode, message }`. Behind the middleware, `onUnauthenticated` and `onForbidden` answer instead with a `Response` (typically `c.redirect(…)`); not found has no hook. The middleware also answers the Access conditions' `NoRecordAllowedError` as forbidden, and `notFound()` throws the same 404 for a missing record as for a hidden one;
  - `rulesHandler`, the Rules endpoint as a Hono handler: `{ rules }`, the packed rules of the user's Ability, or 401 without a session.
  
  It uses only web standards and Hono's own exports, so it runs wherever Hono runs. `@jperezmart/casl-core`, `@casl/ability` and `hono` are peer dependencies.

### Patch Changes

- [#51](https://github.com/jperezmart/casl-adapters/pull/51) [`b47ec8a`](https://github.com/jperezmart/casl-adapters/commit/b47ec8a3a25207cfa9507e847735de4d802fae2a) Thanks [@jperezmart](https://github.com/jperezmart)! - The repository is now `jperezmart/casl-adapters`: the package metadata (`homepage`, `bugs`, `repository`) and the README links point at it. GitHub redirects the old URLs.

- [#49](https://github.com/jperezmart/casl-adapters/pull/49) [`7c64eb6`](https://github.com/jperezmart/casl-adapters/commit/7c64eb613ec70e414453a5649900f28d2100d769) Thanks [@jperezmart](https://github.com/jperezmart)! - Every Rules endpoint answers with `Cache-Control: private, no-store` (`RULES_CACHE_CONTROL`, exported by `@jperezmart/casl-core`), so a CDN or a shared proxy can no longer store one user's rules and serve them to another, and the browser keeps no copy that outlives a change of user. `CaslModule.forRulesEndpoint`, `rulesEndpoint` (Next.js) and both `rulesHandler`s (Hono, TanStack Start) set it on the 401 too. `@jperezmart/orpc-casl`'s `rulesProcedure` and `implementRules` set it through oRPC's `ResponseHeadersPlugin`, the only way a procedure sets a response header: add `new ResponseHeadersPlugin()` to your handler's `plugins`.
- Updated dependencies [[`61eff21`](https://github.com/jperezmart/casl-adapters/commit/61eff218adadee3b95ec3b8150963e491962d20c), [`b47ec8a`](https://github.com/jperezmart/casl-adapters/commit/b47ec8a3a25207cfa9507e847735de4d802fae2a), [`7c64eb6`](https://github.com/jperezmart/casl-adapters/commit/7c64eb613ec70e414453a5649900f28d2100d769), [`f1a0088`](https://github.com/jperezmart/casl-adapters/commit/f1a00884e1542a3edf7878e2a431f742d37429e3)]:
  - @jperezmart/casl-core@0.1.0
