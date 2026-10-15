import type { AnyAbility } from '@casl/ability';
import type {
  AbilityFactoryOptions,
  AuthorizableUser,
  RolePermissions,
} from '@jperezmart/casl-core';
import { createAbilityFactory } from '@jperezmart/casl-core';

/** Extra options accepted by {@link buildAbilityForTest}. */
export type BuildAbilityForTestOptions = Pick<
  AbilityFactoryOptions,
  'superuserRole' | 'detectSubjectType'
>;

/**
 * Build a CASL ability directly from Role permissions and a user, without
 * booting any framework. It builds through `@jperezmart/casl-core`, as every
 * Adapter does, so the ability is the one the app's server would build. The
 * user and ability types are inferred from `permissions`; the user may carry
 * roles the map does not declare. Everyone permissions apply first, then the
 * user's Roles.
 *
 * @example
 * ```ts
 * const ability = buildAbilityForTest(permissions, { id: "1", roles: ["author"] });
 * expect(ability.can("update", subject("Article", { authorId: "1" }))).toBe(true);
 * ```
 */
export function buildAbilityForTest<
  TUser extends AuthorizableUser = AuthorizableUser,
  TAbility extends AnyAbility = AnyAbility,
>(
  permissions: RolePermissions<string, TUser, TAbility>,
  user: TUser,
  options: BuildAbilityForTestOptions = {},
): TAbility {
  return createAbilityFactory<TUser, TAbility>({
    ...options,
    permissions: [permissions],
  }).createForUser(user);
}
