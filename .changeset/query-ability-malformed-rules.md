---
'@jperezmart/casl-react': patch
---

`useQueryAbility` settles a query result that is not `{ rules }` with packed rules as a `MalformedRulesError` in `error`, as `AbilityProvider` does with `fetchRules`, so an app can tell malformed rules from a Client ability that allows nothing. Its Client ability still allows nothing for such a result.
