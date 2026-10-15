import type { AnyAbility, SubjectType } from '@casl/ability';
import type { AccessConditions } from '@jperezmart/casl-core';
import { accessConditions, NoRecordAllowedError } from '@jperezmart/casl-core';
import { ForbiddenException } from '@nestjs/common';

import type {
  AccessConditionsAst,
  ConditionsProxy,
} from './interfaces/conditions-proxy.interface.js';
import type { AnyObject } from './types.js';

/**
 * Default {@link ConditionsProxy} implementation: the Access conditions of the
 * guarded `(action, subjectType)` from `@jperezmart/casl-core`.
 *
 * When no record is allowed, `get()`, `toMongo()` and `toAst()` throw a
 * `ForbiddenException` rather than hand back conditions that let records
 * through.
 */
export class ConditionsProxyImpl<
  TConditions extends AnyObject = AnyObject,
> implements ConditionsProxy<TConditions> {
  private readonly conditions: AccessConditions<TConditions>;

  constructor(ability: AnyAbility, action: string, subject: SubjectType) {
    this.conditions = accessConditions<TConditions>(ability, action, subject);
  }

  get hasConditions(): boolean {
    return this.conditions.hasConditions;
  }

  get(): TConditions | undefined {
    return forbiddenIfNoRecord(() => this.conditions.get());
  }

  toMongo(): TConditions {
    return forbiddenIfNoRecord(() => this.conditions.toMongo());
  }

  toAst(): AccessConditionsAst {
    return forbiddenIfNoRecord(() => this.conditions.toAst());
  }
}

function forbiddenIfNoRecord<T>(read: () => T): T {
  try {
    return read();
  } catch (error) {
    if (error instanceof NoRecordAllowedError) throw new ForbiddenException();
    throw error;
  }
}
