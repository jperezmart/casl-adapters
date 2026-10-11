import { CaslModule } from '@jperezmart/nest-casl';
import { detectSubjectType } from '@jperezmart/orpc-abilities';
import type { Role } from '@jperezmart/orpc-domain';
import { ForbiddenException, Module, NotFoundException } from '@nestjs/common';
import { onError, ORPCModule } from '@orpc/nest';
import { ORPCError } from '@orpc/server';

import { ArticlesModule } from './articles/articles.module.js';
import { parseUser } from './auth/parse-user.js';
import { MeModule } from './me/me.module.js';

@Module({
  imports: [
    // Mounts the oRPC interceptor that executes @Implement handlers.
    ORPCModule.forRoot({
      interceptors: [
        onError((error: unknown) => {
          console.error('[orpc]', error);
        }),
        // oRPC answers any error that is not an `ORPCError` with a 500, so
        // translate the exceptions `assertCan` throws (ADR 0004: 404 for what
        // the user cannot read, 403 otherwise).
        async ({ next }) => {
          try {
            return await next();
          } catch (error) {
            if (error instanceof NotFoundException)
              throw new ORPCError('NOT_FOUND');
            if (error instanceof ForbiddenException)
              throw new ORPCError('FORBIDDEN');
            throw error;
          }
        },
      ],
    }),
    // `getUserFromRequest` is read by the AccessGuard behind each procedure's
    // `@UseAbility` (the `me` endpoints, which have none, parse the user
    // themselves); `detectSubjectType` lets the factory match `kind`-tagged
    // objects.
    CaslModule.forRoot<Role>({
      superuserRole: 'admin',
      getUserFromRequest: request =>
        parseUser(request as { headers?: Record<string, unknown> }),
      detectSubjectType,
    }),
    ArticlesModule,
    MeModule,
  ],
})
export class AppModule {}
