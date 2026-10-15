import { toORPCError } from '@orpc/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useCallback, useState } from 'react';

import { Can } from '../casl.js';
import { client, orpc } from '../orpc.js';

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

const route = getRouteApi('/');

/** The readable articles, with the actions the Client ability allows. */
export function ArticlesPage(): React.JSX.Element {
  const { denied } = route.useSearch();
  const queryClient = useQueryClient();
  const articles = useQuery(orpc.articles.list.queryOptions());
  const [log, setLog] = useState<LogEntry[]>([]);

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
    <>
      {denied && (
        <p className="fail">
          The Client ability does not let you {denied}: its route sent you back
          here.
        </p>
      )}

      <section>
        <h2>Articles</h2>
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
            {/* `article` already carries its `kind`, so it goes straight to
                <Can> — detectSubjectType resolves the type. No subject() wrapper. */}
            {/* After a failed refetch (a logout, say) Query keeps the old list: hide it. */}
            {(articles.isError ? [] : (articles.data ?? [])).map(article => (
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
            {articles.data?.length === 0 && (
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

      <section>
        <h2>Activity</h2>
        <ul className="log">
          {log.map(entry => (
            <li key={entry.key} className={entry.ok ? 'ok' : 'fail'}>
              {entry.text}
            </li>
          ))}
          {log.length === 0 && <li className="muted">No calls yet.</li>}
        </ul>
      </section>
    </>
  );
}
