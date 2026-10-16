# @jperezmart/next-casl

[![npm version](https://img.shields.io/npm/v/@jperezmart/next-casl.svg)](https://www.npmjs.com/package/@jperezmart/next-casl)
[![license](https://img.shields.io/npm/l/@jperezmart/next-casl.svg)](./LICENSE)

The [Next.js](https://nextjs.org) **Pages Router** Adapter of [`@jperezmart/casl-core`](https://github.com/jperezmart/casl-adapters/tree/main/packages/casl-core): it finds the Authorizable user of a request, builds their [CASL](https://casl.js.org) Ability and answers denials the Next.js way, following the Denial rule ([ADR 0004](https://github.com/jperezmart/casl-adapters/blob/main/docs/adr/0004-hide-what-the-user-cannot-read.md)). It offers:

- **wrappers** for `getServerSideProps` and API routes that hand over the request's Ability;
- an **`assertCan`** that, inside them, answers by the Denial rule;
- **`withDenialPage`**, for the custom App, which renders Next.js's error page for a denied page;
- the **Rules endpoint** as a ready-made API route, for the browser to rebuild a Client ability.

It targets the Node runtime only; the Edge runtime, the App Router and React Server Components are out of its scope.

## Install

```bash
pnpm add @jperezmart/next-casl @jperezmart/casl-core @casl/ability
```

`@jperezmart/casl-core`, `@casl/ability@^7`, `next@^15 || ^16` and `react` are peer dependencies, so an app that also uses another Adapter (oRPC inside an API route, say) has exactly one copy of the core.

## Set up: `createNextCasl`

Create the Adapter once, in a module only your server code imports, with the Role permissions and a `getUser` that finds the Authorizable user of a Node request:

```ts
// lib/casl.ts
import type { IncomingMessage } from 'node:http';

import type { InferSubjects, MongoAbility } from '@casl/ability';
import type { RolePermissions } from '@jperezmart/casl-core';
import { createNextCasl } from '@jperezmart/next-casl';

interface AppUser {
  id: string;
  roles: string[];
}

interface Article {
  readonly kind: 'Article';
  id: string;
  authorId: string;
  published: boolean;
}

type AppAbility = MongoAbility<
  ['read' | 'create' | 'update' | 'delete', InferSubjects<Article> | 'all']
>;

declare function findSessionUser(req: IncomingMessage): Promise<AppUser | null>;

const permissions: RolePermissions<'author', AppUser, AppAbility> = {
  everyone(_user, { can }) {
    can('read', 'Article', { published: true });
  },
  author(user, { can }) {
    can('read', 'Article', { authorId: user.id });
    can('update', 'Article', { authorId: user.id });
  },
};

export const casl = createNextCasl<AppUser, AppAbility>({
  getUser: req => findSessionUser(req),
  permissions: [permissions],
  superuserRole: 'admin',
  detectSubjectType: subject => (subject as Article).kind,
});
```

| Option              | Type                                 | Effect                                                                                      |
| ------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------- |
| `getUser`           | `(req) => user \| null`, maybe async | Finds the Authorizable user; `null` or `undefined` is an Unauthenticated request.           |
| `permissions`       | `RolePermissions[]`                  | Every Role permissions map of the app, merged in order, as `createAbilityFactory` takes it. |
| `superuserRole`     | `string`                             | A user holding this Role may do everything.                                                 |
| `detectSubjectType` | `(subject: object) => string`        | Custom subject-type detection, forwarded to the built Ability.                              |
| `readAction`        | an action of the Ability             | The action that decides whether a denied instance is hidden. Defaults to `'read'`.          |
| `onUnauthenticated` | `(denial, req) => Redirect \| void`  | Answers an Unauthenticated request with a redirect instead of the 401.                      |
| `onForbidden`       | `(denial, req) => Redirect \| void`  | Answers a forbidden denial with a redirect instead of the 403.                              |

## Pages: `casl.getServerSideProps`

Wrap a page's `getServerSideProps`: it gets Next.js's context plus `ability` and `user`. An Unauthenticated request is answered before it runs, so a page open to Unauthenticated requests does not use it ([Unauthenticated requests](#unauthenticated-requests)).

There is no load-then-check helper: check the subject type, load the instance, then check the instance. Checking the type first answers 403 to a user who may act on no article, the same for every id, before anything is loaded.

```tsx
// pages/articles/[id]/edit.tsx
import type { InferGetServerSidePropsType } from 'next';

import { casl } from '../../../lib/casl';

declare function findArticle(id: string): Promise<Article | undefined>;

export const getServerSideProps = casl.getServerSideProps<
  { article: Article },
  { id: string }
>(async ({ ability, params }) => {
  casl.assertCan(ability, 'update', 'Article');
  const article = await findArticle(params?.id ?? '');
  if (!article) return { notFound: true };
  casl.assertCan(ability, 'update', article);
  return { props: { article } };
});

export default function EditArticle({
  article,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return <h1>{article.title}</h1>;
}
```

A denial answers:

| Denial                                                     | Answer                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------- |
| no Ability (Unauthenticated request)                       | status 401 and the denial prop, or `onUnauthenticated`'s redirect   |
| the action is denied on the subject type                   | status 403 and the denial prop, or `onForbidden`'s redirect         |
| the instance is denied, and the user cannot read it either | `{ notFound: true }`, Next.js's own 404 page, like a missing record |
| the instance is denied, but the user can read it           | status 403 and the denial prop, or `onForbidden`'s redirect         |

### Rendering the denial: `withDenialPage`

A 401 or 403 page gets the denial prop (`DENIAL_PROP`, `{ statusCode, message }`) instead of its own props. Wrap the custom App with `withDenialPage` and every such page renders the error page, inside the App, with no page checking the prop itself:

```tsx
// pages/_app.tsx
import { withDenialPage } from '@jperezmart/next-casl';
import type { AppProps } from 'next/app';

function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default withDenialPage(App);
```

It renders Next.js's `next/error` by default; pass your own error page (your `pages/_error`, say) with `withDenialPage(App, { ErrorPage })`. It gets `{ statusCode, title }`.

## API routes: `casl.apiRoute`

Wrap an API route handler: it gets the request, the response and `{ ability, user }`. An Unauthenticated request is answered before it runs, so an API route open to Unauthenticated requests does not use it ([Unauthenticated requests](#unauthenticated-requests)).

```ts
// pages/api/articles/[id].ts
import { notFound } from '@jperezmart/next-casl';

import { casl } from '../../../lib/casl';

declare function updateArticle(id: string, patch: unknown): Promise<Article>;

export default casl.apiRoute(async (req, res, { ability }) => {
  casl.assertCan(ability, 'update', 'Article');
  const article = await findArticle(String(req.query['id']));
  if (!article) notFound();
  casl.assertCan(ability, 'update', article);
  res.status(200).json(await updateArticle(article.id, req.body));
});
```

A denial answers 401, 403 or 404 with a JSON body `{ statusCode, message }`, carrying the core's message; the 404 says `Not Found`. `notFound()` answers a missing record with that same 404, so a hidden record and a missing one cannot be told apart. `onUnauthenticated` and `onForbidden` apply here too, as a redirect.

### Filtering lists

Use the core's `accessConditions` with the Ability. When the user may act on no record at all, it throws `NoRecordAllowedError`; both wrappers answer that as forbidden:

```ts
// pages/api/articles/index.ts
import { accessConditions } from '@jperezmart/casl-core';

import { casl } from '../../../lib/casl';

declare function findArticles(query: object): Promise<Article[]>;

export default casl.apiRoute(async (_req, res, { ability }) => {
  const conditions = accessConditions(ability, 'read', 'Article');
  res.status(200).json(await findArticles(conditions.toMongo()));
});
```

`casl.assertCan` throws a denial that only the wrappers know how to answer: call it inside them (outside, it ends as a 500).

## Unauthenticated requests

`casl.getServerSideProps`, `casl.apiRoute` and `casl.rulesEndpoint` answer an Unauthenticated request (401, or `onUnauthenticated`'s redirect) before the handler runs, so a handler under them always has an Ability and a user and never checks for a missing one. This is deliberate: an Unauthenticated request gets no Ability at all, unlike a user who holds no Roles, so there is nothing to check it against. A page or API route open to Unauthenticated requests (a public listing, a login) simply does not use them.

## Overriding the answers

`onUnauthenticated` and `onForbidden` receive the core's denial (`{ kind, message }`) and the request, and return a Next.js `Redirect` to answer with, or nothing to keep the status. A page answers with `{ redirect }`; an API route with the redirect's status and `Location`. The request tells a page from an API route:

```ts
export const redirectingCasl = createNextCasl<AppUser, AppAbility>({
  getUser: req => findSessionUser(req),
  permissions: [permissions],
  // Pages go to the login page; API clients keep the 401.
  onUnauthenticated: (_denial, req) =>
    req.url?.startsWith('/api/')
      ? undefined
      : { destination: '/login', permanent: false },
  onForbidden: () => ({ destination: '/403', permanent: false }),
});
```

Not found has no hook: it always answers not found, so existence stays hidden.

## The Rules endpoint

`casl.rulesEndpoint` is a ready-made API route handler: `GET` answers `{ rules }`, the packed rules (`packRules` from `@casl/ability/extra`) of the user's Ability, for the browser to rebuild a Client ability. An Unauthenticated request gets 401, whatever `onUnauthenticated` says, so the browser can tell there is no session. Its type is `RulesResponse<AppAbility>`, declared by `@jperezmart/casl-core` for every Adapter and re-exported here. Every answer, the 401 included, carries `Cache-Control: private, no-store`: the rules are the user's own, so no CDN or proxy may store them and serve them to someone else.

Mount it at the path of your choice. At `pages/api/me/abilities.ts`, the default path of [`@jperezmart/casl-react`](https://github.com/jperezmart/casl-adapters/tree/main/packages/casl-react), the browser needs no configuration:

```ts
// pages/api/me/abilities.ts
import { casl } from '../../../lib/casl';

export default casl.rulesEndpoint;
```

The rules never travel through page props. The Client ability only decides what the UI shows; what the server allows is decided by the server's Ability alone ([ADR 0006](https://github.com/jperezmart/casl-adapters/blob/main/docs/adr/0006-each-app-builds-its-own-ability.md)).

## With oRPC in an API route

[`@jperezmart/orpc-casl`](https://github.com/jperezmart/casl-adapters/tree/main/packages/orpc-casl) authorizes oRPC procedures mounted in an API route. Give the procedures the request as their context, and both Adapters can share one `getUser`. The [`next-pages-orpc` example](https://github.com/jperezmart/casl-adapters/tree/main/apps/next-pages-orpc) does this.

## Testing

Call a wrapped `getServerSideProps` with a context object, and a wrapped API route with a Node request/response pair; neither needs Next.js running. Build abilities for unit tests of your Role permissions with [`@jperezmart/casl-testing`](https://github.com/jperezmart/casl-adapters/tree/main/packages/casl-testing).

## License

[MIT](./LICENSE)
