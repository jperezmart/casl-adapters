import { Module } from '@nestjs/common';

import { MeController } from './me.controller.js';

@Module({
  controllers: [MeController],
})
export class MeModule {}
