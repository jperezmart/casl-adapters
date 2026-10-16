import type { AnyMongoAbility, RawRuleOf } from '@casl/ability';
import { createMongoAbility } from '@casl/ability';
import type { PackRule } from '@casl/ability/extra';
import { unpackRules } from '@casl/ability/extra';
import type { CanProps } from '@casl/react';
import {
  AbilityProvider as CaslAbilityProvider,
  Can as CaslCan,
} from '@casl/react';
import type { ActionOf, SubjectOf } from '@jperezmart/casl-core';
import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

/**
 * What a Rules endpoint answers, as the browser receives it: `{ rules }`, the
 * packed rules of the user's Ability (`RulesResponse` of
 * `@jperezmart/casl-core`). Loosely typed, since the rules come off the wire.
 */
export interface RulesPayload {
  rules: readonly unknown[];
}

/** Fetches the current user's rules from a Rules endpoint. */
export type FetchRules = () => Promise<RulesPayload>;

/** The Client ability and where its rules stand. */
export interface ClientAbilityState<TAbility> {
  /**
   * The Client ability: it allows nothing while the rules load, after a 401
   * or after any other failure, and only decides what the UI shows.
   */
  ability: TAbility;
  /** No answer from the Rules endpoint yet. */
  isLoading: boolean;
  /** The Rules endpoint answered 401: there is no session. */
  isUnauthenticated: boolean;
  /** Why the rules could not be fetched (a 401 included), if they could not. */
  error: unknown;
  /** Fetches the rules again, as after a login or a logout. */
  refresh(): Promise<void>;
}

/** Props of {@link CaslReact.AbilityProvider}. */
export type AbilityProviderProps<TAbility> = {
  children?: ReactNode;
} & (
  | {
      /** Fetches the rules; by default {@link fetchRulesFrom} the default path. */
      fetchRules?: FetchRules | undefined;
      state?: never;
    }
  | {
      /** A Client ability built elsewhere, as by `useQueryAbility`. */
      state: ClientAbilityState<TAbility>;
      fetchRules?: never;
    }
);

/** Options for {@link createCaslReact}, from the app's shared module. */
export interface CaslReactOptions {
  /** How the Client ability resolves a subject's type, as on the server. */
  detectSubjectType?: ((subject: object) => string) | undefined;
}

/** The React bindings of one app's Ability type, from {@link createCaslReact}. */
export interface CaslReact<TAbility extends AnyMongoAbility> {
  /**
   * Builds the Client ability and puts it in context for `Can` and the
   * hooks: it fetches the rules with `fetchRules` (by default from
   * {@link DEFAULT_RULES_PATH}), or takes a `state` built elsewhere.
   */
  AbilityProvider(props: AbilityProviderProps<TAbility>): ReactNode;

  /** CASL's `Can`, typed by the app's Ability. */
  Can(props: CanProps<TAbility>): ReactNode;

  /** The Client ability. */
  useAbility(): TAbility;

  /** Whether the Client ability allows `action` on `subject` (and `field`). */
  useCan(
    action: ActionOf<TAbility>,
    subject: SubjectOf<TAbility>,
    field?: string,
  ): boolean;

  /** The Client ability and where its rules stand. */
  useAbilityState(): ClientAbilityState<TAbility>;

  /**
   * Builds a Client ability from a Rules endpoint's answer, or one that
   * allows nothing without it or for a malformed one.
   */
  createAbility(payload?: RulesPayload): TAbility;
}

/** Where the default `fetchRules` fetches the rules. */
export const DEFAULT_RULES_PATH = '/api/me/abilities';

/**
 * Creates the React bindings of an app's Ability type, with the subject-type
 * detection of its shared module (one with no server code, so the Role
 * permissions never reach the client bundle).
 */
export function createCaslReact<TAbility extends AnyMongoAbility>(
  options: CaslReactOptions = {},
): CaslReact<TAbility> {
  const StateContext = createContext<ClientAbilityState<TAbility> | null>(null);

  function abilityOf(rules: readonly unknown[]): TAbility {
    return createMongoAbility<TAbility>(
      rules as never,
      (options.detectSubjectType
        ? { detectSubjectType: options.detectSubjectType }
        : {}) as never,
    );
  }

  /** {@link createAbility}, throwing a MalformedRulesError for a bad payload. */
  function parseAbility(payload?: RulesPayload): TAbility {
    if (payload === undefined) return abilityOf([]);
    // What a Rules endpoint answers is not checked by its type.
    const body: unknown = payload;
    const rules: unknown =
      typeof body === 'object' && body !== null
        ? (body as { rules?: unknown }).rules
        : undefined;
    if (!Array.isArray(rules)) throw new MalformedRulesError();
    try {
      return abilityOf(
        unpackRules(rules as PackRule<RawRuleOf<TAbility>>[]) as unknown[],
      );
    } catch (cause) {
      throw new MalformedRulesError({ cause });
    }
  }

  function createAbility(payload?: RulesPayload): TAbility {
    try {
      return parseAbility(payload);
    } catch {
      return abilityOf([]);
    }
  }

  function StateProvider({
    state,
    children,
  }: {
    state: ClientAbilityState<TAbility>;
    children?: ReactNode;
  }): ReactNode {
    return (
      <StateContext.Provider value={state}>
        <CaslAbilityProvider value={state.ability}>
          {children}
        </CaslAbilityProvider>
      </StateContext.Provider>
    );
  }

  function FetchingProvider({
    fetchRules,
    children,
  }: {
    fetchRules: FetchRules;
    children?: ReactNode;
  }): ReactNode {
    const state = useFetchedRules(fetchRules, parseAbility);
    return <StateProvider state={state}>{children}</StateProvider>;
  }

  function AbilityProvider(props: AbilityProviderProps<TAbility>): ReactNode {
    if (props.state)
      return (
        <StateProvider state={props.state}>{props.children}</StateProvider>
      );
    return (
      <FetchingProvider fetchRules={props.fetchRules ?? defaultFetchRules}>
        {props.children}
      </FetchingProvider>
    );
  }

  function useAbilityState(): ClientAbilityState<TAbility> {
    const state = useContext(StateContext);
    if (!state)
      throw new Error('useAbilityState needs an AbilityProvider above it.');
    return state;
  }

  function useAbility(): TAbility {
    return useAbilityState().ability;
  }

  function useCan(
    action: ActionOf<TAbility>,
    subject: SubjectOf<TAbility>,
    field?: string,
  ): boolean {
    return useAbility().can(action, subject as never, field);
  }

  return {
    AbilityProvider,
    // The same component, its props narrowed to the app's Ability.
    Can: CaslCan as unknown as (props: CanProps<TAbility>) => ReactNode,
    useAbility,
    useCan,
    useAbilityState,
    createAbility,
  };
}

/** The rules fetched with `fetchRules`, settled into a Client ability. */
function useFetchedRules<TAbility>(
  fetchRules: FetchRules,
  parseAbility: (payload?: RulesPayload) => TAbility,
): ClientAbilityState<TAbility> {
  // Allows nothing while the rules load, and after any failure.
  const [none] = useState(() => parseAbility());
  const [answer, setAnswer] = useState<
    | { settled: false; ability?: undefined }
    | { settled: true; ability: TAbility; error?: undefined }
    | { settled: true; ability?: undefined; error: unknown }
  >({ settled: false });

  // The latest `fetchRules`, so an inline function does not refetch on render.
  const fetchRef = useRef(fetchRules);
  useEffect(() => {
    fetchRef.current = fetchRules;
  });
  // Only the latest fetch settles the rules.
  const latest = useRef(0);

  const refresh = useCallback(async (): Promise<void> => {
    const call = ++latest.current;
    try {
      // A malformed body throws here, so it settles as an error.
      const ability = parseAbility(await fetchRef.current());
      if (call === latest.current) setAnswer({ settled: true, ability });
    } catch (error) {
      if (call === latest.current) setAnswer({ settled: true, error });
    }
  }, [parseAbility]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const ability = answer.ability ?? none;

  return useMemo(
    () => ({
      ability,
      isLoading: !answer.settled,
      isUnauthenticated: answer.settled && isUnauthenticated(answer.error),
      error: answer.settled ? answer.error : undefined,
      refresh,
    }),
    [ability, answer, refresh],
  );
}

/** Whether a failed fetch of the rules was a 401: a `status` of 401. */
export function isUnauthenticated(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { status?: unknown }).status === 401
  );
}

/**
 * A Rules endpoint's answer that is not `{ rules }` with packed rules, such as
 * an HTML page or a proxy's error served with a 200: the Client ability then
 * allows nothing, as after any other failure.
 */
export class MalformedRulesError extends Error {
  constructor(options?: { cause?: unknown }) {
    super('The Rules endpoint answered no packed rules.', options);
    this.name = 'MalformedRulesError';
  }
}

/** A Rules endpoint that answered something other than 2xx. */
export class RulesRequestError extends Error {
  constructor(
    /** The HTTP status the Rules endpoint answered. */
    readonly status: number,
  ) {
    super(`The Rules endpoint answered ${status}.`);
    this.name = 'RulesRequestError';
  }
}

/**
 * A `fetchRules` that fetches `path` with the browser's credentials (its
 * cookies) included; a non-2xx answer rejects with a {@link RulesRequestError}.
 */
export function fetchRulesFrom(path: string = DEFAULT_RULES_PATH): FetchRules {
  return async () => {
    const response = await fetch(path, {
      credentials: 'include',
      headers: { accept: 'application/json' },
    });
    if (!response.ok) throw new RulesRequestError(response.status);
    return (await response.json()) as RulesPayload;
  };
}

const defaultFetchRules = fetchRulesFrom();
