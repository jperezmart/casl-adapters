import type { AnyAbility } from '@casl/ability';
import type { DynamicModule, Provider } from '@nestjs/common';
import { Module } from '@nestjs/common';

import { CASL_ROOT_OPTIONS } from './constants.js';
import { AbilityFactory } from './factories/ability.factory.js';
import { AccessGuard } from './guards/access.guard.js';
import type { AuthorizableRequest } from './interfaces/authorizable-request.interface.js';
import type { AuthorizableUser } from './interfaces/authorizable-user.interface.js';
import type {
  CaslFeatureOptions,
  CaslModuleAsyncOptions,
  CaslModuleOptions,
} from './interfaces/casl-options.interface.js';
import type { CaslRulesEndpointOptions } from './rules.controller.js';
import { createRulesController } from './rules.controller.js';
import type { AppAbility } from './types.js';

/**
 * Entry point of the library.
 *
 * - {@link CaslModule.forRoot} — register once at the app root with global
 *   options (superuser role, how to extract the user from the request).
 * - {@link CaslModule.forFeature} — register per feature module with that
 *   feature's permission definitions.
 */
/** How many forFeature registrations were made, for their tokens. */
let featureCount = 0;

@Module({})
export class CaslModule {
  /**
   * Global, synchronous configuration. Pass the `Roles` type parameter to have
   * `superuserRole` checked against the app's role union. Registered globally
   * so the guard, factory and options are injectable everywhere.
   */
  static forRoot<
    Roles extends string = string,
    TUser extends AuthorizableUser = AuthorizableUser,
    TRequest extends AuthorizableRequest<TUser> = AuthorizableRequest<TUser>,
  >(options: CaslModuleOptions<Roles, TUser, TRequest> = {}): DynamicModule {
    const optionsProvider: Provider = {
      provide: CASL_ROOT_OPTIONS,
      useValue: options,
    };
    return {
      module: CaslModule,
      global: true,
      providers: [optionsProvider, AbilityFactory, AccessGuard],
      exports: [optionsProvider, AbilityFactory, AccessGuard],
    };
  }

  /** Global configuration resolved asynchronously from other providers. */
  static forRootAsync<
    Roles extends string = string,
    TUser extends AuthorizableUser = AuthorizableUser,
    TRequest extends AuthorizableRequest<TUser> = AuthorizableRequest<TUser>,
  >(options: CaslModuleAsyncOptions<Roles, TUser, TRequest>): DynamicModule {
    const optionsProvider: Provider = {
      provide: CASL_ROOT_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject ?? [],
    };
    return {
      module: CaslModule,
      global: true,
      imports: options.imports ?? [],
      providers: [optionsProvider, AbilityFactory, AccessGuard],
      exports: [optionsProvider, AbilityFactory, AccessGuard],
    };
  }

  /**
   * Per-feature permissions. Each registration merges its Role permissions
   * into the global {@link AbilityFactory} at bootstrap. The user and ability
   * types are inferred from `permissions` — no type arguments needed. The
   * Roles are not: a map typed `RolePermissions<Role, …>` has already checked
   * its keys, and inferring them would mistake `everyone` for a Role.
   */
  static forFeature<
    TUser extends AuthorizableUser = AuthorizableUser,
    TAbility extends AnyAbility = AppAbility,
  >(options: CaslFeatureOptions<string, TUser, TAbility>): DynamicModule {
    const registrationProvider: Provider = {
      // A token of its own: NestJS 10 (and 11 with `deep-hash` module ids)
      // keys a dynamic module by a hash of its metadata, where a symbol is
      // its description and the factory its source, so every forFeature
      // would be one module and only the first map registered.
      provide: `CASL_FEATURE_REGISTRATION_${++featureCount}`,
      useFactory: (factory: AbilityFactory) => {
        factory.registerPermissions(options.permissions);
        return true;
      },
      inject: [AbilityFactory],
    };
    return {
      module: CaslModule,
      providers: [registrationProvider],
    };
  }

  /**
   * The ready-made Rules endpoint, optional: `GET <path>` answers `{ rules }`,
   * the packed rules of the request user's Ability, for the browser to build
   * its Client ability (`@jperezmart/casl-react`). It finds the user as the
   * guard does, and answers an Unauthenticated request with 401.
   */
  static forRulesEndpoint(options: CaslRulesEndpointOptions): DynamicModule {
    return {
      module: CaslModule,
      controllers: [createRulesController(options.path)],
    };
  }
}
