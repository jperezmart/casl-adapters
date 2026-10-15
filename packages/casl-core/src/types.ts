import type {
  AbilityBuilder,
  AbilityTuple,
  AnyAbility,
  AnyMongoAbility,
  ForcedSubject,
  Generics,
  Subject,
  SubjectType,
} from '@casl/ability';

/**
 * Minimal contract the library needs from an authenticated user: the names of
 * the roles whose permissions apply.
 *
 * Deliberately loose. `roles` is plain strings, not the app's role union: a
 * user from a shared identity provider carries roles other apps own, and those
 * are simply ignored. There is no identifier either — the library never reads
 * one. Consumers bring their own user shape; whatever their rules read (an
 * `id`, a tenant list…) lives on that shape.
 */
export interface AuthorizableUser {
  roles: readonly string[];
}

/** Plain object shape used for CASL conditions / subject instances. */
export type AnyObject = Record<PropertyKey, unknown>;

/**
 * Default ability type the library operates on when a consumer does not
 * provide its own. CASL's Mongo-flavoured ability is the standard choice.
 */
export type AppAbility = AnyMongoAbility;

/**
 * Built-in CRUD action set. Consumers are free to ignore this and use their own
 * string union — every action parameter in the public API accepts plain strings.
 */
export enum DefaultActions {
  /** CASL wildcard: grants every action. */
  manage = 'manage',
  create = 'create',
  read = 'read',
  update = 'update',
  delete = 'delete',
}

/**
 * A callback that declares the permissions of a single role by mutating the
 * CASL {@link AbilityBuilder}. Receives the authenticated user so rules can be
 * scoped (e.g. `can('update', Article, { authorId: user.id })`).
 */
export type DefineRolePermissions<
  TUser extends AuthorizableUser = AuthorizableUser,
  TAbility extends AnyAbility = AppAbility,
> = (user: TUser, builder: AbilityBuilder<TAbility>) => void;

/**
 * Rejects a role union that contains `everyone`: the key is reserved for the
 * Everyone permissions, so it can never name a Role. A plain `string` (no
 * union declared) is left alone.
 */
type EveryoneIsNotARole<Roles extends string> = string extends Roles
  ? unknown
  : 'everyone' extends Roles
    ? {
        readonly '`everyone` is reserved for the Everyone permissions and cannot be a Role': never;
      }
    : unknown;

/**
 * Map of role → permission definition. A `true` value grants the role full
 * access (`manage` on `all`); `false` grants nothing; a
 * {@link DefineRolePermissions} callback declares fine-grained rules.
 *
 * The `everyone` entry holds the Everyone permissions: rules for every
 * authenticated user, whatever Roles they hold (including none), laid down
 * before any Role's rules so a Role can restrict them with `cannot`. It only
 * takes a callback — `everyone: true` would open everything to everyone — and
 * `everyone` cannot be a Role.
 *
 * `Roles` types the keys only — the user's own `roles` stay plain strings.
 */
export type RolePermissions<
  Roles extends string = string,
  TUser extends AuthorizableUser = AuthorizableUser,
  TAbility extends AnyAbility = AppAbility,
> = Partial<Record<Roles, boolean | DefineRolePermissions<TUser, TAbility>>> & {
  everyone?: DefineRolePermissions<TUser, TAbility>;
} & EveryoneIsNotARole<Roles>;

type AbilitiesOf<T extends AnyAbility> = Generics<T>['abilities'];

/** The action union of an ability (falls back to `string` for loose abilities). */
export type ActionOf<T extends AnyAbility> =
  AbilitiesOf<T> extends AbilityTuple ? AbilitiesOf<T>[0] : string;

/** The subject *type* union (string tags / classes) of an ability. */
export type SubjectTypeOf<T extends AnyAbility> =
  AbilitiesOf<T> extends AbilityTuple
    ? Extract<AbilitiesOf<T>[1], SubjectType>
    : SubjectType;

/** Every subject an ability checks: its types and its instances. */
export type SubjectOf<T extends AnyAbility> =
  AbilitiesOf<T> extends AbilityTuple ? AbilitiesOf<T>[1] : unknown;

/**
 * A subject tagged with its type's name the ways CASL reads it (mirrors CASL's
 * own `TaggedInterface`, which it does not export).
 */
type TaggedAs<TName extends string> =
  | ForcedSubject<TName>
  | { readonly kind: TName }
  | { readonly __typename: TName };

/**
 * What an ability types as an instance of `TSubjectType`: a class's instances,
 * or the subjects tagged with that name (`kind`, `__typename` or CASL's
 * `subject()`). Falls back to any `Subject` when the ability types none, as for
 * string-only subjects, `all` or a loose ability.
 */
export type SubjectInstanceOf<
  TAbility extends AnyAbility,
  TSubjectType extends SubjectType,
> = TSubjectType extends abstract new (...args: never[]) => infer TInstance
  ? TInstance
  : [Extract<SubjectOf<TAbility>, TaggedAs<TSubjectType & string>>] extends [
        never,
      ]
    ? Subject
    : Extract<SubjectOf<TAbility>, TaggedAs<TSubjectType & string>>;
