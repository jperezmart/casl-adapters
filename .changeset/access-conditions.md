---
'@jperezmart/nest-casl': minor
---

**Breaking (fixes a record leak).** `@CaslConditions()` returns the Access conditions of the guarded action: every allowing rule OR-ed, every denying rule with conditions excluded. It used to return the conditions of one rule only, so filtering by them could let through records the user may not read. Migrating:

- The conditions may now carry `$or`, `$and` and `$nor`. If you translate them for a database other than Mongo, make sure your translation handles those.
- When the ability allows no record, `get()` and `toMongo()` throw `ForbiddenException` (they returned `undefined` and `{}`), and `hasConditions` is `true`. Behind the guard this does not happen: the guard already answers 403.

What it fixes:

- `can('read', 'Article')` with `cannot('read', 'Article', { secret: true })`: `toMongo()` was `{}`, which read the secret articles. It is now `{ $nor: [{ secret: true }] }`.
- `can` `{ published: true }`, `can` `{ authorId: 'u1' }`, `cannot` `{ archived: true }`: it was `{ authorId: 'u1' }`, which missed published articles and let archived ones through. It now ORs both and excludes the archived ones.

A lone allowing rule and an unconditional allow come back as before.
