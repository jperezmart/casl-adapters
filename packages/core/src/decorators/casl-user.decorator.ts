import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';

import { getCaslContext } from './extract-context.helper.js';

/**
 * Injects the authenticated user resolved by `getUserFromRequest` (awaited,
 * when it is async): the same user the ability was built from. To load more
 * about the user, make `getUserFromRequest` async and reach your services from
 * it with `forRootAsync` + `inject`.
 *
 * @example `findMine(@CaslUser() user: AppUser) {}`
 */
export const CaslUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => getCaslContext(ctx)?.user,
);
