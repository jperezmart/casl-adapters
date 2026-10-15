import { createFileRoute, Link } from '@tanstack/react-router';

import { Can } from '../../../ability';
import { getArticle } from '../../../articles.functions';
import { DenialErrorComponent } from '../../../components/denial';

// The loader calls a server function: a hidden or missing article renders the
// not-found component (404), a denial the error component (401 / 403).
export const Route = createFileRoute('/articles/$id/')({
  loader: ({ params }) => getArticle({ data: { id: params.id } }),
  component: ArticlePage,
  errorComponent: DenialErrorComponent,
  notFoundComponent: () => (
    <main className="app">
      <h1>404</h1>
      <p>
        Article not found. <Link to="/">Back to the articles</Link>
      </p>
    </main>
  ),
});

function ArticlePage() {
  const article = Route.useLoaderData();
  return (
    <main className="app">
      <p>
        <Link to="/">← Articles</Link>
      </p>
      <h1>{article.title}</h1>
      <p className="muted">
        #{article.id} by {article.authorId} ·{' '}
        {article.published ? 'published' : 'draft'}
      </p>
      <Can I="update" this={article}>
        <Link to="/articles/$id/edit" params={{ id: article.id }}>
          Edit
        </Link>
      </Can>
    </main>
  );
}
