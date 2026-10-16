import { SetMetadata } from '@nestjs/common';

import { CASL_ALLOW_WITHOUT_ABILITY } from '../constants.js';

/**
 * Opens a route, or every route of a controller, that has no `@UseAbility`.
 * `AccessGuard` denies such a route by default (403), whether it is applied
 * per controller or as a global `APP_GUARD`, so a forgotten check fails closed
 * and opening a route is a visible decision.
 *
 * On a handler it also opens that route under a class-level `@UseAbility`; a
 * `@UseAbility` on the handler itself always wins.
 *
 * @example
 * ```ts
 * @Get('health')
 * @AllowWithoutAbility()
 * health() {}
 * ```
 */
export function AllowWithoutAbility() {
  return SetMetadata(CASL_ALLOW_WITHOUT_ABILITY, true);
}
