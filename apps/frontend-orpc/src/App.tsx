import { useQueryAbility } from '@jperezmart/casl-react/tanstack-query';
import { RouterProvider } from '@tanstack/react-router';
import { useEffect } from 'react';

import { AbilityProvider, casl } from './casl.js';
import { orpc } from './orpc.js';
import { router } from './router.js';

/**
 * Builds the Client ability from the Rules endpoint procedure's query
 * (`me.abilities`, through oRPC's TanStack Query integration), puts it in
 * context for `<Can>`, and hands it to the router for `beforeLoad`.
 */
export function App(): React.JSX.Element {
  const state = useQueryAbility(casl, orpc.me.abilities.queryOptions());

  // A new ability (another user, a logout) re-runs every `beforeLoad`, so a
  // route the user may no longer see redirects away.
  useEffect(() => {
    void router.invalidate();
  }, [state.ability]);

  // The Client ability allows nothing while loading: wait for the rules
  // before the router checks a route against it.
  if (state.isLoading) return <p className="app muted">Loading the rules…</p>;

  return (
    <AbilityProvider state={state}>
      <RouterProvider router={router} context={{ ability: state.ability }} />
    </AbilityProvider>
  );
}
