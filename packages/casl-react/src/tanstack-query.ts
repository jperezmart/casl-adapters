import type { AnyMongoAbility } from '@casl/ability';
import type { QueryKey, UseQueryOptions } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import type {
  CaslReact,
  ClientAbilityState,
  RulesPayload,
} from './casl-react.js';
import { isUnauthenticated } from './casl-react.js';

/** How many times a failed fetch of the rules is retried, as Query's default. */
const RETRIES = 3;

/**
 * The Client ability built from the result of a TanStack Query over a Rules
 * endpoint, for `casl.AbilityProvider`'s `state`. `options` are the query's
 * options with their `queryKey`, such as those oRPC's TanStack Query
 * integration builds for the Rules endpoint procedure
 * (`orpc.me.rules.queryOptions()`).
 *
 * The Client ability allows nothing while the query loads and whenever it
 * last failed, a 401 included, even though Query keeps the old data. A 401 is
 * not retried. Refreshing is invalidating the query: `refresh()` does just
 * that, and so does any invalidation of its key.
 */
export function useQueryAbility<
  TAbility extends AnyMongoAbility,
  TQueryFnData extends RulesPayload,
  TError = Error,
  TQueryKey extends QueryKey = QueryKey,
>(
  casl: Pick<CaslReact<TAbility>, 'createAbility'>,
  options: UseQueryOptions<TQueryFnData, TError, TQueryFnData, TQueryKey> & {
    queryKey: TQueryKey;
  },
): ClientAbilityState<TAbility> {
  const queryClient = useQueryClient();
  const query = useQuery({
    retry: (failures, error) => !isUnauthenticated(error) && failures < RETRIES,
    ...options,
  });

  const { queryKey } = options;
  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey }),
    [queryClient, queryKey],
  );

  const payload = query.status === 'success' ? query.data : undefined;
  const ability = useMemo(() => casl.createAbility(payload), [casl, payload]);

  return useMemo(
    () => ({
      ability,
      isLoading: query.isLoading,
      isUnauthenticated:
        query.status === 'error' && isUnauthenticated(query.error),
      error: query.status === 'error' ? query.error : undefined,
      refresh,
    }),
    [ability, query.isLoading, query.status, query.error, refresh],
  );
}
