import type { CanActivate, ExecutionContext } from '@nestjs/common';
import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';

import { assertCan } from '../assert-can.js';
import { ConditionsProxyImpl } from '../conditions.proxy.js';
import {
  CASL_ABILITY_METADATA,
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
 * user cannot read either, 403 for any other denial (ADR 0004). Routes without
 * `@UseAbility` metadata are allowed through.
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
    // Read handler metadata first, falling back to the controller class so a
    // class-level `@UseAbility` protects every route instead of silently
    // allowing them through (handler metadata, when present, takes precedence).
    const metadata = this.reflector.getAllAndOverride<
      UseAbilityMetadata | undefined
    >(CASL_ABILITY_METADATA, [context.getHandler(), context.getClass()]);
    if (!metadata) return true;

    const request = context.switchToHttp().getRequest<AuthorizableRequest>();

    const getUser =
      this.options.getUserFromRequest ??
      ((req: AuthorizableRequest) => req.user);
    const user = await getUser(request);
    if (!user) {
      throw new UnauthorizedException(
        'No authenticated user available for the CASL ability check.',
      );
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
}
