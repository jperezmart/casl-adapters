import { createMiddleware } from '@tanstack/react-start';

import { casl, redirectingCasl } from './casl';

// Server functions are referenced from client code, so their middleware is
// too. Start strips `.server(…)` from the client bundle, and with it the
// import of ./casl: the Role permissions and the demo auth stay on the server.

/** Adds the request's Ability to the context; denials answer by default. */
export const caslMiddleware = createMiddleware({ type: 'function' }).server(
  casl.functionMiddlewareServer,
);

/** The same, but no session redirects home and forbidden to /forbidden. */
export const redirectingCaslMiddleware = createMiddleware({
  type: 'function',
}).server(redirectingCasl.functionMiddlewareServer);
