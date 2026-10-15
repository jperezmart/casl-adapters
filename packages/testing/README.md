# @jperezmart/nest-casl-testing

[![npm version](https://img.shields.io/npm/v/@jperezmart/nest-casl-testing.svg)](https://www.npmjs.com/package/@jperezmart/nest-casl-testing)
[![license](https://img.shields.io/npm/l/@jperezmart/nest-casl-testing.svg)](./LICENSE)

> **Deprecated.** Use [`@jperezmart/casl-testing`](https://github.com/jperezmart/nest-casl/tree/main/packages/casl-testing)
> instead: it has the same `buildAbilityForTest` and works for every framework.
> This package only re-exports it, and keeps working until you migrate.

## Migrating

```bash
pnpm remove @jperezmart/nest-casl-testing
pnpm add -D @jperezmart/casl-testing
```

Then change the import; nothing else changes:

```diff
- import { buildAbilityForTest } from '@jperezmart/nest-casl-testing';
+ import { buildAbilityForTest } from '@jperezmart/casl-testing';
```

`@casl/ability` and `@jperezmart/casl-core` are peer dependencies, as they are
of `@jperezmart/nest-casl`.

## License

MIT
