# frontend

A Vite + React tester for `@jperezmart/nest-casl`, using [`@casl/react`](https://casl.js.org/v7/en/package/casl-react).

It fetches the current user's **packed rules** from the backend (`GET /me/abilities`)
and rebuilds a CASL ability on the client with `buildAbilityFromPackedRules` from
the shared [`@jperezmart/example-shared`](../../packages/example-shared) package,
then gates the UI with `<Can>`. Clicking a button calls the guarded REST endpoint,
so you see the server agree (200/201) or reject (403, or 404 for an article they cannot read but could act on others of its kind) — the UI and the API share
the same rules.

**Shared typing:** the rules are still produced by the server (the source of
truth), but the ability **type** (`AppAbility`, `Action`, `Subjects`, `Article`,
`Role`) is imported from the shared package — the same one the backend uses — so
`<Can>` and `ability.can(...)` are checked against the real action/subject unions
at compile time. The frontend never imports NestJS: the shared package's default
entry depends only on `@casl/ability`.

## Run

Start one of the backends first, then this app:

```bash
pnpm build                            # build the package graph first
pnpm --filter backend-shared start    # or: backend-simple — both on :3000
pnpm --filter frontend dev            # http://localhost:5173
```

Requests go to `/api/*` and Vite proxies them to the backend (see
[`vite.config.ts`](vite.config.ts)). Override the target with `API_TARGET`, or
hit a backend directly with `VITE_API_URL`.

## What to try

- Switch between **Admin / Alice / Bob / Carol** and watch the article list,
  the enabled buttons, and the packed-rules panel change.
- As **Carol** (plain user) only published articles load and every action is
  disabled. As an **author** you can edit _your own_ rows only. **Admin**
  (superuser) can do everything.
- Article #5 is archived: only **Admin** lists it. Alice wrote it, but a
  `cannot` rule on archived articles overrides her ownership rules.
