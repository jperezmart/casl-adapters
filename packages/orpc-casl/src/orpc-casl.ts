import type { AnyAbility } from '@casl/ability';
import type {
  AbilityFactoryOptions,
  ActionOf,
  AppAbility,
  AuthorizableUser,
  DecideOptions,
  Denial,
  RulesResponse,
  SubjectOf,
} from '@jperezmart/casl-core';
import {
  createAbilityFactory,
  decide,
  NoRecordAllowedError,
  rulesResponse,
} from '@jperezmart/casl-core';
import type {
  AnyMiddleware,
  Context,
  ContractProcedure,
  DecoratedProcedure,
  ErrorMap,
  InferSchemaInput,
  MergedCurrentContext,
  Meta,
  Middleware,
  Procedure,
  Schema,
} from '@orpc/server';
import { implement, ORPCError, os } from '@orpc/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- as oRPC's own `AnySchema`
type AnySchema = Schema<any, any>;

/** Options for {@link createOrpcCasl}. */
export interface OrpcCaslOptions<
  TContext extends Context,
  TUser extends AuthorizableUser,
  TAbility extends AnyAbility,
> extends AbilityFactoryOptions<TUser, TAbility> {
  /**
   * Finds the Authorizable user of a request from the procedure context the
   * app's oRPC handler was given, or `null` (or `undefined`) for an
   * Unauthenticated request.
   */
  getUser(
    context: TContext,
  ): TUser | null | undefined | Promise<TUser | null | undefined>;

  /**
   * The action that decides whether a denied instance is hidden (not found)
   * or merely forbidden. Defaults to `'read'`.
   */
  readAction?: ActionOf<TAbility> | undefined;

  /**
   * Answers an Unauthenticated request instead of `UNAUTHORIZED`: returns (or
   * throws) the error to throw.
   */
  onUnauthenticated?: ((denial: Denial) => Error) | undefined;

  /**
   * Answers a forbidden denial instead of `FORBIDDEN`: returns (or throws) the
   * error to throw. Not found has no hook, so existence stays hidden.
   */
  onForbidden?: ((denial: Denial) => Error) | undefined;
}

/** What {@link OrpcCasl.middleware} adds to the procedure context. */
export interface CaslContext<TUser, TAbility> {
  /** The Ability of the request's Authorizable user. */
  ability: TAbility;
  /** The Authorizable user `getUser` found. */
  user: TUser;
}

/**
 * The middleware's type: it needs `TContext` and adds {@link CaslContext}, and
 * fits any procedure's input, output, errors and metadata.
 */
export type CaslMiddleware<TContext extends Context, TUser, TAbility> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fits any procedure
  Middleware<TContext, CaslContext<TUser, TAbility>, unknown, any, any, any>;

/** {@link OrpcCasl.rulesProcedure}'s type. */
export type RulesProcedure<
  TContext extends Context,
  TUser,
  TAbility extends AnyAbility,
> = DecoratedProcedure<
  TContext,
  MergedCurrentContext<TContext, CaslContext<TUser, TAbility>>,
  Schema<unknown, unknown>,
  Schema<RulesResponse<TAbility>, RulesResponse<TAbility>>,
  Record<never, never>,
  Record<never, never>
>;

/**
 * A contract procedure whose output accepts a {@link RulesResponse}; any
 * other contract gets a readable type error.
 */
export type RulesContract<TContract, TAbility extends AnyAbility> =
  TContract extends ContractProcedure<
    AnySchema,
    infer UOutputSchema,
    ErrorMap,
    Meta
  >
    ? RulesResponse<TAbility> extends InferSchemaInput<UOutputSchema>
      ? TContract
      : {
          readonly '`output` must accept the Rules endpoint response { rules }': never;
        }
    : never;

/** The procedure that implements `TContract` with initial context `TContext`. */
export type ImplementedContract<TContext extends Context, TContract> =
  TContract extends ContractProcedure<
    infer UInputSchema,
    infer UOutputSchema,
    infer UErrorMap,
    infer UMeta
  >
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any -- as oRPC's own `Router`
      Procedure<TContext, any, UInputSchema, UOutputSchema, UErrorMap, UMeta>
    : never;

/** The oRPC Adapter of one app, from {@link createOrpcCasl}. */
export interface OrpcCasl<
  TContext extends Context,
  TUser extends AuthorizableUser,
  TAbility extends AnyAbility,
> {
  /**
   * Finds the request's Authorizable user with `getUser`, builds their
   * Ability and adds both to the procedure context ({@link CaslContext}).
   * An Unauthenticated request is answered `UNAUTHORIZED` (or by
   * `onUnauthenticated`) before the handler runs. The Access conditions'
   * refusal (`NoRecordAllowedError`) thrown by the handler is answered
   * `FORBIDDEN` (or by `onForbidden`).
   */
  middleware: CaslMiddleware<TContext, TUser, TAbility>;

  /**
   * Returns when `ability` may perform `action` on `subject`, and otherwise
   * throws by the Denial rule: `UNAUTHORIZED` without an Ability, `NOT_FOUND`
   * for an instance the user cannot read either, `FORBIDDEN` for the rest.
   * Check the subject type before loading the instance, then the instance.
   */
  assertCan(
    ability: TAbility | null | undefined,
    action: ActionOf<TAbility>,
    subject: SubjectOf<TAbility>,
    options?: DecideOptions<TAbility>,
  ): void;

  /**
   * The Rules endpoint as a ready-made procedure, for a router-first app:
   * `{ rules }`, the packed rules of the user's Ability. Mount it under any
   * key, and give it a `.route()` for OpenAPI.
   */
  rulesProcedure: RulesProcedure<TContext, TUser, TAbility>;

  /**
   * The Rules endpoint for a contract-first app: implements `contract`, a
   * procedure of the app's contract whose output accepts `{ rules }`.
   */
  implementRules<TContract>(
    contract: RulesContract<TContract, TAbility>,
  ): ImplementedContract<TContext, TContract>;
}

/**
 * Creates the oRPC Adapter of an app: its Role permissions, its Superuser role
 * and subject-type detection (as `createAbilityFactory` takes them), the
 * `getUser` that finds a request's Authorizable user in the procedure context,
 * and optional hooks to answer denials differently.
 *
 * It works the same wherever oRPC is mounted: a NestJS controller, a Next.js
 * API route or a TanStack Start server route.
 */
export function createOrpcCasl<
  TContext extends Context,
  TUser extends AuthorizableUser = AuthorizableUser,
  TAbility extends AnyAbility = AppAbility,
>(
  options: OrpcCaslOptions<TContext, TUser, TAbility>,
): OrpcCasl<TContext, TUser, TAbility> {
  const factory = createAbilityFactory<TUser, TAbility>(options);

  const middleware: CaslMiddleware<TContext, TUser, TAbility> = async ({
    context,
    next,
  }) => {
    const user = await options.getUser(context);
    if (!user) return answer(UNAUTHENTICATED);
    try {
      return await next({
        context: { user, ability: factory.createForUser(user) },
      });
    } catch (error) {
      if (!(error instanceof NoRecordAllowedError)) throw error;
      return answer({
        allowed: false,
        kind: 'forbidden',
        message: error.message,
      });
    }
  };

  const rulesOf = ({
    context,
  }: {
    context: CaslContext<TUser, TAbility>;
  }): RulesResponse<TAbility> => rulesResponse(context.ability);

  return {
    middleware,

    assertCan(ability, action, subject, decideOptions) {
      const decision = decide(ability, action, subject, {
        ...(options.readAction === undefined
          ? {}
          : { readAction: options.readAction }),
        ...decideOptions,
      });
      if (!decision.allowed) answer(decision);
    },

    // oRPC's generics cannot follow an unknown `TContext` through `use`, so
    // the procedures are built loosely and typed by their declared types.
    rulesProcedure: os
      .use(middleware as AnyMiddleware)
      .handler(rulesOf) as unknown as RulesProcedure<TContext, TUser, TAbility>,

    implementRules<TContract>(contract: RulesContract<TContract, TAbility>) {
      const procedure = contract as ContractProcedure<
        AnySchema,
        AnySchema,
        ErrorMap,
        Meta
      >;
      return implement(procedure)
        .use(middleware as AnyMiddleware)
        .handler(rulesOf) as unknown as ImplementedContract<
        TContext,
        TContract
      >;
    },
  };

  /** Throws the oRPC error of a denial. */
  function answer(denial: Denial): never {
    switch (denial.kind) {
      case 'unauthenticated':
        if (options.onUnauthenticated) throw options.onUnauthenticated(denial);
        throw new ORPCError('UNAUTHORIZED', { message: denial.message });
      case 'forbidden':
        if (options.onForbidden) throw options.onForbidden(denial);
        throw new ORPCError('FORBIDDEN', { message: denial.message });
      case 'not-found':
        // oRPC's default message, indistinguishable from a genuine not-found.
        throw new ORPCError('NOT_FOUND');
    }
  }
}

/** The core's answer to an Unauthenticated request, whatever the check. */
const UNAUTHENTICATED = decide(null, 'read', 'all') as Denial;
