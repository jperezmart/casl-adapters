import type { IncomingMessage } from 'node:http';

import type { AppUser } from '@jperezmart/orpc-domain';

/** The demo users the tester switches between. */
export const DEMO_USERS: AppUser[] = [
  { id: 'admin', name: 'Admin', roles: ['admin'] },
  { id: 'alice', name: 'Alice (author)', roles: ['author'] },
  { id: 'bob', name: 'Bob (author)', roles: ['author'] },
  { id: 'carol', name: 'Carol (user)', roles: ['user'] },
];

/** The cookie that stands in for a session. */
export const DEMO_USER_COOKIE = 'demo-user';

/**
 * Demo "auth", NOT real authentication: the request names its user with the
 * `demo-user` cookie the tester sets (as a session cookie would reach a
 * backend-for-frontend) or the `x-user-id` header the e2e tests send. Both
 * Adapters of this app find the user with it, the Next.js one from the request
 * and the oRPC one from the procedure context, which holds the same request.
 */
export function findUser(req: IncomingMessage): AppUser | null {
  const header = req.headers['x-user-id'];
  const id = typeof header === 'string' ? header : demoUserCookie(req);
  return DEMO_USERS.find(user => user.id === id) ?? null;
}

/** The `demo-user` cookie of the request, if any. */
function demoUserCookie(req: IncomingMessage): string | undefined {
  for (const pair of req.headers.cookie?.split(';') ?? []) {
    const [name, value] = pair.trim().split('=');
    if (name === DEMO_USER_COOKIE && value) return decodeURIComponent(value);
  }
  return undefined;
}
