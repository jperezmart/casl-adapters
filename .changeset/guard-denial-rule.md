---
'@jperezmart/nest-casl': minor
---

**Breaking.** The guard answers denials with the 404/403 rule of [ADR 0004](https://github.com/jperezmart/nest-casl/blob/main/docs/adr/0004-hide-what-the-user-cannot-read.md), by delegating to `assertCan`. Some former 403s are now 404s:

- Denied on an instance the user cannot read either → **404** (was 403), with Nest's default body, identical to a genuine not-found.
- A subject hook that loads nothing → **404** (was 403), for a user the subject type check lets through (see the entry on denying on the subject type first). It still never falls back to a check against the subject type.
- Denied on an instance the user can read, or on a subject type (no hook) → 403, as before.

No user is still 401, and allowed requests and the parameter decorators are unchanged.

New `forRoot` option `readAction` (default `'read'`): the action that decides whether a denied instance is hidden. Set it when your app names its read action differently.

```ts
CaslModule.forRoot<Role>({ readAction: 'view' });
```

Migrating: a client or test that expected 403 for a record the user cannot see, or for a missing record behind a subject hook, now gets 404.
