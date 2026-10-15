import { useQueryClient } from '@tanstack/react-query';
import { Link, Outlet, useRouteContext } from '@tanstack/react-router';
import { useState } from 'react';

import { Can } from '../casl.js';
import { DEMO_USERS, session } from '../orpc.js';

/** The page frame: the demo session switcher, the navigation, the rules. */
export function Layout(): React.JSX.Element {
  const queryClient = useQueryClient();
  const { ability } = useRouteContext({ from: '__root__' });
  const [userId, setUserId] = useState(session.userId);

  /**
   * Switches the demo session. The queries do not key on the user, so
   * invalidating them refetches everything as the new user — the Rules
   * endpoint's query included, which is how the Client ability refreshes.
   */
  const switchUser = (id: string | null): void => {
    session.userId = id;
    setUserId(id);
    void queryClient.invalidateQueries();
  };

  return (
    <main className="app">
      <header>
        <h1>
          <code>@jperezmart/casl-react</code> · TanStack Router + oRPC
        </h1>
        <p className="muted">
          A single-page app with no server of its own. The Client ability comes
          from the Rules endpoint procedure (<code>me.abilities</code>) through
          oRPC&apos;s TanStack Query integration and{' '}
          <code>@jperezmart/casl-react/tanstack-query</code>. It gates the
          buttons with <code>&lt;Can&gt;</code> and the{' '}
          <code>/articles/new</code> route in its <code>beforeLoad</code>; the
          oRPC procedures authorize again on the server.
        </p>
      </header>

      <section>
        <h2>User</h2>
        <div className="row">
          {DEMO_USERS.map(user => (
            <button
              key={user.id}
              className={user.id === userId ? 'pill active' : 'pill'}
              onClick={() => switchUser(user.id)}
            >
              {user.name}
              <span className="muted"> · {user.roles.join(', ')}</span>
            </button>
          ))}
          <button
            className={userId === null ? 'pill active' : 'pill'}
            onClick={() => switchUser(null)}
          >
            Signed out
          </button>
        </div>
      </section>

      <nav className="row">
        <Link to="/" search={{}}>
          Articles
        </Link>
        {/* Visible to everyone on purpose: try it as Carol, whose rules
            send her back from the route's beforeLoad. */}
        <Link to="/articles/new">New article</Link>
        <Can I="create" a="Article" not>
          <span className="muted">(you may not create articles)</span>
        </Can>
      </nav>

      <Outlet />

      <section>
        <h2>Client ability rules (from me.abilities)</h2>
        <pre>{JSON.stringify(ability.rules, null, 2)}</pre>
      </section>
    </main>
  );
}
