import type { AppAbility } from '@jperezmart/example-shared';
import { detectSubjectType } from '@jperezmart/example-shared';
import type { AppUser } from '@jperezmart/example-shared/server';
import {
  articlesPermissions,
  parseUser,
} from '@jperezmart/example-shared/server';
import { createHonoCasl } from '@jperezmart/hono-casl';

/**
 * The Hono Adapter of this app. `getUser` finds the demo user in the request's
 * headers: the `x-user-id` header the e2e tests and curl send, or the
 * `demo-user` cookie the frontend sets (as a session cookie would reach the
 * server). `admin` is the Superuser role, and `detectSubjectType` lets the
 * Ability match `kind`-tagged articles.
 */
export const casl = createHonoCasl<AppUser, AppAbility>({
  getUser: c => parseUser({ headers: c.req.header() }),
  permissions: [articlesPermissions],
  superuserRole: 'admin',
  detectSubjectType,
});
