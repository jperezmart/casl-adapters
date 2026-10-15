import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ParsedUrlQuery } from 'node:querystring';

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
  notFoundDenial,
  rulesResponse,
  unauthenticatedDenial,
} from '@jperezmart/casl-core';
import type {
  GetServerSideProps,
  GetServerSidePropsContext,
  GetServerSidePropsResult,
  NextApiHandler,
  NextApiRequest,
  NextApiResponse,
  PreviewData,
  Redirect,
} from 'next';

import type { DeniedPageProps } from './denial-page.js';
import { DENIAL_PROP } from './denial-page.js';

/**
 * Options for {@link createNextCasl}, as every Adapter takes them: `getUser`
 * finds the Authorizable user from the request's Node request, and
 * `onUnauthenticated` and `onForbidden` answer with a redirect (to a login
 * page, to the app's own 403 page…) instead of the 401 and the 403.
 */
export type NextCaslOptions<
  TUser extends AuthorizableUser,
  TAbility extends AnyAbility,
> = AdapterOptions<IncomingMessage, TUser, TAbility, DenialHook>;

/**
 * Answers a denial with a redirect instead of its status, or keeps the status
 * by returning nothing. It gets the request, so it can tell a page from an API
 * route (`req.url`).
 */
export type DenialHook = (
  denial: Denial,
  req: IncomingMessage,
) => Redirect | undefined | Promise<Redirect | undefined>;

/** What the wrappers hand over: the request's Ability and its user. */
export type CaslRequestContext<TUser, TAbility> = CaslContext<TUser, TAbility>;

/** The page's `getServerSideProps`, given the request's Ability. */
export type GetServerSidePropsWithAbility<
  TProps extends Record<string, unknown>,
  TParams extends ParsedUrlQuery,
  TPreview extends PreviewData,
  TUser,
  TAbility,
> = (
  context: GetServerSidePropsContext<TParams, TPreview> &
    CaslRequestContext<TUser, TAbility>,
) =>
  | GetServerSidePropsResult<TProps>
  | Promise<GetServerSidePropsResult<TProps>>;

/** An API route handler, given the request's Ability. */
export type ApiRouteWithAbility<TData, TUser, TAbility> = (
  req: NextApiRequest,
  res: NextApiResponse<TData>,
  context: CaslRequestContext<TUser, TAbility>,
) => unknown;

/** The Next.js Pages Router Adapter of one app, from {@link createNextCasl}. */
export interface NextCasl<
  TUser extends AuthorizableUser,
  TAbility extends AnyAbility,
> {
  /** Wraps a page's `getServerSideProps`, handing it the request's Ability. */
  getServerSideProps<
    TProps extends Record<string, unknown> = Record<string, unknown>,
    TParams extends ParsedUrlQuery = ParsedUrlQuery,
    TPreview extends PreviewData = PreviewData,
  >(
    handler: GetServerSidePropsWithAbility<
      TProps,
      TParams,
      TPreview,
      TUser,
      TAbility
    >,
  ): GetServerSideProps<TProps, TParams, TPreview>;

  /** Wraps an API route handler, handing it the request's Ability. */
  apiRoute<TData = unknown>(
    handler: ApiRouteWithAbility<TData, TUser, TAbility>,
  ): NextApiHandler<TData>;

  /**
   * The Rules endpoint as a ready-made API route handler: `GET` answers
   * `{ rules }`, the packed rules of the user's Ability, and an
   * Unauthenticated request gets 401 (never `onUnauthenticated`'s redirect,
   * so the browser can tell there is no session). Export it as the default of
   * the API route at the path of your choice.
   */
  rulesEndpoint: NextApiHandler<RulesResponse<TAbility>>;

  /**
   * Returns when `ability` may perform `action` on `subject`, and otherwise
   * throws the denial for the wrapper around it to answer by the Denial rule.
   */
  assertCan(
    ability: TAbility | null | undefined,
    action: ActionOf<TAbility>,
    subject: SubjectOf<TAbility>,
    options?: DecideOptions<TAbility>,
  ): void;
}

/**
 * Creates the Next.js Pages Router Adapter of an app: its Role permissions,
 * Superuser role and subject-type detection (as `createAbilityFactory` takes
 * them), and the `getUser` that finds a request's Authorizable user.
 */
export function createNextCasl<
  TUser extends AuthorizableUser = AuthorizableUser,
  TAbility extends AnyAbility = AppAbility,
>(options: NextCaslOptions<TUser, TAbility>): NextCasl<TUser, TAbility> {
  const kit = createAdapterKit<IncomingMessage, TUser, TAbility, DenialHook>(
    options,
  );

  /** Sends an API route's answer to a denial: the app's redirect, or JSON. */
  async function sendDenial(
    denial: Denial,
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const redirect = await kit.hookFor(denial)?.(denial, req);
    if (redirect) {
      res.statusCode =
        'statusCode' in redirect
          ? redirect.statusCode
          : redirect.permanent
            ? 308
            : 307;
      res.setHeader('location', redirect.destination);
      res.end();
      return;
    }
    sendDenialJson(res, denial);
  }

  return {
    getServerSideProps(handler) {
      return async context => {
        const caslContext = await kit.contextOf(context.req);
        if (!caslContext)
          return deniedPageResult(
            unauthenticatedDenial,
            context,
            kit.hookFor(unauthenticatedDenial),
          );
        try {
          return await handler({ ...context, ...caslContext });
        } catch (error) {
          const denial = denialOf(error);
          return deniedPageResult(denial, context, kit.hookFor(denial));
        }
      };
    },

    apiRoute(handler) {
      return async (req, res) => {
        const caslContext = await kit.contextOf(req);
        if (!caslContext) return sendDenial(unauthenticatedDenial, req, res);
        try {
          await handler(req, res, caslContext);
        } catch (error) {
          await sendDenial(denialOf(error), req, res);
        }
      };
    },

    async rulesEndpoint(req, res) {
      if (req.method !== 'GET') {
        res.statusCode = 405;
        res.setHeader('allow', 'GET');
        res.end();
        return;
      }
      const caslContext = await kit.contextOf(req);
      if (!caslContext) return sendDenialJson(res, unauthenticatedDenial);
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(rulesResponse(caslContext.ability)));
    },

    assertCan(ability, action, subject, decideOptions) {
      const decision = kit.decide(ability, action, subject, decideOptions);
      if (!decision.allowed) throw new DenialError(decision);
    },
  };
}

/** The status of each denial kind. */
const STATUS = {
  unauthenticated: 401,
  forbidden: 403,
  'not-found': 404,
} as const;

/**
 * Answers not found from inside a wrapper, exactly as `assertCan` answers an
 * instance the user cannot read: use it for a record that does not exist, so
 * a hidden record and a missing one cannot be told apart.
 */
export function notFound(): never {
  throw new DenialError(notFoundDenial);
}

/** The `getServerSideProps` result of a denial. */
async function deniedPageResult(
  denial: Denial,
  context: GetServerSidePropsContext,
  hook: DenialHook | undefined,
): Promise<GetServerSidePropsResult<never>> {
  if (denial.kind === 'not-found') return { notFound: true };
  const redirect = await hook?.(denial, context.req);
  if (redirect) return { redirect };
  const statusCode = STATUS[denial.kind];
  context.res.statusCode = statusCode;
  const props: DeniedPageProps = {
    [DENIAL_PROP]: { statusCode, message: denial.message },
  };
  // The denial props stand in for the page's own: `withDenialPage` renders
  // the error page instead of the page.
  return { props } as unknown as GetServerSidePropsResult<never>;
}

/** Sends a denial's status, with `{ statusCode, message }` as JSON. */
function sendDenialJson(res: ServerResponse, denial: Denial): void {
  const statusCode = STATUS[denial.kind];
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ statusCode, message: denial.message }));
}

/**
 * The denial a wrapped handler threw: `assertCan`'s or `notFound`'s, or the
 * Access conditions' refusal as forbidden. Rethrows anything else.
 */
function denialOf(error: unknown): Denial {
  if (error instanceof DenialError) return error.denial;
  if (error instanceof NoRecordAllowedError) return forbiddenDenialOf(error);
  throw error;
}

/** Carries a denial from `assertCan` to the wrapper that answers it. */
class DenialError extends Error {
  constructor(readonly denial: Denial) {
    super(denial.message);
    this.name = 'DenialError';
  }
}
