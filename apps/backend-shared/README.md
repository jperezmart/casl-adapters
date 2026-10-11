# backend-shared

The same NestJS REST app as [`backend-simple`](../backend-simple), but the
roles, the `Article` subject, the `AppUser` shape, the demo auth **and the
permission definitions** all come from the shared
[`@jperezmart/example-shared`](../../packages/example-shared) package instead of
being defined locally.

The CASL wiring is byte-for-byte the same as backend-simple:

```ts
CaslModule.forFeature({ permissions: articlesPermissions });
```

The only difference is the import:

```ts
// backend-simple — defined inline in the feature module
import { articlesPermissions } from './articles/articles.permissions.js';

// backend-shared — imported from a package the frontend's types come from too
import { articlesPermissions } from '@jperezmart/example-shared/server';
```

That's the design point: `permissions` is just an object you pass in, so sharing
it costs nothing at the API level.

## Run

```bash
pnpm build                            # build the package graph first
pnpm --filter backend-shared start    # http://localhost:3000
pnpm --filter backend-shared test     # e2e: every route, per user
pnpm --filter frontend dev            # http://localhost:5173
```

Runs on the same port (`3000`) as backend-simple — start one or the other, then
point the frontend at it. Both expose identical routes.
