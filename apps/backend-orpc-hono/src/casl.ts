import type { AppAbility } from '@jperezmart/orpc-abilities';
import { detectSubjectType } from '@jperezmart/orpc-abilities';
import { articlesPermissions } from '@jperezmart/orpc-abilities/server';
import { createOrpcCasl } from '@jperezmart/orpc-casl';
import type { AppUser } from '@jperezmart/orpc-domain';

/** What the Hono app hands every procedure: the web request. */
export interface AppContext {
  request: Request;
}

/**
 * Demo "auth" — NOT real authentication. A request identifies itself with an
 * `x-user-id` header, as the oRPC frontend sends it; the user's roles come
 * from this fixed list. In a real app a session or a token would.
 */
export const DEMO_USERS: AppUser[] = [
  { id: 'admin', name: 'Admin', roles: ['admin'] },
  { id: 'alice', name: 'Alice (author)', roles: ['author'] },
  { id: 'bob', name: 'Bob (author)', roles: ['author'] },
  { id: 'carol', name: 'Carol (user)', roles: ['user'] },
];

/**
 * The oRPC Adapter of this app, the same as `backend-orpc`'s. Its middleware
 * finds the demo user in the request the context holds (`getUser`), builds
 * their Ability and adds both to the procedure context; its `assertCan` throws
 * oRPC's `UNAUTHORIZED` / `FORBIDDEN` / `NOT_FOUND` by the Denial rule.
 * `admin` is the Superuser role, and `detectSubjectType` lets the Ability
 * match `kind`-tagged objects.
 */
export const casl = createOrpcCasl<AppContext, AppUser, AppAbility>({
  getUser: ({ request }) => {
    const id = request.headers.get('x-user-id');
    return DEMO_USERS.find(user => user.id === id);
  },
  permissions: [articlesPermissions],
  superuserRole: 'admin',
  detectSubjectType,
});
