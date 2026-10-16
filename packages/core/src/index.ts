// Module
export { CaslModule } from './casl.module.js';

// Rules endpoint
export type { CaslRulesEndpointOptions } from './rules.controller.js';

// Authorization check (404/403)
export type { AssertCanOptions } from './assert-can.js';
export { assertCan } from './assert-can.js';

// Guard
export { AccessGuard } from './guards/index.js';

// Factory
export { AbilityFactory } from './factories/index.js';

// Decorators
export {
  AllowWithoutAbility,
  CaslAbility,
  CaslConditions,
  CaslSubject,
  CaslUser,
  createUseAbility,
  UseAbility,
} from './decorators/index.js';

// Interfaces (type-only)
export type {
  AccessConditionsAst,
  AuthorizableRequest,
  AuthorizableUser,
  CaslFeatureOptions,
  CaslModuleAsyncOptions,
  CaslModuleOptions,
  CaslRequestContext,
  ConditionsProxy,
  SubjectBeforeFilterHook,
  UseAbilityMetadata,
} from './interfaces/index.js';

// Core types
export type {
  AnyObject,
  AppAbility,
  DefineRolePermissions,
  RolePermissions,
} from './types.js';

// Constants & enums
export {
  CASL_ABILITY_METADATA,
  CASL_ALLOW_WITHOUT_ABILITY,
  CASL_FEATURE_OPTIONS,
  CASL_REQUEST_CONTEXT,
  CASL_ROOT_OPTIONS,
  DefaultActions,
} from './constants.js';
