import { createCaslReact } from '@jperezmart/casl-react';
import type { AppAbility } from '@jperezmart/orpc-abilities';
import { detectSubjectType } from '@jperezmart/orpc-abilities';

// The React bindings of the Client ability. The type and the subject-type
// detection come from the abilities package's client-safe barrel; the Role
// permissions stay on the server (src/server/router.ts), which serves the
// rules on the contract's Rules endpoint procedure.
export const casl = createCaslReact<AppAbility>({ detectSubjectType });
export const { AbilityProvider, Can } = casl;
