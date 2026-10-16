---
'@jperezmart/casl-react': patch
---

A Rules endpoint body that is not `{ rules }` with packed rules (`{ rules: "x" }`, a missing `rules`, a rule that is not packed, `null`) no longer crashes the render. `AbilityProvider` settles it as a `MalformedRulesError` in `useAbilityState().error`, and the Client ability allows nothing, as after any other failure; `createAbility` allows nothing for such a payload, so `useQueryAbility` and an SSR `state` cannot crash either.
