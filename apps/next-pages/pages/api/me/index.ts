import type { AppUser } from '@jperezmart/example-shared/server';

import { casl } from '../../../lib/casl';

/** `GET /api/me`: the current demo user, or 401 without one. */
export default casl.apiRoute<AppUser>((_req, res, { user }) => {
  res.status(200).json(user);
});
