# Coding standards

Judgement calls for review. What tooling enforces (format, import order, duplicate imports, types) is not repeated here.

## Breaking changes

- A commit that breaks a public type or behaviour is `feat!:` / `fix!:`, not `feat:`.
- Its changeset opens with the breaking note and the migration, before anything else.

## Language

- `GLOSSARY.md` binds code, tests, READMEs, changesets and commit titles alike.
- An _Avoid_ entry bans the word for the term it sits under, not everywhere: read which term owns it before flagging.

## The denial rule

The 404/403 answer (ADR 0004) is decided once, in `packages/casl-core/src/decide.ts`, and answered across the Adapters and the examples. A change to it updates every site, and the review checks each: `packages/casl-core/src/decide.ts`, `packages/casl-core/src/adapter-kit.ts` (no hook for not found), `packages/casl-core/README.md`, `packages/core/src/assert-can.ts`, `packages/core/src/guards/access.guard.ts`, `packages/core/README.md`, `packages/orpc-casl/src/orpc-casl.ts`, `packages/orpc-casl/README.md`, `packages/next-casl/src/next-casl.ts`, `packages/next-casl/README.md`, `packages/tanstack-start-casl/src/tanstack-start-casl.ts`, `packages/tanstack-start-casl/README.md`, `packages/hono-casl/src/hono-casl.ts`, `packages/hono-casl/README.md`, `packages/orpc-contract/src/errors.ts`, the controllers in `apps/backend-*` (the routes and procedures in the Hono ones), the API routes and pages in `apps/next-pages*`, and the server functions and routes in `apps/tanstack-start*`.

## Snippets

Code in READMEs and changesets is never compiled, so the review compiles it in its head:

- every call matches the current exports of the package's `src/index.ts` (`packages/core`, `packages/casl-core`, …);
- every name is imported or declared in an earlier snippet of the same file;
- types line up (no `T | undefined` passed where `T` is required).

## Planned transitions

A departure from an ADR that an open ticket of the same spec already schedules is a note, not a violation. Check the ticket's parent and its open sub-issues before flagging it.
