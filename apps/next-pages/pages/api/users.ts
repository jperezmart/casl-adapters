import type { AppUser } from '@jperezmart/example-shared/server';
import { DEMO_USERS } from '@jperezmart/example-shared/server';
import type { NextApiRequest, NextApiResponse } from 'next';

/** `GET /api/users`: the demo users the tester switches between (public). */
export default function users(
  _req: NextApiRequest,
  res: NextApiResponse<AppUser[]>,
): void {
  res.status(200).json(DEMO_USERS);
}
