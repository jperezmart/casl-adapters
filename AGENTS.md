# nest-casl

`packages/core` is the library and `packages/testing` its test helpers; `apps/*` are examples that consume the built packages.

- **Checks**: `pnpm turbo run typecheck lint test` (turbo builds what the apps import first), then `pnpm format:check`.
- **Tickets**: read with `gh issue view <n> --json title,state,body,comments`; a closed ticket is done, so stop and ask.
- **Git**: PRs land with "Rebase and merge", so sync with main by `git rebase origin/main`, never a merge (nor `sync_with_base_branch`, which merges). The user pushes.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on jperezmart/nest-casl, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical labels, unrenamed. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
