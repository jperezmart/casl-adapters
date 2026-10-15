import { createFileRoute } from '@tanstack/react-router';

import { casl } from '../../../casl';

// The Rules endpoint, at the path `@jperezmart/casl-react` fetches by default.
export const Route = createFileRoute('/api/me/abilities')({
  server: { handlers: { GET: casl.rulesHandler } },
});
