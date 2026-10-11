import type { AnyAbility, SubjectType } from '@casl/ability';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { DefaultActions } from './constants.js';
import type { ActionOf, SubjectOf } from './types.js';

/** Options for {@link assertCan}. */
export interface AssertCanOptions<TAbility extends AnyAbility = AnyAbility> {
  /**
   * The action that decides whether a denied instance is hidden (404) or
   * merely forbidden (403). Defaults to `'read'`
   * ({@link DefaultActions.read}).
   */
  readAction?: ActionOf<TAbility>;
}

/**
 * Throws what the guard should throw when `ability` may not perform `action` on
 * `subject`, and returns normally otherwise (ADR 0004):
 *
 * - a subject type (string or class) → `ForbiddenException`;
 * - an instance whose type the action is denied on → `ForbiddenException`: the
 *   same answer for every instance, so it reveals none;
 * - an instance the user cannot read either → `NotFoundException`, with Nest's
 *   default message, indistinguishable from a genuine not-found;
 * - any other instance → `ForbiddenException`.
 *
 * Pure: no guard, no dependency injection — for services, background jobs
 * and grouped oRPC handlers. `AccessGuard` decides with it too, so both give
 * the same answer.
 */
export function assertCan<TAbility extends AnyAbility>(
  ability: TAbility,
  action: ActionOf<TAbility>,
  subject: SubjectOf<TAbility>,
  options: AssertCanOptions<TAbility> = {},
): void {
  // The typed signature has done its job at the call site; check loosely.
  const canLoosely = ability.can.bind(ability) as (
    action: string,
    subject: unknown,
  ) => boolean;
  if (canLoosely(action, subject)) return;

  // An instance is hidden only from a user who may act on some instance of its
  // type: denied on the type, the 403 is the same for every id, so it reveals
  // nothing about which records exist.
  if (
    !isSubjectType(subject) &&
    canLoosely(action, ability.detectSubjectType(subject as never))
  ) {
    const readAction = options.readAction ?? DefaultActions.read;
    if (!canLoosely(readAction, subject)) throw new NotFoundException();
  }

  throw new ForbiddenException(
    `Insufficient permissions to ${action} ${subjectName(ability, subject)}.`,
  );
}

function isSubjectType(subject: unknown): subject is SubjectType {
  return typeof subject === 'string' || typeof subject === 'function';
}

function subjectName(ability: AnyAbility, subject: unknown): string {
  const type = isSubjectType(subject)
    ? subject
    : (ability.detectSubjectType(subject as never) as SubjectType);
  if (typeof type === 'string') return type;
  return (type as { modelName?: string }).modelName ?? type.name;
}
