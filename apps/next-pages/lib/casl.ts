import type { AppAbility } from '@jperezmart/example-shared';
import { detectSubjectType } from '@jperezmart/example-shared';
import type { AppUser } from '@jperezmart/example-shared/server';
import {
  articlesPermissions,
  parseUser,
} from '@jperezmart/example-shared/server';
import { createNextCasl } from '@jperezmart/next-casl';

/**
 * The Next.js Adapter of this app, imported by its API routes and its pages'
 * `getServerSideProps` only, so the Role permissions never reach the browser.
 *
 * `getUser` finds the demo user in the request: the `demo-user` cookie the
 * tester sets (as a session cookie would reach a backend-for-frontend), or the
 * `x-user-id` header the e2e tests send. `admin` is the Superuser role, and
 * `detectSubjectType` lets the Ability match `kind`-tagged articles.
 */
export const casl = createNextCasl<AppUser, AppAbility>({
  getUser: req => parseUser(req) ?? null,
  permissions: [articlesPermissions],
  superuserRole: 'admin',
  detectSubjectType,
});
