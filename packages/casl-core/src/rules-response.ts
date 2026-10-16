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

/**
 * The `Cache-Control` of every answer of a Rules endpoint: the rules are the
 * user's own, so no shared cache (a CDN, a proxy) may store them and serve
 * them to someone else, and the browser keeps no copy that outlives a change
 * of user.
 */
export const RULES_CACHE_CONTROL = 'private, no-store';

/** The Rules endpoint's answer for `ability`: its rules, packed. */
export function rulesResponse<TAbility extends AnyAbility>(
  ability: TAbility,
): RulesResponse<TAbility> {
  return { rules: packRules(ability.rules as RawRuleOf<TAbility>[]) };
}
