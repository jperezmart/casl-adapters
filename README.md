# casl-adapters

[![license](https://img.shields.io/npm/l/@jperezmart/casl-core.svg)](./LICENSE)

Declare your Role permissions once with [CASL](https://casl.js.org) v7 and get an Ability for every request, in whichever framework serves it: NestJS, oRPC, the Next.js Pages Router, TanStack Start or Hono. Every Adapter answers denials by the same Denial rule, and the browser gets a Client ability from any of them.

```text
@jperezmart/casl-core         decides: allowed, or unauthenticated / forbidden / not found
  ├── nest-casl               ┐
  ├── orpc-casl               │  each Adapter finds the Authorizable user of a request,
  ├── next-casl               │  builds its Ability and answers in its framework's own way
  ├── tanstack-start-casl     │  (401 / 403 / 404, oRPC errors, the router's notFound…)
  └── hono-casl               ┘
casl-react                    the browser: a Client ability from any Adapter's Rules endpoint
```

The core never throws framework errors; the Adapter turns its answer into a native one ([ADR 0005](./docs/adr/0005-a-core-that-decides-an-adapter-per-framework.md)). Each app builds its own Ability in its own server, with no central abilities service ([ADR 0006](./docs/adr/0006-each-app-builds-its-own-ability.md)).

## Install

Install the core, CASL and the Adapter for your framework. The core is a peer dependency of every Adapter, so an app that uses two (oRPC inside Next.js, say) has exactly one copy of it.

| Framework                     | Install                                                                           |
| ----------------------------- | --------------------------------------------------------------------------------- |
| NestJS                        | `pnpm add @jperezmart/nest-casl @jperezmart/casl-core @casl/ability`              |
| oRPC (wherever it is mounted) | `pnpm add @jperezmart/orpc-casl @jperezmart/casl-core @casl/ability`              |
| Next.js Pages Router          | `pnpm add @jperezmart/next-casl @jperezmart/casl-core @casl/ability`              |
| TanStack Start                | `pnpm add @jperezmart/tanstack-start-casl @jperezmart/casl-core @casl/ability`    |
| Hono                          | `pnpm add @jperezmart/hono-casl @jperezmart/casl-core @casl/ability`              |
| React, in the browser         | `pnpm add @jperezmart/casl-react @jperezmart/casl-core @casl/ability @casl/react` |

Each package's README shows how to set it up.

## The Denial rule

One rule, decided once in the core and answered by every Adapter ([ADR 0004](./docs/adr/0004-hide-what-the-user-cannot-read.md)):

1. An Unauthenticated request gets no Ability: **unauthenticated** (401).
2. The action is denied on the subject type, checked before any instance is loaded: **forbidden** (403).
3. The instance is denied and the user cannot read it either: **not found** (404), exactly like a missing record.
4. The instance is denied but the user can read it: **forbidden** (403).

`onUnauthenticated` and `onForbidden` let an app answer differently (a redirect to its login page, say). Not found has no hook, so existence stays hidden.

## Packages

| Package                                                             | Description                                                                                              |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [`@jperezmart/casl-core`](./packages/casl-core)                     | Framework-free core: Role permissions, the Ability, the Denial rule, the Access conditions.              |
| [`@jperezmart/nest-casl`](./packages/core)                          | The NestJS Adapter: `CaslModule`, `AccessGuard`, `@UseAbility`, subject hooks, decorators.               |
| [`@jperezmart/orpc-casl`](./packages/orpc-casl)                     | The oRPC Adapter: a middleware adding the Ability to the context, `assertCan`, the Rules endpoint.       |
| [`@jperezmart/next-casl`](./packages/next-casl)                     | The Next.js Pages Router Adapter: `getServerSideProps` and API route wrappers, the Rules endpoint.       |
| [`@jperezmart/tanstack-start-casl`](./packages/tanstack-start-casl) | The TanStack Start Adapter: middleware for server functions and routes, `assertCan`, the Rules endpoint. |
| [`@jperezmart/hono-casl`](./packages/hono-casl)                     | The Hono Adapter: a middleware adding the Ability to the typed context, `assertCan`, the Rules endpoint. |
| [`@jperezmart/casl-react`](./packages/casl-react)                   | The browser side: a Client ability from a Rules endpoint, a typed `Can`, hooks, TanStack Query.          |
| [`@jperezmart/casl-testing`](./packages/casl-testing)               | Helpers to unit-test Role permissions without booting any framework.                                     |
| `@jperezmart/nest-casl-testing`                                     | Deprecated re-export of `@jperezmart/casl-testing`.                                                      |

The Client ability only decides what the UI shows. What a user may do is decided by the server's Ability alone.

## Examples

Every example uses the same seed (Admin, Alice and Bob as authors, Carol as a plain user) and the same articles, so you can switch user and compare.

| Server                                              | Transport | Adapter               | Browser                                                       |
| --------------------------------------------------- | --------- | --------------------- | ------------------------------------------------------------- |
| [`backend-simple`](./apps/backend-simple)           | REST      | `nest-casl`           | [`frontend`](./apps/frontend) (Vite)                          |
| [`backend-shared`](./apps/backend-shared)           | REST      | `nest-casl`           | [`frontend`](./apps/frontend) (Vite)                          |
| [`backend-hono`](./apps/backend-hono)               | REST      | `hono-casl`           | [`frontend`](./apps/frontend) (Vite)                          |
| [`backend-orpc`](./apps/backend-orpc)               | oRPC      | `orpc-casl` in NestJS | [`frontend-orpc`](./apps/frontend-orpc) (TanStack Router SPA) |
| [`backend-orpc-hono`](./apps/backend-orpc-hono)     | oRPC      | `orpc-casl` in Hono   | [`frontend-orpc`](./apps/frontend-orpc) (TanStack Router SPA) |
| [`next-pages`](./apps/next-pages)                   | REST      | `next-casl`           | the same app, `casl-react`                                    |
| [`next-pages-orpc`](./apps/next-pages-orpc)         | oRPC      | `orpc-casl` in Next   | the same app, `casl-react/tanstack-query`                     |
| [`tanstack-start`](./apps/tanstack-start)           | REST      | `tanstack-start-casl` | the same app, `casl-react`                                    |
| [`tanstack-start-orpc`](./apps/tanstack-start-orpc) | oRPC      | `orpc-casl` in Start  | the same app, `casl-react/tanstack-query`                     |

Run one:

```bash
pnpm install
pnpm build                              # build the package graph
pnpm --filter backend-simple dev        # :3000
pnpm --filter frontend dev              # :5173
```

The fullstack examples need only themselves (`pnpm --filter next-pages dev`, on :3010; `pnpm --filter tanstack-start dev`, on :3200). The Vite frontends proxy to a backend set by `API_TARGET`, so the same frontend runs against NestJS or Hono:

```bash
pnpm --filter backend-orpc-hono dev                                # :3004
API_TARGET=http://127.0.0.1:3004 pnpm --filter frontend-orpc dev   # :5174
```

### Where the permissions live

- **`backend-simple`** defines its Role permissions inline, the common case.
- **`backend-shared`** imports them, with the `Article` subject, the Roles and the user type, from [`@jperezmart/example-shared`](./packages/example-shared). The `frontend` imports the types and `detectSubjectType` from that same package for its typed `Can`, and fetches the rules at runtime from the Rules endpoint.
- The **oRPC examples** are contract-first, with strict one-way dependencies:

  ```text
  orpc-domain     Zod schemas + types (source of truth, no deps but zod)
  orpc-contract   the oRPC contract   →  depends only on orpc-domain
  orpc-abilities  CASL                →  depends only on orpc-domain
  ```

  The frontend imports the typing from the client-safe entry of `orpc-abilities`; the Role permissions sit under its `./server` entry, so they never reach the browser bundle.

Always authorize against the record the server loaded, never the incoming body: a client could spoof it.

## Security

The libraries were reviewed before their first release: see [the October 2026 review](./docs/security/2026-10-review.md). Two things worth knowing:

- In NestJS, a route under `AccessGuard` with no `@UseAbility` answers 403. Open a route on purpose with `@AllowWithoutAbility()`.
- User fields reach the rule conditions as values. `getUser` must check the type of every field it takes from a token or a session.

## Develop

```bash
pnpm install
pnpm turbo run typecheck lint test   # builds what the apps import first
pnpm format:check
```

Tooling: **pnpm** workspaces, **Turborepo**, **tsdown** (dual ESM/CJS), **Vitest**, strict **TypeScript**, and **changesets**, so each package is versioned on its own. The domain terms are in [`GLOSSARY.md`](./GLOSSARY.md) and the decisions in [`docs/adr`](./docs/adr).
