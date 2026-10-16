export type {
  CaslContext,
  CaslEnv,
  DenialBody,
  DenialHook,
  HonoCasl,
  HonoCaslOptions,
} from './hono-casl.js';
export { createHonoCasl, notFound } from './hono-casl.js';

// The Rules endpoint's shape, declared by the core for every Adapter.
export type { RulesResponse } from '@jperezmart/casl-core';
