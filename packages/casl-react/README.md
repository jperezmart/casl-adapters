# @jperezmart/casl-react

[![npm version](https://img.shields.io/npm/v/@jperezmart/casl-react.svg)](https://www.npmjs.com/package/@jperezmart/casl-react)
[![license](https://img.shields.io/npm/l/@jperezmart/casl-react.svg)](./LICENSE)

The browser side of the [`@jperezmart/casl-core`](https://github.com/jperezmart/casl-adapters/tree/main/packages/casl-core) Adapters. It fetches the current user's rules from your server's Rules endpoint and turns them into a **Client ability**, which `Can` and the hooks read, typed by your own Ability type. A `/tanstack-query` subpath builds it from a TanStack Query instead, such as the one oRPC's TanStack Query integration gives you.

Every Adapter serves the Rules endpoint with the same shape (`{ rules }`, the packed rules of the user's Ability, and 401 without a session), so this package works whatever the server: NestJS (`CaslModule.forRulesEndpoint`), oRPC (`casl.rulesProcedure`), Next.js or TanStack Start.

> The Client ability only decides what the UI shows. Hiding a button or a route is not enforcement: what the server allows is decided by the server's Ability alone ([ADR 0006](https://github.com/jperezmart/casl-adapters/blob/main/docs/adr/0006-each-app-builds-its-own-ability.md)).

## Install

```bash
pnpm add @jperezmart/casl-react @jperezmart/casl-core @casl/ability @casl/react
```

`@jperezmart/casl-core`, `@casl/ability@^7`, `@casl/react@^7` and `react@^18 || ^19` are peer dependencies. `@tanstack/react-query@^5` is an optional one, needed only by `@jperezmart/casl-react/tanstack-query`.

## Bind it to your Ability: `createCaslReact`

Call it once, in a module of your app the browser may import: it takes your Ability type and your subject-type detection, the same ones your server uses, from a shared module with no server code, so your Role permissions never reach the client bundle.

```ts
// casl.ts
import { createCaslReact } from '@jperezmart/casl-react';

import type { AppAbility } from './shared/ability'; // types and detectSubjectType only
import { detectSubjectType } from './shared/ability';

export const casl = createCaslReact<AppAbility>({ detectSubjectType });
export const { AbilityProvider, Can, useAbility, useAbilityState, useCan } =
  casl;
```

## The Ability provider

```tsx
<AbilityProvider>
  <App />
</AbilityProvider>
```

By default it fetches `/api/me/abilities` (`DEFAULT_RULES_PATH`) with the browser's credentials (its cookies) included. That path is a client-side convenience; your server mounts its Rules endpoint wherever it likes. Pass `fetchRules` for another path, custom headers or your RPC client:

```tsx
import { fetchRulesFrom } from '@jperezmart/casl-react';

<AbilityProvider fetchRules={fetchRulesFrom('/auth/rules')}>…</AbilityProvider>
<AbilityProvider fetchRules={() => client.me.rules()}>…</AbilityProvider>
```

`fetchRules` resolves to `{ rules }`. It rejects for a failed fetch; a rejection whose `status` is 401 (as `fetchRulesFrom`'s `RulesRequestError` or oRPC's `ORPCError` carry) means there is no session. A body that is not `{ rules }` with packed rules (an HTML page, a proxy's error page served with a 200) settles as a `MalformedRulesError` in `error`, and the Client ability allows nothing, as after any other failure; `createAbility` likewise allows nothing for a malformed payload rather than throw.

The Client ability **allows nothing** while the rules load, after a 401 and after any other failure, so no control flashes into view and then disappears.

## `Can` and the hooks

`Can` is [`@casl/react`](https://casl.js.org/v7/en/package/casl-react)'s component, typed by your Ability: a misspelt action or subject type does not compile.

```tsx
<Can I="create" a="Article">
  <NewArticleButton />
</Can>

<Can I="update" this={article} passThrough>
  {({ isAllowed }) => <button disabled={!isAllowed}>Edit</button>}
</Can>
```

| Hook                         | Returns                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------- |
| `useAbility()`               | The Client ability.                                                           |
| `useCan(action, subject, f)` | Whether the Client ability allows `action` on `subject` (and field `f`).      |
| `useAbilityState()`          | `{ ability, isLoading, isUnauthenticated, error, refresh }`, described below. |

`useAbilityState()` tells where the rules stand:

- `isLoading`: no answer from the Rules endpoint yet;
- `isUnauthenticated`: it answered 401, so there is no session (show a login link, say);
- `error`: why the rules could not be fetched, if they could not;
- `refresh()`: fetches the rules again, as after a login or a logout. The current Client ability stays until the new rules arrive.

## TanStack Query: `@jperezmart/casl-react/tanstack-query`

`useQueryAbility(casl, queryOptions)` runs the query and builds the Client ability from its result; hand it to the provider as its `state`. It takes any query options with a `queryKey` whose data is `{ rules }`, such as those [oRPC's TanStack Query integration](https://orpc.dev/docs/integrations/tanstack-query) builds for the Rules endpoint procedure:

```tsx
import { useQueryAbility } from '@jperezmart/casl-react/tanstack-query';

import { AbilityProvider, casl } from './casl';
import { orpc } from './orpc'; // createTanstackQueryUtils(client)

function Root() {
  const state = useQueryAbility(casl, orpc.me.rules.queryOptions());
  return (
    <AbilityProvider state={state}>
      <App />
    </AbilityProvider>
  );
}
```

Refreshing is invalidating that query: `refresh()` does it, and so does any `queryClient.invalidateQueries` that matches its key. The Client ability allows nothing while the query loads and whenever its last fetch failed, a 401 included, even though TanStack Query keeps the previous data. A 401 is not retried. A result that is not `{ rules }` with packed rules allows nothing too, and settles as a `MalformedRulesError` in `error`, as with `fetchRules`.

## Protecting routes

There is no router helper: the Client ability is a plain CASL ability you can put wherever your router reads from. The [TanStack Router example](https://github.com/jperezmart/casl-adapters/tree/main/apps/frontend-orpc) puts it in the router context and checks it in `beforeLoad`.

## License

MIT
