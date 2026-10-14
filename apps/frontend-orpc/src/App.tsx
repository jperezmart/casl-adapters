import { AbilityProvider } from '@casl/react';
import type { AppAbility, PackedRules } from '@jperezmart/orpc-abilities';
import {
  buildAbilityFromPackedRules,
  createEmptyAbility,
} from '@jperezmart/orpc-abilities';
import type { Article } from '@jperezmart/orpc-domain';
import { toORPCError } from '@orpc/client';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Can } from './can.js';
import { DEMO_USERS, makeClient } from './orpc.js';

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

export function App(): React.JSX.Element {
  const [currentUserId, setCurrentUserId] = useState<string>(
    DEMO_USERS[0]?.id ?? '',
  );
  const [ability, setAbility] = useState<AppAbility>(createEmptyAbility);
  const [rawRules, setRawRules] = useState<unknown[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);

  const currentUser = useMemo(
    () => DEMO_USERS.find(user => user.id === currentUserId) ?? null,
    [currentUserId],
  );
  const client = useMemo(() => makeClient(currentUser), [currentUser]);

  const addLog = useCallback((ok: boolean, text: string) => {
    setLog(prev => [{ key: prev.length, ok, text }, ...prev].slice(0, 12));
  }, []);

  const reload = useCallback(async () => {
    const { rules } = await client.me.abilities();
    // The contract types `rules` as `unknown[]` on purpose: it must not depend
    // on the abilities package (only on domain). The packed-rule shape is known
    // here, where we DO depend on abilities — hence this single boundary cast.
    setAbility(buildAbilityFromPackedRules(rules as PackedRules));
    setRawRules(rules);
    setArticles(await client.articles.list());
  }, [client]);

  useEffect(() => {
    if (currentUser)
      reload().catch(() =>
        addLog(false, 'Failed to load — is the oRPC backend running?'),
      );
  }, [currentUser, reload, addLog]);

  const run = useCallback(
    async (label: string, action: () => Promise<unknown>) => {
      try {
        await action();
        addLog(true, `${label} → ok`);
      } catch (error) {
        addLog(false, `${label} → ${describeError(error)} ⛔`);
      }
      await reload().catch(() => undefined);
    },
    [addLog, reload],
  );

  return (
    <AbilityProvider value={ability}>
      <main className="app">
        <header>
          <h1>
            <code>@jperezmart/nest-casl</code> · oRPC tester
          </h1>
          <p className="muted">
            Same <code>Article</code> domain as the REST tester, over a typed
            oRPC client. Switch user → the app rebuilds the ability from the
            backend&apos;s packed rules (<code>me.abilities</code>). Buttons are
            gated by <code>&lt;Can&gt;</code> on the plain JSON article
            (resolved by <code>detectSubjectType</code>); clicking calls the
            oRPC procedure, which authorizes the same way server-side.
          </p>
        </header>

        <section>
          <h2>User</h2>
          <div className="row">
            {DEMO_USERS.map(user => (
              <button
                key={user.id}
                className={user.id === currentUserId ? 'pill active' : 'pill'}
                onClick={() => setCurrentUserId(user.id)}
              >
                {user.name}
                <span className="muted"> · {user.roles.join(', ')}</span>
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
                    run('create Article', () =>
                      client.articles.create({
                        title: `New by ${currentUser.name}`,
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
              {/* `article` already carries its `kind`, so it goes straight to
                  <Can> — detectSubjectType resolves the type. No subject() wrapper. */}
              {articles.map(article => (
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
                          disabled={!isAllowed}
                          onClick={() =>
                            run(`update #${article.id}`, () =>
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
                            run(`delete #${article.id}`, () =>
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
            The list is filtered server-side by the user&apos;s read ability — a
            plain user never receives other people&apos;s drafts.
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
            <h2>Packed rules (from me.abilities)</h2>
            <pre>{JSON.stringify(rawRules, null, 2)}</pre>
          </div>
        </section>
      </main>
    </AbilityProvider>
  );
}
