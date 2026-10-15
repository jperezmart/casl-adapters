import type { AppAbility } from '@jperezmart/orpc-abilities';
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router';

import { ArticlesPage } from './pages/ArticlesPage.js';
import { Layout } from './pages/Layout.js';
import { NewArticlePage } from './pages/NewArticlePage.js';

/**
 * What every route's `beforeLoad` and `loader` receive: the Client ability,
 * which `App` puts here (see App.tsx). There is no router helper in
 * `@jperezmart/casl-react`: this is the whole wiring.
 */
export interface RouterContext {
  ability: AppAbility;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Layout,
});

const articlesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  // Set when a guarded route sent the user back here.
  validateSearch: (search): { denied?: string | undefined } => ({
    denied: typeof search['denied'] === 'string' ? search['denied'] : undefined,
  }),
  component: ArticlesPage,
});

const newArticleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/articles/new',
  // The route is protected in the UI by checking the Client ability by hand.
  // It only hides the page: the server checks `create` again on submit.
  beforeLoad: ({ context }) => {
    if (!context.ability.can('create', 'Article'))
      throw redirect({ to: '/', search: { denied: 'create an article' } });
  },
  component: NewArticlePage,
});

export const router = createRouter({
  routeTree: rootRoute.addChildren([articlesRoute, newArticleRoute]),
  // A placeholder: App passes the real ability to <RouterProvider context>.
  context: { ability: undefined! },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
