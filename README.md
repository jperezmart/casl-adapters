# nest-casl monorepo

[![npm version](https://img.shields.io/npm/v/@jperezmart/nest-casl.svg)](https://www.npmjs.com/package/@jperezmart/nest-casl)
[![license](https://img.shields.io/npm/l/@jperezmart/nest-casl.svg)](./LICENSE)

Modern [CASL](https://casl.js.org) authorization for [NestJS](https://nestjs.com) — REST-focused, ESM + CJS, CASL v7.

```bash
pnpm add @jperezmart/nest-casl @jperezmart/casl-core @casl/ability
```

## Why

Existing NestJS + CASL integrations are abandoned or stuck on `@casl/ability@^5`. This is a from-scratch, strictly-typed, REST-only take built for NestJS 10/11 and CASL 7.

## Packages

| Package                                                   | Path                      | Description                                                                                        |
| --------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------- |
| [`@jperezmart/casl-core`](./packages/casl-core)           | `packages/casl-core`      | Framework-free core: Role permissions, the Ability, the Denial rule, the Access conditions.        |
| [`@jperezmart/nest-casl`](./packages/core)                | `packages/core`           | The NestJS Adapter: `CaslModule`, `AccessGuard`, `@UseAbility`, subject hooks, decorators.         |
| [`@jperezmart/orpc-casl`](./packages/orpc-casl)           | `packages/orpc-casl`      | The oRPC Adapter: a middleware adding the Ability to the context, `assertCan`, the Rules endpoint. |
| [`@jperezmart/next-casl`](./packages/next-casl)           | `packages/next-casl`      | The Next.js Pages Router Adapter: `getServerSideProps` and API route wrappers, the Rules endpoint. |
| [`@jperezmart/casl-react`](./packages/casl-react)         | `packages/casl-react`     | The browser side: a Client ability from a Rules endpoint, a typed `Can`, hooks, TanStack Query.    |
| [`@jperezmart/casl-testing`](./packages/casl-testing)     | `packages/casl-testing`   | Helpers to unit-test Role permissions without booting any framework.                               |
| `@jperezmart/nest-casl-testing`                           | `packages/testing`        | Deprecated re-export of `@jperezmart/casl-testing`.                                                |
| [`@jperezmart/example-shared`](./packages/example-shared) | `packages/example-shared` | Shared roles, subjects, ability type and permission definitions used by the examples.              |
| [`backend-simple`](./apps/backend-simple)                 | `apps/backend-simple`     | NestJS REST API with permissions defined **inline** (Nest only).                                   |
| [`backend-shared`](./apps/backend-shared)                 | `apps/backend-shared`     | Same API, but roles/subjects/permissions **imported** from `@jperezmart/example-shared`.           |
| [`frontend`](./apps/frontend)                             | `apps/frontend`           | Vite + React tester on `@jperezmart/casl-react`'s default fetch; shares typing with the backends.  |
| [`@jperezmart/orpc-domain`](./packages/orpc-domain)       | `packages/orpc-domain`    | oRPC example — Zod schemas + inferred types (single source of truth; no deps but zod).             |
| [`@jperezmart/orpc-contract`](./packages/orpc-contract)   | `packages/orpc-contract`  | oRPC example — the oRPC contract; depends only on `orpc-domain`.                                   |
| [`@jperezmart/orpc-abilities`](./packages/orpc-abilities) | `packages/orpc-abilities` | oRPC example — CASL roles/subjects/abilities/permissions; depends only on `orpc-domain`.           |
| [`backend-orpc`](./apps/backend-orpc)                     | `apps/backend-orpc`       | NestJS + `@orpc/nest`, authorizing oRPC procedures with `@jperezmart/orpc-casl` (in-memory).       |
| [`frontend-orpc`](./apps/frontend-orpc)                   | `apps/frontend-orpc`      | TanStack Router SPA: typed oRPC client, TanStack Query, `@jperezmart/casl-react/tanstack-query`.   |
| [`next-pages`](./apps/next-pages)                         | `apps/next-pages`         | Next.js Pages Router over REST: API routes and `getServerSideProps` with `next-casl`, casl-react.  |
| [`next-pages-orpc`](./apps/next-pages-orpc)               | `apps/next-pages-orpc`    | Next.js Pages Router with oRPC in an API route (`orpc-casl`), `casl-react/tanstack-query`.         |

## Two ways to feed `permissions`

`permissions` is just an object you pass to `CaslModule.forFeature`. The two
backends show the same API with that object coming from different places:

- **`backend-simple`** defines the permissions inline — the common "Nest only"
  case, nothing extra to set up.
- **`backend-shared`** imports them (plus the `Article` subject, `Role` and
  `AppUser`) from `@jperezmart/example-shared`. The `frontend` imports the
  **types** and `detectSubjectType` from that same package for the
  compile-time-checked `<Can>` of `@jperezmart/casl-react`, which fetches the
  actual rules at runtime from the Rules endpoint, `GET /me/abilities`.

Going from one to the other is moving an object from a local file into a shared
package — the library API doesn't change.

## Try it end-to-end

```bash
pnpm install
pnpm build                                          # build the package graph
pnpm --filter backend-shared start                  # :3000 (or backend-simple)
pnpm --filter frontend dev                          # :5173
```

Open http://localhost:5173, switch between users, and watch the UI gating and the
REST responses stay in sync with the same CASL rules.

## oRPC example (contract-first)

The `orpc-*` packages + `backend-orpc` + `frontend-orpc` show **oRPC mounted in
NestJS, authorized by the oRPC Adapter**
([`@jperezmart/orpc-casl`](./packages/orpc-casl)) instead of the NestJS one.
Architecture (strict, one-way deps):

```
orpc-domain     Zod schemas + types (source of truth, no deps but zod)
orpc-contract   oRPC contract        →  depends only on orpc-domain
orpc-abilities  CASL                 →  depends only on orpc-domain
backend-orpc    Nest + @orpc/nest + @jperezmart/orpc-casl (in-memory, no database)
frontend-orpc   TanStack Router SPA: typed oRPC client + TanStack Query + @jperezmart/casl-react
```

`domain` depends on no one; `contract` and `abilities` depend only on `domain`,
never on each other. Subjects are `kind`-tagged plain objects resolved via
`detectSubjectType`; the frontend imports the typing and the detection from the
client-safe barrel of `orpc-abilities` (the Role permissions sit under its
`./server` entry) and gets the rules at runtime from the `me.abilities`
procedure, through oRPC's TanStack Query integration and
`@jperezmart/casl-react/tanstack-query`. It puts the Client ability in the
TanStack Router context and checks it in a route's `beforeLoad`, by hand.

**The CASL ↔ oRPC bridge.** `AppModule` hands every procedure the request as its
context, and [`casl.ts`](./apps/backend-orpc/src/casl.ts) creates the Adapter
with a `getUser` that reads the demo user from it. Then:

- [`articles.controller.ts`](./apps/backend-orpc/src/articles/articles.controller.ts)
  implements each procedure with `casl.middleware`, which puts the user's
  Ability in the context (or answers `UNAUTHORIZED`). The handler checks the
  subject type with `casl.assertCan`, loads the article from the **validated
  `input`**, and checks the article: oRPC's own `FORBIDDEN` or `NOT_FOUND` by
  the Denial rule, with no translation of NestJS exceptions.
- [`me.controller.ts`](./apps/backend-orpc/src/me/me.controller.ts) implements
  `me.abilities` with the Adapter's ready-made Rules endpoint
  (`casl.implementRules`).

Always authorize against the **server-loaded** record, never the incoming body
(a client could spoof it); a missing record is a real 404.

```bash
pnpm install
pnpm build
pnpm --filter backend-orpc dev     # :3002
pnpm --filter frontend-orpc dev    # :5174
```

## Develop

```bash
pnpm install
pnpm build       # turbo run build
pnpm test        # turbo run test
pnpm typecheck   # turbo run typecheck
```

Tooling: **pnpm** workspaces, **Turborepo**, **tsdown** (dual ESM/CJS, via rolldown/oxc), **Vitest**, strict **TypeScript**.

> Status: core implemented; verified end-to-end by the example apps. Test suite next.
