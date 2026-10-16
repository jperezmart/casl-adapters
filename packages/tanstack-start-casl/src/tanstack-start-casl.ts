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
   * `createMiddleware({ type: 'function' }).server(…)`. It refuses as
   * forbidden a call the browser marks as cross-site (`Sec-Fetch-Site`, or
   * else `Origin`), before anything else. Then it finds the
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
   * A write (`POST`, `PUT`, `PATCH`, `DELETE`) the browser marks as cross-site
   * is refused as forbidden before anything else, by the same check as server
   * functions; reads are left to CORS, which decides who may read the answer.
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
    const request = getRequest();
    // Server functions are same-origin RPC, and an app's own `startInstance`
    // replaces Start's default CSRF middleware: refuse a call the browser
    // marks as cross-site before the session cookie it carries counts.
    if (isCrossSite(request)) throwDenial(crossSiteCallDenial);
    const context = await contextOrThrow(request);
    return guarded(() => next({ context }));
  };

  const routeMiddleware = createMiddleware().server(
    async ({ request, next }) => {
      try {
        // Start's CSRF middleware never covers server routes: refuse a
        // cross-site write before the session cookie it carries counts.
        if (UNSAFE_METHODS.has(request.method) && isCrossSite(request))
          throwDenial(crossSiteWriteDenial);
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

/** A server function call refused as cross-site: forbidden. */
const crossSiteCallDenial: Denial = Object.freeze({
  allowed: false,
  kind: 'forbidden',
  message: 'Cross-site server function calls are refused.',
});

/** A server route write refused as cross-site: forbidden. */
const crossSiteWriteDenial: Denial = Object.freeze({
  allowed: false,
  kind: 'forbidden',
  message: 'Cross-site writes are refused.',
});

/** The methods a server route refuses from another site. */
const UNSAFE_METHODS: ReadonlySet<string> = new Set([
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
]);

/**
 * Whether the browser says `request` comes from another site, by
 * `Sec-Fetch-Site` or else `Origin` (Start's own CSRF check). A request with
 * neither, from no browser, carries no ambient session to abuse.
 */
function isCrossSite(request: Request): boolean {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite !== null) return fetchSite !== 'same-origin';
  const origin = request.headers.get('origin');
  return origin !== null && origin !== new URL(request.url).origin;
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
