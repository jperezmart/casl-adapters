---
'@jperezmart/nest-casl': minor
---

**Breaking.** A `@UseAbility` built with `createUseAbility<AppAbility>()` now rejects a subject hook that loads something other than the subject type it names. `@UseAbility('read', 'Article', CommentHook)` compiled before and is now a type error, as ADR 0004 already asked: the subject type must be the type of what the hook loads.

Migrating: point each route at the hook that loads its subject, or name the subject type the hook loads. A hook whose `run` returns a looser type than the subject (for example `SubjectBeforeFilterHook` with no type argument, returning `Subject`) needs its real return type. The bare `UseAbility` is unchanged.

The hook is checked when the ability types the subject's instances: a class, or a subject tagged with its name (`kind`, `__typename` or `subject()`). For a string subject with no tagged instance, or for `all`, any hook goes, as before.
