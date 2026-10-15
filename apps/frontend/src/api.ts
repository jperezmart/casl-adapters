import type { Article, Role } from '@jperezmart/example-shared';

export type { Article };

/**
 * Base URL of the backend API: the same-origin `/api` prefix, which Vite
 * proxies to the backend (see `vite.config.ts`). Either `backend-simple` or
 * `backend-shared` works — both expose the same routes. Same-origin matters:
 * the demo session is a cookie, and `@jperezmart/casl-react` fetches the Rules
 * endpoint from `/api/me/abilities` by default.
 */
export const API_URL = '/api';

export interface DemoUser {
  id: string;
  name: string;
  roles: Role[];
}

/** The cookie that stands in for a session: the demo backends read it. */
const DEMO_USER_COOKIE = 'demo-user';

/** The demo user the session cookie names, if any. */
export function currentDemoUserId(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)demo-user=([^;]*)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/** "Signs in" as a demo user (or out, with `null`) by setting the cookie. */
export function signInAs(userId: string | null): void {
  document.cookie = userId
    ? `${DEMO_USER_COOKIE}=${encodeURIComponent(userId)}; path=/; SameSite=Lax`
    : `${DEMO_USER_COOKIE}=; path=/; max-age=0`;
}

export async function fetchUsers(): Promise<DemoUser[]> {
  const response = await fetch(`${API_URL}/users`);
  return response.json() as Promise<DemoUser[]>;
}

/** The articles the session's user may read; none without a session. */
export async function fetchArticles(): Promise<Article[]> {
  const response = await fetch(`${API_URL}/articles`);
  if (!response.ok) return [];
  return response.json() as Promise<Article[]>;
}

export interface ApiResult {
  status: number;
  body: unknown;
}

/** Call a mutating endpoint and return the raw status + body for the activity log. */
export async function callApi(
  method: 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<ApiResult> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* keep raw text */
  }
  return { status: response.status, body: parsed };
}
