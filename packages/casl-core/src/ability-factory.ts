import type { AnyAbility, MongoAbility } from '@casl/ability';
import { AbilityBuilder, createMongoAbility } from '@casl/ability';

import type {
  AppAbility,
  AuthorizableUser,
  DefineRolePermissions,
  RolePermissions,
} from './types.js';

/** Options for {@link createAbilityFactory}. */
export interface AbilityFactoryOptions<
  TUser extends AuthorizableUser = AuthorizableUser,
  TAbility extends AnyAbility = AppAbility,
> {
  /**
   * Every Role permissions map of the app, merged in order: a Role declared in
   * several maps gets the rules of all of them, and so do the Everyone
   * permissions. Read once, when the factory is created.
   */
  permissions: readonly RolePermissions<string, TUser, TAbility>[];

  /**
   * The Superuser role: a user who holds it may do everything, and the Role
   * permissions are skipped. Any string — it usually has no entry in them.
   */
  superuserRole?: string | undefined;

  /**
   * Customises how CASL resolves a subject's type from a subject instance,
   * forwarded to the built ability. Defaults to CASL's behaviour
   * (`subject.constructor.modelName || subject.constructor.name`). Only
   * invoked for object subjects; strings and classes are returned as-is.
   */
  detectSubjectType?: ((subject: object) => string) | undefined;
}

/** Builds the Ability of an Authorizable user. */
export interface AbilityFactory<
  TUser extends AuthorizableUser = AuthorizableUser,
  TAbility extends AnyAbility = AppAbility,
> {
  /**
   * The Ability of `user`: everything for the Superuser role; otherwise the
   * Everyone permissions first, then the permissions of every Role the user
   * holds, so a Role can restrict what everyone may do. Missing or malformed
   * Roles count as none.
   */
  createForUser(user: TUser): TAbility;
}

type RulesCallback = DefineRolePermissions<AuthorizableUser, AnyAbility>;
type RolePermission = boolean | RulesCallback;

/**
 * Creates the {@link AbilityFactory} of an app from its Role permissions maps,
 * its Superuser role and its subject-type detection.
 */
export function createAbilityFactory<
  TUser extends AuthorizableUser = AuthorizableUser,
  TAbility extends AnyAbility = AppAbility,
>(
  options: AbilityFactoryOptions<TUser, TAbility>,
): AbilityFactory<TUser, TAbility> {
  const { superuserRole, detectSubjectType } = options;
  const buildOptions = detectSubjectType ? { detectSubjectType } : undefined;

  // Role → definitions, merged across every map. The Everyone permissions are
  // kept apart so a foreign Role named `everyone` never reaches them.
  const registry = new Map<string, RolePermission[]>();
  const everyone: RulesCallback[] = [];
  for (const permissions of options.permissions) {
    for (const [role, definition] of Object.entries(permissions)) {
      if (definition === undefined) continue;
      if (role === 'everyone') {
        // Only a callback: the types reject `everyone: true`, and an untyped
        // consumer who slips one through gets nothing rather than everything.
        if (typeof definition === 'function') {
          everyone.push(definition as RulesCallback);
        }
        continue;
      }
      const existing = registry.get(role) ?? [];
      existing.push(definition as RolePermission);
      registry.set(role, existing);
    }
  }

  return {
    createForUser(user) {
      const builder = new AbilityBuilder<MongoAbility>(createMongoAbility);

      // Tolerate a user whose `roles` is missing or not an array (e.g. a JWT
      // payload without the claim): treat it as "no roles" rather than
      // throwing. Such a user still gets the Everyone permissions.
      const roles: readonly string[] = Array.isArray(user.roles)
        ? user.roles
        : [];

      if (superuserRole !== undefined && roles.includes(superuserRole)) {
        builder.can('manage', 'all');
        return builder.build(buildOptions) as unknown as TAbility;
      }

      const abilityBuilder = builder as unknown as AbilityBuilder<AnyAbility>;
      for (const definition of everyone) {
        definition(user, abilityBuilder);
      }

      for (const role of roles) {
        for (const definition of registry.get(role) ?? []) {
          if (definition === true) {
            builder.can('manage', 'all');
          } else if (typeof definition === 'function') {
            definition(user, abilityBuilder);
          }
        }
      }

      return builder.build(buildOptions) as unknown as TAbility;
    },
  };
}
