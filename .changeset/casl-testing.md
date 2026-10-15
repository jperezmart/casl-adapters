---
'@jperezmart/casl-testing': minor
'@jperezmart/nest-casl-testing': minor
---

The testing helpers move to `@jperezmart/casl-testing`, which works for every framework. Its `buildAbilityForTest` builds through `@jperezmart/casl-core`, the same code every Adapter runs, instead of a second implementation kept in parity with it.

`@jperezmart/nest-casl-testing` is deprecated: it re-exports `@jperezmart/casl-testing` and keeps working until you migrate. To migrate, install `@jperezmart/casl-testing` and change the import:

```diff
- import { buildAbilityForTest } from '@jperezmart/nest-casl-testing';
+ import { buildAbilityForTest } from '@jperezmart/casl-testing';
```

Both take `@jperezmart/casl-core` as a peer dependency, as `@jperezmart/nest-casl` does.
