import type { AppAbility } from '@jperezmart/example-shared';
import { detectSubjectType } from '@jperezmart/example-shared';
import type { AppUser } from '@jperezmart/example-shared/server';
import {
  articlesPermissions,
  parseUser,
} from '@jperezmart/example-shared/server';
import type { StartCaslOptions } from '@jperezmart/tanstack-start-casl';
import { createStartCasl } from '@jperezmart/tanstack-start-casl';
import { redirect } from '@tanstack/react-router';

const options: StartCaslOptions<AppUser, AppAbility> = {
  // The demo session: the `demo-user` cookie (see example-shared's parseUser).
  getUser: request =>
    parseUser({ headers: Object.fromEntries(request.headers) }),
  permissions: [articlesPermissions],
  superuserRole: 'admin',
  detectSubjectType,
};

/**
 * The app's TanStack Start Adapter, answering denials by default: 401, 403 or
 * 404 in server routes; in server functions, the router's not-found, or a
 * DenialError with the status set to 401 or 403.
 */
export const casl = createStartCasl(options);

/**
 * The same Adapter for pages that send the user elsewhere instead: home to
 * sign in, or to the forbidden page. Not found stays not found.
 */
export const redirectingCasl = createStartCasl({
  ...options,
  onUnauthenticated: () => redirect({ to: '/' }),
  onForbidden: () => redirect({ to: '/forbidden' }),
});
