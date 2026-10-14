import type { RolePermissions } from '@jperezmart/nest-casl';

import type { AppUser, Role } from '../auth/user.js';

/**
 * Article permissions per role. `admin` is intentionally absent — it is the
 * configured `superuserRole`, so it bypasses these rules entirely.
 */
export const articlesPermissions: RolePermissions<Role, AppUser> = {
  // Plain users can only read published articles that are not archived.
  user(_user, { can, cannot }) {
    can('read', 'Article', { published: true });
    cannot('read', 'Article', { archived: true });
  },

  // Authors can read published + their own, and manage their own. Archived
  // articles are off-limits whichever rule would allow them: one `cannot`
  // narrows every `can` above it.
  author(user, { can, cannot }) {
    can('read', 'Article', { published: true });
    can('read', 'Article', { authorId: user.id });
    can('create', 'Article');
    can('update', 'Article', { authorId: user.id });
    can('delete', 'Article', { authorId: user.id });
    cannot(['read', 'update', 'delete'], 'Article', { archived: true });
  },
};
