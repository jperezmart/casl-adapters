import { toORPCError } from '@orpc/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { Can, casl, client, orpc } from '../lib/client';
import { DEMO_USER_COOKIE, DEMO_USERS } from '../lib/session';

interface LogEntry {
  key: number;
  ok: boolean;
  text: string;
}

function describeError(error: unknown): string {
  // oRPC coerces any thrown value to a typed ORPCError — no cast needed.
  const e = toORPCError(error);
  return `${e.code} (${e.status})`;
}

/** The demo user the session cookie names, if any. */
function currentDemoUserId(): string | null {
  const match = new RegExp(`(?:^|;\\s*)${DEMO_USER_COOKIE}=([^;]*)`).exec(
    document.cookie,
  );
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/** "Signs in" as a demo user (or out, with `null`) by setting the cookie. */
function signInAs(userId: string | null): void {
  document.cookie = userId
    ? `${DEMO_USER_COOKIE}=${encodeURIComponent(userId)}; path=/; SameSite=Lax`
    : `${DEMO_USER_COOKIE}=; path=/; max-age=0`;
}

/**
 * The tester: switch the demo user, see which buttons `<Can>` enables, and call
 * the oRPC procedures to see the server agree (or answer FORBIDDEN/NOT_FOUND).
 */
export function Tester(): React.JSX.Element {
  const queryClient = useQueryClient();
  const articles = useQuery(orpc.articles.list.queryOptions());
  const ability = casl.useAbility();
  const [userId, setUserId] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);

  // The session cookie is only readable in the browser, after hydration.
  useEffect(() => setUserId(currentDemoUserId()), []);

  /**
   * Switches the demo session. The queries do not key on the user, so
   * invalidating them refetches everything as the new user — the Rules
   * endpoint's query included, which is how the Client ability refreshes.
   */
  const switchUser = (id: string | null): void => {
    signInAs(id);
    setUserId(id);
    void queryClient.invalidateQueries();
  };

  const run = useCallback(
    async (label: string, action: () => Promise<unknown>) => {
      let entry: Omit<LogEntry, 'key'>;
      try {
        await action();
        entry = { ok: true, text: `${label} → ok` };
      } catch (error) {
        entry = { ok: false, text: `${label} → ${describeError(error)} ⛔` };
      }
      setLog(prev => [{ key: prev.length, ...entry }, ...prev].slice(0, 12));
      await queryClient.invalidateQueries({ queryKey: orpc.articles.key() });
    },
    [queryClient],
  );

  return (
    <main className="app">
      <header>
        <h1>
          <code>@jperezmart/orpc-casl</code> · Next.js Pages Router + oRPC
        </h1>
        <p className="muted">
          The oRPC contract is served from one API route and authorized by{' '}
          <code>@jperezmart/orpc-casl</code>. The Client ability comes from the
          Rules endpoint procedure (<code>me.abilities</code>) through
          oRPC&apos;s TanStack Query integration and{' '}
          <code>@jperezmart/casl-react/tanstack-query</code>, and gates the
          buttons with <code>&lt;Can&gt;</code>. Each title opens the
          article&apos;s page, read in <code>getServerSideProps</code> with{' '}
          <code>@jperezmart/next-casl</code>.
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

      <section>
        <div className="row spread">
          <h2>Articles</h2>
          <Can I="create" a="Article" passThrough>
            {({ isAllowed }) => (
              <button
                disabled={!isAllowed}
                onClick={() =>
                  void run('create Article', () =>
                    client.articles.create({
                      title: `New by ${userId ?? 'nobody'}`,
                      published: true,
                    }),
                  )
                }
              >
                + New article {isAllowed ? '' : '(no permission)'}
              </button>
            )}
          </Can>
        </div>
        {articles.isError && (
          <p className="muted">
            Could not list articles: {describeError(articles.error)}.
          </p>
        )}
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
            {/* After a failed refetch (a logout, say) Query keeps the old list: hide it. */}
            {(articles.isError ? [] : (articles.data ?? [])).map(article => (
              <tr key={article.id}>
                <td>{article.id}</td>
                <td>
                  <Link href={`/articles/${article.id}`}>{article.title}</Link>
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
                          void run(`update #${article.id}`, () =>
                            client.articles.update({
                              id: article.id,
                              title: `${article.title} ✎`,
                            }),
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
                          void run(`delete #${article.id}`, () =>
                            client.articles.remove({ id: article.id }),
                          )
                        }
                      >
                        Delete
                      </button>
                    )}
                  </Can>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
          <h2>Client ability rules (from me.abilities)</h2>
          <pre>{JSON.stringify(ability.rules, null, 2)}</pre>
        </div>
      </section>
    </main>
  );
}
