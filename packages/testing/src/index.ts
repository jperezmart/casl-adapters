/**
 * `@jperezmart/nest-casl-testing` is now `@jperezmart/casl-testing`, which
 * works for every framework. This package only re-exports it, marked
 * deprecated so editors point at the new import.
 */
import type { BuildAbilityForTestOptions as Options } from '@jperezmart/casl-testing';
import { buildAbilityForTest as build } from '@jperezmart/casl-testing';

/** @deprecated Import it from `@jperezmart/casl-testing` instead. */
export type BuildAbilityForTestOptions = Options;

/** @deprecated Import it from `@jperezmart/casl-testing` instead. */
export const buildAbilityForTest: typeof build = build;
