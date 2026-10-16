---
'@jperezmart/hono-casl': minor
---

First release of `@jperezmart/hono-casl`, the Hono Adapter of `@jperezmart/casl-core`. `createHonoCasl({ getUser, permissions, superuserRole?, detectSubjectType?, readAction?, onUnauthenticated?, onForbidden? })`, where `getUser` finds the Authorizable user from the request's Hono context, returns:

- `middleware`, which puts `{ ability, user }` in the Hono context, typed through its `Variables` (`c.var.ability`, `c.var.user`), and answers an Unauthenticated request before the handler runs;
- `assertCan(ability, action, subject)`, which answers by the Denial rule with Hono's `HTTPException`: 401, 403 or 404, with a JSON `{ statusCode, message }`. Behind the middleware, `onUnauthenticated` and `onForbidden` answer instead with a `Response` (typically `c.redirect(…)`); not found has no hook. The middleware also answers the Access conditions' `NoRecordAllowedError` as forbidden, and `notFound()` throws the same 404 for a missing record as for a hidden one;
- `rulesHandler`, the Rules endpoint as a Hono handler: `{ rules }`, the packed rules of the user's Ability, or 401 without a session.

It uses only web standards and Hono's own exports, so it runs wherever Hono runs. `@jperezmart/casl-core`, `@casl/ability` and `hono` are peer dependencies.
