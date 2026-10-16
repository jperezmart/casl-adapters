// The client-safe root: what an error component and the app's `src/start.ts`
// import. The Adapter itself lives in `./server`, because it reaches Start's
// server-only module.
export type { DenialErrorKind, SerializedDenialError } from './denial-error.js';
export {
  DenialError,
  denialErrorAdapter,
  isDenialError,
} from './denial-error.js';
export type {
  CaslContext,
  CaslFunctionMiddlewareServer,
  CaslRouteMiddleware,
  ServerRouteHandler,
  StartCasl,
  StartCaslOptions,
} from './tanstack-start-casl.js';

// The Rules endpoint's shape, declared by the core for every Adapter.
export type { RulesResponse } from '@jperezmart/casl-core';
