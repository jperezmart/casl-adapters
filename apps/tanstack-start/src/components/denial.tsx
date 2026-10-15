import { isDenialError } from '@jperezmart/tanstack-start-casl';
import type { ErrorComponentProps } from '@tanstack/react-router';
import { ErrorComponent, Link } from '@tanstack/react-router';

/**
 * An error component that recognises the Adapter's DenialError: 401 asks to
 * sign in, 403 says the page is off-limits. Anything else is Start's default.
 */
export function DenialErrorComponent(props: ErrorComponentProps) {
  const { error } = props;
  if (!isDenialError(error)) return <ErrorComponent {...props} />;
  return (
    <main className="app">
      <h1>{error.status}</h1>
      <p>
        {error.kind === 'unauthenticated'
          ? 'Sign in to see this page.'
          : 'You may not see this page.'}{' '}
        <Link to="/">Back to the articles</Link>
      </p>
    </main>
  );
}
