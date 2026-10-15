import { createMongoAbility, subject } from '@casl/ability';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { assertCan } from './assert-can.js';

// The Denial rule itself is tested in @jperezmart/casl-core; this covers how
// assertCan answers each of the core's decisions with a NestJS exception.

// An author reads published articles and updates their own.
const author = createMongoAbility([
  { action: 'read', subject: 'Article', conditions: { published: true } },
  { action: 'update', subject: 'Article', conditions: { authorId: 'u1' } },
  { action: 'view', subject: 'Article' },
]);

const own = subject('Article', { authorId: 'u1', published: false });
const othersPublished = subject('Article', { authorId: 'u2', published: true });
const othersDraft = subject('Article', { authorId: 'u2', published: false });

function thrown(fn: () => void): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error('expected assertCan to throw');
}

describe('assertCan', () => {
  it('returns when the action is allowed', () => {
    expect(() => assertCan(author, 'update', own)).not.toThrow();
  });

  it('throws a ForbiddenException naming the action and subject type when forbidden', () => {
    const error = thrown(() => assertCan(author, 'update', othersPublished));

    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as Error).message).toBe(
      'Insufficient permissions to update Article.',
    );
  });

  it('throws the NotFoundException of a genuine not-found when not found', () => {
    const error = thrown(() => assertCan(author, 'update', othersDraft));

    expect(error).toBeInstanceOf(NotFoundException);
    expect((error as NotFoundException).getResponse()).toEqual(
      new NotFoundException().getResponse(),
    );
  });

  it('passes the readAction on to the decision', () => {
    // Viewable, so with `view` deciding hiding the draft is forbidden.
    expect(
      thrown(() =>
        assertCan(author, 'update', othersDraft, { readAction: 'view' }),
      ),
    ).toBeInstanceOf(ForbiddenException);
  });
});
