---
'@jperezmart/nest-casl': minor
---

**Breaking:** `AccessGuard` now denies (403) a route that has no `@UseAbility`, on the handler or its controller, whether the guard is applied per controller or as a global `APP_GUARD`. It used to let such a route through, so a forgotten decorator left the route open. The new `@AllowWithoutAbility()` decorator, on a handler or a whole controller, opens a route on purpose. There is no option to restore the old behaviour. The Rules endpoint of `CaslModule.forRulesEndpoint` carries the opt-out itself, so it still answers its own 401 under a global guard.

To migrate, add `@AllowWithoutAbility()` to every route under the guard that is meant to be open (a health check, a public list, a grouped oRPC handler that checks inside):

```diff
+import { AllowWithoutAbility } from '@jperezmart/nest-casl';

 @Get('health')
+@AllowWithoutAbility()
 health() {}
```

A route that is not under `AccessGuard` at all (no global guard, no `@UseGuards(AccessGuard)` on its controller, no `@UseAbility`) is not affected.
