import { AbilityBuilder, createMongoAbility } from '@casl/ability';

import { rulesResponse } from './index.js';

describe('rulesResponse', () => {
  it("answers the Ability's rules packed under `rules`", () => {
    const { can, cannot, build } = new AbilityBuilder(createMongoAbility);
    can('read', 'Article', { published: true });
    cannot('read', 'Article', { archived: true });

    // The trailing 1 is packRules' flag for an inverted (`cannot`) rule.
    expect(rulesResponse(build())).toEqual({
      rules: [
        ['read', 'Article', { published: true }],
        ['read', 'Article', { archived: true }, 1],
      ],
    });
  });

  it('answers no rules for an Ability that allows nothing', () => {
    expect(rulesResponse(createMongoAbility())).toEqual({ rules: [] });
  });
});
