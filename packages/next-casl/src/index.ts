export type {
  DenialPageOptions,
  DeniedPageProps,
  ErrorPageProps,
  PageDenial,
} from './denial-page.js';
export { DENIAL_PROP, withDenialPage } from './denial-page.js';
export type {
  ApiRouteWithAbility,
  CaslRequestContext,
  DenialHook,
  GetServerSidePropsWithAbility,
  NextCasl,
  NextCaslOptions,
} from './next-casl.js';
export { createNextCasl, notFound } from './next-casl.js';

// The Rules endpoint's shape, declared by the core for every Adapter.
export type { RulesResponse } from '@jperezmart/casl-core';
