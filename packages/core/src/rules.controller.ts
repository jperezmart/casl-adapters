import type { RulesResponse } from '@jperezmart/casl-core';
import {
  RULES_CACHE_CONTROL,
  rulesResponse,
  unauthenticatedDenial,
} from '@jperezmart/casl-core';
import type { Type } from '@nestjs/common';
import { Controller, Get, Inject, Req, Res } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

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
      private readonly adapterHost: HttpAdapterHost,
    ) {}

    @Get()
    async rules(
      @Req() request: AuthorizableRequest,
      @Res({ passthrough: true }) response: unknown,
    ): Promise<RulesResponse> {
      // Set before anything is decided, so the 401 carries it too.
      this.adapterHost.httpAdapter.setHeader(
        response,
        'cache-control',
        RULES_CACHE_CONTROL,
      );
      const getUser =
        this.options.getUserFromRequest ??
        ((req: AuthorizableRequest) => req.user);
      const user = await getUser(request);
      // An Unauthenticated request gets no Ability: the core answers it.
      if (!user) enforce(unauthenticatedDenial);
      return rulesResponse(this.abilityFactory.createForUser(user!));
    }
  }
  return CaslRulesController;
}
