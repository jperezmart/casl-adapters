import type { RulesResponse } from '@jperezmart/casl-core';
import { decide, rulesResponse } from '@jperezmart/casl-core';
import type { Type } from '@nestjs/common';
import { Controller, Get, Inject, Req } from '@nestjs/common';

import { enforce } from './assert-can.js';
import { CASL_ROOT_OPTIONS } from './constants.js';
import { AbilityFactory } from './factories/ability.factory.js';
import type { AuthorizableRequest } from './interfaces/authorizable-request.interface.js';
import type { CaslModuleOptions } from './interfaces/casl-options.interface.js';

/** Options for `CaslModule.forRulesEndpoint`. */
export interface CaslRulesEndpointOptions {
  /** Where the Rules endpoint is mounted, as `@Controller()` takes it. */
  path: string;
}

/**
 * Builds the controller of the Rules endpoint, mounted at `path`: `GET` answers
 * `{ rules }`, the packed rules of the request user's Ability, found as the
 * guard finds it (`getUserFromRequest`, or `request.user`). An Unauthenticated
 * request gets 401.
 */
export function createRulesController(path: string): Type {
  @Controller(path)
  class CaslRulesController {
    constructor(
      private readonly abilityFactory: AbilityFactory,
      @Inject(CASL_ROOT_OPTIONS)
      private readonly options: CaslModuleOptions,
    ) {}

    @Get()
    async rules(@Req() request: AuthorizableRequest): Promise<RulesResponse> {
      const getUser =
        this.options.getUserFromRequest ??
        ((req: AuthorizableRequest) => req.user);
      const user = await getUser(request);
      // An Unauthenticated request gets no Ability: the core answers it.
      if (!user) enforce(decide(null, 'read', 'all'));
      return rulesResponse(this.abilityFactory.createForUser(user!));
    }
  }
  return CaslRulesController;
}
