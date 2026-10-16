import { AllowWithoutAbility } from '@jperezmart/nest-casl';
import { Controller, Get } from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AppUser } from '../auth/user.js';
import { DEMO_USERS } from '../auth/user.js';

/**
 * The current user's helpers. The Rules endpoint (`GET /me/abilities`) is not
 * here: nest-casl serves it, ready-made (see `me.module.ts`).
 *
 * Neither route checks an Ability, so the controller is marked
 * `@AllowWithoutAbility()`: open on purpose, and still open if `AccessGuard`
 * is ever registered as a global `APP_GUARD`, which denies unmarked routes.
 */
@Controller()
@AllowWithoutAbility()
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
