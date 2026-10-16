---
'@jperezmart/casl-core': patch
'@jperezmart/nest-casl': patch
'@jperezmart/next-casl': patch
'@jperezmart/hono-casl': patch
'@jperezmart/tanstack-start-casl': patch
'@jperezmart/orpc-casl': patch
---

Every Rules endpoint answers with `Cache-Control: private, no-store` (`RULES_CACHE_CONTROL`, exported by `@jperezmart/casl-core`), so a CDN or a shared proxy can no longer store one user's rules and serve them to another, and the browser keeps no copy that outlives a change of user. `CaslModule.forRulesEndpoint`, `rulesEndpoint` (Next.js) and both `rulesHandler`s (Hono, TanStack Start) set it on the 401 too. `@jperezmart/orpc-casl`'s `rulesProcedure` and `implementRules` set it through oRPC's `ResponseHeadersPlugin`, the only way a procedure sets a response header: add `new ResponseHeadersPlugin()` to your handler's `plugins`.
