---
'@jperezmart/orpc-casl': minor
---

First release of `@jperezmart/orpc-casl`, the oRPC Adapter of `@jperezmart/casl-core`. It works the same wherever oRPC is mounted (a NestJS controller, a Next.js API route or a TanStack Start server route). `createOrpcCasl({ getUser, permissions, superuserRole?, detectSubjectType?, readAction?, onUnauthenticated?, onForbidden? })` returns:

- `middleware`, which finds the request's Authorizable user with `getUser(context)`, builds their Ability through the core and adds `{ ability, user }` to the procedure context. An Unauthenticated request gets `UNAUTHORIZED`, and the Access conditions' refusal (`NoRecordAllowedError`) gets `FORBIDDEN`;
- `assertCan(ability, action, subject)`, which throws `UNAUTHORIZED`, `FORBIDDEN` or `NOT_FOUND` by the Denial rule (ADR 0004);
- the Rules endpoint, `{ rules }` with the packed rules of the user's Ability: `rulesProcedure` for a router-first app, `implementRules(contractProcedure)` for a contract-first one.

`onUnauthenticated` and `onForbidden` answer those denials differently; not found is not overridable, so existence stays hidden. `@jperezmart/casl-core`, `@casl/ability` and `@orpc/server` are peer dependencies.
