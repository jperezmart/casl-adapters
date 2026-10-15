import { casl } from '../../../lib/casl';

/**
 * The Rules endpoint, ready-made: `GET /api/me/abilities` answers `{ rules }`
 * for the user `getUser` finds, and 401 without one. It is the path
 * `@jperezmart/casl-react` fetches by default, so the browser needs no
 * configuration.
 */
export default casl.rulesEndpoint;
