import type { AnyAbility } from '@casl/ability';
import type {
  ActionOf,
  AdapterOptions,
  AppAbility,
  AuthorizableUser,
  CaslContext,
  DecideOptions,
  Denial,
  SubjectOf,
} from '@jperezmart/casl-core';
import {
  createAdapterKit,
  forbiddenDenialOf,
  NoRecordAllowedError,
  notFoundDenial,
  RULES_CACHE_CONTROL,
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

/**
 * Options for {@link createStartCasl}, as every Adapter takes them: `getUser`
 * finds the Authorizable user from the request, and `onUnauthenticated` and
 * `onForbidden` return (or throw) what to throw instead of the 401 and the
 * 403, typically a `redirect(…)`.
 */
export type StartCaslOptions<
  TUser extends AuthorizableUser,
  TAbility extends AnyAbility,
> = AdapterOptions<Request, TUser, TAbility, DenialHook>;

/** What the Adapter's middleware adds to the context. */
export type { CaslContext };

/** What `onUnauthenticated` and `onForbidden` answer a denial with. */
type DenialHook = (denial: Denial) => unknown;

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
  const kit = createAdapterKit<Request, TUser, TAbility, DenialHook>(options);

  /** The context of a request; throws the answer to an Unauthenticated one. */
  async function contextOrThrow(
    request: Request,
  ): Promise<CaslContext<TUser, TAbility>> {
    const context = await kit.contextOf(request);
    if (!context) throwDenial(unauthenticatedDenial);
    return context;
  }

  /** Runs the rest of the chain, answering the Access conditions' refusal. */
  async function guarded<T>(next: () => T | Promise<T>): Promise<T> {
    try {
      return await next();
    } catch (error) {
      if (!(error instanceof NoRecordAllowedError)) throw error;
      throwDenial(forbiddenDenialOf(error));
    }
  }

  /** Throws the answer to a denial: the router's, the app's hook's, or ours. */
  function throwDenial(denial: Denial): never {
    if (denial.kind === 'not-found') throw notFound();
    const hook = kit.hookFor(denial);
    if (hook) throw hook(denial);
    const error = new DenialError(denial.kind, denial.message);
    setResponseStatus(error.status);
    throw error;
  }

  const functionMiddlewareServer: CaslFunctionMiddlewareServer<
    TUser,
    TAbility
  > = async ({ next }) => {
    const context = await contextOrThrow(getRequest());
    return guarded(() => next({ context }));
  };

  const routeMiddleware = createMiddleware().server(
    async ({ request, next }) => {
      try {
        const context = await contextOrThrow(request);
        return await guarded(() => next({ context }));
      } catch (error) {
        return denialResponse(error);
      }
    },
  );

  return {
    functionMiddlewareServer,
    routeMiddleware,

    assertCan(ability, action, subject, decideOptions) {
      const decision = kit.decide(ability, action, subject, decideOptions);
      if (!decision.allowed) throwDenial(decision);
    },

    async rulesHandler({ request }) {
      const context = await kit.contextOf(request);
      const response = context
        ? Response.json(rulesResponse(context.ability))
        : jsonResponse(401, unauthenticatedDenial.message);
      response.headers.set('cache-control', RULES_CACHE_CONTROL);
      return response;
    },
  };
}

/** A server route's answer to what a denied check threw. */
function denialResponse(error: unknown): Response {
  if (error instanceof DenialError)
    return jsonResponse(error.status, error.message);
  // The core's answer for a hidden instance, also used for a missing one.
  if (isNotFound(error)) return jsonResponse(404, notFoundDenial.message);
  // A hook's redirect, or a Response the handler threw.
  if (error instanceof Response) return error;
  throw error;
}

/** A JSON `{ message }` response with `status`. */
function jsonResponse(status: number, message: string): Response {
  return Response.json({ message }, { status });
}
