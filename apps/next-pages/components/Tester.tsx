import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import type { Article, DemoUser } from '../lib/api';
import {
  callApi,
  currentDemoUserId,
  fetchArticles,
  fetchUsers,
  signInAs,
} from '../lib/api';
import { Can, useAbilityState } from '../lib/client-casl';

interface LogEntry {
  key: number;
  ok: boolean;
  text: string;
}

/**
 * The tester: switch the demo user, see which buttons `<Can>` enables, and
 * call the API routes to see the server agree (or answer 403/404).
 */
export function Tester(): React.JSX.Element {
  // The Client ability, from the Rules endpoint `<AbilityProvider>` fetched
  // (see main.tsx). It allows nothing while loading and without a session.
  const { ability, isLoading, isUnauthenticated, refresh } = useAbilityState();
  const [users, setUsers] = useState<DemoUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);

  const addLog = useCallback((ok: boolean, text: string) => {
    setLog(prev => [{ key: prev.length, ok, text }, ...prev].slice(0, 12));
  }, []);

  // The session cookie is only readable in the browser, after hydration.
  useEffect(() => setCurrentUserId(currentDemoUserId()), []);

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch(() => addLog(false, 'Failed to load users'));
  }, [addLog]);

  const reloadArticles = useCallback(async () => {
    setArticles(await fetchArticles());
  }, []);

  useEffect(() => {
    reloadArticles().catch(() => addLog(false, 'Failed to load articles'));
  }, [reloadArticles, addLog]);

  /** Switches the demo session, then refreshes the rules and the articles. */
  const switchUser = useCallback(
    async (userId: string | null) => {
      signInAs(userId);
      setCurrentUserId(userId);
      await Promise.all([refresh(), reloadArticles()]);
    },
    [refresh, reloadArticles],
  );

  const run = useCallback(
    async (
      method: 'POST' | 'PATCH' | 'DELETE',
      path: string,
      label: string,
      body?: unknown,
    ) => {
      const result = await callApi(method, path, body);
      const ok = result.status < 400;
      addLog(ok, `${label} → ${result.status}${ok ? '' : ' ⛔'}`);
      await reloadArticles();
    },
    [addLog, reloadArticles],
  );

  const currentUser = users.find(user => user.id === currentUserId);

  return (
    <main className="app">
      <header>
        <h1>
          <code>@jperezmart/next-casl</code> · Next.js Pages Router
        </h1>
        <p className="muted">
          Switch user → the demo session cookie changes and{' '}
          <code>@jperezmart/casl-react</code> refetches the rules from this
          app&apos;s Rules endpoint (<code>/api/me/abilities</code>). Buttons
          are gated by <code>&lt;Can&gt;</code>; clicking one calls the API
          route so you can see the server agree (or 403/404). Each title opens
          the article&apos;s page, read in <code>getServerSideProps</code>.
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
              <span className="muted"> · {user.roles.join(', ') || '—'}</span>
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
              : `Signed in as ${currentUser?.name ?? currentUserId}.`}
        </p>
      </section>

      <section>
        <div className="row spread">
          <h2>Articles</h2>
          <Can I="create" a="Article" passThrough>
            {({ isAllowed }) => (
              <button
                disabled={!isAllowed}
                onClick={() =>
                  void run('POST', '/articles', 'create Article', {
                    title: `New by ${currentUser?.name ?? currentUserId}`,
                    published: true,
                  })
                }
              >
                + New article {isAllowed ? '' : '(no permission)'}
              </button>
            )}
          </Can>
        </div>

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
            {articles.map(article => {
              // `article` already carries its `kind` discriminator, so it can
              // be passed straight to <Can> — the ability's detectSubjectType
              // resolves the subject type from it. No `subject()` wrapper.
              return (
                <tr key={article.id}>
                  <td>{article.id}</td>
                  <td>
                    <Link href={`/articles/${article.id}`}>
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
                  <td className="row">
                    <Can I="update" this={article} passThrough>
                      {({ isAllowed }) => (
                        <button
                          disabled={!isAllowed}
                          onClick={() =>
                            void run(
                              'PATCH',
                              `/articles/${article.id}`,
                              `update #${article.id}`,
                              { title: `${article.title} ✎` },
                            )
                          }
                        >
                          Edit
                        </button>
                      )}
                    </Can>
                    <Can I="delete" this={article} passThrough>
                      {({ isAllowed }) => (
                        <button
                          className="danger"
                          disabled={!isAllowed}
                          onClick={() =>
                            void run(
                              'DELETE',
                              `/articles/${article.id}`,
                              `delete #${article.id}`,
                            )
                          }
                        >
                          Delete
                        </button>
                      )}
                    </Can>
                  </td>
                </tr>
              );
            })}
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
          The list itself is already filtered server-side by the user&apos;s
          read ability — a plain user never receives other people&apos;s drafts.
        </p>
      </section>

      <section className="grid">
        <div>
          <h2>Activity</h2>
          <ul className="log">
            {log.map(entry => (
              <li key={entry.key} className={entry.ok ? 'ok' : 'fail'}>
                {entry.text}
              </li>
            ))}
            {log.length === 0 && <li className="muted">No calls yet.</li>}
          </ul>
        </div>
        <div>
          <h2>Client ability rules (from /api/me/abilities)</h2>
          <pre>{JSON.stringify(ability.rules, null, 2)}</pre>
        </div>
      </section>
    </main>
  );
}
