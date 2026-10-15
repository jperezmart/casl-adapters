import type { Article } from '@jperezmart/orpc-domain';
import { isDefinedError, safe } from '@orpc/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { Can } from '../ability';
import { client, orpc } from '../orpc';

export const Route = createFileRoute('/')({ component: HomePage });

/** Who the home page can sign in as (the server's demo auth knows them). */
const DEMO_USERS = [
  { id: 'admin', name: 'Admin' },
  { id: 'alice', name: 'Alice (author)' },
  { id: 'bob', name: 'Bob (author)' },
  { id: 'carol', name: 'Carol (user)' },
];

/** Sets (or clears) the `demo-user` cookie, as a login would a session. */
function signInAs(userId: string | null): void {
  document.cookie = userId
    ? `demo-user=${encodeURIComponent(userId)}; path=/; SameSite=Lax`
    : 'demo-user=; path=/; max-age=0';
}

function HomePage() {
  const queryClient = useQueryClient();
  const me = useQuery(orpc.me.get.queryOptions({ retry: false }));
  const articles = useQuery(orpc.articles.list.queryOptions({ retry: false }));
  const [log, setLog] = useState<string[]>([]);

  /** Switches the demo session: every query, the rules among them, refetches. */
  const switchUser = async (userId: string | null) => {
    signInAs(userId);
    await queryClient.invalidateQueries();
  };

  /** Renames an article, logging what the server answered. */
  const rename = async (article: Article) => {
    const { error } = await safe(
      client.articles.update({ id: article.id, title: `${article.title} ✎` }),
    );
    const answer = !error
      ? 'OK'
      : isDefinedError(error)
        ? error.code
        : 'failed';
    setLog(prev => [`rename #${article.id} → ${answer}`, ...prev].slice(0, 8));
    await queryClient.invalidateQueries({ queryKey: orpc.articles.key() });
  };

  return (
    <main className="app">
      <header>
        <h1>
          <code>@jperezmart/orpc-casl</code> · TanStack Start over oRPC
        </h1>
        <p className="muted">
          The contract is served from a Start server route (<code>/api/$</code>)
          and authorized by <code>@jperezmart/orpc-casl</code>. The Client
          ability comes from the Rules endpoint procedure through{' '}
          <code>@jperezmart/casl-react/tanstack-query</code>.
        </p>
      </header>

      <section>
        <h2>User</h2>
        <div className="row">
          {DEMO_USERS.map(user => (
            <button
              key={user.id}
              className={user.id === me.data?.id ? 'pill active' : 'pill'}
              onClick={() => void switchUser(user.id)}
            >
              {user.name}
            </button>
          ))}
          <button className="pill" onClick={() => void switchUser(null)}>
            Signed out
          </button>
        </div>
        <p className="muted">
          {me.data
            ? `Signed in as ${me.data.name}.`
            : me.isPending
              ? 'Loading…'
              : 'No session: every procedure answers UNAUTHORIZED, and the Client ability allows nothing.'}
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(articles.data ?? []).map(article => (
              <tr key={article.id}>
                <td>{article.id}</td>
                <td>{article.title}</td>
                <td>{article.authorId}</td>
                <td>
                  <Can I="update" this={article} passThrough>
                    {({ isAllowed }) => (
                      <button
                        disabled={!isAllowed}
                        onClick={() => void rename(article)}
                      >
                        Rename
                      </button>
                    )}
                  </Can>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="log">
          {log.map((entry, index) => (
            <li key={index}>{entry}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
