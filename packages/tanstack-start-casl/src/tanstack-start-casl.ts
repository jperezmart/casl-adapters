import type { AnyAbility } from '@casl/ability';
import type {
  AbilityFactoryOptions,
  ActionOf,
  AppAbility,
  AuthorizableUser,
  DecideOptions,
  Denial,
  SubjectOf,
} from '@jperezmart/casl-core';
import {
  createAbilityFactory,
  decide,
  forbiddenDenialOf,
  NoRecordAllowedError,
  notFoundDenial,
  rulesResponse,
  unauthenticatedDenial,
} from '@jperezmart/casl-core';
import { isNotFound, notFound } from '@tanstack/react-router';
import type {
  FunctionMiddlewareServerFn,
  RequestMiddlewareAfterServer,
} from '@tanstack/react-start';
import { createMiddleware } from '@tanstack/react-start';
import { getRequest, setResponseStatus } from '@tanstack/react-start/server';

import { DenialError } from './denial-error.js';

/** Options for {@link createStartCasl}. */
export interface StartCaslOptions<
  TUser extends AuthorizableUser,
  TAbility extends AnyAbility,
> extends AbilityFactoryOptions<TUser, TAbility> {
  /**
   * Finds the Authorizable user of a request, or `null` (or `undefined`) for
   * an Unauthenticated request.
   */
  getUser(
    request: Request,
  ): TUser | null | undefined | Promise<TUser | null | undefined>;

  /**
   * The action that decides whether a denied instance is hidden (not found)
   * or merely forbidden. Defaults to `'read'`.
   */
  readAction?: ActionOf<TAbility> | undefined;

  /**
   * Answers an Unauthenticated request instead of the default (401): returns
   * (or throws) what to throw, typically `redirect({ to: '/login' })`.
   */
  onUnauthenticated?: ((denial: Denial) => unknown) | undefined;

  /**
   * Answers a forbidden denial instead of the default (403): returns (or
   * throws) what to throw, typically a `redirect(…)`. Not found has no hook,
   * so existence stays hidden.
   */
  onForbidden?: ((denial: Denial) => unknown) | undefined;
}

/** What the Adapter's middleware adds to the context. */
export interface CaslContext<TUser, TAbility> {
  /** The Ability of the request's Authorizable user. */
  ability: TAbility;
  /** The Authorizable user `getUser` found. */
  user: TUser;
}

// Start's own `TRegister` for `createMiddleware`, which is `{}`.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- as Start's
type StartRegister = {};

/**
 * {@link StartCasl.functionMiddlewareServer}'s type: the server step of a
 * function middleware that adds {@link CaslContext}.
 */
export type CaslFunctionMiddlewareServer<TUser, TAbility> =
  FunctionMiddlewareServerFn<
    StartRegister,
    unknown,
    undefined,
    undefined,
    CaslContext<TUser, TAbility>,
    undefined
  >;

/** {@link StartCasl.routeMiddleware}'s type: it adds {@link CaslContext}. */
export type CaslRouteMiddleware<TUser, TAbility> = RequestMiddlewareAfterServer<
  StartRegister,
  undefined,
  CaslContext<TUser, TAbility>
>;

/** A server route handler, as Start calls it. */
export type ServerRouteHandler = (ctx: {
  request: Request;
}) => Promise<Response>;

/** The TanStack Start Adapter of one app, from {@link createStartCasl}. */
export interface StartCasl<
  TUser extends AuthorizableUser,
  TAbility extends AnyAbility,
> {
  /**
   * The server step of the server function middleware; pass it to
   * `createMiddleware({ type: 'function' }).server(…)`. It finds the
   * request's Authorizable user with `getUser`, builds their Ability and adds
   * both to the context ({@link CaslContext}). An Unauthenticated request is
   * answered (401, or `onUnauthenticated`) before the handler runs, and the
   * Access conditions' refusal (`NoRecordAllowedError`) thrown by the handler
   * is answered as forbidden.
   *
   * It is a step rather than a ready-made middleware because server functions
   * are referenced from client code: Start strips `.server(…)` from the client
   * bundle, and with it this Adapter and the Role permissions it holds.
   */
  functionMiddlewareServer: CaslFunctionMiddlewareServer<TUser, TAbility>;

  /**
   * Server route middleware, ready-made (server routes never reach the
   * client): it adds {@link CaslContext} as the server function middleware
   * does, but every denial, thrown by it or by the handler's `assertCan`, is
   * answered with a `Response`: 401, 403 or 404, with a JSON `{ message }`.
   */
  routeMiddleware: CaslRouteMiddleware<TUser, TAbility>;

  /**
   * Returns when `ability` may perform `action` on `subject`, and otherwise
   * throws by the Denial rule. Not found throws the router's `notFound()`;
   * unauthenticated (no Ability) and forbidden set the response status to 401
   * or 403 and throw a {@link DenialError}, unless `onUnauthenticated` or
   * `onForbidden` answers instead. Check the subject type before loading the
   * instance, then the instance.
   */
  assertCan(
    ability: TAbility | null | undefined,
    action: ActionOf<TAbility>,
    subject: SubjectOf<TAbility>,
    options?: DecideOptions<TAbility>,
  ): void;

  /**
   * The Rules endpoint as a server route handler: `{ rules }`, the packed
   * rules of the user's Ability, or 401 for an Unauthenticated request.
   */
  rulesHandler: ServerRouteHandler;
}

/**
 * Creates the TanStack Start Adapter of an app: its Role permissions, its
 * Superuser role and subject-type detection (as `createAbilityFactory` takes
 * them), the `getUser` that finds a request's Authorizable user, and optional
 * hooks to answer denials differently. It works the same in SPA mode, where
 * server functions and server routes still run on the server.
 */
export function createStartCasl<
  TUser extends AuthorizableUser = AuthorizableUser,
  TAbility extends AnyAbility = AppAbility,
>(options: StartCaslOptions<TUser, TAbility>): StartCasl<TUser, TAbility> {
  const factory = createAbilityFactory<TUser, TAbility>(options);

  /** The context of a request, or the answer to an Unauthenticated one. */
  async function contextOf(
    request: Request,
  ): Promise<CaslContext<TUser, TAbility>> {
    const user = await options.getUser(request);
    if (!user) deny(unauthenticatedDenial);
    return { user, ability: factory.createForUser(user) };
  }

  /** Runs the rest of the chain, answering the Access conditions' refusal. */
  async function guarded<T>(next: () => T | Promise<T>): Promise<T> {
    try {
      return await next();
    } catch (error) {
      if (!(error instanceof NoRecordAllowedError)) throw error;
      deny(forbiddenDenialOf(error));
    }
  }

  /** Throws the answer to a denial. */
  function deny(denial: Denial): never {
    switch (denial.kind) {
      case 'not-found':
        throw notFound();
      case 'unauthenticated':
        if (options.onUnauthenticated) throw options.onUnauthenticated(denial);
        break;
      case 'forbidden':
        if (options.onForbidden) throw options.onForbidden(denial);
        break;
    }
    const error = new DenialError(denial.kind, denial.message);
    setResponseStatus(error.status);
    throw error;
  }

  const functionMiddlewareServer: CaslFunctionMiddlewareServer<
    TUser,
    TAbility
  > = async ({ next }) => {
    const context = await contextOf(getRequest());
    return guarded(() => next({ context }));
  };

  const routeMiddleware = createMiddleware().server(
    async ({ request, next }) => {
      try {
        const context = await contextOf(request);
        return await guarded(() => next({ context }));
      } catch (error) {
        return asResponse(error);
      }
    },
  );

  return {
    functionMiddlewareServer,
    routeMiddleware,

    assertCan(ability, action, subject, decideOptions) {
      const decision = decide(ability, action, subject, {
        ...(options.readAction === undefined
          ? {}
          : { readAction: options.readAction }),
        ...decideOptions,
      });
      if (!decision.allowed) deny(decision);
    },

    async rulesHandler({ request }) {
      const user = await options.getUser(request);
      if (!user) return answer(401, unauthenticatedDenial.message);
      return Response.json(rulesResponse(factory.createForUser(user)));
    },
  };
}

/** A server route's answer to what a denied check threw. */
function asResponse(error: unknown): Response {
  if (error instanceof DenialError) return answer(error.status, error.message);
  // The core's answer for a hidden instance, also used for a missing one.
  if (isNotFound(error)) return answer(404, notFoundDenial.message);
  // A hook's redirect, or a Response the handler threw.
  if (error instanceof Response) return error;
  throw error;
}

function answer(status: number, message: string): Response {
  return Response.json({ message }, { status });
}
