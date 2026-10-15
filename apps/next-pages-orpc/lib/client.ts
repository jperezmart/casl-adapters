import { createCaslReact } from '@jperezmart/casl-react';
import type { AppAbility } from '@jperezmart/orpc-abilities';
import { detectSubjectType } from '@jperezmart/orpc-abilities';
import type { AppContract } from '@jperezmart/orpc-contract';
import { contract } from '@jperezmart/orpc-contract';
import { createORPCClient } from '@orpc/client';
import type { ContractRouterClient } from '@orpc/contract';
import { OpenAPILink } from '@orpc/openapi-client/fetch';
import { createTanstackQueryUtils } from '@orpc/tanstack-query';

/**
 * The typed oRPC client of the API route. The contract carries the `/api`
 * prefix, so `url` is just the origin, and the session cookie goes along on
 * every same-origin call.
 */
export const client: ContractRouterClient<AppContract> = createORPCClient(
  new OpenAPILink(contract, {
    url: () =>
      typeof window === 'undefined'
        ? 'http://localhost'
        : window.location.origin,
  }),
);

/** oRPC's TanStack Query integration: query and mutation options per procedure. */
export const orpc = createTanstackQueryUtils(client);

// The React bindings of the app's Ability. The type and the subject-type
// detection come from the abilities package's client-safe barrel: the Role
// permissions stay on the server, which serves the rules on its Rules endpoint.
export const casl = createCaslReact<AppAbility>({ detectSubjectType });
export const { AbilityProvider, Can } = casl;
