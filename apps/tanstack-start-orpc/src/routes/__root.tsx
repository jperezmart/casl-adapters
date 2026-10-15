import { useQueryAbility } from '@jperezmart/casl-react/tanstack-query';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { AbilityProvider, casl } from '../ability';
import { orpc } from '../orpc';
import styles from '../styles.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'tanstack-start-orpc' },
    ],
    links: [{ rel: 'stylesheet', href: styles }],
  }),
  shellComponent: RootDocument,
  component: Root,
});

function Root() {
  // One QueryClient per app instance, so the server never shares one between
  // requests.
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <WithAbility>
        <Outlet />
      </WithAbility>
    </QueryClientProvider>
  );
}

/**
 * Builds the Client ability from the Rules endpoint procedure's query
 * (`me.abilities`, through oRPC's TanStack Query integration). Refreshing it
 * is invalidating that query.
 */
function WithAbility({ children }: { children: ReactNode }) {
  const state = useQueryAbility(casl, orpc.me.abilities.queryOptions());
  return <AbilityProvider state={state}>{children}</AbilityProvider>;
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
