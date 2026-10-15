import type { AnyAbility, SubjectType } from '@casl/ability';
import { rulesToAST, rulesToCondition } from '@casl/ability/extra';

import type { AnyObject } from './types.js';

/**
 * The Access conditions as an abstract syntax tree (a `@ucast/core`
 * `Condition`), to translate into a non-Mongo query (SQL, Prisma, a custom
 * repository). Derived from CASL's `rulesToAST`, so it needs no import of
 * `@ucast/core`.
 */
export type AccessConditionsAst = NonNullable<ReturnType<typeof rulesToAST>>;

/**
 * Thrown by the {@link AccessConditions} when the Ability allows the action on
 * no record at all, rather than hand back conditions that let records through.
 * An Adapter answers it as forbidden.
 */
export class NoRecordAllowedError extends Error {
  override readonly name = 'NoRecordAllowedError';

  constructor(
    readonly action: string,
    readonly subjectType: SubjectType,
  ) {
    super(
      `No record of ${typeof subjectType === 'string' ? subjectType : subjectType.name} is allowed for ${action}.`,
    );
  }
}

/**
 * The Access conditions of one `(action, subjectType)`: what a record must
 * satisfy for the Ability to allow the action on it. Every allowing rule is
 * OR-ed and every denying rule with conditions excluded, so filtering a query
 * by them returns exactly the records the user may act on.
 *
 * @typeParam TConditions - Shape of the conditions object (Mongo syntax).
 */
export interface AccessConditions<TConditions extends AnyObject = AnyObject> {
  /** `false` only when the ability allows the action on every record. */
  readonly hasConditions: boolean;

  /**
   * The Access conditions in Mongo syntax, or `undefined` when every record is
   * allowed.
   *
   * @throws NoRecordAllowedError when no record is allowed.
   */
  get(): TConditions | undefined;

  /**
   * The Access conditions in Mongo syntax, `{}` when every record is allowed.
   *
   * @throws NoRecordAllowedError when no record is allowed.
   */
  toMongo(): TConditions;

  /**
   * The Access conditions as an AST, built with CASL's `rulesToAST`; an empty
   * `and` when every record is allowed.
   *
   * @throws NoRecordAllowedError when no record is allowed.
   */
  toAst(): AccessConditionsAst;
}

/**
 * The {@link AccessConditions} of `action` on `subjectType` for `ability`,
 * built from every rule of the ability with CASL's `rulesToCondition` and
 * `rulesToAST` (`@casl/ability/extra`). Nothing is computed until asked.
 */
export function accessConditions<TConditions extends AnyObject = AnyObject>(
  ability: AnyAbility,
  action: string,
  subjectType: SubjectType,
): AccessConditions<TConditions> {
  /** `undefined` when every record is allowed, `null` when none is. */
  const conditions = (): TConditions | undefined | null =>
    rulesToCondition<AnyAbility, AnyObject, AnyObject | undefined>(
      ability.rulesFor(action, subjectType),
      rule =>
        rule.inverted
          ? { $nor: [rule.conditions] }
          : (rule.conditions as AnyObject),
      {
        and: all => single(all) ?? { $and: all },
        or: any => single(any) ?? { $or: any },
        empty: () => undefined,
      },
    ) as TConditions | undefined | null;

  const get = (): TConditions | undefined => {
    const result = conditions();
    if (result === null) throw new NoRecordAllowedError(action, subjectType);
    return result;
  };

  return {
    get hasConditions() {
      return conditions() !== undefined;
    },
    get,
    toMongo: () => get() ?? ({} as TConditions),
    toAst: () => {
      const ast = rulesToAST(ability, action, subjectType);
      if (ast === null) throw new NoRecordAllowedError(action, subjectType);
      return ast;
    },
  };
}

/** One condition stays unwrapped, so a lone rule reads as its own conditions. */
function single(conditions: AnyObject[]): AnyObject | undefined {
  return conditions.length === 1 ? conditions[0] : undefined;
}
