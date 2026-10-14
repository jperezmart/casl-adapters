import type { InferSubjects, MongoAbility } from '@casl/ability';

/**
 * Article subject as a `kind`-tagged plain object — the discriminated-union
 * pattern. CASL's `InferSubjects` reads the `kind` tag to derive the subject
 * type, and our shared {@link detectSubjectType} reads it at runtime, so we
 * never depend on class names (robust for POJOs from a DB/API, minification,
 * and structural clones across the wire).
 */
export interface Article {
  readonly kind: 'Article';
  id: string;
  title: string;
  authorId: string;
  published: boolean;
  /** Taken down by moderation: seeded only, not settable through the API. */
  archived: boolean;
}

/** Actions used across the app. */
export type Action = 'manage' | 'create' | 'read' | 'update' | 'delete';

/** Subjects the ability can reason about (instances + string tags + `all`). */
export type Subjects = InferSubjects<Article> | 'all';

/**
 * The strongly-typed ability shared by both ends. Because the action and
 * subject unions are pinned here, `ability.can(...)` and `<Can I=... a=...>`
 * are checked at compile time on the frontend, not just on the server.
 */
export type AppAbility = MongoAbility<[Action, Subjects]>;

/**
 * Resolves a subject's type from its `kind` discriminator. Pass it to
 * `CaslModule.forRoot({ detectSubjectType })` on the backend and to
 * `createMongoAbility(rules, { detectSubjectType })` on the frontend so both
 * ends agree. CASL only invokes it for object subjects — strings (`'Article'`)
 * and `all` are handled before it runs.
 */
export const detectSubjectType = (subject: object): Article['kind'] =>
  (subject as Article).kind;
