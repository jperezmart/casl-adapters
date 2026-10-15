import type { AnyAbility } from '@casl/ability';
import type { AbilityFactory as CoreAbilityFactory } from '@jperezmart/casl-core';
import { createAbilityFactory } from '@jperezmart/casl-core';
import { Inject, Injectable } from '@nestjs/common';

import { CASL_ROOT_OPTIONS } from '../constants.js';
import type { AuthorizableUser } from '../interfaces/authorizable-user.interface.js';
import type { CaslModuleOptions } from '../interfaces/casl-options.interface.js';
import type { AppAbility, RolePermissions } from '../types.js';

/**
 * Builds a CASL ability for a given user from the Role permissions every
 * `forFeature` registration contributed. Exposed so consumers can build
 * abilities outside the request lifecycle.
 *
 * The per-feature registration is sugar over `@jperezmart/casl-core`: it
 * accumulates the core's explicit list of Role permissions maps, and the core
 * builds the ability.
 */
@Injectable()
export class AbilityFactory<TAbility extends AppAbility = AppAbility> {
  /** Every registered Role permissions map, in registration order. */
  private readonly permissions: RolePermissions<
    string,
    AuthorizableUser,
    AnyAbility
  >[] = [];

  /** The core's factory over {@link permissions}; rebuilt after a registration. */
  private core: CoreAbilityFactory<AuthorizableUser, AnyAbility> | undefined;

  constructor(
    @Inject(CASL_ROOT_OPTIONS)
    private readonly options: CaslModuleOptions,
  ) {}

  /** Merge a feature's Role permissions into the global registry. */
  registerPermissions<
    TUser extends AuthorizableUser = AuthorizableUser,
    TAbility extends AnyAbility = AnyAbility,
  >(permissions: RolePermissions<string, TUser, TAbility>): void {
    this.permissions.push(permissions as unknown as RolePermissions);
    this.core = undefined;
  }

  /**
   * Create the ability for `user`: the Everyone permissions first, then every
   * registered role definition the user holds, so a Role can restrict what
   * everyone may do. Honours the configured superuser role.
   */
  createForUser<
    TUser extends AuthorizableUser = AuthorizableUser,
    TResult extends AppAbility = TAbility,
  >(user: TUser): TResult {
    this.core ??= createAbilityFactory({
      permissions: this.permissions,
      superuserRole: this.options.superuserRole,
      detectSubjectType: this.options.detectSubjectType,
    });
    return this.core.createForUser(user) as TResult;
  }
}
