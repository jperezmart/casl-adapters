/**
 * Reflect-metadata keys and DI tokens used internally by the module.
 * Exported so advanced consumers / the testing package can reach them.
 */

/** Metadata key under which {@link UseAbilityMetadata} is stored on handlers. */
export const CASL_ABILITY_METADATA = 'casl:ability-metadata' as const;

/** DI token holding the global {@link CaslModuleOptions} from `forRoot`. */
export const CASL_ROOT_OPTIONS = Symbol('CASL_ROOT_OPTIONS');

/** DI token holding the per-feature {@link CaslFeatureOptions} from `forFeature`. */
export const CASL_FEATURE_OPTIONS = Symbol('CASL_FEATURE_OPTIONS');

/**
 * Property key under which {@link CaslRequestContext} is cached on the request
 * object. Caching per request guarantees a subject is loaded from the DB at
 * most once even if several decorators read it.
 */
export const CASL_REQUEST_CONTEXT = Symbol('CASL_REQUEST_CONTEXT');

// The built-in CRUD action set, declared by @jperezmart/casl-core.
export { DefaultActions } from '@jperezmart/casl-core';
