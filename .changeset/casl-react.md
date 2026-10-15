---
'@jperezmart/casl-react': minor
---

First release of `@jperezmart/casl-react`, the browser side of the `@jperezmart/casl-core` Adapters. It turns the rules a Rules endpoint serves into a Client ability, which only decides what the UI shows (ADR 0006). `createCaslReact<AppAbility>({ detectSubjectType })` binds it to your Ability type and returns:

- `AbilityProvider`, which fetches the rules with `fetchRules`, by default from `/api/me/abilities` with the credentials included, or takes a `state` built elsewhere. The Client ability allows nothing while the rules load and after a 401 or any other failure;
- `Can`, `@casl/react`'s component typed by your Ability, and the hooks `useAbility`, `useCan` and `useAbilityState`, which gives `isLoading`, `isUnauthenticated`, `error` and `refresh()`.

The `@jperezmart/casl-react/tanstack-query` subpath adds `useQueryAbility(casl, queryOptions)`, which builds the Client ability from a TanStack Query, such as the query options oRPC's TanStack Query integration builds for the Rules endpoint procedure. Refreshing is invalidating that query. `@jperezmart/casl-core`, `@casl/ability`, `@casl/react` and `react` are peer dependencies, and `@tanstack/react-query` an optional one.
