# Coding standards

Judgement calls for review. What tooling enforces (format, import order, duplicate imports, types) is not repeated here.

## Breaking changes

- A commit that breaks a public type or behaviour is `feat!:` / `fix!:`, not `feat:`.
- Its changeset opens with the breaking note and the migration, before anything else.

## Language

- `GLOSSARY.md` binds code, tests, READMEs, changesets and commit titles alike.
- An _Avoid_ entry bans the word for the term it sits under, not everywhere: read which term owns it before flagging.

## The denial rule

The 404/403 answer (ADR 0004) is spread across the library and its examples. A change to it updates every site, and the review checks each: `packages/core/src/assert-can.ts`, `packages/core/src/guards/access.guard.ts`, `packages/core/README.md`, `packages/orpc-contract/src/errors.ts`, and the controllers in `apps/backend-*`.

## Snippets

Code in READMEs and changesets is never compiled, so the review compiles it in its head:

- every call matches the current exports of `packages/core/src/index.ts`;
- every name is imported or declared in an earlier snippet of the same file;
- types line up (no `T | undefined` passed where `T` is required).

## Planned transitions

A departure from an ADR that an open ticket of the same spec already schedules is a note, not a violation. Check the ticket's parent and its open sub-issues before flagging it.
