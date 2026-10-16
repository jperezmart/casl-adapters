import type { InferSubjects, MongoAbility } from '@casl/ability';
import type { Handler } from 'hono';
import { Hono } from 'hono';

import type { RulesResponse } from './index.js';
import { createHonoCasl } from './index.js';

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

const casl = createHonoCasl<User, AppAbility>({
  getUser: c => {
    expectTypeOf(c.req.raw).toEqualTypeOf<Request>();
    return null;
  },
  permissions: [],
  onUnauthenticated: (_denial, c) => c.redirect('/login'),
  onForbidden: () => undefined,
});

describe('createHonoCasl types', () => {
  it('types the context of the routes after app.use(casl.middleware)', () => {
    new Hono().use(casl.middleware).get('/', c => {
      expectTypeOf(c.var.ability).toEqualTypeOf<AppAbility>();
      expectTypeOf(c.get('user')).toEqualTypeOf<User>();
      return c.text('ok');
    });
  });

  it('types the context of a route given the middleware', () => {
    new Hono().get('/', casl.middleware, c => {
      expectTypeOf(c.var.ability).toEqualTypeOf<AppAbility>();
      expectTypeOf(c.var.user).toEqualTypeOf<User>();
      return c.text('ok');
    });
  });

  it('leaves the context untyped without the middleware', () => {
    new Hono<{ Variables: { requestId: string } }>().get('/', c => {
      // @ts-expect-error -- no Ability without the middleware
      c.get('ability');
      return c.text('ok');
    });
  });

  it('reads the Hono env the app gives getUser', () => {
    interface AuthEnv {
      Variables: { session: { user: User } | null };
    }
    createHonoCasl<User, AppAbility, AuthEnv>({
      getUser: c => c.var.session?.user,
      permissions: [],
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

  it('lets a hook answer with a Response only', () => {
    createHonoCasl<User, AppAbility>({
      getUser: () => null,
      permissions: [],
      // @ts-expect-error -- a hook answers with a Response, not a string
      onForbidden: () => '/denied',
    });
  });

  it('declares the Rules endpoint as a handler, its body by the Ability', () => {
    expectTypeOf(casl.rulesHandler).toEqualTypeOf<Handler>();
    expectTypeOf<RulesResponse<AppAbility>['rules']>().toBeArray();
  });
});
