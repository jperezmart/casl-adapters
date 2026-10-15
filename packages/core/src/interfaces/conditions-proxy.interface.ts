import type { AccessConditionsAst } from '@jperezmart/casl-core';

import type { AnyObject } from '../types.js';

// Declared by @jperezmart/casl-core; re-exported so the public API is unchanged.
export type { AccessConditionsAst };

/**
 * The Access conditions of the guarded `(action, subjectType)`, injected via
 * `@CaslConditions()`: what a record must satisfy for the ability to allow the
 * action on it. Every allowing rule is OR-ed and every denying rule with
 * conditions excluded, so filtering a DB query by them returns exactly the
 * records the user may act on.
 *
 * @typeParam TConditions - Shape of the conditions object (Mongo syntax).
 */
export interface ConditionsProxy<TConditions extends AnyObject = AnyObject> {
  /** `false` only when the ability allows the action on every record. */
  readonly hasConditions: boolean;

  /**
   * The Access conditions in Mongo syntax, or `undefined` when every record is
   * allowed.
   *
   * @throws ForbiddenException when no record is allowed.
   */
  get(): TConditions | undefined;

  /**
   * The Access conditions in Mongo syntax, `{}` when every record is allowed.
   *
   * @throws ForbiddenException when no record is allowed.
   */
  toMongo(): TConditions;

  /**
   * The Access conditions as an AST, built with CASL's `rulesToAST`; an empty
   * `and` when every record is allowed.
   *
   * @throws ForbiddenException when no record is allowed.
   */
  toAst(): AccessConditionsAst;
}
