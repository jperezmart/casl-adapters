// CASL authorization for the example. Depends only on @jperezmart/orpc-domain
// (types) and @casl/ability — never on the contract or on nest-casl. This
// barrel is client-safe: the frontend imports the Ability type and the
// subject-type detection for `@jperezmart/casl-react`. The Role permissions
// live in the `./server` entry, so they never reach the client bundle.

export type { Action, AppAbility, Subjects } from './subjects.js';
export { detectSubjectType } from './subjects.js';
