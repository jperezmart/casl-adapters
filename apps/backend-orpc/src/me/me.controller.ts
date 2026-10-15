import { contract } from '@jperezmart/orpc-contract';
import { Controller } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { casl } from '../casl.js';

/**
 * `me` has no subject to gate, so the grouped `@Implement` form fits. `get`
 * returns the user `casl.middleware` found; `abilities` is the Adapter's
 * ready-made Rules endpoint, implementing this contract's procedure, so the
 * React app can rebuild the same Ability (the server stays the source of
 * truth).
 */
@Controller()
export class MeController {
  @Implement(contract.me)
  me() {
    return {
      get: implement(contract.me.get)
        .use(casl.middleware)
        .handler(({ context }) => context.user),
      abilities: casl.implementRules(contract.me.abilities),
    };
  }
}
