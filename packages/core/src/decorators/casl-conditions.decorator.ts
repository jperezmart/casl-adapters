import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';

import { getCaslContext } from './extract-context.helper.js';

/**
 * Injects a {@link ConditionsProxy} with the Access conditions of the guarded
 * `(action, subject)`, so the handler can filter DB queries to exactly the
 * records the user may act on.
 *
 * @example `list(@CaslConditions() conditions: ConditionsProxy) {}`
 */
export const CaslConditions = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => getCaslContext(ctx)?.conditions,
);
