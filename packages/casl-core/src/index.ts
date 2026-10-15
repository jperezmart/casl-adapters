// Ability construction
export type {
  AbilityFactory,
  AbilityFactoryOptions,
} from './ability-factory.js';
export { createAbilityFactory } from './ability-factory.js';

// Adapter building
export type { AdapterKit, AdapterOptions, CaslContext } from './adapter-kit.js';
export { createAdapterKit } from './adapter-kit.js';

// Access conditions
export type {
  AccessConditions,
  AccessConditionsAst,
} from './access-conditions.js';
export { accessConditions, NoRecordAllowedError } from './access-conditions.js';

// Denial rule
export type {
  Allowed,
  DecideOptions,
  Decision,
  Denial,
  DenialKind,
} from './decide.js';
export {
  decide,
  forbiddenDenialOf,
  notFoundDenial,
  unauthenticatedDenial,
} from './decide.js';

// Rules endpoint
export type { RulesResponse } from './rules-response.js';
export { rulesResponse } from './rules-response.js';

// Role permissions and ability types
export type {
  ActionOf,
  AnyObject,
  AppAbility,
  AuthorizableUser,
  DefineRolePermissions,
  RolePermissions,
  SubjectInstanceOf,
  SubjectOf,
  SubjectTypeOf,
} from './types.js';
export { DefaultActions } from './types.js';
