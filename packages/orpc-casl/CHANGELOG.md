# @jperezmart/orpc-casl

## 0.1.0

### Minor Changes

- [#49](https://github.com/jperezmart/casl-adapters/pull/49) [`c639a35`](https://github.com/jperezmart/casl-adapters/commit/c639a35b35bb6046ef0b2b1130e5ce390f98ce8e) Thanks [@jperezmart](https://github.com/jperezmart)! - First release of `@jperezmart/orpc-casl`, the oRPC Adapter of `@jperezmart/casl-core`. It works the same wherever oRPC is mounted (a NestJS controller, a Next.js API route or a TanStack Start server route). `createOrpcCasl({ getUser, permissions, superuserRole?, detectSubjectType?, readAction?, onUnauthenticated?, onForbidden? })` returns:
  
  - `middleware`, which finds the request's Authorizable user with `getUser(context)`, builds their Ability through the core and adds `{ ability, user }` to the procedure context. An Unauthenticated request gets `UNAUTHORIZED`, and the Access conditions' refusal (`NoRecordAllowedError`) gets `FORBIDDEN`;
  - `assertCan(ability, action, subject)`, which throws `UNAUTHORIZED`, `FORBIDDEN` or `NOT_FOUND` by the Denial rule (ADR 0004);
  - the Rules endpoint, `{ rules }` with the packed rules of the user's Ability: `rulesProcedure` for a router-first app, `implementRules(contractProcedure)` for a contract-first one.
  
  `onUnauthenticated` and `onForbidden` answer those denials differently; not found is not overridable, so existence stays hidden. `@jperezmart/casl-core`, `@casl/ability` and `@orpc/server` are peer dependencies.

### Patch Changes

- [#51](https://github.com/jperezmart/casl-adapters/pull/51) [`b47ec8a`](https://github.com/jperezmart/casl-adapters/commit/b47ec8a3a25207cfa9507e847735de4d802fae2a) Thanks [@jperezmart](https://github.com/jperezmart)! - The repository is now `jperezmart/casl-adapters`: the package metadata (`homepage`, `bugs`, `repository`) and the README links point at it. GitHub redirects the old URLs.

- [#49](https://github.com/jperezmart/casl-adapters/pull/49) [`7c64eb6`](https://github.com/jperezmart/casl-adapters/commit/7c64eb613ec70e414453a5649900f28d2100d769) Thanks [@jperezmart](https://github.com/jperezmart)! - Every Rules endpoint answers with `Cache-Control: private, no-store` (`RULES_CACHE_CONTROL`, exported by `@jperezmart/casl-core`), so a CDN or a shared proxy can no longer store one user's rules and serve them to another, and the browser keeps no copy that outlives a change of user. `CaslModule.forRulesEndpoint`, `rulesEndpoint` (Next.js) and both `rulesHandler`s (Hono, TanStack Start) set it on the 401 too. `@jperezmart/orpc-casl`'s `rulesProcedure` and `implementRules` set it through oRPC's `ResponseHeadersPlugin`, the only way a procedure sets a response header: add `new ResponseHeadersPlugin()` to your handler's `plugins`.
- Updated dependencies [[`61eff21`](https://github.com/jperezmart/casl-adapters/commit/61eff218adadee3b95ec3b8150963e491962d20c), [`b47ec8a`](https://github.com/jperezmart/casl-adapters/commit/b47ec8a3a25207cfa9507e847735de4d802fae2a), [`7c64eb6`](https://github.com/jperezmart/casl-adapters/commit/7c64eb613ec70e414453a5649900f28d2100d769), [`f1a0088`](https://github.com/jperezmart/casl-adapters/commit/f1a00884e1542a3edf7878e2a431f742d37429e3)]:
  - @jperezmart/casl-core@0.1.0
