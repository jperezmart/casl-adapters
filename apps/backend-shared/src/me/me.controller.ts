import type { AppUser } from '@jperezmart/example-shared/server';
import { DEMO_USERS } from '@jperezmart/example-shared/server';
import { Controller, Get } from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator.js';

/**
 * The current user's helpers. The Rules endpoint (`GET /me/abilities`) is not
 * here: nest-casl serves it, ready-made (see `me.module.ts`).
 */
@Controller()
export class MeController {
  /** The current demo user (from the headers or the `demo-user` cookie). */
  @Get('me')
  me(@CurrentUser() user: AppUser): AppUser {
    return user;
  }

  /** Sample users the tester can switch between. */
  @Get('users')
  users(): AppUser[] {
    return DEMO_USERS;
  }
}
