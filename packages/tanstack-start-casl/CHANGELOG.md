# @jperezmart/tanstack-start-casl

## 0.1.0

### Minor Changes

- [#49](https://github.com/jperezmart/casl-adapters/pull/49) [`ad52cb7`](https://github.com/jperezmart/casl-adapters/commit/ad52cb70ecebb974b26806b8a66b5e27bbf80cd8) Thanks [@jperezmart](https://github.com/jperezmart)! - First release of `@jperezmart/tanstack-start-casl`, the TanStack Start Adapter of `@jperezmart/casl-core`, for server functions and server routes, in SPA mode or not. `createStartCasl({ getUser, permissions, superuserRole?, detectSubjectType?, readAction?, onUnauthenticated?, onForbidden? })`, where `getUser` finds the Authorizable user of a web `Request`, returns:
  
  - `functionMiddlewareServer`, the server step of a server function middleware (`createMiddleware({ type: 'function' }).server(casl.functionMiddlewareServer)`, so Start strips the Adapter and the Role permissions from the client bundle), and `routeMiddleware`, a ready-made server route middleware. Both add `{ ability, user }` to the context and answer an Unauthenticated request before the handler runs. Both refuse with a 403 what the browser marks as cross-site (by `Sec-Fetch-Site`, or else `Origin`): every server function call, and the writes (`POST`, `PUT`, `PATCH`, `DELETE`) to a server route;
  - `assertCan(ability, action, subject)`, which answers by the Denial rule. In server functions, not found throws the router's `notFound()`, and unauthenticated or forbidden set the response status to 401 or 403 and throw a `DenialError`, which error components recognise with `isDenialError` once `denialErrorAdapter` is registered in `createStart`. In server routes, the middleware answers each denial with a 401, 403 or 404 `Response`. `onUnauthenticated` and `onForbidden` answer instead, typically with a redirect; not found has no hook;
  - `rulesHandler`, the Rules endpoint as a server route handler: `{ rules }`, the packed rules of the user's Ability, or 401 without a session.
  
  `createStartCasl` is imported from `@jperezmart/tanstack-start-casl/server`, since it reaches Start's server-only module. The root, `@jperezmart/tanstack-start-casl`, is client-safe: `DenialError`, `isDenialError`, `denialErrorAdapter` and the types, for error components and `src/start.ts`.
  
  `@jperezmart/casl-core`, `@casl/ability`, `@tanstack/react-start` and `@tanstack/react-router` are peer dependencies.

### Patch Changes

- [#51](https://github.com/jperezmart/casl-adapters/pull/51) [`b47ec8a`](https://github.com/jperezmart/casl-adapters/commit/b47ec8a3a25207cfa9507e847735de4d802fae2a) Thanks [@jperezmart](https://github.com/jperezmart)! - The repository is now `jperezmart/casl-adapters`: the package metadata (`homepage`, `bugs`, `repository`) and the README links point at it. GitHub redirects the old URLs.

- [#49](https://github.com/jperezmart/casl-adapters/pull/49) [`7c64eb6`](https://github.com/jperezmart/casl-adapters/commit/7c64eb613ec70e414453a5649900f28d2100d769) Thanks [@jperezmart](https://github.com/jperezmart)! - Every Rules endpoint answers with `Cache-Control: private, no-store` (`RULES_CACHE_CONTROL`, exported by `@jperezmart/casl-core`), so a CDN or a shared proxy can no longer store one user's rules and serve them to another, and the browser keeps no copy that outlives a change of user. `CaslModule.forRulesEndpoint`, `rulesEndpoint` (Next.js) and both `rulesHandler`s (Hono, TanStack Start) set it on the 401 too. `@jperezmart/orpc-casl`'s `rulesProcedure` and `implementRules` set it through oRPC's `ResponseHeadersPlugin`, the only way a procedure sets a response header: add `new ResponseHeadersPlugin()` to your handler's `plugins`.

- [#49](https://github.com/jperezmart/casl-adapters/pull/49) [`18b1fc5`](https://github.com/jperezmart/casl-adapters/commit/18b1fc58fcd20c4d21543d8c3b1b2e37ff140cd1) Thanks [@jperezmart](https://github.com/jperezmart)! - `casl.functionMiddlewareServer` refuses as forbidden (403, a `DenialError`) a server function call the browser marks as cross-site, by `Sec-Fetch-Site` or else `Origin`, before `getUser` runs. The README and `denialErrorAdapter`'s docs used to tell apps to create a `src/start.ts` with only `serializationAdapters`, and a `startInstance` of your own replaces Start's default CSRF middleware: another site could call a server function with the user's session cookie. Both now register `createCsrfMiddleware` again too, which stays the first line of defence.
  
  `casl.routeMiddleware` refuses with a 403 a write (`POST`, `PUT`, `PATCH`, `DELETE`) the browser marks as cross-site in the same way, before `getUser` runs. Start's CSRF middleware never covers server routes, so another site could otherwise send a form or a simple `fetch` to one with the user's session cookie. Reads are left to CORS. A route meant to take cross-site writes from browsers does not use `casl.routeMiddleware`.
- Updated dependencies [[`61eff21`](https://github.com/jperezmart/casl-adapters/commit/61eff218adadee3b95ec3b8150963e491962d20c), [`b47ec8a`](https://github.com/jperezmart/casl-adapters/commit/b47ec8a3a25207cfa9507e847735de4d802fae2a), [`7c64eb6`](https://github.com/jperezmart/casl-adapters/commit/7c64eb613ec70e414453a5649900f28d2100d769), [`f1a0088`](https://github.com/jperezmart/casl-adapters/commit/f1a00884e1542a3edf7878e2a431f742d37429e3)]:
  - @jperezmart/casl-core@0.1.0
