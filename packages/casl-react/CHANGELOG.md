# @jperezmart/casl-react

## 0.1.1

### Patch Changes

- [#55](https://github.com/jperezmart/casl-adapters/pull/55) [`ec9edd5`](https://github.com/jperezmart/casl-adapters/commit/ec9edd5f1ecd31d27e44b59c1c95cafe8d0209d6) Thanks [@jperezmart](https://github.com/jperezmart)! - `useQueryAbility` settles a query result that is not `{ rules }` with packed rules as a `MalformedRulesError` in `error`, as `AbilityProvider` does with `fetchRules`, so an app can tell malformed rules from a Client ability that allows nothing. Its Client ability still allows nothing for such a result.

## 0.1.0

### Minor Changes

- [#49](https://github.com/jperezmart/casl-adapters/pull/49) [`5fa3ee5`](https://github.com/jperezmart/casl-adapters/commit/5fa3ee5af06b9b6966c6f3428d1f61122f57ed1f) Thanks [@jperezmart](https://github.com/jperezmart)! - First release of `@jperezmart/casl-react`, the browser side of the `@jperezmart/casl-core` Adapters. It turns the rules a Rules endpoint serves into a Client ability, which only decides what the UI shows (ADR 0006). `createCaslReact<AppAbility>({ detectSubjectType })` binds it to your Ability type and returns:
  
  - `AbilityProvider`, which fetches the rules with `fetchRules`, by default from `/api/me/abilities` with the credentials included, or takes a `state` built elsewhere. The Client ability allows nothing while the rules load and after a 401 or any other failure;
  - `Can`, `@casl/react`'s component typed by your Ability, and the hooks `useAbility`, `useCan` and `useAbilityState`, which gives `isLoading`, `isUnauthenticated`, `error` and `refresh()`.
  
  The `@jperezmart/casl-react/tanstack-query` subpath adds `useQueryAbility(casl, queryOptions)`, which builds the Client ability from a TanStack Query, such as the query options oRPC's TanStack Query integration builds for the Rules endpoint procedure. Refreshing is invalidating that query. `@jperezmart/casl-core`, `@casl/ability`, `@casl/react` and `react` are peer dependencies, and `@tanstack/react-query` an optional one.

### Patch Changes

- [#51](https://github.com/jperezmart/casl-adapters/pull/51) [`b47ec8a`](https://github.com/jperezmart/casl-adapters/commit/b47ec8a3a25207cfa9507e847735de4d802fae2a) Thanks [@jperezmart](https://github.com/jperezmart)! - The repository is now `jperezmart/casl-adapters`: the package metadata (`homepage`, `bugs`, `repository`) and the README links point at it. GitHub redirects the old URLs.

- [#49](https://github.com/jperezmart/casl-adapters/pull/49) [`9f5aba3`](https://github.com/jperezmart/casl-adapters/commit/9f5aba3058650fd65ae99b645f6f51e4d790abf9) Thanks [@jperezmart](https://github.com/jperezmart)! - A Rules endpoint body that is not `{ rules }` with packed rules (`{ rules: "x" }`, a missing `rules`, a rule that is not packed, `null`) no longer crashes the render. `AbilityProvider` settles it as a `MalformedRulesError` in `useAbilityState().error`, and the Client ability allows nothing, as after any other failure; `createAbility` allows nothing for such a payload, so `useQueryAbility` and an SSR `state` cannot crash either.
- Updated dependencies [[`61eff21`](https://github.com/jperezmart/casl-adapters/commit/61eff218adadee3b95ec3b8150963e491962d20c), [`b47ec8a`](https://github.com/jperezmart/casl-adapters/commit/b47ec8a3a25207cfa9507e847735de4d802fae2a), [`7c64eb6`](https://github.com/jperezmart/casl-adapters/commit/7c64eb613ec70e414453a5649900f28d2100d769), [`f1a0088`](https://github.com/jperezmart/casl-adapters/commit/f1a00884e1542a3edf7878e2a431f742d37429e3)]:
  - @jperezmart/casl-core@0.1.0
