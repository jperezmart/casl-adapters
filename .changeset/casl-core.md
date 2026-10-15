---
'@jperezmart/casl-core': minor
---

First release of `@jperezmart/casl-core`, the framework-free core every Adapter builds on. It depends only on CASL and holds:

- the Role permissions types (`RolePermissions`, `DefineRolePermissions`, `AuthorizableUser`, `AppAbility` and the ability helper types);
- `createAbilityFactory({ permissions, superuserRole?, detectSubjectType? })`, which builds a user's Ability from an explicit list of Role permissions maps: the Everyone permissions first, then the user's Roles, everything for the Superuser role, and no Roles for missing or malformed ones;
- `decide(ability, action, subject, options?)`, the Denial rule (ADR 0004), which returns `{ allowed: true }` or a denial whose `kind` is `'unauthenticated'`, `'forbidden'` or `'not-found'`, with its message, instead of throwing;
- `accessConditions(ability, action, subjectType)`, the Access conditions in Mongo syntax or as an AST, which throw a `NoRecordAllowedError` when no record is allowed.
- `rulesResponse(ability)`, the answer of every Rules endpoint: `{ rules }`, the Ability's packed rules, typed `RulesResponse<TAbility>`.
