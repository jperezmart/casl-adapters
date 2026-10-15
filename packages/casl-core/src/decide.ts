import type { AnyAbility, SubjectType } from '@casl/ability';

import type { ActionOf, SubjectOf } from './types.js';
import { DefaultActions } from './types.js';

/** Options for {@link decide}. */
export interface DecideOptions<TAbility extends AnyAbility = AnyAbility> {
  /**
   * The action that decides whether a denied instance is hidden (not found)
   * or merely forbidden. Defaults to `'read'` ({@link DefaultActions.read}).
   */
  readAction?: ActionOf<TAbility>;
}

/** Which answer a denied check is (ADR 0004, ADR 0005). */
export type DenialKind = 'unauthenticated' | 'forbidden' | 'not-found';

/** A check the Ability allows. */
export interface Allowed {
  readonly allowed: true;
}

/**
 * A denied check: which answer it is, and the message an Adapter may show for
 * it (the one `@jperezmart/nest-casl` has always shown).
 */
export interface Denial {
  readonly allowed: false;
  readonly kind: DenialKind;
  readonly message: string;
}

/** What {@link decide} answers. */
export type Decision = Allowed | Denial;

const ALLOWED: Allowed = Object.freeze({ allowed: true });

/**
 * Decides whether `ability` may perform `action` on `subject`, following the
 * Denial rule (ADR 0004), and returns the answer rather than throwing it:
 *
 * - no Ability (an Unauthenticated request) → `unauthenticated`;
 * - a subject type (string or class) → `forbidden`;
 * - an instance whose type the action is denied on → `forbidden`: the same
 *   answer for every instance, so it reveals none;
 * - an instance the user cannot read either → `not-found`;
 * - any other instance → `forbidden`.
 *
 * Every Adapter decides with this function and maps the answer to its
 * framework's own response, so the Denial rule has one implementation.
 */
export function decide<TAbility extends AnyAbility>(
  ability: TAbility | null | undefined,
  action: ActionOf<TAbility>,
  subject: SubjectOf<TAbility>,
  options: DecideOptions<TAbility> = {},
): Decision {
  if (ability == null) {
    return denial(
      'unauthenticated',
      'No authenticated user available for the CASL ability check.',
    );
  }

  // The typed signature has done its job at the call site; check loosely.
  const canLoosely = ability.can.bind(ability) as (
    action: string,
    subject: unknown,
  ) => boolean;
  if (canLoosely(action, subject)) return ALLOWED;

  // An instance is hidden only from a user who may act on some instance of its
  // type: denied on the type, the answer is the same for every id, so it
  // reveals nothing about which records exist.
  if (
    !isSubjectType(subject) &&
    canLoosely(action, ability.detectSubjectType(subject as never))
  ) {
    const readAction = options.readAction ?? DefaultActions.read;
    if (!canLoosely(readAction, subject)) {
      return denial('not-found', 'Not Found');
    }
  }

  return denial(
    'forbidden',
    `Insufficient permissions to ${action} ${subjectName(ability, subject)}.`,
  );
}

function denial(kind: DenialKind, message: string): Denial {
  return { allowed: false, kind, message };
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
