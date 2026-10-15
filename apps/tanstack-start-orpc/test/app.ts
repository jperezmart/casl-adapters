import { inject } from 'vitest';

const origin = inject('origin');

/** An HTTP client of the example's server, as a demo user or anonymous. */
export interface Api {
  get(path: string): Promise<Response>;
  patch(path: string, body: unknown): Promise<Response>;
}

/**
 * `api(user)` authenticates as that demo user with the `demo-user` session
 * cookie; `api()` is an Unauthenticated request. Paths are the contract's,
 * under `/api`, where a Start server route mounts the oRPC handler.
 */
export function api(user?: string): Api {
  const session: Record<string, string> = user
    ? { cookie: `demo-user=${encodeURIComponent(user)}` }
    : {};
  return {
    get: path => fetch(`${origin}/api${path}`, { headers: session }),
    patch: (path, body) =>
      fetch(`${origin}/api${path}`, {
        method: 'PATCH',
        headers: { ...session, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
  };
}
