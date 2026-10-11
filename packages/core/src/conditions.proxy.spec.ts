import { AbilityBuilder, createMongoAbility, subject } from '@casl/ability';
import { ForbiddenException } from '@nestjs/common';
import {
  CompoundCondition,
  FieldCondition,
  guard,
  interpret,
} from '@ucast/mongo2js';

import { ConditionsProxyImpl } from './conditions.proxy.js';

type Builder = AbilityBuilder<ReturnType<typeof createMongoAbility>>;

describe('ConditionsProxyImpl', () => {
  it('exposes a lone allowing rule as its own conditions', () => {
    const { can, build } = new AbilityBuilder(createMongoAbility);
    can('read', 'Article', { published: true });
    const ability = build();

    const conditions = new ConditionsProxyImpl(ability, 'read', 'Article');

    expect(conditions.hasConditions).toBe(true);
    expect(conditions.get()).toEqual({ published: true });
    expect(conditions.toMongo()).toEqual({ published: true });
  });

  it('exposes a lone allowing rule as an AST of its own conditions', () => {
    const { can, build } = new AbilityBuilder(createMongoAbility);
    can('read', 'Article', { published: true });
    const ability = build();

    const conditions = new ConditionsProxyImpl(ability, 'read', 'Article');

    expect(conditions.toAst()).toEqual(
      new FieldCondition('eq', 'published', true),
    );
  });

  it('has no conditions when every record is allowed', () => {
    const { can, build } = new AbilityBuilder(createMongoAbility);
    can('manage', 'all');
    const ability = build();

    const conditions = new ConditionsProxyImpl(ability, 'read', 'Article');

    expect(conditions.hasConditions).toBe(false);
    expect(conditions.get()).toBeUndefined();
    expect(conditions.toMongo()).toEqual({});
    expect(conditions.toAst()).toEqual(new CompoundCondition('and', []));
  });

  it('excludes what a denying rule narrows out of an unconditional allow', () => {
    const { can, cannot, build } = new AbilityBuilder(createMongoAbility);
    can('read', 'Article');
    cannot('read', 'Article', { secret: true });
    const ability = build();

    const conditions = new ConditionsProxyImpl(ability, 'read', 'Article');

    expect(conditions.hasConditions).toBe(true);
    expect(conditions.toMongo()).toEqual({ $nor: [{ secret: true }] });
  });

  it.each([
    ['no rule at all', () => {}],
    [
      'an unconditional denial above the allowing rule',
      ({ can, cannot }: Builder) => {
        can('read', 'Article', { published: true });
        cannot('read', 'Article');
      },
    ],
  ])('refuses to filter when %s lets no record through', (_, define) => {
    const builder = new AbilityBuilder(createMongoAbility);
    define(builder);
    const ability = builder.build();

    const conditions = new ConditionsProxyImpl(ability, 'read', 'Article');

    expect(() => conditions.get()).toThrow(ForbiddenException);
    expect(() => conditions.toMongo()).toThrow(ForbiddenException);
    expect(() => conditions.toAst()).toThrow(ForbiddenException);
  });

  describe('filters to exactly the records the ability allows', () => {
    const articles = [
      { published: true, authorId: 'u1', archived: false, secret: false },
      { published: true, authorId: 'u2', archived: true, secret: false },
      { published: false, authorId: 'u1', archived: true, secret: true },
      { published: false, authorId: 'u2', archived: false, secret: true },
      { published: false, authorId: 'u1', archived: false, secret: false },
      { published: true, authorId: 'u2', archived: false, secret: true },
    ];

    it.each<[string, (builder: Builder) => void]>([
      [
        'two allowing rules and a denial',
        ({ can, cannot }) => {
          can('read', 'Article', { published: true });
          can('read', 'Article', { authorId: 'u1' });
          cannot('read', 'Article', { archived: true });
        },
      ],
      [
        'an unconditional allow narrowed by two denials',
        ({ can, cannot }) => {
          can('read', 'Article');
          cannot('read', 'Article', { secret: true });
          cannot('read', 'Article', { archived: true });
        },
      ],
      [
        'a denial overridden by a later allow',
        ({ can, cannot }) => {
          cannot('read', 'Article', { secret: true });
          can('read', 'Article', { authorId: 'u1' });
        },
      ],
      [
        'allows and denials interleaved',
        ({ can, cannot }) => {
          can('read', 'Article', { published: true });
          cannot('read', 'Article', { secret: true });
          can('read', 'Article', { authorId: 'u1' });
          cannot('read', 'Article', { archived: true });
        },
      ],
    ])('%s', (_, define) => {
      const builder = new AbilityBuilder(createMongoAbility);
      define(builder);
      const ability = builder.build();

      const conditions = new ConditionsProxyImpl(ability, 'read', 'Article');
      const matchesMongo = guard(conditions.toMongo());
      const ast = conditions.toAst();

      for (const article of articles) {
        const allowed = ability.can('read', subject('Article', { ...article }));
        expect(matchesMongo(article), JSON.stringify(article)).toBe(allowed);
        expect(interpret(ast, article), JSON.stringify(article)).toBe(allowed);
      }
    });
  });
});
