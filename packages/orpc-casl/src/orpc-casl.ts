import type { AnyAbility } from '@casl/ability';
import type {
  ActionOf,
  AdapterOptions,
  AppAbility,
  AuthorizableUser,
  CaslContext,
  DecideOptions,
  Denial,
  RulesResponse,
  SubjectOf,
} from '@jperezmart/casl-core';
import {
  createAdapterKit,
  forbiddenDenialOf,
  NoRecordAllowedError,
  RULES_CACHE_CONTROL,
  rulesResponse,
  unauthenticatedDenial,
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

/**
 * Options for {@link createOrpcCasl}, as every Adapter takes them: `getUser`
 * finds the Authorizable user from the procedure context the app's oRPC
 * handler was given, and `onUnauthenticated` and `onForbidden` return (or
 * throw) the error to throw instead of `UNAUTHORIZED` and `FORBIDDEN`.
 */
export type OrpcCaslOptions<
  TContext extends Context,
  TUser extends AuthorizableUser,
  TAbility extends AnyAbility,
> = AdapterOptions<TContext, TUser, TAbility, (denial: Denial) => Error>;

/** What {@link OrpcCasl.middleware} adds to the procedure context. */
export type { CaslContext };

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
   * key, and give it a `.route()` for OpenAPI. It answers with
   * `Cache-Control: private, no-store` when the handler runs oRPC's
   * `ResponseHeadersPlugin`; without it, no shared cache is kept out.
   */
  rulesProcedure: RulesProcedure<TContext, TUser, TAbility>;

  /**
   * The Rules endpoint for a contract-first app: implements `contract`, a
   * procedure of the app's contract whose output accepts `{ rules }`. Like
   * {@link OrpcCasl.rulesProcedure}, it sets `Cache-Control` through the
   * handler's `ResponseHeadersPlugin`.
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
  const kit = createAdapterKit<
    TContext,
    TUser,
    TAbility,
    (denial: Denial) => Error
  >(options);

  const middleware: CaslMiddleware<TContext, TUser, TAbility> = async ({
    context,
    next,
  }) => {
    const caslContext = await kit.contextOf(context);
    if (!caslContext) return throwDenial(unauthenticatedDenial);
    try {
      return await next({ context: caslContext });
    } catch (error) {
      if (!(error instanceof NoRecordAllowedError)) throw error;
      return throwDenial(forbiddenDenialOf(error));
    }
  };

  const rulesOf = ({
    context,
  }: {
    context: CaslContext<TUser, TAbility> & {
      resHeaders?: { set(name: string, value: string): unknown };
    };
  }): RulesResponse<TAbility> => {
    // Only through oRPC's `ResponseHeadersPlugin`, which puts `resHeaders` in
    // the context: a procedure has no other way to set a response header.
    context.resHeaders?.set('cache-control', RULES_CACHE_CONTROL);
    return rulesResponse(context.ability);
  };

  return {
    middleware,

    assertCan(ability, action, subject, decideOptions) {
      const decision = kit.decide(ability, action, subject, decideOptions);
      if (!decision.allowed) throwDenial(decision);
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

  /** Throws the oRPC error of a denial, or the app's hook's. */
  function throwDenial(denial: Denial): never {
    const hook = kit.hookFor(denial);
    if (hook) throw hook(denial);
    switch (denial.kind) {
      case 'unauthenticated':
        throw new ORPCError('UNAUTHORIZED', { message: denial.message });
      case 'forbidden':
        throw new ORPCError('FORBIDDEN', { message: denial.message });
      case 'not-found':
        // oRPC's default message, indistinguishable from a genuine not-found.
        throw new ORPCError('NOT_FOUND');
    }
  }
}
