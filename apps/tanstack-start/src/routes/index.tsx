import { createFileRoute, Link, useRouter } from '@tanstack/react-router';

import { Can, useAbilityState } from '../ability';
import { listArticles } from '../articles.functions';
import { getSession, signInAs } from '../session';

export const Route = createFileRoute('/')({
  loader: async () => {
    const session = await getSession();
    // Signed out, listArticles would answer 401 (and set the page's status
    // to 401 with it), so the home page does not ask.
    const articles = session.userId ? await listArticles() : [];
    return { ...session, articles };
  },
  component: HomePage,
});

function HomePage() {
  const { users, userId: currentUserId, articles } = Route.useLoaderData();
  const router = useRouter();
  const { ability, isLoading, isUnauthenticated, refresh } = useAbilityState();

  /** Switches the demo session, then refetches the rules and the page. */
  const switchUser = async (userId: string | null) => {
    signInAs(userId);
    await Promise.all([refresh(), router.invalidate()]);
  };

  return (
    <main className="app">
      <header>
        <h1>
          <code>@jperezmart/tanstack-start-casl</code> · TanStack Start over
          REST
        </h1>
        <p className="muted">
          The list comes from a server function, each article page from a server
          function in its loader, and <code>/api/articles</code> is the same
          data as REST server routes. The buttons are gated by{' '}
          <code>&lt;Can&gt;</code> with the Client ability from the Rules
          endpoint (<code>/api/me/abilities</code>).
        </p>
      </header>

      <section>
        <h2>User</h2>
        <div className="row">
          {users.map(user => (
            <button
              key={user.id}
              className={user.id === currentUserId ? 'pill active' : 'pill'}
              onClick={() => void switchUser(user.id)}
            >
              {user.name}
              <span className="muted"> · {user.roles.join(', ')}</span>
            </button>
          ))}
          <button
            className={currentUserId === null ? 'pill active' : 'pill'}
            onClick={() => void switchUser(null)}
          >
            Signed out
          </button>
        </div>
        <p className="muted">
          {isLoading
            ? 'Loading the rules…'
            : isUnauthenticated
              ? 'No session: the Rules endpoint answered 401, so the Client ability allows nothing.'
              : `Signed in as ${currentUserId ?? '?'}.`}
        </p>
      </section>

      <section>
        <h2>Articles</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Author</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {articles.map(article => (
              <tr key={article.id}>
                <td>{article.id}</td>
                <td>
                  <Link to="/articles/$id" params={{ id: article.id }}>
                    {article.title}
                  </Link>
                </td>
                <td>{article.authorId}</td>
                <td>
                  {article.archived
                    ? 'archived'
                    : article.published
                      ? 'published'
                      : 'draft'}
                </td>
                <td>
                  <Can I="update" this={article}>
                    <Link to="/articles/$id/edit" params={{ id: article.id }}>
                      Edit
                    </Link>
                  </Can>
                </td>
              </tr>
            ))}
            {articles.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  No readable articles for this user.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="muted">
          Try opening another author&apos;s draft (#2 or #4 as Carol): it is not
          found, exactly like a missing article. Signed out, an article page
          answers 401. Editing someone else&apos;s article sends you to the
          forbidden page.
        </p>
      </section>

      <section>
        <h2>Client ability rules (from /api/me/abilities)</h2>
        <pre>{JSON.stringify(ability.rules, null, 2)}</pre>
      </section>
    </main>
  );
}
