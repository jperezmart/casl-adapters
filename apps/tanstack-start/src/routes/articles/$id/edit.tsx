import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { useState } from 'react';

import { getArticleToEdit, renameArticle } from '../../../articles.functions';

// The loader's server function uses the redirecting Adapter: no session goes
// home to sign in, an article the user may not edit to the forbidden page.
export const Route = createFileRoute('/articles/$id/edit')({
  loader: ({ params }) => getArticleToEdit({ data: { id: params.id } }),
  component: EditArticlePage,
  notFoundComponent: () => (
    <main className="app">
      <h1>404</h1>
      <p>
        Article not found. <Link to="/">Back to the articles</Link>
      </p>
    </main>
  ),
});

function EditArticlePage() {
  const article = Route.useLoaderData();
  const router = useRouter();
  const [title, setTitle] = useState(article.title);

  const save = async () => {
    await renameArticle({ data: { id: article.id, title } });
    await router.navigate({
      to: '/articles/$id',
      params: { id: article.id },
    });
  };

  return (
    <main className="app">
      <p>
        <Link to="/articles/$id" params={{ id: article.id }}>
          ← {article.title}
        </Link>
      </p>
      <h1>Edit #{article.id}</h1>
      <form
        className="row"
        onSubmit={event => {
          event.preventDefault();
          void save();
        }}
      >
        <input value={title} onChange={event => setTitle(event.target.value)} />
        <button type="submit">Save</button>
      </form>
    </main>
  );
}
