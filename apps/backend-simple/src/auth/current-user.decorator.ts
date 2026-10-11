import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';

import { parseUser } from './user.js';

/**
 * Injects the demo user parsed from request headers, independent of the CASL
 * guard. Used on routes (like `GET /me/abilities`) that build the ability
 * manually via `AbilityFactory` instead of going through `@UseAbility`.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    parseUser(ctx.switchToHttp().getRequest()),
);
