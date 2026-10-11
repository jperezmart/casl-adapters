# backend-simple

A working NestJS REST API showcasing `@jperezmart/nest-casl` with everything —
roles, the `Article` entity, the demo auth and the **permissions** — defined
**inline** in this app. For the same app with those definitions imported from a
shared package, see [`backend-shared`](../backend-shared).

## Run

```bash
pnpm --filter backend-simple build   # or: pnpm --filter backend-simple dev (watch)
pnpm --filter backend-simple start   # http://localhost:3000  (PORT to override)
pnpm --filter backend-simple test    # e2e: every route, per user
```

## Demo "auth"

There is no real auth — the user is read from request headers so you can role-play
from curl or the React tester:

- `x-user-id`: one of `admin`, `alice`, `bob`, `carol`
- `x-user-roles`: comma-separated, e.g. `author`

## What it demonstrates

- `CaslModule.forRoot<Role>({ superuserRole: 'admin', getUserFromRequest })`
- `CaslModule.forFeature({ permissions })` in `ArticlesModule`
- `@UseAbility(action, 'Article', ArticleHook)` on the controller
- A **subject hook** (`ArticleHook`) lazily loading the article so conditional
  rules (`{ authorId: user.id }`) are checked against the real record
- `@CaslSubject()` / `@CaslUser()` parameter decorators
- `@CaslConditions()` on the list endpoint: the user's **Access conditions** for
  `read Article`, as a Mongo query (`toMongo()`) the store filters by
- Using `AbilityFactory` directly to expose packed rules at `GET /me/abilities`
  for the frontend

## Endpoints

| Method | Path                               | Rule                                                |
| ------ | ---------------------------------- | --------------------------------------------------- |
| GET    | `/articles`                        | `read`, filtered by `@CaslConditions()` (`toMongo`) |
| GET    | `/articles/:id`                    | `read` (hook + conditions)                          |
| POST   | `/articles`                        | `create` (authors only)                             |
| PATCH  | `/articles/:id`                    | `update` (own only; admin bypasses)                 |
| DELETE | `/articles/:id`                    | `delete` (own only)                                 |
| GET    | `/me` · `/me/abilities` · `/users` | demo helpers                                        |

## Quick check

```bash
# Carol (plain user) only reads published articles:
curl -s -H 'x-user-id: carol' -H 'x-user-roles: user' localhost:3000/articles
# Carol cannot create → 403:
curl -s -X POST -H 'x-user-id: carol' -H 'x-user-roles: user' \
  -H 'content-type: application/json' -d '{"title":"x"}' localhost:3000/articles
```
