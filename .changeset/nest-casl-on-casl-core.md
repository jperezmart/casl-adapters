---
'@jperezmart/nest-casl': minor
---

`@jperezmart/nest-casl` is now the NestJS Adapter of `@jperezmart/casl-core`, with no change in behaviour or public API. The guard, the decorators and `assertCan` decide with the core's `decide` and answer with the same `UnauthorizedException`, `ForbiddenException` and `NotFoundException` as before; `CaslModule.forFeature` accumulates the core's list of Role permissions maps; the types it exported (`RolePermissions`, `AuthorizableUser`, `AccessConditionsAst`, `DefaultActions`…) are the core's, re-exported.

`@jperezmart/casl-core` is a new peer dependency, as `@casl/ability` already is, so an app using several Adapters has one copy of it. Install it alongside:

```bash
pnpm add @jperezmart/casl-core
```
