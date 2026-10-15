import type { ClientAbilityState } from './index.js';
import { createCaslReact } from './index.js';
import type { AppAbility, Article } from './test-app.js';
import { detectSubjectType } from './test-app.js';

const { AbilityProvider, Can, useAbility, useAbilityState, useCan } =
  createCaslReact<AppAbility>({ detectSubjectType });

const article: Article = { kind: 'Article', id: '1', authorId: 'u1' };

describe('Can types', () => {
  it("checks the action and subject against the app's Ability", () => {
    <Can I="read" a="Article">
      ok
    </Can>;
    <Can I="update" this={article} passThrough>
      {({ isAllowed }) => (isAllowed ? 'edit' : 'locked')}
    </Can>;
    // @ts-expect-error — 'frobnicate' is not an Action
    <Can I="frobnicate" a="Article">
      no
    </Can>;
    // @ts-expect-error — 'Comment' is not a subject type
    <Can I="read" a="Comment">
      no
    </Can>;
  });

  it('hands the render function the typed Client ability', () => {
    <Can I="read" a="Article">
      {({ ability }) => {
        expectTypeOf(ability).toEqualTypeOf<AppAbility>();
        return null;
      }}
    </Can>;
  });
});

describe('hook types', () => {
  it("useAbility and useAbilityState return the app's Ability", () => {
    expectTypeOf(useAbility).returns.toEqualTypeOf<AppAbility>();
    expectTypeOf(useAbilityState).returns.toEqualTypeOf<
      ClientAbilityState<AppAbility>
    >();
  });

  it("useCan checks the action and subject against the app's Ability", () => {
    expectTypeOf(useCan('update', article)).toEqualTypeOf<boolean>();
    useCan('read', 'Article');
    // @ts-expect-error — 'frobnicate' is not an Action
    useCan('frobnicate', 'Article');
    // @ts-expect-error — 'Comment' is not a subject
    useCan('read', 'Comment');
  });
});

describe('AbilityProvider types', () => {
  it('takes a fetchRules, a state, or neither, but not both', () => {
    const state = {} as ClientAbilityState<AppAbility>;
    <AbilityProvider>app</AbilityProvider>;
    <AbilityProvider fetchRules={async () => ({ rules: [] })}>
      app
    </AbilityProvider>;
    <AbilityProvider state={state}>app</AbilityProvider>;
    // @ts-expect-error — one source of rules, not two
    <AbilityProvider state={state} fetchRules={async () => ({ rules: [] })}>
      app
    </AbilityProvider>;
  });

  it("takes only a state of the app's Ability", () => {
    const loose = {} as ClientAbilityState<string>;
    // @ts-expect-error — not a Client ability of AppAbility
    <AbilityProvider state={loose}>app</AbilityProvider>;
  });
});
