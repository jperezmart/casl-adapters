# @jperezmart/nest-casl-testing

## 0.4.0

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
- Updated dependencies [[`61eff21`](https://github.com/jperezmart/casl-adapters/commit/61eff218adadee3b95ec3b8150963e491962d20c), [`61eff21`](https://github.com/jperezmart/casl-adapters/commit/61eff218adadee3b95ec3b8150963e491962d20c), [`b47ec8a`](https://github.com/jperezmart/casl-adapters/commit/b47ec8a3a25207cfa9507e847735de4d802fae2a), [`7c64eb6`](https://github.com/jperezmart/casl-adapters/commit/7c64eb613ec70e414453a5649900f28d2100d769), [`f1a0088`](https://github.com/jperezmart/casl-adapters/commit/f1a00884e1542a3edf7878e2a431f742d37429e3)]:
  - @jperezmart/casl-core@0.1.0
  - @jperezmart/casl-testing@0.1.0

## 0.3.0

### Minor Changes

- [#21](https://github.com/jperezmart/nest-casl/pull/21) [`c67cc5c`](https://github.com/jperezmart/nest-casl/commit/c67cc5ca2f068fefdaa059dd5af7ee2c726ad638) Thanks [@jperezmart](https://github.com/jperezmart)! - **Breaking (types only).** `CaslModule.forFeature` and `buildAbilityForTest` no longer take a role-union type argument, since inferring it would mistake `everyone` for a Role. Type the map with `RolePermissions<Role, …>` to check its keys, and drop the first type argument where you passed one: `forFeature<Role, User>(…)` becomes `forFeature<User>(…)`, or no type arguments at all.
  
  Everyone permissions: a Role permissions map may carry an `everyone` entry, whose rules apply to every authenticated user, whatever Roles they hold — including none, or a missing `roles`.
  
  ```ts
  const permissions: RolePermissions<Role, AppUser> = {
    everyone(user, { can }) {
      can('read', 'Article', { published: true });
    },
    banned(_user, { cannot }) {
      cannot('read', 'Article');
    },
  };
  ```
  
  - `everyone` takes a function only, with the same `(user, builder)` as a Role's. `everyone: true` and `everyone: false` do not compile.
  - `everyone` cannot be a Role: `RolePermissions<'author' | 'everyone'>` does not compile, and a role literally named `everyone` on the user is ignored, so the rules apply once.
  - The rules are laid down before any Role's, so a Role can restrict them with `cannot`.
  - Every feature's `everyone` applies. The `superuserRole` still skips them all, and a request with no user is still a 401.
  - `buildAbilityForTest` builds the same Ability.

### Patch Changes

- Updated dependencies [[`93d1b5e`](https://github.com/jperezmart/nest-casl/commit/93d1b5e0bbc153e1be364bbc957d5947417aeaed), [`829adec`](https://github.com/jperezmart/nest-casl/commit/829adecd75854138d30b43f7477742a433c96d4b), [`9587943`](https://github.com/jperezmart/nest-casl/commit/958794355e27980ed6a6171543c3bc9a7bb145d1), [`56e26d9`](https://github.com/jperezmart/nest-casl/commit/56e26d9c1bf0cae08d8ca88d99e578ad3d6aa1ad), [`fffaa7e`](https://github.com/jperezmart/nest-casl/commit/fffaa7e1855657da86c00acf095577d906a3e038), [`9c05c18`](https://github.com/jperezmart/nest-casl/commit/9c05c18f5b7cc1cfc3a24b81afde02ad268e2c14), [`c67cc5c`](https://github.com/jperezmart/nest-casl/commit/c67cc5ca2f068fefdaa059dd5af7ee2c726ad638), [`ecde36a`](https://github.com/jperezmart/nest-casl/commit/ecde36a22d4e73ed2c242574a7f107c79f7a6fb1), [`351e5e9`](https://github.com/jperezmart/nest-casl/commit/351e5e9fd6ec49de4e8054d6bc0cd97d4fbe42c4)]:
  - @jperezmart/nest-casl@0.3.0

## 0.2.0

### Minor Changes

- [#9](https://github.com/jperezmart/nest-casl/pull/9) [`b759f2f`](https://github.com/jperezmart/nest-casl/commit/b759f2f62822c3edc3147322399c76dfa493f9e9) Thanks [@jperezmart](https://github.com/jperezmart)! - **Breaking (types only — nothing changes at runtime).** The types no longer assume what your user looks like.
  
  - `AuthorizableUser` is now `{ roles: readonly string[] }`. It has no type parameters and no `id`. The user may hold roles your app does not declare, e.g. every role a shared identity provider hands out. The library never read `id`. If your rules use it, declare it on your own user type.
  - The role union types only the keys of the permissions map and the `superuserRole`.
  - `CaslModule.forFeature` and `buildAbilityForTest` infer the role union, the user and the ability from `permissions`, so you no longer pass type arguments.
  - `Permissions` is renamed to `RolePermissions`, and `DefinePermissions` to `DefineRolePermissions`. No aliases are kept.
  - `CaslModuleAsyncOptions` types `inject` and `useFactory` the way Nest's own async modules do: `inject` takes injection tokens, and `useFactory` takes whatever they resolve to.
  - `BuildAbilityForTestOptions` is no longer generic, and its `superuserRole` is a `string`.
  
  Migrating:
  
  ```diff
  - interface AppUser extends AuthorizableUser<Role, string> {
  + interface AppUser extends AuthorizableUser {
      id: string;
    }
  - const permissions: Permissions<Role, AppUser> = { … };
  + const permissions: RolePermissions<Role, AppUser> = { … };
  - CaslModule.forFeature<Role, AppUser>({ permissions });
  + CaslModule.forFeature({ permissions });
  ```

### Patch Changes

- Updated dependencies [[`b759f2f`](https://github.com/jperezmart/nest-casl/commit/b759f2f62822c3edc3147322399c76dfa493f9e9)]:
  - @jperezmart/nest-casl@0.2.0

## 0.1.2

### Patch Changes

- [#7](https://github.com/jperezmart/nest-casl/pull/7) [`6f2f8e7`](https://github.com/jperezmart/nest-casl/commit/6f2f8e70a031bc00d8d1c9b1e0e9b43079387868) Thanks [@jperezmart](https://github.com/jperezmart)! - Add a README. The package shipped with none, so its npm page was blank — `npm view @jperezmart/nest-casl-testing readme` returned "No README data found!" despite `files` declaring one. Documents `buildAbilityForTest` and both of its options, with npm version and license badges.

## 0.1.1

### Patch Changes

- fc4c2a6: Add the missing `repository` field (with `directory: packages/testing`) to the
  package manifest. npm requires it to link a published tarball back to its source
  commit, so `0.1.0` shipped without a provenance attestation even though the
  release workflow already publishes via OIDC trusted publishing. The next publish
  carries provenance.
