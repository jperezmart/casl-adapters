import type { Article } from '@jperezmart/example-shared';
import type { InferGetServerSidePropsType } from 'next';
import Link from 'next/link';

import { findArticle } from '../../../lib/articles';
import { casl } from '../../../lib/casl';
import { Can } from '../../../lib/client-casl';

/**
 * Reads the article on the server, by the Denial rule: 401 without a session,
 * 404 for an article the user cannot read (the same as a missing one).
 */
export const getServerSideProps = casl.getServerSideProps<
  { article: Article },
  { id: string }
>(({ ability, params }) => {
  casl.assertCan(ability, 'read', 'Article');
  const article = findArticle(params?.id ?? '');
  if (!article) return { notFound: true };
  casl.assertCan(ability, 'read', article);
  return { props: { article } };
});

export default function ArticlePage({
  article,
}: InferGetServerSidePropsType<typeof getServerSideProps>): React.JSX.Element {
  return (
    <main className="app">
      <p>
        <Link href="/">← All articles</Link>
      </p>
      <h1>{article.title}</h1>
      <p className="muted">
        #{article.id} by {article.authorId} ·{' '}
        {article.published ? 'published' : 'draft'}
      </p>
      <Can I="update" this={article}>
        <Link href={`/articles/${article.id}/edit`}>Edit</Link>
      </Can>
    </main>
  );
}
