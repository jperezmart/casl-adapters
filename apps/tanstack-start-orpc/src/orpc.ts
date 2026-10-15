import type { AppContract } from '@jperezmart/orpc-contract';
import { contract } from '@jperezmart/orpc-contract';
import { createORPCClient } from '@orpc/client';
import type { ContractRouterClient } from '@orpc/contract';
import { OpenAPILink } from '@orpc/openapi-client/fetch';
import { createTanstackQueryUtils } from '@orpc/tanstack-query';

/**
 * The typed oRPC client of the app's own server: same origin, so the session
 * cookie goes with every call. The contract carries the `/api` prefix, where
 * the server route mounts the handler. Queries only run in the browser here
 * (nothing is prefetched on the server), so the URL is the page's origin.
 */
export const client: ContractRouterClient<AppContract> = createORPCClient(
  new OpenAPILink(contract, { url: () => window.location.origin }),
);

/** oRPC's TanStack Query integration: query and mutation options per procedure. */
export const orpc = createTanstackQueryUtils(client);
