---
'@jperezmart/tanstack-start-casl': minor
---

First release of `@jperezmart/tanstack-start-casl`, the TanStack Start Adapter of `@jperezmart/casl-core`, for server functions and server routes, in SPA mode or not. `createStartCasl({ getUser, permissions, superuserRole?, detectSubjectType?, readAction?, onUnauthenticated?, onForbidden? })`, where `getUser` finds the Authorizable user of a web `Request`, returns:

- `functionMiddlewareServer`, the server step of a server function middleware (`createMiddleware({ type: 'function' }).server(casl.functionMiddlewareServer)`, so Start strips the Adapter and the Role permissions from the client bundle), and `routeMiddleware`, a ready-made server route middleware. Both add `{ ability, user }` to the context and answer an Unauthenticated request before the handler runs. Both refuse with a 403 what the browser marks as cross-site (by `Sec-Fetch-Site`, or else `Origin`): every server function call, and the writes (`POST`, `PUT`, `PATCH`, `DELETE`) to a server route;
- `assertCan(ability, action, subject)`, which answers by the Denial rule. In server functions, not found throws the router's `notFound()`, and unauthenticated or forbidden set the response status to 401 or 403 and throw a `DenialError`, which error components recognise with `isDenialError` once `denialErrorAdapter` is registered in `createStart`. In server routes, the middleware answers each denial with a 401, 403 or 404 `Response`. `onUnauthenticated` and `onForbidden` answer instead, typically with a redirect; not found has no hook;
- `rulesHandler`, the Rules endpoint as a server route handler: `{ rules }`, the packed rules of the user's Ability, or 401 without a session.

`createStartCasl` is imported from `@jperezmart/tanstack-start-casl/server`, since it reaches Start's server-only module. The root, `@jperezmart/tanstack-start-casl`, is client-safe: `DenialError`, `isDenialError`, `denialErrorAdapter` and the types, for error components and `src/start.ts`.

`@jperezmart/casl-core`, `@casl/ability`, `@tanstack/react-start` and `@tanstack/react-router` are peer dependencies.
