import type { AppContract } from '@jperezmart/orpc-contract';
import { contract } from '@jperezmart/orpc-contract';
import type { Role } from '@jperezmart/orpc-domain';
import { createORPCClient } from '@orpc/client';
import type { ContractRouterClient } from '@orpc/contract';
import { OpenAPILink } from '@orpc/openapi-client/fetch';
import { createTanstackQueryUtils } from '@orpc/tanstack-query';

export interface DemoUser {
  id: string;
  name: string;
  roles: Role[];
}

/** Mirrors the backend's DEMO_USERS — the header `x-user-id` selects one. */
export const DEMO_USERS: DemoUser[] = [
  { id: 'admin', name: 'Admin', roles: ['admin'] },
  { id: 'alice', name: 'Alice (author)', roles: ['author'] },
  { id: 'bob', name: 'Bob (author)', roles: ['author'] },
  { id: 'carol', name: 'Carol (user)', roles: ['user'] },
];

/**
 * The demo session: which user the client authenticates as, or `null` for
 * none. A real app would hold a token (from Keycloak, say) here instead.
 */
export const session: { userId: string | null } = {
  userId: DEMO_USERS[0]?.id ?? null,
};

export type AppClient = ContractRouterClient<AppContract>;

/**
 * The typed oRPC client. The contract carries the `/api` prefix, so `url` is
 * just the origin; Vite proxies `/api` to the backend. Every call sends the
 * current demo session.
 */
export const client: AppClient = createORPCClient(
  new OpenAPILink(contract, {
    url: () => window.location.origin,
    headers: () => (session.userId ? { 'x-user-id': session.userId } : {}),
  }),
);

/** oRPC's TanStack Query integration: query and mutation options per procedure. */
export const orpc = createTanstackQueryUtils(client);
