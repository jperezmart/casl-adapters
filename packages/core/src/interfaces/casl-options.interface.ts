import type { AnyAbility } from '@casl/ability';
import type {
  InjectionToken,
  ModuleMetadata,
  OptionalFactoryDependency,
} from '@nestjs/common';

import type { AppAbility, RolePermissions } from '../types.js';
import type { AuthorizableRequest } from './authorizable-request.interface.js';
import type { AuthorizableUser } from './authorizable-user.interface.js';

/**
 * Global configuration passed to `CaslModule.forRoot`.
 *
 * @typeParam Roles    - String union of role names; types `superuserRole`.
 * @typeParam TUser    - Authenticated user shape.
 * @typeParam TRequest - Incoming request shape.
 */
export interface CaslModuleOptions<
  Roles extends string = string,
  TUser extends AuthorizableUser = AuthorizableUser,
  TRequest extends AuthorizableRequest<TUser> = AuthorizableRequest<TUser>,
> {
  /**
   * Role that bypasses all permission checks. When the user has this role the
   * guard short-circuits to "allow".
   */
  superuserRole?: Roles;

  /**
   * Extracts the authenticated user from the request. Defaults to reading
   * `request.user` (as populated by most NestJS auth strategies). It may be
   * async, to load more about the user before the ability is built: with
   * `forRootAsync`, `inject` the services it needs and close over them.
   */
  getUserFromRequest?: (
    request: TRequest,
  ) => TUser | undefined | Promise<TUser | undefined>;

  /**
   * Customises how CASL resolves a subject's type from a subject instance,
   * forwarded to the built ability. Defaults to CASL's behaviour
   * (`subject.constructor.modelName || subject.constructor.name`). Provide this
   * to discriminate plain objects by a field — e.g.
   * `detectSubjectType: subject => (subject as { kind: string }).kind` for
   * `kind`-tagged objects. Only invoked for object subjects; strings and classes
   * are returned as-is.
   */
  detectSubjectType?: (subject: object) => string;

  /**
   * The action that decides whether a denied instance is hidden (404) or
   * merely forbidden (403): the guard answers 404 when the user may not
   * perform this action on the instance either (ADR 0004). Defaults to
   * `'read'`. The guard passes it to `assertCan`.
   */
  readAction?: string;
}

/**
 * Async variant of {@link CaslModuleOptions} for `CaslModule.forRootAsync`,
 * letting options depend on other providers (config service, etc.).
 */
export interface CaslModuleAsyncOptions<
  Roles extends string = string,
  TUser extends AuthorizableUser = AuthorizableUser,
  TRequest extends AuthorizableRequest<TUser> = AuthorizableRequest<TUser>,
> extends Pick<ModuleMetadata, 'imports'> {
  inject?: Array<InjectionToken | OptionalFactoryDependency>;
  // `any[]`, as in Nest's own async modules: the parameters are whatever
  // `inject` resolves to, which the type system cannot line up.
  useFactory: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: any[]
  ) =>
    | Promise<CaslModuleOptions<Roles, TUser, TRequest>>
    | CaslModuleOptions<Roles, TUser, TRequest>;
}

/**
 * Per-feature configuration passed to `CaslModule.forFeature`. Each feature
 * module contributes its slice of permissions, aggregated globally at runtime.
 *
 * All three are inferred from `permissions`.
 *
 * @typeParam Roles    - String union of role names (the map's keys).
 * @typeParam TUser    - Authenticated user shape the rules receive.
 * @typeParam TAbility - CASL ability type.
 */
export interface CaslFeatureOptions<
  Roles extends string = string,
  TUser extends AuthorizableUser = AuthorizableUser,
  TAbility extends AnyAbility = AppAbility,
> {
  /** Role → permission definitions contributed by this feature. */
  permissions: RolePermissions<Roles, TUser, TAbility>;
}
