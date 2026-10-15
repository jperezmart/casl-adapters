import type { AppAbility } from '@jperezmart/orpc-abilities';
import {
  articlesPermissions,
  detectSubjectType,
} from '@jperezmart/orpc-abilities';
import { createOrpcCasl } from '@jperezmart/orpc-casl';
import type { AppUser } from '@jperezmart/orpc-domain';
import type { ORPCGlobalContext } from '@orpc/nest';

import { parseUser } from './auth/parse-user.js';

declare module '@orpc/nest' {
  /** What `AppModule` hands every procedure: the HTTP request. */
  interface ORPCGlobalContext {
    request: { headers?: Record<string, unknown> };
  }
}

/**
 * The oRPC Adapter of this app. Its middleware finds the demo user in the
 * request (`getUser`), builds their Ability and adds both to the procedure
 * context; its `assertCan` throws oRPC's `UNAUTHORIZED` / `FORBIDDEN` /
 * `NOT_FOUND` by the Denial rule, so nothing translates NestJS exceptions.
 * `admin` is the Superuser role, and `detectSubjectType` lets the Ability match
 * `kind`-tagged objects.
 */
export const casl = createOrpcCasl<ORPCGlobalContext, AppUser, AppAbility>({
  getUser: ({ request }) => parseUser(request),
  permissions: [articlesPermissions],
  superuserRole: 'admin',
  detectSubjectType,
});
