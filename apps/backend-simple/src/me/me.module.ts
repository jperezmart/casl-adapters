import { CaslModule } from '@jperezmart/nest-casl';
import { Module } from '@nestjs/common';

import { MeController } from './me.controller.js';

@Module({
  // The Rules endpoint, ready-made: `GET /me/abilities` answers `{ rules }`
  // for the user `getUserFromRequest` finds, and 401 without one. The
  // frontend's `@jperezmart/casl-react` fetches it by default.
  imports: [CaslModule.forRulesEndpoint({ path: 'me/abilities' })],
  controllers: [MeController],
})
export class MeModule {}
