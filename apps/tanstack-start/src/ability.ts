import { createCaslReact } from '@jperezmart/casl-react';
import type { AppAbility } from '@jperezmart/example-shared';
import { detectSubjectType } from '@jperezmart/example-shared';

// The React bindings of the Client ability. The type and the subject-type
// detection come from the shared package's client-safe barrel; the Role
// permissions stay on the server (src/casl.ts), which serves the rules on its
// Rules endpoint (src/routes/api/me/abilities.ts).
export const { AbilityProvider, Can, useAbilityState } =
  createCaslReact<AppAbility>({ detectSubjectType });
