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
  rulesResponse,
  unauthenticatedDenial,
} from '@jperezmart/casl-core';
import type { Context, Env, Handler, MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';

/**
 * Options for {@link createHonoCasl}, as every Adapter takes them: `getUser`
 * finds the Authorizable user from the request's Hono context (where an
 * authentication middleware that ran before may have put it), and
 * `onUnauthenticated` and `onForbidden` answer with a `Response` (typically
 * `c.redirect(…)`) instead of the 401 and the 403.
 *
 * `TEnv` is the Hono env `getUser` and the hooks read the context with, such
 * as the `Variables` your authentication middleware sets.
 */
export type HonoCaslOptions<
  TUser extends AuthorizableUser,
  TAbility extends AnyAbility,
  TEnv extends Env = Env,
> = AdapterOptions<Context<TEnv>, TUser, TAbility, DenialHook<TEnv>>;

/**
 * Answers a denial with a `Response` instead of the default JSON one, or keeps
 * the default by returning nothing.
 */
export type DenialHook<TEnv extends Env = Env> = (
  denial: Denial,
  c: Context<TEnv>,
) => Response | undefined | Promise<Response | undefined>;

/** What the Adapter's middleware puts in the context. */
export type { CaslContext };

/**
 * The Hono env of the Adapter's middleware: `c.var.ability` and `c.var.user`
 * (or `c.get('ability')`) are typed by it after the middleware runs.
 */
export interface CaslEnv<TUser, TAbility> {
  Variables: CaslContext<TUser, TAbility>;
}

/** The JSON body of a denial's answer. */
export interface DenialBody {
  statusCode: 401 | 403 | 404;
  message: string;
}

/** The Hono Adapter of one app, from {@link createHonoCasl}. */
export interface HonoCasl<
  TUser extends AuthorizableUser,
  TAbility extends AnyAbility,
> {
  /**
   * Finds the request's Authorizable user with `getUser`, builds their
   * Ability and puts both in the context ({@link CaslEnv}). An
   * Unauthenticated request is answered (401, or `onUnauthenticated`) before
   * the handler runs. What the handlers after it throw is answered too:
   * `assertCan`'s and `notFound()`'s denials, and the Access conditions'
   * refusal (`NoRecordAllowedError`) as forbidden, with `onForbidden` and
   * `onUnauthenticated` applied.
   */
  middleware: MiddlewareHandler<CaslEnv<TUser, TAbility>>;

  /**
   * Returns when `ability` may perform `action` on `subject`, and otherwise
   * throws by the Denial rule an `HTTPException` whose response is the
   * denial's status (401, 403 or 404) with a JSON {@link DenialBody}. Check
   * the subject type before loading the instance, then the instance.
   */
  assertCan(
    ability: TAbility | null | undefined,
    action: ActionOf<TAbility>,
    subject: SubjectOf<TAbility>,
    options?: DecideOptions<TAbility>,
  ): void;

  /**
   * The Rules endpoint as a ready-made handler: `{ rules }`, the packed rules
   * of the user's Ability, or 401 for an Unauthenticated request (never
   * `onUnauthenticated`'s answer, so the browser can tell there is no
   * session). Mount it with `app.get(path, casl.rulesHandler)`.
   */
  rulesHandler: Handler;
}

/**
 * Creates the Hono Adapter of an app: its Role permissions, Superuser role
 * and subject-type detection (as `createAbilityFactory` takes them), the
 * `getUser` that finds a request's Authorizable user, and optional hooks to
 * answer denials differently.
 */
export function createHonoCasl<
  TUser extends AuthorizableUser = AuthorizableUser,
  TAbility extends AnyAbility = AppAbility,
  TEnv extends Env = Env,
>(options: HonoCaslOptions<TUser, TAbility, TEnv>): HonoCasl<TUser, TAbility> {
  const kit = createAdapterKit<
    Context<TEnv>,
    TUser,
    TAbility,
    DenialHook<TEnv>
  >(options);

  /** The answer to a denial: the app's hook's, or the default JSON. */
  async function answer(denial: Denial, c: Context): Promise<Response> {
    const hooked = await kit.hookFor(denial)?.(denial, c as Context<TEnv>);
    return hooked ?? denialResponse(denial);
  }

  return {
    async middleware(c, next) {
      const context = await kit.contextOf(c as unknown as Context<TEnv>);
      if (!context) return answer(unauthenticatedDenial, c);
      c.set('ability', context.ability);
      c.set('user', context.user);
      await next();
      // Hono answers what a handler throws before control returns here, so
      // the denial is read back from the context and its answer replaces the
      // error handler's.
      const denial = denialOf(c.error);
      if (denial) {
        const response = await answer(denial, c);
        // Replaces the response instead of merging the error's headers in.
        c.res = undefined;
        c.res = response;
      }
      return undefined;
    },

    assertCan(ability, action, subject, decideOptions) {
      const decision = kit.decide(ability, action, subject, decideOptions);
      if (!decision.allowed) throw new DenialException(decision);
    },

    async rulesHandler(c) {
      const context = await kit.contextOf(c as Context<TEnv>);
      if (!context) return denialResponse(unauthenticatedDenial);
      return c.json(rulesResponse(context.ability));
    },
  };
}

/**
 * Answers not found from a handler, exactly as `assertCan` answers an
 * instance the user cannot read: use it for a record that does not exist, so
 * a hidden record and a missing one cannot be told apart.
 */
export function notFound(): never {
  throw new DenialException(notFoundDenial);
}

/** The status of each denial kind. */
const STATUS = {
  unauthenticated: 401,
  forbidden: 403,
  'not-found': 404,
} as const;

/** A denial's default answer: its status, with a JSON {@link DenialBody}. */
function denialResponse(denial: Denial): Response {
  const statusCode = STATUS[denial.kind];
  const body: DenialBody = { statusCode, message: denial.message };
  return Response.json(body, { status: statusCode });
}

/**
 * What `assertCan` and `notFound` throw: Hono's `HTTPException`, so a route
 * without the middleware still answers the denial's default response.
 */
class DenialException extends HTTPException {
  constructor(readonly denial: Denial) {
    super(STATUS[denial.kind], {
      message: denial.message,
      res: denialResponse(denial),
    });
    this.name = 'DenialException';
  }
}

/** The denial a handler threw, if any: ours, or the Access conditions' refusal. */
function denialOf(error: unknown): Denial | undefined {
  if (error instanceof DenialException) return error.denial;
  if (error instanceof NoRecordAllowedError) return forbiddenDenialOf(error);
  return undefined;
}
