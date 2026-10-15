import { denialErrorAdapter } from '@jperezmart/tanstack-start-casl';
import { createCsrfMiddleware, createStart } from '@tanstack/react-start';

export const startInstance = createStart(() => ({
  // Server functions are same-origin RPC endpoints: refuse cross-site calls.
  requestMiddleware: [
    createCsrfMiddleware({ filter: ctx => ctx.handlerType === 'serverFn' }),
  ],
  // The DenialError a server function throws reaches the browser as itself,
  // so error components recognise it with `isDenialError`.
  serializationAdapters: [denialErrorAdapter],
}));
