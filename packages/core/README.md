# @jperezmart/nest-casl

[![npm version](https://img.shields.io/npm/v/@jperezmart/nest-casl.svg)](https://www.npmjs.com/package/@jperezmart/nest-casl)
[![license](https://img.shields.io/npm/l/@jperezmart/nest-casl.svg)](./LICENSE)

Modern [CASL](https://casl.js.org) authorization for [NestJS](https://nestjs.com). REST-focused, strictly typed, dual ESM/CJS, built for CASL v7 and NestJS 11/12.

## Install

```bash
pnpm add @jperezmart/nest-casl @jperezmart/casl-core @casl/ability
```

Peer dependencies: `@jperezmart/casl-core`, `@nestjs/common` and `@nestjs/core` (`^11 || ^12`), `@casl/ability@^7`, `reflect-metadata`, `rxjs`.

This package is the NestJS Adapter of [`@jperezmart/casl-core`](https://github.com/jperezmart/casl-adapters/tree/main/packages/casl-core), which holds the Role permissions, the Ability construction, the Denial rule and the Access conditions. The core decides; this package turns its answers into NestJS exceptions (`UnauthorizedException`, `ForbiddenException`, `NotFoundException`). The core is a peer dependency so that an app using several Adapters has exactly one copy of it.

## API surface

```ts
import {
  CaslModule,
  AccessGuard,
  assertCan,
  AbilityFactory,
  UseAbility,
  AllowWithoutAbility,
  CaslUser,
  CaslAbility,
  CaslConditions,
  CaslSubject,
  DefaultActions,
} from '@jperezmart/nest-casl';
import type {
  AccessConditionsAst,
  AuthorizableUser,
  AuthorizableRequest,
  CaslRequestContext,
  ConditionsProxy,
  SubjectBeforeFilterHook,
  CaslModuleOptions,
  CaslRulesEndpointOptions,
  CaslFeatureOptions,
  AssertCanOptions,
  RolePermissions,
  DefineRolePermissions,
  AppAbility,
} from '@jperezmart/nest-casl';
```

### Usage

```ts
// app.module.ts
type Role = 'admin' | 'author' | 'user';

@Module({
  imports: [
    CaslModule.forRoot<Role>({
      superuserRole: 'admin', // checked against `Role`
      getUserFromRequest: req => req.user,
    }),
  ],
})
export class AppModule {}
```

```ts
// articles.permissions.ts
// Your own user shape. nest-casl only needs `roles`, as plain strings: the
// user may hold roles other apps own (a shared identity provider), and those
// are ignored. There is no required `id` — declare whatever your rules read.
interface AppUser {
  id: string;
  roles: string[];
}

export const articlesPermissions: RolePermissions<Role, AppUser> = {
  // Everyone permissions: every authenticated user, whatever Roles they hold
  // (including none). Laid down before the Roles, so a Role can `cannot` them.
  everyone: (_user, { can }) => {
    can('read', 'Article', { published: true });
  },
  author: (user, { can }) => {
    can('read', 'Article');
    can('update', 'Article', { authorId: user.id });
  },
};
```

```ts
// articles.module.ts — user and ability are inferred
@Module({
  imports: [CaslModule.forFeature({ permissions: articlesPermissions })],
})
export class ArticlesModule {}
```

```ts
// articles.controller.ts
@UseGuards(AccessGuard)
@Controller('articles')
export class ArticlesController {
  @UseAbility(DefaultActions.update, 'Article', ArticleHook)
  @Patch(':id')
  update(@CaslSubject() article: Article, @CaslUser() user: AppUser) {}
}
```

### Routes without `@UseAbility`: denied by default

`AccessGuard` answers 403 to a route that has no `@UseAbility`, on the handler
or its controller, whether you apply it per controller (`@UseGuards`) or as a
global `APP_GUARD`. A forgotten decorator therefore fails closed. To open a
route on purpose (a health check, a public list), mark the handler or the whole
controller `@AllowWithoutAbility()`:

```ts
@UseGuards(AccessGuard)
@Controller('articles')
export class ArticlesController {
  @Get('count')
  @AllowWithoutAbility() // open on purpose: no Ability is built or checked
  count() {}

  @Get('drafts')
  drafts() {} // no @UseAbility: 403
}
```

A `@UseAbility` on the handler wins over an `@AllowWithoutAbility()` on its
controller, and an `@AllowWithoutAbility()` on the handler wins over a
`@UseAbility` on its controller. There is no option to allow unmarked routes
again. The Rules endpoint of `CaslModule.forRulesEndpoint` carries the opt-out
itself, so it answers its own 401 under a global guard.

Typing the map is what catches a misspelt role: `RolePermissions<Role, AppUser>`
rejects any key outside `Role`.

`everyone` is not a Role: it takes a function only (`everyone: true` would open
everything to every user, so it does not compile), no Role may be named
`everyone`, and a user whose identity provider hands them a role called
`everyone` gets the Everyone permissions once, like anyone else. Each feature
may declare its own `everyone`; they all apply. The `superuserRole` still skips
every rule, `everyone` included. An unauthenticated request never gets them: it
is a 401 before any rule runs.

### Loading more about the user

When a rule reads something your auth layer does not put on the request (say,
the user's tenants, kept in the database), make `getUserFromRequest` async and
reach your services through `forRootAsync`:

```ts
CaslModule.forRootAsync({
  imports: [UsersModule],
  inject: [UsersService],
  useFactory: (users: UsersService) => ({
    getUserFromRequest: async (req: AuthorizableRequest<AppUser>) =>
      req.user && { ...req.user, tenants: await users.tenantsOf(req.user.id) },
  }),
});
```

The guard awaits it on every route with `@UseAbility`, before the subject hook
and before building the ability, and `@CaslUser()` hands the handler the user
it resolved. Resolving to `undefined` is a 401; an `HttpException` it throws
reaches the client unchanged (anything else is Nest's 500).

### Subject hooks

The third argument of `@UseAbility` is a subject hook: an injectable provider
class that loads the concrete subject, so conditional rules like
`{ authorId: user.id }` are checked against the real record. The guard resolves
it from the module, so register it in `providers`.

```ts
// article.hook.ts
@Injectable()
export class ArticleHook implements SubjectBeforeFilterHook<Article> {
  constructor(private readonly articles: ArticlesService) {}

  run(req: AuthorizableRequest) {
    const id = req.params?.['id'];
    return id ? this.articles.find(id) : undefined;
  }
}
```

The hook is always a class; there is no `[Hook, args]` form. For a hook that
takes arguments, write a class factory and build each variant once:

```ts
// article.hook.ts
export function ArticleHookBy(
  param: string,
): Type<SubjectBeforeFilterHook<Article>> {
  @Injectable()
  class ArticleByParamHook implements SubjectBeforeFilterHook<Article> {
    constructor(private readonly articles: ArticlesService) {}

    run(req: AuthorizableRequest) {
      const id = req.params?.[param];
      return id ? this.articles.find(id) : undefined;
    }
  }
  return ArticleByParamHook;
}

export const ArticleBySlugHook = ArticleHookBy('slug');

// articles.module.ts — providers: [ArticlesService, ArticleBySlugHook]
// articles.controller.ts
@UseAbility(DefaultActions.read, 'Article', ArticleBySlugHook)
@Get('by-slug/:slug')
read(@CaslSubject() article: Article) {}
```

Each call to the factory makes a new class, so call it once, register the
result, and pass that same constant to `@UseAbility`. A class built inline in
the decorator is not a registered provider and the guard cannot resolve it.

### Denials: 404 or 403

The guard does not answer every denial with 403. A 403 for one record confirms
it exists, so a denied check against an instance the user cannot even read is a
404 instead. The first row that matches decides:

| Request                                                    | Response |
| ---------------------------------------------------------- | -------- |
| no authenticated user                                      | 401      |
| denied against the subject type (with or without a hook)   | 403      |
| the subject hook loads nothing                             | 404      |
| denied against an instance the user **cannot** read either | 404      |
| denied against an instance the user **can** read           | 403      |

With a hook, the guard checks the subject type first and does not run the hook
when that check fails: a user whose rules allow the action on no record at all
gets the same 403 for every id, existing or not, so it reveals nothing. The
subject type in `@UseAbility` must therefore name the type the way your rules
name it, which is what `detectSubjectType` reports for what the hook loads.
`'Article'` and the class `Article` are different types to CASL: with rules
written for `'Article'`, declare `'Article'` even when the hook returns class
instances. A mismatch denies everyone but the superuser.

The 404 carries Nest's default body, identical to a genuine not-found, so
someone probing IDs learns nothing; an author who can read an article still
gets an honest 403 when they may not edit it. The check against the subject
type only ever denies: a hook that loads nothing is never allowed through on
it, as that would let a conditional rule through without its conditions. The reasons are in
[ADR 0004](https://github.com/jperezmart/casl-adapters/blob/main/docs/adr/0004-hide-what-the-user-cannot-read.md).

"Can read" means the `'read'` action. If your app names it differently, set it
once in `forRoot`:

```ts
CaslModule.forRoot<Role>({ readAction: 'view' });
```

The guard makes this decision with [`assertCan`](#assertcan-the-guards-answer-anywhere),
so the guard and your own checks cannot disagree. Both decide with `decide`
from `@jperezmart/casl-core`, which every Adapter shares.

### Filtering lists: `@CaslConditions()`

A list route has no instance to check, so the guard can only check the subject
type. `@CaslConditions()` hands the handler the **Access conditions** for the
guarded `(action, subjectType)`: what a record must satisfy for the ability to
allow the action on it. Filtering by them returns exactly the records
`ability.can(action, record)` allows, no more and no fewer.

```ts
@UseAbility(DefaultActions.read, 'Article')
@Get()
list(@CaslConditions() conditions: ConditionsProxy) {
  return this.articles.findMany(conditions.toMongo());
}
```

They join every rule, not only one: allowing rules are OR-ed, and each denying
rule with conditions is excluded with `$nor`. With `can('read', 'Article')` and
`cannot('read', 'Article', { secret: true })`, `toMongo()` is
`{ $nor: [{ secret: true }] }`.

| Ability             | `hasConditions` | `get()`               | `toMongo()`           | `toAst()`            |
| ------------------- | --------------- | --------------------- | --------------------- | -------------------- |
| allows every record | `false`         | `undefined`           | `{}`                  | an empty `and`       |
| allows some records | `true`          | them, in Mongo syntax | them, in Mongo syntax | them, as an AST      |
| allows no record    | `true`          | `ForbiddenException`  | `ForbiddenException`  | `ForbiddenException` |

A lone allowing rule with no denials comes back as its own conditions
(`{ authorId: 'u1' }`). They are written in Mongo syntax, built with CASL's
`rulesToCondition` from `@casl/ability/extra`.

For another database (SQL, Prisma, your own repository), `toAst()` returns the
same Access conditions as an abstract syntax tree, built with CASL's
`rulesToAST`: a `@ucast/core` `Condition`, typed as `AccessConditionsAst`, to
translate into your query. To build your own instead, read the ability
(`@CaslAbility()`) with `rulesToCondition` or `rulesToAST`.

```ts
// Your translator from the AST to your store's query.
declare function toSqlWhere(ast: AccessConditionsAst): string;

list(@CaslConditions() conditions: ConditionsProxy) {
  return this.articles.findMany(toSqlWhere(conditions.toAst()));
}
```

An ability that allows no record seldom gets this far: the guard has already
answered 403 against the subject type. The exception keeps a handler that reads
the conditions outside the guard from getting no restriction at all.

## The Rules endpoint, ready-made

The browser builds its Client ability from the rules of the current user's
Ability, fetched from a Rules endpoint
([`@jperezmart/casl-react`](https://github.com/jperezmart/casl-adapters/tree/main/packages/casl-react)
fetches `/api/me/abilities` by default). Import `CaslModule.forRulesEndpoint`
to serve one at the path of your choice, instead of writing the controller.
Every answer, the 401 included, carries `Cache-Control: private, no-store`:
the rules are the user's own, so no CDN or proxy may store them and serve them
to someone else.

```ts
@Module({
  imports: [CaslModule.forRulesEndpoint({ path: 'me/abilities' })],
})
export class MeModule {}
```

`GET /me/abilities` then answers `{ rules }`, the packed rules (`packRules`) of
the Ability of the user `getUserFromRequest` finds, as the guard finds them
(`request.user` by default). An Unauthenticated request gets 401. The shape is
the same in every Adapter: `RulesResponse` from `@jperezmart/casl-core`.

The Client ability only decides what the UI shows. What the server allows is
decided by the guard alone (ADR 0006).

## `assertCan`: the guard's answer, anywhere

`assertCan(ability, action, subject, options?)` returns when the ability allows
`action` on `subject`, and otherwise throws the exception the guard would throw
for the same decision. It is a plain function — no guard, no dependency
injection — so services, background jobs and grouped oRPC handlers get the
same answer as `@UseAbility`, which calls it too. The first row that matches
decides:

| Denied check                                           | Throws               |
| ------------------------------------------------------ | -------------------- |
| against a subject type (`'Article'`, a class)          | `ForbiddenException` |
| against an instance whose type it is denied on as well | `ForbiddenException` |
| against an instance the user **cannot** read too       | `NotFoundException`  |
| against an instance the user **can** read              | `ForbiddenException` |

The 404 carries Nest's default message, so it is indistinguishable from a
genuine not-found ([why](#denials-404-or-403)).

```ts
import { assertCan } from '@jperezmart/nest-casl';

const article = await this.articles.findById(id);
if (!article) throw new NotFoundException();
assertCan(ability, 'update', article); // 403, or 404 if they can't read it either
```

"Can read" means the `'read'` action. The `readAction` set in `forRoot` reaches
only the guard; outside it, pass the same one:

```ts
assertCan(ability, 'update', article, { readAction: 'view' });
```

`assertCan` is generic over the ability, so with a typed `AppAbility` a wrong
`action`, `subject` or `readAction` is a compile error.

## Typing your abilities

By default the module operates on `AppAbility` (CASL's `AnyMongoAbility`), which
is enough to be safe. To get full IDE hints and compile-time checks on actions,
subjects and conditions, define your own ability type and pass it as the
`TAbility` generic. For REST/JSON apps the cleanest approach is a `kind`-tagged
[discriminated union](https://casl.js.org/v7/en/advanced/typescript) of plain
objects — no classes needed:

```ts
import type { InferSubjects, MongoAbility } from '@casl/ability';

interface Article {
  readonly kind: 'Article';
  id: string;
  authorId: string;
  published: boolean;
}

type Action = 'manage' | 'create' | 'read' | 'update' | 'delete';
type Subjects = InferSubjects<Article> | 'all'; // → Article | 'Article' | 'all'
export type AppAbility = MongoAbility<[Action, Subjects]>;
```

Then tell the module how to read that discriminator, so the guard, the factory
and the (frontend) ability all resolve subject types the same way:

```ts
// resolve the subject type from `kind`; only called for object subjects
const detectSubjectType = (subject: object) => (subject as Article).kind;

CaslModule.forRoot<Role>({ superuserRole: 'admin', detectSubjectType });
```

`detectSubjectType` is forwarded to the built ability, so `ability.can('update', article)`
works with a raw `{ kind: 'Article', ... }` object — no `subject()` wrapper. On
the frontend pass the **same** function to `createMongoAbility(rules, { detectSubjectType })`.

`AbilityFactory` is generic over your ability — **type the injection once** and
every `createForUser` is typed (no per-call generic, no `AnyMongoAbility`):

```ts
constructor(private readonly abilityFactory: AbilityFactory<AppAbility>) {}
// ...
const ability = this.abilityFactory.createForUser(user); // typed AppAbility
ability.can('update', article); // `action` and `subject` are checked
```

The `@UseAbility` decorator accepts any string by default. Bind it to your
ability with `createUseAbility` (the analogue of `@casl/react`'s
`createContextualCan`) for type-checked `action` / `subject`, and a subject hook
that loads that subject:

```ts
// casl.ts
export const UseAbility = createUseAbility<AppAbility>();

// @UseAbility('update', 'Article', ArticleHook)  ✓
// @UseAbility('frobnicate', 'Ghost')             ✗ compile error
// @UseAbility('update', 'Article', CommentHook)  ✗ compile error
```

The hook is checked when the ability types the subject's instances: a class, or
a subject tagged with its name (`kind`, `__typename` or `subject()`). For a
string subject with no tagged instance, or for `all`, any hook goes.

- Include `'manage'` / `'all'` in the unions if you use a `superuserRole` —
  otherwise `RawRuleOf<AppAbility>` can't represent the `manage`/`all` rule the
  guard generates for superusers.
- `InferSubjects` derives the string tag (`'Article'`) from the `kind`/`__typename`
  field (or a class with a static custom name) — for a **plain class** it can't,
  so list `Article | 'Article'` explicitly there.

> **Prefer `kind` over class names.** Without a custom `detectSubjectType`, CASL
> falls back to `subject.constructor.modelName || subject.constructor.name`. That
> breaks for plain POJOs (constructor is `Object`) and for **minified** class
> code (the name is mangled). The `kind` discriminator above sidesteps both; if
> you do use classes, add a `static modelName = 'Article'` or wrap objects with
> CASL's `subject('Article', obj)` helper.

## Testing your permissions

Permission maps are plain functions, so they can be tested without booting Nest.
[`@jperezmart/casl-testing`](https://github.com/jperezmart/casl-adapters/tree/main/packages/casl-testing)
builds the ability this package would build, from the same map:

```ts
import { buildAbilityForTest } from '@jperezmart/casl-testing';
import { subject } from '@casl/ability';

const ability = buildAbilityForTest(permissions, {
  id: '1',
  roles: ['author'],
});

expect(ability.can('update', subject('Article', { authorId: '1' }))).toBe(true);
```

It builds through `@jperezmart/casl-core`, as this package does, and takes the
same `superuserRole` and `detectSubjectType`, so the ability under test is the
one the running application would have. `@jperezmart/nest-casl-testing` still
works, as a deprecated re-export of it.

## Beyond REST: oRPC

[oRPC](https://orpc.dev) (`@orpc/nest`) implements a contract two ways, and
nest-casl works with **both using only its core API** — no oRPC-specific package:

- **Per-procedure** — `@Implement(contract.articles.get)` on its own method.
  Each procedure is a normal Nest handler, so `@UseAbility` + `@CaslAbility` /
  `@CaslUser` work as-is. Use `@UseAbility` as the coarse role/action gate (it also
  injects the ability), and do the per-record check **inside the handler against
  the validated `input`** — don't use a subject hook here, since the guard runs
  before oRPC has parsed the request (it would read raw `req.params`):

  ```ts
  @Implement(contract.articles.get)
  @UseAbility('read', 'Article') // coarse gate + injects the ability
  get(@CaslAbility() ability: AppAbility) {
    return implement(contract.articles.get).handler(({ input }) => {
      const article = this.articles.findById(input.id); // validated input
      if (!article) throw new ORPCError('NOT_FOUND'); // a real 404
      assertCan(ability, 'read', article); // 403, or 404 if unreadable
      return article;
    });
  }
  ```

- **Grouped** — `@Implement(contract.articles)` returns a map of handlers under
  one Nest handler, so `@UseAbility` can't target individual procedures. Read the
  user from the request (`@Req()`) and build the ability inline with the (generic)
  `AbilityFactory`. Under `AccessGuard` (a global `APP_GUARD`, say), mark that
  handler `@AllowWithoutAbility()`, since it checks inside:

  ```ts
  @Implement(contract.me)
  me(@Req() req: Request) {
    const user = parseUser(req);
    return {
      get: implement(contract.me.get).handler(() => {
        if (!user) throw new ORPCError('UNAUTHORIZED');
        return user;
      }),
    };
  }
  ```

  Each procedure then authorizes with [`assertCan`](#assertcan-the-guards-answer-anywhere),
  which throws a Nest `NotFoundException` or `ForbiddenException`:

  ```ts
  constructor(
    private readonly abilityFactory: AbilityFactory<AppAbility>,
    private readonly articles: ArticlesService,
  ) {}

  @Implement(contract.articles)
  articles(@Req() req: Request) {
    const user = parseUser(req);
    return {
      update: implement(contract.articles.update).handler(({ input }) => {
        if (!user) throw new ORPCError('UNAUTHORIZED');
        const ability = this.abilityFactory.createForUser(user);
        const article = this.articles.findById(input.id);
        if (!article) throw new ORPCError('NOT_FOUND');
        assertCan(ability, 'update', article); // 403, or 404 if unreadable
        return this.articles.update(article, input);
      }),
      // ...
    };
  }
  ```

  In both forms, oRPC answers any error that is not an `ORPCError` with a 500,
  so translate the exceptions `assertCan` throws once, in an interceptor:

  ```ts
  ORPCModule.forRoot({
    interceptors: [
      async ({ next }) => {
        try {
          return await next();
        } catch (error) {
          if (error instanceof NotFoundException)
            throw new ORPCError('NOT_FOUND');
          if (error instanceof ForbiddenException)
            throw new ORPCError('FORBIDDEN');
          throw error;
        }
      },
    ],
  });
  ```

Either way, authorize against the **server-loaded** record, never client input.

> Status: implemented and exercised end-to-end by [`backend-simple`](../../apps/backend-simple) / [`backend-shared`](../../apps/backend-shared) + [`frontend`](../../apps/frontend) (REST) and [`backend-orpc`](../../apps/backend-orpc) + [`frontend-orpc`](../../apps/frontend-orpc) (oRPC).
