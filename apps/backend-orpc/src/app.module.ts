import { Module } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { ORPCGlobalContext } from '@orpc/nest';
import { onError, ORPCModule } from '@orpc/nest';

import { ArticlesModule } from './articles/articles.module.js';
import { MeModule } from './me/me.module.js';

@Module({
  imports: [
    // Mounts the oRPC interceptor that executes @Implement handlers, with the
    // request as the procedure context: `casl`'s `getUser` reads the demo user
    // from it. Its errors are already oRPC's own, so nothing translates them.
    ORPCModule.forRootAsync({
      useFactory: (request: ORPCGlobalContext['request']) => ({
        interceptors: [
          onError((error: unknown) => {
            console.error('[orpc]', error);
          }),
        ],
        context: { request },
      }),
      inject: [REQUEST],
    }),
    ArticlesModule,
    MeModule,
  ],
})
export class AppModule {}
