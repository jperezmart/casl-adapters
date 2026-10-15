export type {
  CaslContext,
  CaslMiddleware,
  ImplementedContract,
  OrpcCasl,
  OrpcCaslOptions,
  RulesContract,
  RulesProcedure,
} from './orpc-casl.js';
export { createOrpcCasl } from './orpc-casl.js';

// The Rules endpoint's shape, declared by the core for every Adapter.
export type { RulesResponse } from '@jperezmart/casl-core';
