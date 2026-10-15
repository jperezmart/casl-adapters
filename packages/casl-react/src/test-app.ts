// A small app's shared module, as the tests' fixture: its Ability type and
// subject-type detection, with no server code.
import type { InferSubjects, MongoAbility } from '@casl/ability';
import { createMongoAbility } from '@casl/ability';
import type { RulesResponse } from '@jperezmart/casl-core';
import { rulesResponse } from '@jperezmart/casl-core';

export interface Article {
  readonly kind: 'Article';
  id: string;
  authorId: string;
}

export type Action = 'read' | 'update';
export type AppAbility = MongoAbility<[Action, InferSubjects<Article> | 'all']>;

export const detectSubjectType = (subject: object): string =>
  (subject as Article).kind;

/** What a Rules endpoint answers for a reader of published articles who authors `authorId`'s. */
export function rulesFor(authorId: string): RulesResponse<AppAbility> {
  return rulesResponse(
    createMongoAbility<AppAbility>([
      { action: 'read', subject: 'Article' },
      { action: 'update', subject: 'Article', conditions: { authorId } },
    ]),
  );
}

/** A promise the test settles by hand. */
export function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
