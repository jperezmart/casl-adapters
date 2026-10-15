// Client-safe barrel — depends only on @casl/ability, so the frontend can import
// the shared types and subject-type detection without pulling in nest-casl or
// the Role permissions. The permission definitions and demo auth live in the
// `./server` entry instead.

export type { Role } from './roles.js';
export type { Action, AppAbility, Article, Subjects } from './subjects.js';
export { detectSubjectType } from './subjects.js';
