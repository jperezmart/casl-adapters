---
'@jperezmart/tanstack-start-casl': patch
---

`casl.functionMiddlewareServer` refuses as forbidden (403, a `DenialError`) a server function call the browser marks as cross-site, by `Sec-Fetch-Site` or else `Origin`, before `getUser` runs. The README and `denialErrorAdapter`'s docs used to tell apps to create a `src/start.ts` with only `serializationAdapters`, and a `startInstance` of your own replaces Start's default CSRF middleware: another site could call a server function with the user's session cookie. Both now register `createCsrfMiddleware` again too, which stays the first line of defence.

`casl.routeMiddleware` refuses with a 403 a write (`POST`, `PUT`, `PATCH`, `DELETE`) the browser marks as cross-site in the same way, before `getUser` runs. Start's CSRF middleware never covers server routes, so another site could otherwise send a form or a simple `fetch` to one with the user's session cookie. Reads are left to CORS. A route meant to take cross-site writes from browsers does not use `casl.routeMiddleware`.
