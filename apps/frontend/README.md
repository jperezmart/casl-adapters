# frontend

A Vite + React tester for `@jperezmart/nest-casl`, on
[`@jperezmart/casl-react`](../../packages/casl-react) with its **default fetch**:
the simplest client of a Rules endpoint.

`<AbilityProvider>` (see [`main.tsx`](src/main.tsx)) fetches the current user's
packed rules from `/api/me/abilities`, with the browser's cookies, and builds the
Client ability that `<Can>` reads. The backends serve that path with nest-casl's
ready-made Rules endpoint (`CaslModule.forRulesEndpoint`). Clicking a button calls
the guarded REST endpoint, so you see the server agree (200/201) or reject (403,
or 404 for an article they cannot read but could act on others of its kind) — the
UI and the API share the same rules. The Client ability only decides what the UI
shows; the server decides what is allowed.

**Shared typing:** the rules are produced by the server (the source of truth),
but the ability **type** (`AppAbility`, `Article`, `Role`) and
`detectSubjectType` come from the shared package's client-safe barrel, the same
one the backend uses, and are handed to
`createCaslReact<AppAbility>({ detectSubjectType })` in
[`casl.ts`](src/casl.ts). So `<Can>` is checked against the real action and
subject unions at compile time, and the Role permissions never reach the client
bundle.

**Demo session:** switching user sets a `demo-user` cookie (as a session cookie
would be set by a login) and calls `refresh()` from `useAbilityState()`, which
refetches the rules. "Signed out" clears it: the Rules endpoint answers 401 and
the Client ability allows nothing.

## Run

Start one of the backends first, then this app:

```bash
pnpm build                            # build the package graph first
pnpm --filter backend-shared start    # or: backend-simple — both on :3000
pnpm --filter frontend dev            # http://localhost:5173
```

Requests go to `/api/*` and Vite proxies them to the backend (see
[`vite.config.ts`](vite.config.ts)), so the session cookie stays same-origin.
Override the target with `API_TARGET`.

## What to try

- Switch between **Admin / Alice / Bob / Carol** and watch the article list,
  the enabled buttons, and the rules panel change.
- As **Carol** (plain user) only published articles load and every action is
  disabled. As an **author** you can edit _your own_ rows only. **Admin**
  (superuser) can do everything.
- Article #5 is archived: only **Admin** lists it. Alice wrote it, but a
  `cannot` rule on archived articles overrides her ownership rules.
- **Signed out**: the Rules endpoint answers 401 and nothing is allowed.
