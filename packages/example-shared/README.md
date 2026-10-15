# @jperezmart/example-shared

Shared CASL definitions consumed by the example apps. It exists to demonstrate
one design point of `@jperezmart/nest-casl`: **`permissions` is just an object
you pass in**, so going from "Nest only" to "Nest + frontend" is moving that
object from a local file into a shared package — the API doesn't change.

The package is **framework-agnostic** — it depends only on `@casl/ability`, not
on `@jperezmart/nest-casl`. The permission definitions are typed structurally so
`CaslModule.forFeature({ permissions })` accepts them by structural
compatibility. Two entry points split client- and server-side concerns:

| Import                              | Contents                                                                  | Used by                   |
| ----------------------------------- | ------------------------------------------------------------------------- | ------------------------- |
| `@jperezmart/example-shared`        | `Role`, `Article`, `Action`/`Subjects`, `AppAbility`, `detectSubjectType` | frontend **and** backends |
| `@jperezmart/example-shared/server` | `AppUser`, `DEMO_USERS`, `parseUser`, `articlesPermissions`               | backends only             |

The default barrel gives the frontend the **shared typing** (`AppAbility`,
subjects) and the subject-type detection, which it hands to
`createCaslReact<AppAbility>({ detectSubjectType })` of `@jperezmart/casl-react`.
The rules themselves come at runtime from the Rules endpoint
(`GET /me/abilities`), so the server stays their source of truth and the Role
permissions never reach the client bundle.

See [`backend-shared`](../../apps/backend-shared) for the consumer, and
[`backend-simple`](../../apps/backend-simple) for the same app with the
permissions defined inline instead.
