import type { RulesResponse } from '@jperezmart/casl-core';
import { act, render, screen } from '@testing-library/react';

import type { ClientAbilityState } from './index.js';
import { createCaslReact, RulesRequestError } from './index.js';
import type { AppAbility, Article } from './test-app.js';
import { deferred, detectSubjectType, rulesFor } from './test-app.js';

const { AbilityProvider, Can, useAbility, useAbilityState, useCan } =
  createCaslReact<AppAbility>({ detectSubjectType });

const own: Article = { kind: 'Article', id: '1', authorId: 'u1' };
const others: Article = { kind: 'Article', id: '2', authorId: 'u2' };

/** Renders what the Client ability allows, and keeps its state for the test. */
function Probe({
  onState,
}: {
  onState?: (state: ClientAbilityState<AppAbility>) => void;
}): React.JSX.Element {
  const state = useAbilityState();
  onState?.(state);
  return (
    <>
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
    </>
  );
}

describe('AbilityProvider', () => {
  it('allows nothing while the rules load', async () => {
    const rules = deferred<RulesResponse<AppAbility>>();
    render(
      <AbilityProvider fetchRules={() => rules.promise}>
        <Probe />
      </AbilityProvider>,
    );

    expect(screen.getByText('loading')).toBeTruthy();
    expect(screen.queryByText('articles')).toBeNull();

    await act(async () => rules.resolve(rulesFor('u1')));

    expect(screen.getByText('ready')).toBeTruthy();
    expect(screen.getByText('articles')).toBeTruthy();
  });

  it("detects an instance's subject type as the app's shared module does", async () => {
    render(
      <AbilityProvider fetchRules={async () => rulesFor('u1')}>
        <Probe />
      </AbilityProvider>,
    );

    expect(await screen.findByText('edit own')).toBeTruthy();
    expect(screen.queryByText('edit others')).toBeNull();
  });

  it('allows nothing after a 401, and says there is no session', async () => {
    render(
      <AbilityProvider
        fetchRules={() => Promise.reject(new RulesRequestError(401))}
      >
        <Probe />
      </AbilityProvider>,
    );

    expect(await screen.findByText('signed out')).toBeTruthy();
    expect(screen.queryByText('articles')).toBeNull();
  });

  it('allows nothing when the rules cannot be fetched', async () => {
    let state: ClientAbilityState<AppAbility> | undefined;
    render(
      <AbilityProvider
        fetchRules={() => Promise.reject(new RulesRequestError(500))}
      >
        <Probe onState={s => (state = s)} />
      </AbilityProvider>,
    );

    expect(await screen.findByText('ready')).toBeTruthy();
    expect(state?.error).toEqual(new RulesRequestError(500));
    expect(screen.queryByText('articles')).toBeNull();
  });

  it('refetches the rules on refresh(), as after a login', async () => {
    let user = 'u1';
    let state: ClientAbilityState<AppAbility> | undefined;
    render(
      <AbilityProvider fetchRules={async () => rulesFor(user)}>
        <Probe onState={s => (state = s)} />
      </AbilityProvider>,
    );
    expect(await screen.findByText('edit own')).toBeTruthy();

    user = 'u2';
    await act(() => state!.refresh());

    expect(screen.getByText('edit others')).toBeTruthy();
    expect(screen.queryByText('edit own')).toBeNull();
  });

  it('allows nothing once a refresh answers 401, as after a logout', async () => {
    let signedIn = true;
    let state: ClientAbilityState<AppAbility> | undefined;
    render(
      <AbilityProvider
        fetchRules={async () => {
          if (!signedIn) throw new RulesRequestError(401);
          return rulesFor('u1');
        }}
      >
        <Probe onState={s => (state = s)} />
      </AbilityProvider>,
    );
    expect(await screen.findByText('articles')).toBeTruthy();

    signedIn = false;
    await act(() => state!.refresh());

    expect(screen.getByText('signed out')).toBeTruthy();
    expect(screen.queryByText('articles')).toBeNull();
  });

  describe('by default', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('fetches /api/me/abilities with the credentials included', async () => {
      const fetch = vi.fn(async () => Response.json(rulesFor('u1')));
      vi.stubGlobal('fetch', fetch);

      render(
        <AbilityProvider>
          <Probe />
        </AbilityProvider>,
      );

      expect(await screen.findByText('articles')).toBeTruthy();
      expect(fetch).toHaveBeenCalledWith(
        '/api/me/abilities',
        expect.objectContaining({ credentials: 'include' }),
      );
    });

    it('takes a 401 answer for no session', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response(null, { status: 401 })),
      );

      render(
        <AbilityProvider>
          <Probe />
        </AbilityProvider>,
      );

      expect(await screen.findByText('signed out')).toBeTruthy();
      expect(screen.queryByText('articles')).toBeNull();
    });
  });
});

describe('hooks', () => {
  function Hooks(): React.JSX.Element {
    const ability = useAbility();
    const canEditOwn = useCan('update', own);
    return (
      <p>
        {`rules: ${ability.rules.length}, `}
        {canEditOwn ? 'may edit own' : 'may not edit own'}
      </p>
    );
  }

  it('useAbility and useCan read the Client ability', async () => {
    const rules = deferred<RulesResponse<AppAbility>>();
    render(
      <AbilityProvider fetchRules={() => rules.promise}>
        <Hooks />
      </AbilityProvider>,
    );
    expect(screen.getByText('rules: 0, may not edit own')).toBeTruthy();

    await act(async () => rules.resolve(rulesFor('u1')));

    expect(screen.getByText('rules: 2, may edit own')).toBeTruthy();
  });
});
