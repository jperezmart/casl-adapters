import { createFileRoute, Link } from '@tanstack/react-router';

// Where the redirecting Adapter's `onForbidden` sends the user.
export const Route = createFileRoute('/forbidden')({
  component: () => (
    <main className="app">
      <h1>Not allowed</h1>
      <p>
        You may not edit that article. <Link to="/">Back to the articles</Link>
      </p>
    </main>
  ),
});
