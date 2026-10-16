// The Adapter: server code only, since it reaches Start's server-only module.
// Import it from modules the client bundle never loads, or only inside
// `.server(…)` steps, which Start strips from the client.
export * from './index.js';
export { createStartCasl } from './tanstack-start-casl.js';
