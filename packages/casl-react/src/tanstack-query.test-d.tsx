import { createORPCClient } from '@orpc/client';
import type { ContractRouterClient } from '@orpc/contract';
import { oc } from '@orpc/contract';
import { createTanstackQueryUtils } from '@orpc/tanstack-query';
import { z } from 'zod';

import type { ClientAbilityState } from './index.js';
import { createCaslReact } from './index.js';
import { useQueryAbility } from './tanstack-query.js';
import type { AppAbility } from './test-app.js';

const casl = createCaslReact<AppAbility>();

// An app's contract, its Rules endpoint procedure typing the packed rules as
// opaque, as a contract with no CASL dependency does.
const contract = oc.router({
  me: oc.router({
    rules: oc.output(z.object({ rules: z.array(z.unknown()) })),
    profile: oc.output(z.object({ name: z.string() })),
  }),
});
declare const link: Parameters<typeof createORPCClient>[0];
const client: ContractRouterClient<typeof contract> = createORPCClient(link);
void contract;
const orpc = createTanstackQueryUtils(client);

describe('useQueryAbility types', () => {
  it("takes the query options oRPC's TanStack Query integration builds", () => {
    expectTypeOf(
      useQueryAbility(casl, orpc.me.rules.queryOptions()),
    ).toEqualTypeOf<ClientAbilityState<AppAbility>>();
  });

  it('takes plain query options with their queryKey', () => {
    useQueryAbility(casl, {
      queryKey: ['me', 'rules'],
      queryFn: async () => ({ rules: [] }),
    });
    // @ts-expect-error — no queryKey to invalidate on refresh
    useQueryAbility(casl, { queryFn: async () => ({ rules: [] }) });
  });

  it('refuses a query that does not answer { rules }', () => {
    // @ts-expect-error — not the Rules endpoint
    useQueryAbility(casl, orpc.me.profile.queryOptions());
  });
});
