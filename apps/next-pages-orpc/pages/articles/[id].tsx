import type { Article } from '@jperezmart/orpc-domain';
import type { InferGetServerSidePropsType } from 'next';
import Link from 'next/link';

import { findArticle } from '../../lib/articles';
import { nextCasl as casl } from '../../lib/casl';

/**
 * Reads the article on the server with `@jperezmart/next-casl`, by the Denial
 * rule: 401 without a session, 404 for an article the user cannot read (the
 * same as a missing one). Same user, same Ability as the oRPC procedures.
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
    </main>
  );
}
