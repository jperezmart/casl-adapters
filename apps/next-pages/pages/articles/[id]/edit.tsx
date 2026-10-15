import type { Article } from '@jperezmart/example-shared';
import type { InferGetServerSidePropsType } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';

import { findArticle } from '../../../lib/articles';
import { casl } from '../../../lib/casl';

/**
 * Loads the article to edit on the server, by the Denial rule: 401 without a
 * session; 403 for a user who may update no article, or who may read this one
 * but not update it; 404 for one they cannot read either.
 */
export const getServerSideProps = casl.getServerSideProps<
  { article: Article },
  { id: string }
>(({ ability, params }) => {
  casl.assertCan(ability, 'update', 'Article');
  const article = findArticle(params?.id ?? '');
  if (!article) return { notFound: true };
  casl.assertCan(ability, 'update', article);
  return { props: { article } };
});

export default function EditArticlePage({
  article,
}: InferGetServerSidePropsType<typeof getServerSideProps>): React.JSX.Element {
  const router = useRouter();
  const [title, setTitle] = useState(article.title);
  const [status, setStatus] = useState<string>();

  async function save(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    const response = await fetch(`/api/articles/${article.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (response.ok) await router.push(`/articles/${article.id}`);
    else setStatus(`The server answered ${response.status}.`);
  }

  return (
    <main className="app">
      <p>
        <Link href={`/articles/${article.id}`}>← Back</Link>
      </p>
      <h1>{`Edit #${article.id}`}</h1>
      <form className="row" onSubmit={event => void save(event)}>
        <input
          aria-label="Title"
          value={title}
          onChange={event => setTitle(event.target.value)}
        />
        <button type="submit">Save</button>
      </form>
      {status && <p className="muted">{status}</p>}
    </main>
  );
}
