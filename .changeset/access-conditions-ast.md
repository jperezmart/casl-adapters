---
'@jperezmart/nest-casl': minor
---

`ConditionsProxy.toAst()` returns the Access conditions as an abstract syntax tree (a `@ucast/core` `Condition`, typed as the exported `AccessConditionsAst`), built with CASL's `rulesToAST`. Translate it for SQL, Prisma or your own repository instead of translating the Mongo query. Like `get()` and `toMongo()`, it throws `ForbiddenException` when the ability allows no record; when it allows every record, it is an empty `and`.
