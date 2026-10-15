import '../styles/globals.css';

import { useQueryAbility } from '@jperezmart/casl-react/tanstack-query';
import { withDenialPage } from '@jperezmart/next-casl';
import { toORPCError } from '@orpc/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AppProps } from 'next/app';
import { useState } from 'react';

import { AbilityProvider, casl, orpc } from '../lib/client';

/**
 * Builds the Client ability from the Rules endpoint procedure's query
 * (`me.abilities`, through oRPC's TanStack Query integration). It is fetched in
 * the browser only: the rules never travel through page props.
 */
function ClientAbility({ children }: { children: React.ReactNode }) {
  const state = useQueryAbility(casl, orpc.me.abilities.queryOptions());
  return <AbilityProvider state={state}>{children}</AbilityProvider>;
}

function App({ Component, pageProps }: AppProps): React.JSX.Element {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // A 401 or a 403 will not change on a retry.
          queries: {
            retry: (failures, error) =>
              ![401, 403].includes(toORPCError(error).status) && failures < 3,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ClientAbility>
        <Component {...pageProps} />
      </ClientAbility>
    </QueryClientProvider>
  );
}

// A page whose `getServerSideProps` answered 401 or 403 renders Next.js's
// error page, inside this App, instead of the page.
export default withDenialPage(App);
