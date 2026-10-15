import type { AnyAbility, RawRuleOf } from '@casl/ability';
import type { PackRule } from '@casl/ability/extra';
import { packRules } from '@casl/ability/extra';

import type { AppAbility } from './types.js';

/**
 * What every Rules endpoint answers, whatever the Adapter serving it: the
 * packed rules of the current user's Ability. An object rather than a bare
 * array, so fields can be added later without breaking clients. An
 * Unauthenticated request gets a 401 instead.
 */
export interface RulesResponse<TAbility extends AnyAbility = AppAbility> {
  rules: PackRule<RawRuleOf<TAbility>>[];
}

/** The Rules endpoint's answer for `ability`: its rules, packed. */
export function rulesResponse<TAbility extends AnyAbility>(
  ability: TAbility,
): RulesResponse<TAbility> {
  return { rules: packRules(ability.rules as RawRuleOf<TAbility>[]) };
}
