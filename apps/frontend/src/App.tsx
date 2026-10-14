import { AbilityProvider } from '@casl/react';
import type { AppAbility } from '@jperezmart/example-shared';
import { createEmptyAbility } from '@jperezmart/example-shared';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Article, DemoUser } from './api.js';
import { callApi, fetchAbility, fetchArticles, fetchUsers } from './api.js';
import { Can } from './can.js';

interface LogEntry {
  key: number;
  ok: boolean;
  text: string;
}

export function App(): React.JSX.Element {
  const [users, setUsers] = useState<DemoUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [ability, setAbility] = useState<AppAbility>(createEmptyAbility);
  const [rawRules, setRawRules] = useState<unknown[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);

  const currentUser = useMemo(
    () => users.find(user => user.id === currentUserId) ?? null,
    [users, currentUserId],
  );

  const addLog = useCallback((ok: boolean, text: string) => {
    setLog(prev => [{ key: prev.length, ok, text }, ...prev].slice(0, 12));
  }, []);

  useEffect(() => {
    fetchUsers()
      .then(list => {
        setUsers(list);
        setCurrentUserId(id => id ?? list[0]?.id ?? null);
      })
      .catch(() =>
        addLog(false, 'Failed to load users — is a backend running?'),
      );
  }, [addLog]);

  const reload = useCallback(async (user: DemoUser) => {
    const [{ ability: built, rawRules: rules }, list] = await Promise.all([
      fetchAbility(user),
      fetchArticles(user),
    ]);
    setAbility(built);
    setRawRules(rules);
    setArticles(list);
  }, []);

  useEffect(() => {
    if (currentUser)
      reload(currentUser).catch(() => addLog(false, 'Failed to load data'));
  }, [currentUser, reload, addLog]);

  const run = useCallback(
    async (
      user: DemoUser,
      method: 'POST' | 'PATCH' | 'DELETE',
      path: string,
      label: string,
      body?: unknown,
    ) => {
      const result = await callApi(user, method, path, body);
      const ok = result.status < 400;
      addLog(ok, `${label} → ${result.status}${ok ? '' : ' ⛔'}`);
      await reload(user);
    },
    [addLog, reload],
  );

  return (
    <AbilityProvider value={ability}>
      <main className="app">
        <header>
          <h1>
            <code>@jperezmart/nest-casl</code> · tester
          </h1>
          <p className="muted">
            Switch user → the frontend rebuilds the CASL ability from the
            backend&apos;s packed rules. Buttons are gated by{' '}
            <code>&lt;Can&gt;</code>; clicking one calls the guarded REST
            endpoint so you can see the server agree (or 403/404).
          </p>
        </header>

        <section>
          <h2>User</h2>
          <div className="row">
            {users.map(user => (
              <button
                key={user.id}
                className={user.id === currentUserId ? 'pill active' : 'pill'}
                onClick={() => setCurrentUserId(user.id)}
              >
                {user.name}
                <span className="muted"> · {user.roles.join(', ') || '—'}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="row spread">
            <h2>Articles</h2>
            <Can I="create" a="Article" passThrough>
              {({ isAllowed }) => (
                <button
                  disabled={!isAllowed || !currentUser}
                  onClick={() =>
                    currentUser &&
                    run(currentUser, 'POST', '/articles', 'create Article', {
                      title: `New by ${currentUser.name}`,
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
                    <td>{article.title}</td>
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
                            disabled={!isAllowed || !currentUser}
                            onClick={() =>
                              currentUser &&
                              run(
                                currentUser,
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
                            disabled={!isAllowed || !currentUser}
                            onClick={() =>
                              currentUser &&
                              run(
                                currentUser,
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
            read ability — a plain user never receives other people&apos;s
            drafts.
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
            <h2>Packed rules (from /me/abilities)</h2>
            <pre>{JSON.stringify(rawRules, null, 2)}</pre>
          </div>
        </section>
      </main>
    </AbilityProvider>
  );
}
