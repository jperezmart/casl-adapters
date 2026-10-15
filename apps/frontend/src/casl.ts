import { createCaslReact } from '@jperezmart/casl-react';
import type { AppAbility } from '@jperezmart/example-shared';
import { detectSubjectType } from '@jperezmart/example-shared';

// The React bindings of the app's Ability. The type and the subject-type
// detection come from the shared package's client-safe barrel: the Role
// permissions stay on the server, which serves the rules on its Rules endpoint.
export const { AbilityProvider, Can, useAbilityState } =
  createCaslReact<AppAbility>({ detectSubjectType });
