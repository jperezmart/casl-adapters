---
'@jperezmart/casl-core': patch
'@jperezmart/nest-casl': minor
---

`createAbilityFactory().createForUser(user)` throws an `UndefinedConditionError` instead of building an Ability whose rule conditions hold `undefined`, such as `can('update', 'Article', { authorId: user.id })` for a user without `id`. Those conditions let every record through: `JSON.stringify` (the Rules endpoint), the MongoDB driver's `ignoreUndefined`, Mongoose and Prisma drop the field, so the Access conditions filtered nothing and the Client ability allowed every instance. Every Adapter answers such a request as an error (500), never as allowed. In `@jperezmart/nest-casl` this changes behaviour: the guard and the Rules endpoint now answer 500 for such a user, where they used to allow by those conditions.
