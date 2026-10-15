# Each app builds its own Ability, in its own server

An app's Ability is built by that app's own server (a NestJS backend, or the server of a Next.js or TanStack Start frontend), from its own Role permissions and the Authorizable user of its own session; the browser gets a Client ability from the rules that server serves on its Rules endpoint — the same endpoint in every framework, never page props such as Next.js's `getServerSideProps`, so the browser side is one package whatever the server. This covers the frontend whose real backend knows nothing of CASL — it often acts only as a backend-for-frontend holding the session — without deploying a NestJS service in between just to serve the user's rules.

## Considered Options

- **A central service that builds the Ability for every app.** Rejected: Role permissions are code (functions over the user), not data, so that service would have to ship every app's rules and be redeployed whenever any of them changed.
- **Building the Ability in the browser from the token's Roles.** Rejected as the general answer: a frontend that keeps its session in an httpOnly cookie never hands the browser the token.

## Consequences

When the real backend enforces its own authorization, the frontend's Role permissions mirror it for the UI and can drift from it; the cost of drifting is a button that ends in that backend's 403, not a hole. Whether a frontend's server only mirrors or owns the data is the app's choice: the library serves both.
