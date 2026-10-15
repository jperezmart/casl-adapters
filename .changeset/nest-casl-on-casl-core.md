---
'@jperezmart/nest-casl': minor
---

`@jperezmart/nest-casl` is now the NestJS Adapter of `@jperezmart/casl-core`, with no change in public API and one in behaviour. The guard, the decorators and `assertCan` decide with the core's `decide` and answer with the same `UnauthorizedException`, `ForbiddenException` and `NotFoundException` as before; `CaslModule.forFeature` accumulates the core's list of Role permissions maps; the types it exported (`RolePermissions`, `AuthorizableUser`, `AccessConditionsAst`, `DefaultActions`…) are the core's, re-exported. The change: the `ForbiddenException` that `@CaslConditions()` throws when no record is allowed now carries the core's message (`No record of Article is allowed for read.`) instead of Nest's default `Forbidden`, as every other Adapter answers it.

`@jperezmart/casl-core` is a new peer dependency, as `@casl/ability` already is, so an app using several Adapters has one copy of it. Install it alongside:

```bash
pnpm add @jperezmart/casl-core
```
