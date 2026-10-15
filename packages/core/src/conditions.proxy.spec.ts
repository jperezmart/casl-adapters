import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import { ForbiddenException } from '@nestjs/common';
import { FieldCondition } from '@ucast/mongo2js';

import { ConditionsProxyImpl } from './conditions.proxy.js';

// The Access conditions themselves are tested in @jperezmart/casl-core; this
// covers what @CaslConditions() hands a NestJS handler.

describe('ConditionsProxyImpl', () => {
  it('exposes the Access conditions of the guarded action and subject type', () => {
    const { can, build } = new AbilityBuilder(createMongoAbility);
    can('read', 'Article', { published: true });
    const ability = build();

    const conditions = new ConditionsProxyImpl(ability, 'read', 'Article');

    expect(conditions.hasConditions).toBe(true);
    expect(conditions.get()).toEqual({ published: true });
    expect(conditions.toMongo()).toEqual({ published: true });
    expect(conditions.toAst()).toEqual(
      new FieldCondition('eq', 'published', true),
    );
  });

  it('throws a ForbiddenException when no record is allowed', () => {
    const ability = new AbilityBuilder(createMongoAbility).build();

    const conditions = new ConditionsProxyImpl(ability, 'read', 'Article');

    expect(() => conditions.get()).toThrow(ForbiddenException);
    expect(() => conditions.toMongo()).toThrow(ForbiddenException);
    expect(() => conditions.toAst()).toThrow(ForbiddenException);
  });
});
