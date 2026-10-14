import type { AnyAbility, Subject, SubjectType } from '@casl/ability';
import type { Type } from '@nestjs/common';
import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';

import { CASL_ABILITY_METADATA } from '../constants.js';
import { AccessGuard } from '../guards/access.guard.js';
import type { SubjectBeforeFilterHook } from '../interfaces/subject-hook.interface.js';
import type { UseAbilityMetadata } from '../interfaces/use-ability-metadata.interface.js';
import type { ActionOf, SubjectInstanceOf, SubjectTypeOf } from '../types.js';

/**
 * Protects a route handler with a CASL permission check. Stores the requirement
 * as metadata and wires up the {@link AccessGuard} for the handler.
 *
 * @param action      - Action being attempted (string or action enum member).
 * @param subject     - Subject class or registered subject name.
 * @param subjectHook - Optional hook class (an injectable provider) loading the
 *                      concrete subject before the rule is evaluated, enabling
 *                      condition-based rules.
 *
 * @example
 * ```ts
 * @UseAbility(Actions.update, "Article", ArticleHook)
 * @Patch(":id")
 * update() {}
 * ```
 */
export function UseAbility<TAction extends string = string>(
  action: TAction,
  subject: SubjectType,
  subjectHook?: Type<SubjectBeforeFilterHook>,
) {
  const metadata: UseAbilityMetadata<TAction> = {
    action,
    subject,
    ...(subjectHook ? { subjectHook } : {}),
  };
  return applyDecorators(
    SetMetadata(CASL_ABILITY_METADATA, metadata),
    UseGuards(AccessGuard),
  );
}

/**
 * Create a `@UseAbility` decorator **bound to your `AppAbility`**, so the
 * `action` and `subject` arguments are type-checked (the bare {@link UseAbility}
 * accepts any string). Define it once and import it instead — the CASL-for-NestJS
 * analogue of `@casl/react`'s `createContextualCan`:
 *
 * ```ts
 * // casl.ts
 * export const UseAbility = createUseAbility<AppAbility>();
 *
 * // @UseAbility('create', 'Article')   ✓
 * // @UseAbility('frobnicate', 'Ghost') ✗ compile error
 * ```
 *
 * When the ability types the subject's instances (a class, or a subject tagged
 * with `kind`, `__typename` or `subject()`), the subject hook must load one:
 * `@UseAbility('read', 'Article', CommentHook)` does not compile.
 */
export function createUseAbility<TAbility extends AnyAbility>() {
  return <TSubjectType extends SubjectTypeOf<TAbility>>(
    action: ActionOf<TAbility>,
    subject: TSubjectType,
    subjectHook?: Type<
      SubjectBeforeFilterHook<
        SubjectInstanceOf<TAbility, NoInfer<TSubjectType>> & Subject
      >
    >,
  ) => UseAbility(action as string, subject as SubjectType, subjectHook);
}
