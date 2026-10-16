import type { RulesResponse } from '@jperezmart/casl-core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

import type { ClientAbilityState, RulesPayload } from './index.js';
import {
  createCaslReact,
  MalformedRulesError,
  RulesRequestError,
} from './index.js';
import { useQueryAbility } from './tanstack-query.js';
import type { AppAbility, Article } from './test-app.js';
import { deferred, detectSubjectType, rulesFor } from './test-app.js';

const casl = createCaslReact<AppAbility>({ detectSubjectType });
const { AbilityProvider, Can } = casl;

const own: Article = { kind: 'Article', id: '1', authorId: 'u1' };
const others: Article = { kind: 'Article', id: '2', authorId: 'u2' };

const queryKey = ['me', 'abilities'];

/** The app's root: the Client ability from the rules query, in context. */
function Root({
  queryFn,
  onState,
  children,
}: {
  queryFn: () => Promise<RulesPayload>;
  onState?: (state: ClientAbilityState<AppAbility>) => void;
  children?: ReactNode;
}): React.JSX.Element {
  const state = useQueryAbility(casl, { queryKey, queryFn });
  onState?.(state);
  return (
    <AbilityProvider state={state}>
      <p>
        {state.isLoading
          ? 'loading'
          : state.isUnauthenticated
            ? 'signed out'
            : 'ready'}
      </p>
      <Can I="read" a="Article">
        <span>articles</span>
      </Can>
      <Can I="update" this={own}>
        <span>edit own</span>
      </Can>
      <Can I="update" this={others}>
        <span>edit others</span>
      </Can>
      {children}
    </AbilityProvider>
  );
}

function renderWith(queryClient: QueryClient, root: React.JSX.Element): void {
  render(
    <QueryClientProvider client={queryClient}>{root}</QueryClientProvider>,
  );
}

describe('useQueryAbility', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('allows nothing while the query loads, then builds the Client ability from its result', async () => {
    const rules = deferred<RulesResponse<AppAbility>>();
    renderWith(queryClient, <Root queryFn={() => rules.promise} />);

    expect(screen.getByText('loading')).toBeTruthy();
    expect(screen.queryByText('articles')).toBeNull();

    await act(async () => rules.resolve(rulesFor('u1')));

    expect(await screen.findByText('ready')).toBeTruthy();
    expect(screen.getByText('articles')).toBeTruthy();
    expect(screen.getByText('edit own')).toBeTruthy();
    expect(screen.queryByText('edit others')).toBeNull();
  });

  it('allows nothing after a 401, without retrying it', async () => {
    const queryFn = vi.fn(() => Promise.reject(new RulesRequestError(401)));
    renderWith(queryClient, <Root queryFn={queryFn} />);

    expect(await screen.findByText('signed out')).toBeTruthy();
    expect(screen.queryByText('articles')).toBeNull();
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('allows nothing for a malformed body, and settles it as a MalformedRulesError', async () => {
    let state: ClientAbilityState<AppAbility> | undefined;
    renderWith(
      queryClient,
      <Root
        queryFn={async () => ({ rules: 'x' }) as never}
        onState={s => (state = s)}
      />,
    );

    expect(await screen.findByText('ready')).toBeTruthy();
    expect(screen.queryByText('articles')).toBeNull();
    expect(state?.isUnauthenticated).toBe(false);
    expect(state?.error).toBeInstanceOf(MalformedRulesError);
  });

  it('refreshes when the query is invalidated, as after a login', async () => {
    let user = 'u1';
    renderWith(queryClient, <Root queryFn={async () => rulesFor(user)} />);
    expect(await screen.findByText('edit own')).toBeTruthy();

    user = 'u2';
    await act(() => queryClient.invalidateQueries({ queryKey }));

    expect(await screen.findByText('edit others')).toBeTruthy();
    expect(screen.queryByText('edit own')).toBeNull();
  });

  it('refresh() invalidates the query', async () => {
    let user = 'u1';
    let state: ClientAbilityState<AppAbility> | undefined;
    renderWith(
      queryClient,
      <Root queryFn={async () => rulesFor(user)} onState={s => (state = s)} />,
    );
    expect(await screen.findByText('edit own')).toBeTruthy();

    user = 'u2';
    await act(() => state!.refresh());

    expect(await screen.findByText('edit others')).toBeTruthy();
  });

  it('allows nothing once a refetch answers 401, though the query keeps its old data', async () => {
    let signedIn = true;
    renderWith(
      queryClient,
      <Root
        queryFn={async () => {
          if (!signedIn) throw new RulesRequestError(401);
          return rulesFor('u1');
        }}
      />,
    );
    expect(await screen.findByText('articles')).toBeTruthy();

    signedIn = false;
    await act(() => queryClient.invalidateQueries({ queryKey }));

    expect(await screen.findByText('signed out')).toBeTruthy();
    expect(screen.queryByText('articles')).toBeNull();
  });
});
