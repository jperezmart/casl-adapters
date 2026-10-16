import type { AppProps } from 'next/app';
import NextError from 'next/error';
import type { ComponentType, ReactNode } from 'react';
import { createElement } from 'react';

/** The page prop that carries a denial to {@link withDenialPage}. */
export const DENIAL_PROP = 'caslDenial';

/** A denial as the page prop {@link DENIAL_PROP} carries it. */
export interface PageDenial {
  /** 401 for an Unauthenticated request, 403 for a forbidden denial. */
  statusCode: 401 | 403;
  /** The core's message for the denial. */
  message: string;
}

/** The props of a page answered with a denial. */
export interface DeniedPageProps {
  [DENIAL_PROP]: PageDenial;
}

/** The props an error page gets: those of Next.js's own `next/error`. */
export interface ErrorPageProps {
  statusCode: number;
  title?: string;
}

/** Options for {@link withDenialPage}. */
export interface DenialPageOptions {
  /**
   * The error page to render for a denied page. Defaults to Next.js's own
   * (`next/error`); pass the app's `pages/_error` component to use its own.
   */
  ErrorPage?: ComponentType<ErrorPageProps> | undefined;
}

/** The title of each denial status, as `next/error` titles its own. */
const TITLES = { 401: 'Unauthorized', 403: 'Forbidden' } as const;

/**
 * Wraps the custom App (`pages/_app`) so a page whose `getServerSideProps`
 * answered a denial renders the error page, inside the App, instead of the
 * page: no page checks the denial prop itself. The App's `getInitialProps`,
 * if it has one, is kept.
 */
export function withDenialPage<TProps extends AppProps>(
  App: ComponentType<TProps>,
  options: DenialPageOptions = {},
): (props: TProps) => ReactNode {
  const ErrorPage = options.ErrorPage ?? NextError;
  const DeniedApp = (props: TProps): ReactNode => {
    const denial = deniedBy(props.pageProps);
    if (!denial) return createElement(App, props);
    const errorProps: ErrorPageProps = {
      statusCode: denial.statusCode,
      title: TITLES[denial.statusCode],
    };
    return createElement(App, {
      ...props,
      Component: ErrorPage,
      pageProps: errorProps,
    });
  };
  DeniedApp.displayName = `withDenialPage(${App.displayName ?? App.name})`;
  // Next.js runs the App's `getInitialProps` before every page, often as an
  // App-level gate (a login redirect): the wrapper must keep it.
  const { getInitialProps } = App as { getInitialProps?: unknown };
  if (getInitialProps !== undefined) {
    Object.assign(DeniedApp, { getInitialProps });
  }
  return DeniedApp;
}

/** The denial a page's props carry, if any. */
function deniedBy(pageProps: unknown): PageDenial | undefined {
  if (typeof pageProps !== 'object' || pageProps === null) return undefined;
  return (pageProps as Partial<DeniedPageProps>)[DENIAL_PROP];
}
