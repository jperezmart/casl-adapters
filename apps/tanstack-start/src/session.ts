import { DEMO_USERS, parseUser } from '@jperezmart/example-shared/server';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

/**
 * The demo users to switch between, and who the session cookie says is
 * signed in (example-shared's demo auth), or `null`.
 */
export const getSession = createServerFn().handler(() => {
  const user = parseUser({ headers: Object.fromEntries(getRequest().headers) });
  return { users: DEMO_USERS, userId: user?.id ?? null };
});

/**
 * "Signs in" as a demo user (or out, with `null`) by setting the cookie the
 * server's `getUser` reads, as a login would set a session cookie.
 */
export function signInAs(userId: string | null): void {
  document.cookie = userId
    ? `demo-user=${encodeURIComponent(userId)}; path=/; SameSite=Lax`
    : 'demo-user=; path=/; max-age=0';
}
