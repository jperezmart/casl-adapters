---
'@jperezmart/nest-casl': minor
---

`getUserFromRequest` may be async. The guard awaits it before building the ability, so an app can load more about the user (tenants, flags kept in the database) that its rules read. With `forRootAsync`, `inject` the services it needs and close over them; there is no separate user hook.

- Resolving to `undefined` is a 401, as before.
- An `HttpException` it throws reaches the client unchanged (anything else is Nest's 500).
- `@CaslUser()` hands the handler the user it resolved.

Synchronous functions keep working as they do today.
