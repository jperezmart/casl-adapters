import type { AnyAbility } from '@casl/ability';
import type { DecideOptions, Decision } from '@jperezmart/casl-core';
import { decide } from '@jperezmart/casl-core';
import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import type { ActionOf, SubjectOf } from './types.js';

/** Options for {@link assertCan}. */
export type AssertCanOptions<TAbility extends AnyAbility = AnyAbility> =
  DecideOptions<TAbility>;

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
 * and grouped oRPC handlers. It decides with `@jperezmart/casl-core`, as
 * `AccessGuard` does, so both give the same answer.
 */
export function assertCan<TAbility extends AnyAbility>(
  ability: TAbility,
  action: ActionOf<TAbility>,
  subject: SubjectOf<TAbility>,
  options: AssertCanOptions<TAbility> = {},
): void {
  enforce(decide(ability, action, subject, options));
}

/** Throws the NestJS exception of a denial; returns when allowed. */
export function enforce(decision: Decision): void {
  if (decision.allowed) return;
  switch (decision.kind) {
    case 'unauthenticated':
      throw new UnauthorizedException(decision.message);
    case 'not-found':
      // Nest's default message, indistinguishable from a genuine not-found.
      throw new NotFoundException();
    case 'forbidden':
      throw new ForbiddenException(decision.message);
  }
}
