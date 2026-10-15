import { createCaslReact } from '@jperezmart/casl-react';
import type { AppAbility } from '@jperezmart/orpc-abilities';
import { detectSubjectType } from '@jperezmart/orpc-abilities';

// The React bindings of the app's Ability. The type and the subject-type
// detection come from the abilities package's client-safe barrel: the Role
// permissions stay on the server, which serves the rules on its Rules endpoint.
export const casl = createCaslReact<AppAbility>({ detectSubjectType });
export const { AbilityProvider, Can } = casl;
