import {
  appUserSchema,
  articleCreateSchema,
  articleSchema,
  articleUpdateSchema,
} from '@jperezmart/orpc-domain';
import { oc } from '@orpc/contract';
import { z } from 'zod';

import { commonErrors } from './errors.js';

const idInput = z.object({ id: z.string() });

// The Rules endpoint's response. Packed CASL rules are opaque to the contract —
// validated only as an array.
const rulesOutput = z.object({ rules: z.array(z.unknown()) });

/**
 * The oRPC contract. Pure transport: it assembles domain schemas into typed
 * procedures over the same `Article` domain as the REST examples. Depends only
 * on @jperezmart/orpc-domain, @orpc/contract and zod — never on the abilities
 * package or on any server/Nest code, so the frontend can import it for a fully
 * typed client.
 */
export const contract = oc.prefix('/api').router({
  articles: oc
    .tag('Articles')
    .prefix('/articles')
    .router({
      list: oc
        .route({
          method: 'GET',
          path: '/',
          description: 'List readable articles',
        })
        .errors(commonErrors)
        .output(z.array(articleSchema)),
      get: oc
        .route({
          method: 'GET',
          path: '/{id}',
          description: 'Read one article',
        })
        .input(idInput)
        .errors(commonErrors)
        .output(articleSchema),
      create: oc
        .route({ method: 'POST', path: '/', description: 'Create an article' })
        .input(articleCreateSchema)
        .errors(commonErrors)
        .output(articleSchema),
      update: oc
        .route({
          method: 'PATCH',
          path: '/{id}',
          description: 'Update an article',
        })
        .input(articleUpdateSchema.extend(idInput.shape))
        .errors(commonErrors)
        .output(articleSchema),
      remove: oc
        .route({
          method: 'DELETE',
          path: '/{id}',
          description: 'Delete an article',
        })
        .input(idInput)
        .errors(commonErrors)
        .output(z.object({ deleted: z.boolean() })),
    }),

  me: oc
    .tag('Me')
    .prefix('/me')
    .router({
      get: oc
        .route({ method: 'GET', path: '/', description: 'Current user' })
        .errors(commonErrors)
        .output(appUserSchema),
      abilities: oc
        .route({
          method: 'GET',
          path: '/abilities',
          description:
            "The Rules endpoint: the current user's packed CASL rules",
        })
        .errors(commonErrors)
        .output(rulesOutput),
    }),
});

export type AppContract = typeof contract;
