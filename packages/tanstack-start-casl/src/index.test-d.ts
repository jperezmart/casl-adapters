import type { InferSubjects, MongoAbility } from '@casl/ability';
import { redirect } from '@tanstack/react-router';
import { createMiddleware, createServerFn } from '@tanstack/react-start';

import type { DenialError, RulesResponse } from './server.js';
import { createStartCasl, isDenialError } from './server.js';

interface Article {
  readonly kind: 'Article';
  id: string;
}
type Action = 'read' | 'update';
type AppAbility = MongoAbility<[Action, InferSubjects<Article> | 'all']>;

interface User {
  id: string;
  roles: string[];
}

const casl = createStartCasl<User, AppAbility>({
  getUser: request => {
    expectTypeOf(request).toEqualTypeOf<Request>();
    return null;
  },
  permissions: [],
  onUnauthenticated: () => redirect({ to: '/login' }),
});

describe('createStartCasl types', () => {
  it('adds the Ability and the user to a server function context', () => {
    const caslMiddleware = createMiddleware({ type: 'function' }).server(
      casl.functionMiddlewareServer,
    );
    createServerFn()
      .middleware([caslMiddleware])
      .validator((data: { id: string }) => data)
      .handler(({ context, data }) => {
        expectTypeOf(context.ability).toEqualTypeOf<AppAbility>();
        expectTypeOf(context.user).toEqualTypeOf<User>();
        expectTypeOf(data).toEqualTypeOf<{ id: string }>();
      });
  });

  it('adds the Ability and the user to the context of what follows the route middleware', () => {
    createMiddleware()
      .middleware([casl.routeMiddleware])
      .server(({ context, next }) => {
        expectTypeOf(context.ability).toEqualTypeOf<AppAbility>();
        expectTypeOf(context.user).toEqualTypeOf<User>();
        return next();
      });
  });

  it("types assertCan by the app's Ability", () => {
    const ability = null as unknown as AppAbility;
    casl.assertCan(ability, 'update', { kind: 'Article', id: '1' });
    casl.assertCan(undefined, 'read', 'Article');
    // @ts-expect-error -- not an action of the Ability
    casl.assertCan(ability, 'publish', 'Article');
    // @ts-expect-error -- not a subject of the Ability
    casl.assertCan(ability, 'read', 'Comment');
  });

  it('narrows a caught error to the DenialError', () => {
    const error: unknown = null;
    if (isDenialError(error)) {
      expectTypeOf(error).toEqualTypeOf<DenialError>();
      expectTypeOf(error.status).toEqualTypeOf<401 | 403>();
      expectTypeOf(error.kind).toEqualTypeOf<'unauthenticated' | 'forbidden'>();
    }
  });

  it('declares the Rules endpoint body by the Ability', () => {
    expectTypeOf<RulesResponse<AppAbility>['rules']>().toBeArray();
    expectTypeOf(casl.rulesHandler).parameter(0).toEqualTypeOf<{
      request: Request;
    }>();
    expectTypeOf(casl.rulesHandler).returns.resolves.toEqualTypeOf<Response>();
  });
});
