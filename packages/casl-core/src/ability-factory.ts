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
      // Stryker disable next-line ConditionalExpression: equivalent, an undefined definition is neither `true` nor a callback, so createForUser skips it anyway
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
        : // Stryker disable next-line ArrayDeclaration: equivalent, a made-up Role is in no permissions map
          [];

      if (superuserRole !== undefined && roles.includes(superuserRole)) {
        // Stryker disable next-line StringLiteral: equivalent, CASL reads an empty subject as `all`
        builder.can('manage', 'all');
        return builder.build(buildOptions) as unknown as TAbility;
      }

      const abilityBuilder = builder as unknown as AbilityBuilder<AnyAbility>;
      for (const definition of everyone) {
        definition(user, abilityBuilder);
      }

      for (const role of roles) {
        // Stryker disable next-line ArrayDeclaration: equivalent, a made-up string is neither `true` nor a callback
        for (const definition of registry.get(role) ?? []) {
          if (definition === true) {
            // Stryker disable next-line StringLiteral: equivalent, CASL reads an empty subject as `all`
            builder.can('manage', 'all');
          } else if (typeof definition === 'function') {
            definition(user, abilityBuilder);
          }
        }
      }

      for (const rule of builder.rules) assertNoUndefined(rule);

      return builder.build(buildOptions) as unknown as TAbility;
    },
  };
}

/**
 * Thrown by {@link AbilityFactory.createForUser} when a rule's conditions hold
 * `undefined`, typically a user field the rule reads (`user.id`) that is
 * missing. Such conditions are never what the rule meant: `JSON.stringify`,
 * the MongoDB driver's `ignoreUndefined`, Mongoose and Prisma all drop the
 * field, so the Access conditions would let every record through and the
 * Client ability would allow every instance. No Ability is built instead, and
 * an Adapter answers the request as an error (500).
 */
export class UndefinedConditionError extends Error {
  override readonly name = 'UndefinedConditionError';

  constructor(
    readonly action: string,
    readonly subjectType: string,
    readonly path: string,
  ) {
    super(
      `The conditions of a rule for ${action} ${subjectType} hold undefined at ${path}: a user field the rule reads is probably missing.`,
    );
  }
}

interface BuiltRule {
  action: string | string[];
  subject?: unknown;
  conditions?: unknown;
}

function assertNoUndefined(rule: BuiltRule): void {
  if (rule.conditions === undefined) return;
  const path = undefinedPath(rule.conditions, []);
  if (path === undefined) return;
  throw new UndefinedConditionError(
    [rule.action].flat().join(', '),
    [rule.subject]
      .flat()
      .map(type =>
        typeof type === 'function'
          ? ((type as { modelName?: string }).modelName ?? type.name)
          : String(type),
      )
      .join(', '),
    path,
  );
}

/** The path of the first `undefined` in `value`, a plain object or array. */
function undefinedPath(
  value: unknown,
  path: readonly string[],
): string | undefined {
  if (value === undefined) return path.join('.');
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      const found = undefinedPath(item, [...path, String(index)]);
      if (found !== undefined) return found;
    }
  } else if (isPlainObject(value)) {
    for (const [key, item] of Object.entries(value)) {
      const found = undefinedPath(item, [...path, key]);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  // Stryker disable next-line ConditionalExpression: equivalent, a primitive's prototype is never Object.prototype or null
  if (typeof value !== 'object' || value === null) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
