---
'@jperezmart/nest-casl': minor
---

**Breaking.** A user whose rules allow an action on no instance of the subject type (no allowing rule, or an unconditional `cannot` that wins) now gets **403** for every instance, readable or not, and the guard answers it before running the subject hook (ADR 0004). Before, they got 404 for an instance they could not read and for an id the hook could not load. The 403 is the same for every id, so it reveals nothing, and the hook no longer loads a record for a request that cannot succeed. `assertCan` applies the same step, so the guard and your own checks still agree.

Migrating: the subject type in `@UseAbility` must name the type the way your rules name it, which is what `detectSubjectType` reports for what the subject hook loads. `'Article'` and the class `Article` are different types to CASL: with rules written for `'Article'`, a route declaring the class `Article` now answers 403 to everyone but the superuser, even when its hook returns `Article` instances. A client or test that expected 404 for a user with no rule for the action now gets 403.

- Denied on the subject type, behind a hook → **403** (was 404 for an unreadable or missing instance). The hook does not run.
- `assertCan` on an instance whose type the action is denied on → `ForbiddenException` (was `NotFoundException` when the instance was unreadable).
- A user who may perform the action on some instances keeps the 404/403 split, and a hook that loads nothing is still a 404 for them.
