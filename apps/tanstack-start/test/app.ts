import { fromCrossJSON, toJSONAsync } from 'seroval';
import { inject } from 'vitest';

const origin = inject('origin');

/** An HTTP client of the example's server, as a demo user or unauthenticated. */
export interface Api {
  get(path: string): Promise<Response>;
  patch(path: string, body: unknown): Promise<Response>;
  /**
   * Calls a server function by its id (its export name, see
   * `vite.config.ts`) the way Start's client does.
   */
  serverFn(
    id: string,
    data: unknown,
    method?: 'GET' | 'POST',
  ): Promise<Response>;
}

/**
 * `api(user)` authenticates as that demo user with the `demo-user` session
 * cookie; `api()` is an Unauthenticated request. Redirects are not followed,
 * so tests see them.
 */
export function api(user?: string): Api {
  const session: Record<string, string> = user
    ? { cookie: `demo-user=${encodeURIComponent(user)}` }
    : {};
  const send = (path: string, init: RequestInit = {}) =>
    fetch(`${origin}${path}`, {
      redirect: 'manual',
      ...init,
      headers: { ...session, ...(init.headers as Record<string, string>) },
    });

  return {
    get: path => send(path),
    patch: (path, body) =>
      send(path, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    async serverFn(id, data, method = 'GET') {
      const payload = JSON.stringify(await toJSONAsync({ data }));
      const headers = {
        'x-tsr-serverfn': 'true',
        // Start's CSRF protection only lets same-origin calls through.
        origin,
        'sec-fetch-site': 'same-origin',
      };
      return method === 'GET'
        ? send(`/_serverFn/${id}?payload=${encodeURIComponent(payload)}`, {
            headers,
          })
        : send(`/_serverFn/${id}`, {
            method,
            headers: { ...headers, 'content-type': 'application/json' },
            body: payload,
          });
    },
  };
}

/**
 * What a server function call answered: `{ result }`, or `{ error }` for what
 * it threw. (A DenialError needs the app's serialization adapter to decode,
 * so tests read it from the raw body instead.)
 */
export async function serverFnBody(
  response: Response,
): Promise<{ result?: unknown; error?: unknown }> {
  return fromCrossJSON(await response.json(), { refs: new Map() }) as {
    result?: unknown;
    error?: unknown;
  };
}
