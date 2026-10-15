import type { IncomingMessage } from 'node:http';

import type { InferSubjects, MongoAbility } from '@casl/ability';
import type {
  InferGetServerSidePropsType,
  NextApiHandler,
  NextApiRequest,
  NextApiResponse,
} from 'next';
import type { AppProps } from 'next/app';
import type { ReactNode } from 'react';

import type { RulesResponse } from './index.js';
import { createNextCasl, withDenialPage } from './index.js';

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

const casl = createNextCasl<User, AppAbility>({
  getUser: req => {
    expectTypeOf(req).toEqualTypeOf<IncomingMessage>();
    return null;
  },
  permissions: [],
});

describe('createNextCasl types', () => {
  it("hands getServerSideProps the app's Ability and user, with Next.js's context", () => {
    casl.getServerSideProps<{ title: string }, { id: string }>(
      ({ ability, user, params }) => {
        expectTypeOf(ability).toEqualTypeOf<AppAbility>();
        expectTypeOf(user).toEqualTypeOf<User>();
        expectTypeOf(params).toEqualTypeOf<{ id: string } | undefined>();
        return { props: { title: 'Hello' } };
      },
    );
  });

  it("keeps the page's props for InferGetServerSidePropsType", () => {
    const _getServerSideProps = casl.getServerSideProps(() => ({
      props: { title: 'Hello' },
    }));
    expectTypeOf<
      InferGetServerSidePropsType<typeof _getServerSideProps>
    >().toEqualTypeOf<{ title: string }>();
  });

  it("hands an API route the app's Ability and user", () => {
    const route = casl.apiRoute<{ id: string }>((req, res, context) => {
      expectTypeOf(req).toEqualTypeOf<NextApiRequest>();
      expectTypeOf(res).toEqualTypeOf<NextApiResponse<{ id: string }>>();
      expectTypeOf(context.ability).toEqualTypeOf<AppAbility>();
      expectTypeOf(context.user).toEqualTypeOf<User>();
    });
    expectTypeOf(route).toEqualTypeOf<NextApiHandler<{ id: string }>>();
  });

  it('serves the Rules endpoint as an API route handler', () => {
    expectTypeOf(casl.rulesEndpoint).toEqualTypeOf<
      NextApiHandler<RulesResponse<AppAbility>>
    >();
  });

  it("types assertCan by the app's Ability", () => {
    const ability = null as unknown as AppAbility;
    casl.assertCan(ability, 'update', { kind: 'Article', id: '1' });
    casl.assertCan(ability, 'read', 'Article');
    // @ts-expect-error — not an action of the Ability
    casl.assertCan(ability, 'publish', 'Article');
    // @ts-expect-error — not a subject of the Ability
    casl.assertCan(ability, 'read', 'Comment');
  });

  it('wraps a custom App, keeping its props', () => {
    const App = (_props: AppProps): ReactNode => null;
    expectTypeOf(withDenialPage(App)).toEqualTypeOf<
      (props: AppProps) => ReactNode
    >();
  });
});
