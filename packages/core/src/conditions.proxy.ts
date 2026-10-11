import type { AnyAbility, SubjectType } from '@casl/ability';
import { rulesToAST, rulesToCondition } from '@casl/ability/extra';
import { ForbiddenException } from '@nestjs/common';

import type {
  AccessConditionsAst,
  ConditionsProxy,
} from './interfaces/conditions-proxy.interface.js';
import type { AnyObject } from './types.js';

/**
 * Default {@link ConditionsProxy} implementation: the Access conditions of the
 * guarded `(action, subjectType)`, built from every rule of the ability with
 * CASL's `rulesToCondition` (`@casl/ability/extra`). Allowing rules are OR-ed,
 * each denying rule with conditions is excluded with `$nor`, so filtering by
 * them returns exactly the records `ability.can(action, record)` allows.
 *
 * `toAst()` returns the same Access conditions as CASL's `rulesToAST` AST.
 *
 * When no record is allowed, `get()`, `toMongo()` and `toAst()` throw a
 * `ForbiddenException` rather than hand back conditions that let records
 * through.
 */
export class ConditionsProxyImpl<
  TConditions extends AnyObject = AnyObject,
> implements ConditionsProxy<TConditions> {
  constructor(
    private readonly ability: AnyAbility,
    private readonly action: string,
    private readonly subject: SubjectType,
  ) {}

  get hasConditions(): boolean {
    return this.accessConditions() !== undefined;
  }

  get(): TConditions | undefined {
    const conditions = this.accessConditions();
    if (conditions === null) throw new ForbiddenException();
    return conditions;
  }

  toMongo(): TConditions {
    return this.get() ?? ({} as TConditions);
  }

  toAst(): AccessConditionsAst {
    const ast = rulesToAST(this.ability, this.action, this.subject);
    if (ast === null) throw new ForbiddenException();
    return ast;
  }

  /** `undefined` when every record is allowed, `null` when none is. */
  private accessConditions(): TConditions | undefined | null {
    return rulesToCondition<AnyAbility, AnyObject, AnyObject | undefined>(
      this.ability.rulesFor(this.action, this.subject),
      rule =>
        rule.inverted
          ? { $nor: [rule.conditions] }
          : (rule.conditions as AnyObject),
      {
        and: conditions => single(conditions) ?? { $and: conditions },
        or: conditions => single(conditions) ?? { $or: conditions },
        empty: () => undefined,
      },
    ) as TConditions | undefined | null;
  }
}

/** One condition stays unwrapped, so a lone rule reads as its own conditions. */
function single(conditions: AnyObject[]): AnyObject | undefined {
  return conditions.length === 1 ? conditions[0] : undefined;
}
