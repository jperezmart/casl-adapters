import { createMongoAbility, subject } from '@casl/ability';

import { decide } from './index.js';

class Article {
  constructor(
    readonly authorId: string,
    readonly published = true,
  ) {}
}

// An author reads every published article, and their own drafts, but updates
// only their own.
const author = createMongoAbility([
  { action: 'read', subject: 'Article', conditions: { published: true } },
  { action: 'read', subject: 'Article', conditions: { authorId: 'u1' } },
  { action: 'update', subject: 'Article', conditions: { authorId: 'u1' } },
  { action: 'read', subject: Article, conditions: { published: true } },
]);

const own = subject('Article', { authorId: 'u1', published: false });
const othersPublished = subject('Article', { authorId: 'u2', published: true });
const othersDraft = subject('Article', { authorId: 'u2', published: false });

describe('decide', () => {
  it('allows what the ability allows', () => {
    expect(decide(author, 'update', own)).toEqual({ allowed: true });
    expect(decide(author, 'read', 'Article')).toEqual({ allowed: true });
  });

  it('denies an Unauthenticated request, which has no Ability', () => {
    for (const ability of [null, undefined]) {
      expect(decide(ability, 'read', 'Article')).toEqual({
        allowed: false,
        kind: 'unauthenticated',
        message: 'No authenticated user available for the CASL ability check.',
      });
    }
  });

  it('is forbidden for a subject type, never not found', () => {
    expect(decide(author, 'delete', 'Article')).toMatchObject({
      allowed: false,
      kind: 'forbidden',
    });
    expect(decide(author, 'delete', Article)).toMatchObject({
      allowed: false,
      kind: 'forbidden',
    });
  });

  it('is forbidden for an instance the user can read', () => {
    expect(decide(author, 'update', othersPublished)).toMatchObject({
      kind: 'forbidden',
    });
    expect(decide(author, 'update', new Article('u2'))).toMatchObject({
      kind: 'forbidden',
    });
  });

  it('is not found for an instance the user cannot read either', () => {
    expect(decide(author, 'update', othersDraft)).toEqual({
      allowed: false,
      kind: 'not-found',
      message: 'Not Found',
    });
    expect(decide(author, 'update', new Article('u2', false))).toMatchObject({
      kind: 'not-found',
    });
  });

  it('is forbidden for an instance when the ability allows the action on no instance, readable or not', () => {
    // The author has no `delete` rule at all: forbidden for every id says
    // nothing about which records exist.
    expect(decide(author, 'delete', othersDraft)).toMatchObject({
      kind: 'forbidden',
    });
    expect(decide(author, 'delete', new Article('u2', false))).toMatchObject({
      kind: 'forbidden',
    });
  });

  it('is forbidden for an instance an unconditional denial forbids, even an unreadable one', () => {
    const banned = createMongoAbility([
      { action: 'read', subject: 'Article', conditions: { published: true } },
      { action: 'update', subject: 'Article', conditions: { authorId: 'u1' } },
      { action: 'update', subject: 'Article', inverted: true },
    ]);

    expect(decide(banned, 'update', othersDraft)).toMatchObject({
      kind: 'forbidden',
    });
  });

  it('names the action and subject type in the forbidden message', () => {
    expect(decide(author, 'update', othersPublished)).toEqual({
      allowed: false,
      kind: 'forbidden',
      message: 'Insufficient permissions to update Article.',
    });
    expect(decide(author, 'delete', Article)).toMatchObject({
      message: 'Insufficient permissions to delete Article.',
    });
  });

  it('names a class subject by its modelName when it has one', () => {
    class Post {
      static readonly modelName = 'BlogPost';
    }
    const ability = createMongoAbility([]);

    expect(decide(ability, 'read', Post)).toMatchObject({
      message: 'Insufficient permissions to read BlogPost.',
    });
  });

  it('splits not found from forbidden on a custom readAction', () => {
    const viewer = createMongoAbility([
      { action: 'view', subject: 'Article', conditions: { published: true } },
      { action: 'read', subject: 'Article' },
      // Updates some articles, so a denial is decided by visibility.
      { action: 'update', subject: 'Article', conditions: { authorId: 'u1' } },
    ]);
    const draft = subject('Article', { authorId: 'u2', published: false });
    const published = subject('Article', { authorId: 'u2', published: true });

    expect(
      decide(viewer, 'update', draft, { readAction: 'view' }),
    ).toMatchObject({ kind: 'not-found' });
    expect(
      decide(viewer, 'update', published, { readAction: 'view' }),
    ).toMatchObject({ kind: 'forbidden' });
    // With the default `'read'`, the same draft is readable, so forbidden.
    expect(decide(viewer, 'update', draft)).toMatchObject({
      kind: 'forbidden',
    });
  });
});
