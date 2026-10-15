import type { AnyAbility } from '@casl/ability';

import type { AbilityFactoryOptions } from './ability-factory.js';
import { createAbilityFactory } from './ability-factory.js';
import type { DecideOptions, Decision, Denial } from './decide.js';
import { decide } from './decide.js';
import type {
  ActionOf,
  AppAbility,
  AuthorizableUser,
  SubjectOf,
} from './types.js';

/**
 * The options every Adapter takes: the app's Role permissions, Superuser role
 * and subject-type detection (as {@link createAbilityFactory} takes them), how
 * to find a request's Authorizable user, and the app's hooks for denials.
 *
 * `TRequest` is what the Adapter is given for a request (a `Request`, a Node
 * request, a procedure context…); `THook` is what its framework lets a hook
 * answer with (an error to throw, a redirect…).
 */
export interface AdapterOptions<
  TRequest,
  TUser extends AuthorizableUser = AuthorizableUser,
  TAbility extends AnyAbility = AppAbility,
  THook = unknown,
> extends AbilityFactoryOptions<TUser, TAbility> {
  /**
   * Finds the Authorizable user of a request, or `null` (or `undefined`) for
   * an Unauthenticated request.
   */
  getUser(
    request: TRequest,
  ): TUser | null | undefined | Promise<TUser | null | undefined>;

  /**
   * The action that decides whether a denied instance is hidden (not found)
   * or merely forbidden. Defaults to `'read'`.
   */
  readAction?: ActionOf<TAbility> | undefined;

  /**
   * Answers an Unauthenticated request instead of the Adapter's default
   * (401), with what the Adapter's framework lets it answer.
   */
  onUnauthenticated?: THook | undefined;

  /**
   * Answers a forbidden denial instead of the Adapter's default (403), with
   * what the Adapter's framework lets it answer. Not found has no hook, so
   * existence stays hidden.
   */
  onForbidden?: THook | undefined;
}

/** What an Adapter hands a handler: the request's Ability and its user. */
export interface CaslContext<TUser, TAbility> {
  /** The Ability of the request's Authorizable user. */
  ability: TAbility;
  /** The Authorizable user `getUser` found. */
  user: TUser;
}

/**
 * The framework-free half of an Adapter, from {@link createAdapterKit}: the
 * Adapter maps what it decides to its framework's own answer.
 */
export interface AdapterKit<
  TRequest,
  TUser extends AuthorizableUser = AuthorizableUser,
  TAbility extends AnyAbility = AppAbility,
  THook = unknown,
> {
  /**
   * The request's Authorizable user and their Ability, or `null` for an
   * Unauthenticated request.
   */
  contextOf(request: TRequest): Promise<CaslContext<TUser, TAbility> | null>;

  /**
   * {@link decide}, with the Adapter's `readAction` unless the check passes
   * its own.
   */
  decide(
    ability: TAbility | null | undefined,
    action: ActionOf<TAbility>,
    subject: SubjectOf<TAbility>,
    options?: DecideOptions<TAbility>,
  ): Decision;

  /**
   * The app's hook for a denial: `onUnauthenticated` or `onForbidden`, and
   * never one for not found.
   */
  hookFor(denial: Denial): THook | undefined;
}

/**
 * Creates the {@link AdapterKit} an Adapter builds on, from the
 * {@link AdapterOptions} the app gave it.
 */
export function createAdapterKit<
  TRequest,
  TUser extends AuthorizableUser = AuthorizableUser,
  TAbility extends AnyAbility = AppAbility,
  THook = unknown,
>(
  options: AdapterOptions<TRequest, TUser, TAbility, THook>,
): AdapterKit<TRequest, TUser, TAbility, THook> {
  const factory = createAbilityFactory<TUser, TAbility>(options);
  const { readAction } = options;

  return {
    async contextOf(request) {
      const user = await options.getUser(request);
      if (!user) return null;
      return { user, ability: factory.createForUser(user) };
    },

    decide(ability, action, subject, decideOptions) {
      return decide(ability, action, subject, {
        ...(readAction === undefined ? {} : { readAction }),
        ...decideOptions,
      });
    },

    hookFor(denial) {
      switch (denial.kind) {
        case 'unauthenticated':
          return options.onUnauthenticated;
        case 'forbidden':
          return options.onForbidden;
        case 'not-found':
          return undefined;
      }
    },
  };
}
