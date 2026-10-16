# @jperezmart/casl-core

## 0.1.0

### Minor Changes

- [#49](https://github.com/jperezmart/casl-adapters/pull/49) [`61eff21`](https://github.com/jperezmart/casl-adapters/commit/61eff218adadee3b95ec3b8150963e491962d20c) Thanks [@jperezmart](https://github.com/jperezmart)! - First release of `@jperezmart/casl-core`, the framework-free core every Adapter builds on. It depends only on CASL and holds:
  
  - the Role permissions types (`RolePermissions`, `DefineRolePermissions`, `AuthorizableUser`, `AppAbility` and the ability helper types);
  - `createAbilityFactory({ permissions, superuserRole?, detectSubjectType? })`, which builds a user's Ability from an explicit list of Role permissions maps: the Everyone permissions first, then the user's Roles, everything for the Superuser role, and no Roles for missing or malformed ones;
  - `decide(ability, action, subject, options?)`, the Denial rule (ADR 0004), which returns `{ allowed: true }` or a denial whose `kind` is `'unauthenticated'`, `'forbidden'` or `'not-found'`, with its message, instead of throwing;
  - the denials no check decides, so every Adapter answers them alike: `unauthenticatedDenial` (no Authorizable user), `notFoundDenial` (a missing record, answered as a hidden one) and `forbiddenDenialOf(error)` (the Access conditions' `NoRecordAllowedError`);
  - `accessConditions(ability, action, subjectType)`, the Access conditions in Mongo syntax or as an AST, which throw a `NoRecordAllowedError` when no record is allowed.
  - `createAdapterKit(options)`, the framework-free half of an Adapter: from the options every Adapter takes (`AdapterOptions`: `getUser`, `readAction`, `onUnauthenticated`, `onForbidden` and the Ability's), the request's `CaslContext` (`{ ability, user }`, or `null` when unauthenticated), `decide` with the Adapter's `readAction`, and the app's hook for a denial.
  - `rulesResponse(ability)`, the answer of every Rules endpoint: `{ rules }`, the Ability's packed rules, typed `RulesResponse<TAbility>`.

### Patch Changes

- [#51](https://github.com/jperezmart/casl-adapters/pull/51) [`b47ec8a`](https://github.com/jperezmart/casl-adapters/commit/b47ec8a3a25207cfa9507e847735de4d802fae2a) Thanks [@jperezmart](https://github.com/jperezmart)! - The repository is now `jperezmart/casl-adapters`: the package metadata (`homepage`, `bugs`, `repository`) and the README links point at it. GitHub redirects the old URLs.

- [#49](https://github.com/jperezmart/casl-adapters/pull/49) [`7c64eb6`](https://github.com/jperezmart/casl-adapters/commit/7c64eb613ec70e414453a5649900f28d2100d769) Thanks [@jperezmart](https://github.com/jperezmart)! - Every Rules endpoint answers with `Cache-Control: private, no-store` (`RULES_CACHE_CONTROL`, exported by `@jperezmart/casl-core`), so a CDN or a shared proxy can no longer store one user's rules and serve them to another, and the browser keeps no copy that outlives a change of user. `CaslModule.forRulesEndpoint`, `rulesEndpoint` (Next.js) and both `rulesHandler`s (Hono, TanStack Start) set it on the 401 too. `@jperezmart/orpc-casl`'s `rulesProcedure` and `implementRules` set it through oRPC's `ResponseHeadersPlugin`, the only way a procedure sets a response header: add `new ResponseHeadersPlugin()` to your handler's `plugins`.

- [#49](https://github.com/jperezmart/casl-adapters/pull/49) [`f1a0088`](https://github.com/jperezmart/casl-adapters/commit/f1a00884e1542a3edf7878e2a431f742d37429e3) Thanks [@jperezmart](https://github.com/jperezmart)! - `createAbilityFactory().createForUser(user)` throws an `UndefinedConditionError` instead of building an Ability whose rule conditions hold `undefined`, such as `can('update', 'Article', { authorId: user.id })` for a user without `id`. Those conditions let every record through: `JSON.stringify` (the Rules endpoint), the MongoDB driver's `ignoreUndefined`, Mongoose and Prisma drop the field, so the Access conditions filtered nothing and the Client ability allowed every instance. Every Adapter answers such a request as an error (500), never as allowed. In `@jperezmart/nest-casl` this changes behaviour: the guard and the Rules endpoint now answer 500 for such a user, where they used to allow by those conditions.
