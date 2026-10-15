import { toORPCError } from '@orpc/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { orpc } from '../orpc.js';

/**
 * Creating an article. The route's `beforeLoad` only lets in a user whose
 * Client ability may create one (see router.tsx); the server decides again.
 */
export function NewArticlePage(): React.JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [published, setPublished] = useState(true);
  const create = useMutation(
    orpc.articles.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.articles.key() });
        await navigate({ to: '/', search: {} });
      },
    }),
  );

  return (
    <section>
      <h2>New article</h2>
      <form
        className="row"
        onSubmit={event => {
          event.preventDefault();
          create.mutate({ title, published });
        }}
      >
        <input
          required
          placeholder="Title"
          value={title}
          onChange={event => setTitle(event.target.value)}
        />
        <label>
          <input
            type="checkbox"
            checked={published}
            onChange={event => setPublished(event.target.checked)}
          />{' '}
          published
        </label>
        <button type="submit" disabled={create.isPending}>
          Create
        </button>
      </form>
      {create.isError && (
        <p className="fail">
          The server refused: {toORPCError(create.error).code}.
        </p>
      )}
    </section>
  );
}
