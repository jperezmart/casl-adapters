import type { AppUser } from '@jperezmart/orpc-domain';

/** Sample users the home page switches between. */
export const DEMO_USERS: AppUser[] = [
  { id: 'admin', name: 'Admin', roles: ['admin'] },
  { id: 'alice', name: 'Alice (author)', roles: ['author'] },
  { id: 'bob', name: 'Bob (author)', roles: ['author'] },
  { id: 'carol', name: 'Carol (user)', roles: ['user'] },
];

/**
 * Demo "auth" — NOT real authentication: the `demo-user` cookie names the
 * user, as a session cookie would. A real app reads its session here.
 */
export function parseUser(headers: Headers): AppUser | undefined {
  for (const pair of (headers.get('cookie') ?? '').split(';')) {
    const [name, value] = pair.trim().split('=');
    if (name === 'demo-user' && value) {
      const id = decodeURIComponent(value);
      return DEMO_USERS.find(user => user.id === id);
    }
  }
  return undefined;
}
