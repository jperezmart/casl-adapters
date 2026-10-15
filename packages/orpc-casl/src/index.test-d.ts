import type { InferSubjects, MongoAbility } from '@casl/ability';
import { oc } from '@orpc/contract';
import type { InferRouterOutputs } from '@orpc/server';
import { implement, os } from '@orpc/server';
import { z } from 'zod';

import type { RulesResponse } from './index.js';
import { createOrpcCasl } from './index.js';

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
interface Context {
  headers: Record<string, string | undefined>;
}

const casl = createOrpcCasl<Context, User, AppAbility>({
  getUser: context => {
    expectTypeOf(context).toEqualTypeOf<Context>();
    return null;
  },
  permissions: [],
});

describe('createOrpcCasl types', () => {
  it("adds the Ability and the user to the procedure context, keeping the app's", () => {
    os.$context<Context>()
      .use(casl.middleware)
      .handler(({ context }) => {
        expectTypeOf(context.ability).toEqualTypeOf<AppAbility>();
        expectTypeOf(context.user).toEqualTypeOf<User>();
        expectTypeOf(context.headers).toEqualTypeOf<
          Record<string, string | undefined>
        >();
      });
  });

  it('fits a contract-first procedure, with its errors', () => {
    const contract = oc
      .errors({ NOT_FOUND: { status: 404 } })
      .input(z.object({ id: z.string() }));
    implement(contract)
      .$context<Context>()
      .use(casl.middleware)
      .handler(({ context }) => {
        expectTypeOf(context.ability).toEqualTypeOf<AppAbility>();
      });
  });

  it("types assertCan by the app's Ability", () => {
    const ability = null as unknown as AppAbility;
    casl.assertCan(ability, 'update', { kind: 'Article', id: '1' });
    casl.assertCan(ability, 'read', 'Article', { readAction: 'read' });
    casl.assertCan(null, 'read', 'Article');
    // @ts-expect-error — 'frobnicate' is not an Action
    casl.assertCan(ability, 'frobnicate', 'Article');
    // @ts-expect-error — 'Ghost' is not a subject
    casl.assertCan(ability, 'read', 'Ghost');
  });

  it('types the Rules endpoint response', () => {
    expectTypeOf<
      InferRouterOutputs<typeof casl.rulesProcedure>
    >().toEqualTypeOf<RulesResponse<AppAbility>>();
  });

  it("implementRules fits the app's contract router", () => {
    const contract = {
      me: {
        rules: oc
          .route({ method: 'GET', path: '/me/rules' })
          .errors({ UNAUTHORIZED: { status: 401 } })
          .output(z.object({ rules: z.array(z.unknown()) })),
      },
    };
    implement(contract)
      .$context<Context>()
      .router({ me: { rules: casl.implementRules(contract.me.rules) } });
  });

  it('implementRules rejects a contract whose output cannot hold { rules }', () => {
    const contract = oc.output(z.object({ user: z.string() }));
    // @ts-expect-error — the output must accept { rules }
    casl.implementRules(contract);
  });
});
