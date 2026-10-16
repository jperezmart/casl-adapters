import { decide } from '@jperezmart/casl-core';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';

import { assertCan, enforce } from '../assert-can.js';
import { ConditionsProxyImpl } from '../conditions.proxy.js';
import {
  CASL_ABILITY_METADATA,
  CASL_ALLOW_WITHOUT_ABILITY,
  CASL_REQUEST_CONTEXT,
  CASL_ROOT_OPTIONS,
} from '../constants.js';
import { AbilityFactory } from '../factories/ability.factory.js';
import type { AuthorizableRequest } from '../interfaces/authorizable-request.interface.js';
import type { CaslModuleOptions } from '../interfaces/casl-options.interface.js';
import type { CaslRequestContext } from '../interfaces/casl-request-context.interface.js';
import type { UseAbilityMetadata } from '../interfaces/use-ability-metadata.interface.js';

/**
 * Guard that enforces `@UseAbility` metadata. Resolves the user, optionally runs
 * the subject hook, builds the ability, caches the {@link CaslRequestContext} on
 * the request for the parameter decorators, and decides with {@link assertCan}:
 * 401 without a user; 403, before the hook runs, when the action is denied on
 * the subject type; then 404 for a hook that loads nothing or an instance the
 * user cannot read either, 403 for any other denial (ADR 0004). A route without
 * `@UseAbility` metadata is denied (403) unless it is marked
 * `@AllowWithoutAbility()`, so a forgotten check fails closed.
 */
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
    private readonly abilityFactory: AbilityFactory,
    @Inject(CASL_ROOT_OPTIONS)
    private readonly options: CaslModuleOptions,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.metadataOf(context);
    if (metadata === 'allowed') return true;
    // No `@UseAbility` and no opt-out: a forgotten check, denied.
    if (!metadata) throw new ForbiddenException();

    const request = context.switchToHttp().getRequest<AuthorizableRequest>();

    const getUser =
      this.options.getUserFromRequest ??
      ((req: AuthorizableRequest) => req.user);
    const user = await getUser(request);
    // An Unauthenticated request gets no Ability: the core answers it.
    if (!user) {
      enforce(decide(null, metadata.action, metadata.subject));
      return false; // Unreachable: the core denies a missing Ability.
    }

    const ability = this.abilityFactory.createForUser(user);

    const { subjectHook } = metadata;
    let subjectInstance: unknown;
    if (subjectHook) {
      // Denied on the subject type, the action is denied on every instance:
      // answer 403 before loading anything (ADR 0004).
      assertCan(ability, metadata.action, metadata.subject as never);

      const hook = this.moduleRef.get(subjectHook, { strict: false });
      subjectInstance = await hook.run(request);
    }

    const caslContext: CaslRequestContext = {
      user,
      ability,
      conditions: new ConditionsProxyImpl(
        ability,
        metadata.action,
        metadata.subject,
      ),
    };
    if (subjectInstance != null) {
      caslContext.subject = subjectInstance as never;
    }
    (request as Record<PropertyKey, unknown>)[CASL_REQUEST_CONTEXT] =
      caslContext;

    // A declared subject hook means the rule must be evaluated against the
    // concrete instance; the type check above only ever denies. If the hook
    // yields nothing we must NOT fall back to a `can(action, 'Type')` check:
    // CASL evaluates that as `true` for *conditional* rules (it can't test
    // conditions without an instance), which would fail-open. A hook that produced no subject is a 404, like a missing record;
    // this is the one branch of ADR 0004 `assertCan` cannot see, as it knows no hooks.
    if (subjectHook && subjectInstance == null) throw new NotFoundException();

    assertCan(
      ability,
      metadata.action,
      (subjectInstance ?? metadata.subject) as never,
      { readAction: this.options.readAction },
    );
    return true;
  }

  /**
   * The closest decision wins: the handler's `@UseAbility`, then its
   * `@AllowWithoutAbility()`, then the controller's, in the same order.
   */
  private metadataOf(
    context: ExecutionContext,
  ): UseAbilityMetadata | 'allowed' | undefined {
    for (const target of [context.getHandler(), context.getClass()]) {
      const metadata = this.reflector.get<UseAbilityMetadata | undefined>(
        CASL_ABILITY_METADATA,
        target,
      );
      if (metadata) return metadata;
      if (this.reflector.get<boolean>(CASL_ALLOW_WITHOUT_ABILITY, target)) {
        return 'allowed';
      }
    }
    return undefined;
  }
}
