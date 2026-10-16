# @jperezmart/casl-testing

## 0.1.0

### Minor Changes

- [#49](https://github.com/jperezmart/casl-adapters/pull/49) [`61eff21`](https://github.com/jperezmart/casl-adapters/commit/61eff218adadee3b95ec3b8150963e491962d20c) Thanks [@jperezmart](https://github.com/jperezmart)! - The testing helpers move to `@jperezmart/casl-testing`, which works for every framework. Its `buildAbilityForTest` builds through `@jperezmart/casl-core`, the same code every Adapter runs, instead of a second implementation kept in parity with it.
  
  `@jperezmart/nest-casl-testing` is deprecated: it re-exports `@jperezmart/casl-testing` and keeps working until you migrate. To migrate, install `@jperezmart/casl-testing` and change the import:
  
  ```diff
  - import { buildAbilityForTest } from '@jperezmart/nest-casl-testing';
  + import { buildAbilityForTest } from '@jperezmart/casl-testing';
  ```
  
  Both take `@jperezmart/casl-core` as a peer dependency, as `@jperezmart/nest-casl` does.

### Patch Changes

- [#51](https://github.com/jperezmart/casl-adapters/pull/51) [`b47ec8a`](https://github.com/jperezmart/casl-adapters/commit/b47ec8a3a25207cfa9507e847735de4d802fae2a) Thanks [@jperezmart](https://github.com/jperezmart)! - The repository is now `jperezmart/casl-adapters`: the package metadata (`homepage`, `bugs`, `repository`) and the README links point at it. GitHub redirects the old URLs.
- Updated dependencies [[`61eff21`](https://github.com/jperezmart/casl-adapters/commit/61eff218adadee3b95ec3b8150963e491962d20c), [`b47ec8a`](https://github.com/jperezmart/casl-adapters/commit/b47ec8a3a25207cfa9507e847735de4d802fae2a), [`7c64eb6`](https://github.com/jperezmart/casl-adapters/commit/7c64eb613ec70e414453a5649900f28d2100d769), [`f1a0088`](https://github.com/jperezmart/casl-adapters/commit/f1a00884e1542a3edf7878e2a431f742d37429e3)]:
  - @jperezmart/casl-core@0.1.0
