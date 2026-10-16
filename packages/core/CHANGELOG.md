# @jperezmart/nest-casl

## 0.4.0

### Minor Changes

- [#49](https://github.com/jperezmart/casl-adapters/pull/49) [`61eff21`](https://github.com/jperezmart/casl-adapters/commit/61eff218adadee3b95ec3b8150963e491962d20c) Thanks [@jperezmart](https://github.com/jperezmart)! - `@jperezmart/nest-casl` is now the NestJS Adapter of `@jperezmart/casl-core`, with no change in public API and one in behaviour. The guard, the decorators and `assertCan` decide with the core's `decide` and answer with the same `UnauthorizedException`, `ForbiddenException` and `NotFoundException` as before; `CaslModule.forFeature` accumulates the core's list of Role permissions maps; the types it exported (`RolePermissions`, `AuthorizableUser`, `AccessConditionsAst`, `DefaultActions`…) are the core's, re-exported. The change: the `ForbiddenException` that `@CaslConditions()` throws when no record is allowed now carries the core's message (`No record of Article is allowed for read.`) instead of Nest's default `Forbidden`, as every other Adapter answers it.
  
  `@jperezmart/casl-core` is a new peer dependency, as `@casl/ability` already is, so an app using several Adapters has one copy of it. Install it alongside:
  
  ```bash
  pnpm add @jperezmart/casl-core
  ```

- [#49](https://github.com/jperezmart/casl-adapters/pull/49) [`1abd9ab`](https://github.com/jperezmart/casl-adapters/commit/1abd9ab9856b09f6f421e62348f42546a10ec83b) Thanks [@jperezmart](https://github.com/jperezmart)! - `CaslModule.forRulesEndpoint({ path })` serves the Rules endpoint, ready-made and optional: `GET <path>` answers `{ rules }`, the packed rules of the Ability of the user `getUserFromRequest` finds, and 401 to an Unauthenticated request. The browser builds its Client ability from it with `@jperezmart/casl-react`, so you no longer write the "my abilities" controller yourself.

- [#49](https://github.com/jperezmart/casl-adapters/pull/49) [`0864a7c`](https://github.com/jperezmart/casl-adapters/commit/0864a7c56013729b2914d4ebd1120c39a49a1bf5) Thanks [@jperezmart](https://github.com/jperezmart)! - **Breaking:** `AccessGuard` now denies (403) a route that has no `@UseAbility`, on the handler or its controller, whether the guard is applied per controller or as a global `APP_GUARD`. It used to let such a route through, so a forgotten decorator left the route open. The new `@AllowWithoutAbility()` decorator, on a handler or a whole controller, opens a route on purpose. There is no option to restore the old behaviour. The Rules endpoint of `CaslModule.forRulesEndpoint` carries the opt-out itself, so it still answers its own 401 under a global guard.
  
  To migrate, add `@AllowWithoutAbility()` to every route under the guard that is meant to be open (a health check, a public list, a grouped oRPC handler that checks inside):
  
  ```diff
  +import { AllowWithoutAbility } from '@jperezmart/nest-casl';
  
   @Get('health')
  +@AllowWithoutAbility()
   health() {}
  ```
  
  A route that is not under `AccessGuard` at all (no global guard, no `@UseGuards(AccessGuard)` on its controller, no `@UseAbility`) is not affected.

- [#49](https://github.com/jperezmart/casl-adapters/pull/49) [`f1a0088`](https://github.com/jperezmart/casl-adapters/commit/f1a00884e1542a3edf7878e2a431f742d37429e3) Thanks [@jperezmart](https://github.com/jperezmart)! - `createAbilityFactory().createForUser(user)` throws an `UndefinedConditionError` instead of building an Ability whose rule conditions hold `undefined`, such as `can('update', 'Article', { authorId: user.id })` for a user without `id`. Those conditions let every record through: `JSON.stringify` (the Rules endpoint), the MongoDB driver's `ignoreUndefined`, Mongoose and Prisma drop the field, so the Access conditions filtered nothing and the Client ability allowed every instance. Every Adapter answers such a request as an error (500), never as allowed. In `@jperezmart/nest-casl` this changes behaviour: the guard and the Rules endpoint now answer 500 for such a user, where they used to allow by those conditions.

### Patch Changes

- [#51](https://github.com/jperezmart/casl-adapters/pull/51) [`b47ec8a`](https://github.com/jperezmart/casl-adapters/commit/b47ec8a3a25207cfa9507e847735de4d802fae2a) Thanks [@jperezmart](https://github.com/jperezmart)! - The repository is now `jperezmart/casl-adapters`: the package metadata (`homepage`, `bugs`, `repository`) and the README links point at it. GitHub redirects the old URLs.

- [#49](https://github.com/jperezmart/casl-adapters/pull/49) [`1c5944d`](https://github.com/jperezmart/casl-adapters/commit/1c5944d7c03c5786101c8cdddb1ef0e51147c7c3) Thanks [@jperezmart](https://github.com/jperezmart)! - Every `CaslModule.forFeature` is now its own module on NestJS 10, and on NestJS 11 with `moduleIdGeneratorAlgorithm: 'deep-hash'`. Those key a dynamic module by a hash of its metadata, which was the same for every `forFeature`, so only the first permissions map was registered: the `cannot` rules and Role restrictions of every later feature were silently not enforced (and its grants were missing). Apps on those setups now get the rules of every feature, as on NestJS 11's default.

- [#49](https://github.com/jperezmart/casl-adapters/pull/49) [`7c64eb6`](https://github.com/jperezmart/casl-adapters/commit/7c64eb613ec70e414453a5649900f28d2100d769) Thanks [@jperezmart](https://github.com/jperezmart)! - Every Rules endpoint answers with `Cache-Control: private, no-store` (`RULES_CACHE_CONTROL`, exported by `@jperezmart/casl-core`), so a CDN or a shared proxy can no longer store one user's rules and serve them to another, and the browser keeps no copy that outlives a change of user. `CaslModule.forRulesEndpoint`, `rulesEndpoint` (Next.js) and both `rulesHandler`s (Hono, TanStack Start) set it on the 401 too. `@jperezmart/orpc-casl`'s `rulesProcedure` and `implementRules` set it through oRPC's `ResponseHeadersPlugin`, the only way a procedure sets a response header: add `new ResponseHeadersPlugin()` to your handler's `plugins`.
- Updated dependencies [[`61eff21`](https://github.com/jperezmart/casl-adapters/commit/61eff218adadee3b95ec3b8150963e491962d20c), [`b47ec8a`](https://github.com/jperezmart/casl-adapters/commit/b47ec8a3a25207cfa9507e847735de4d802fae2a), [`7c64eb6`](https://github.com/jperezmart/casl-adapters/commit/7c64eb613ec70e414453a5649900f28d2100d769), [`f1a0088`](https://github.com/jperezmart/casl-adapters/commit/f1a00884e1542a3edf7878e2a431f742d37429e3)]:
  - @jperezmart/casl-core@0.1.0

## 0.3.0

### Minor Changes

- [#31](https://github.com/jperezmart/nest-casl/pull/31) [`93d1b5e`](https://github.com/jperezmart/nest-casl/commit/93d1b5e0bbc153e1be364bbc957d5947417aeaed) Thanks [@jperezmart](https://github.com/jperezmart)! - `ConditionsProxy.toAst()` returns the Access conditions as an abstract syntax tree (a `@ucast/core` `Condition`, typed as the exported `AccessConditionsAst`), built with CASL's `rulesToAST`. Translate it for SQL, Prisma or your own repository instead of translating the Mongo query. Like `get()` and `toMongo()`, it throws `ForbiddenException` when the ability allows no record; when it allows every record, it is an empty `and`.

- [#30](https://github.com/jperezmart/nest-casl/pull/30) [`829adec`](https://github.com/jperezmart/nest-casl/commit/829adecd75854138d30b43f7477742a433c96d4b) Thanks [@jperezmart](https://github.com/jperezmart)! - **Breaking (fixes a record leak).** `@CaslConditions()` returns the Access conditions of the guarded action: every allowing rule OR-ed, every denying rule with conditions excluded. It used to return the conditions of one rule only, so filtering by them could let through records the user may not read. Migrating:
  
  - The conditions may now carry `$or`, `$and` and `$nor`. If you translate them for a database other than Mongo, make sure your translation handles those.
  - When the ability allows no record, `get()` and `toMongo()` throw `ForbiddenException` (they returned `undefined` and `{}`), and `hasConditions` is `true`. Behind the guard this does not happen: the guard already answers 403.
  
  What it fixes:
  
  - `can('read', 'Article')` with `cannot('read', 'Article', { secret: true })`: `toMongo()` was `{}`, which read the secret articles. It is now `{ $nor: [{ secret: true }] }`.
  - `can` `{ published: true }`, `can` `{ authorId: 'u1' }`, `cannot` `{ archived: true }`: it was `{ authorId: 'u1' }`, which missed published articles and let archived ones through. It now ORs both and excludes the archived ones.
  
  A lone allowing rule and an unconditional allow come back as before.

- [#22](https://github.com/jperezmart/nest-casl/pull/22) [`9587943`](https://github.com/jperezmart/nest-casl/commit/958794355e27980ed6a6171543c3bc9a7bb145d1) Thanks [@jperezmart](https://github.com/jperezmart)! - New `assertCan(ability, action, subject, options?)`: the guard's 404/403 decision as a plain function, for services, background jobs and grouped oRPC handlers — no guard, no dependency injection.
  
  - Allowed → returns.
  - Denied on a subject type (string or class) → `ForbiddenException`.
  - Denied on an instance the user cannot read either → `NotFoundException`, with Nest's default message, so it looks like a genuine not-found.
  - Any other denial → `ForbiddenException`.
  
  The read action is `'read'` unless you pass `{ readAction }`. It is generic over the ability, so a typed `AppAbility` checks `action`, `subject` and `readAction`. The guard decides with it too (see the guard's own entry). See [ADR 0004](https://github.com/jperezmart/nest-casl/blob/main/docs/adr/0004-hide-what-the-user-cannot-read.md).

- [#26](https://github.com/jperezmart/nest-casl/pull/26) [`56e26d9`](https://github.com/jperezmart/nest-casl/commit/56e26d9c1bf0cae08d8ca88d99e578ad3d6aa1ad) Thanks [@jperezmart](https://github.com/jperezmart)! - `getUserFromRequest` may be async. The guard awaits it before building the ability, so an app can load more about the user (tenants, flags kept in the database) that its rules read. With `forRootAsync`, `inject` the services it needs and close over them; there is no separate user hook.
  
  - Resolving to `undefined` is a 401, as before.
  - An `HttpException` it throws reaches the client unchanged (anything else is Nest's 500).
  - `@CaslUser()` hands the handler the user it resolved.
  
  Synchronous functions keep working as they do today.

- [#19](https://github.com/jperezmart/nest-casl/pull/19) [`fffaa7e`](https://github.com/jperezmart/nest-casl/commit/fffaa7e1855657da86c00acf095577d906a3e038) Thanks [@jperezmart](https://github.com/jperezmart)! - **Breaking.** A subject hook is a class only. The tuple form `[Hook, args]` is removed.
  
  The guard always dropped the tuple's `args`, so a hook written that way never saw its argument. Passing a tuple to `@UseAbility`, or to a decorator built with `createUseAbility`, is now a type error.
  
  - `SubjectBeforeFilterTuple` is no longer exported.
  - `UseAbilityMetadata['subjectHook']` is `Type<SubjectBeforeFilterHook>`.
  
  Migrating: for a parametrised hook, write a class factory, call it once, and register the result as a provider. The core README shows how.
  
  ```diff
  - @UseAbility('read', 'Article', [ArticleHook, 'slug'])
  + @UseAbility('read', 'Article', ArticleBySlugHook)
  ```
  
  where `ArticleBySlugHook = ArticleHookBy('slug')`, built once by a class factory and listed in `providers`.

- [#36](https://github.com/jperezmart/nest-casl/pull/36) [`9c05c18`](https://github.com/jperezmart/nest-casl/commit/9c05c18f5b7cc1cfc3a24b81afde02ad268e2c14) Thanks [@jperezmart](https://github.com/jperezmart)! - **Breaking.** A user whose rules allow an action on no instance of the subject type (no allowing rule, or an unconditional `cannot` that wins) now gets **403** for every instance, readable or not, and the guard answers it before running the subject hook (ADR 0004). Before, they got 404 for an instance they could not read and for an id the hook could not load. The 403 is the same for every id, so it reveals nothing, and the hook no longer loads a record for a request that cannot succeed. `assertCan` applies the same step, so the guard and your own checks still agree.
  
  Migrating: the subject type in `@UseAbility` must name the type the way your rules name it, which is what `detectSubjectType` reports for what the subject hook loads. `'Article'` and the class `Article` are different types to CASL: with rules written for `'Article'`, a route declaring the class `Article` now answers 403 to everyone but the superuser, even when its hook returns `Article` instances. A client or test that expected 404 for a user with no rule for the action now gets 403.
  
  - Denied on the subject type, behind a hook → **403** (was 404 for an unreadable or missing instance). The hook does not run.
  - `assertCan` on an instance whose type the action is denied on → `ForbiddenException` (was `NotFoundException` when the instance was unreadable).
  - A user who may perform the action on some instances keeps the 404/403 split, and a hook that loads nothing is still a 404 for them.

- [#21](https://github.com/jperezmart/nest-casl/pull/21) [`c67cc5c`](https://github.com/jperezmart/nest-casl/commit/c67cc5ca2f068fefdaa059dd5af7ee2c726ad638) Thanks [@jperezmart](https://github.com/jperezmart)! - **Breaking (types only).** `CaslModule.forFeature` and `buildAbilityForTest` no longer take a role-union type argument, since inferring it would mistake `everyone` for a Role. Type the map with `RolePermissions<Role, …>` to check its keys, and drop the first type argument where you passed one: `forFeature<Role, User>(…)` becomes `forFeature<User>(…)`, or no type arguments at all.
  
  Everyone permissions: a Role permissions map may carry an `everyone` entry, whose rules apply to every authenticated user, whatever Roles they hold — including none, or a missing `roles`.
  
  ```ts
  const permissions: RolePermissions<Role, AppUser> = {
    everyone(user, { can }) {
      can('read', 'Article', { published: true });
    },
    banned(_user, { cannot }) {
      cannot('read', 'Article');
    },
  };
  ```
  
  - `everyone` takes a function only, with the same `(user, builder)` as a Role's. `everyone: true` and `everyone: false` do not compile.
  - `everyone` cannot be a Role: `RolePermissions<'author' | 'everyone'>` does not compile, and a role literally named `everyone` on the user is ignored, so the rules apply once.
  - The rules are laid down before any Role's, so a Role can restrict them with `cannot`.
  - Every feature's `everyone` applies. The `superuserRole` still skips them all, and a request with no user is still a 401.
  - `buildAbilityForTest` builds the same Ability.

- [#24](https://github.com/jperezmart/nest-casl/pull/24) [`ecde36a`](https://github.com/jperezmart/nest-casl/commit/ecde36a22d4e73ed2c242574a7f107c79f7a6fb1) Thanks [@jperezmart](https://github.com/jperezmart)! - **Breaking.** The guard answers denials with the 404/403 rule of [ADR 0004](https://github.com/jperezmart/nest-casl/blob/main/docs/adr/0004-hide-what-the-user-cannot-read.md), by delegating to `assertCan`. Some former 403s are now 404s:
  
  - Denied on an instance the user cannot read either → **404** (was 403), with Nest's default body, identical to a genuine not-found.
  - A subject hook that loads nothing → **404** (was 403), for a user the subject type check lets through (see the entry on denying on the subject type first). It still never falls back to a check against the subject type.
  - Denied on an instance the user can read, or on a subject type (no hook) → 403, as before.
  
  No user is still 401, and allowed requests and the parameter decorators are unchanged.
  
  New `forRoot` option `readAction` (default `'read'`): the action that decides whether a denied instance is hidden. Set it when your app names its read action differently.
  
  ```ts
  CaslModule.forRoot<Role>({ readAction: 'view' });
  ```
  
  Migrating: a client or test that expected 403 for a record the user cannot see, or for a missing record behind a subject hook, now gets 404.

- [#38](https://github.com/jperezmart/nest-casl/pull/38) [`351e5e9`](https://github.com/jperezmart/nest-casl/commit/351e5e9fd6ec49de4e8054d6bc0cd97d4fbe42c4) Thanks [@jperezmart](https://github.com/jperezmart)! - **Breaking.** A `@UseAbility` built with `createUseAbility<AppAbility>()` now rejects a subject hook that loads something other than the subject type it names. `@UseAbility('read', 'Article', CommentHook)` compiled before and is now a type error, as ADR 0004 already asked: the subject type must be the type of what the hook loads.
  
  Migrating: point each route at the hook that loads its subject, or name the subject type the hook loads. A hook whose `run` returns a looser type than the subject (for example `SubjectBeforeFilterHook` with no type argument, returning `Subject`) needs its real return type. The bare `UseAbility` is unchanged.
  
  The hook is checked when the ability types the subject's instances: a class, or a subject tagged with its name (`kind`, `__typename` or `subject()`). For a string subject with no tagged instance, or for `all`, any hook goes, as before.

## 0.2.0

### Minor Changes

- [#9](https://github.com/jperezmart/nest-casl/pull/9) [`b759f2f`](https://github.com/jperezmart/nest-casl/commit/b759f2f62822c3edc3147322399c76dfa493f9e9) Thanks [@jperezmart](https://github.com/jperezmart)! - **Breaking (types only — nothing changes at runtime).** The types no longer assume what your user looks like.
  
  - `AuthorizableUser` is now `{ roles: readonly string[] }`. It has no type parameters and no `id`. The user may hold roles your app does not declare, e.g. every role a shared identity provider hands out. The library never read `id`. If your rules use it, declare it on your own user type.
  - The role union types only the keys of the permissions map and the `superuserRole`.
  - `CaslModule.forFeature` and `buildAbilityForTest` infer the role union, the user and the ability from `permissions`, so you no longer pass type arguments.
  - `Permissions` is renamed to `RolePermissions`, and `DefinePermissions` to `DefineRolePermissions`. No aliases are kept.
  - `CaslModuleAsyncOptions` types `inject` and `useFactory` the way Nest's own async modules do: `inject` takes injection tokens, and `useFactory` takes whatever they resolve to.
  - `BuildAbilityForTestOptions` is no longer generic, and its `superuserRole` is a `string`.
  
  Migrating:
  
  ```diff
  - interface AppUser extends AuthorizableUser<Role, string> {
  + interface AppUser extends AuthorizableUser {
      id: string;
    }
  - const permissions: Permissions<Role, AppUser> = { … };
  + const permissions: RolePermissions<Role, AppUser> = { … };
  - CaslModule.forFeature<Role, AppUser>({ permissions });
  + CaslModule.forFeature({ permissions });
  ```

## 0.1.2

### Patch Changes

- [#7](https://github.com/jperezmart/nest-casl/pull/7) [`6f2f8e7`](https://github.com/jperezmart/nest-casl/commit/6f2f8e70a031bc00d8d1c9b1e0e9b43079387868) Thanks [@jperezmart](https://github.com/jperezmart)! - Document `@jperezmart/nest-casl-testing` in the README. Permission maps are plain functions and can be unit-tested without booting Nest, but nothing in this package pointed at the helper that does it.

## 0.1.1

### Patch Changes

- 6113ed0: Docs: add npm version + license badges and a one-line install snippet to the
  package README.
