# Deny with 404 only what the user cannot read

When a check against a loaded instance is denied, the response is 404 if the user cannot read that instance either, and 403 otherwise; a subject hook that loads nothing is also a 404, and a check against a subject type (no instance) is always 403. Hiding existence only from those who cannot see the record avoids the older `nest-casl` behaviour — 404 whenever a relevant rule has conditions — where an author who just read an article with GET gets a 404 trying to PATCH it. A user whose rules allow the action on no instance of the type gets 403 whatever the instance, readable or missing, and the guard checks that before running a subject hook: the 403 is the same for every id, so it reveals nothing, and nothing is loaded for a request that cannot succeed. That makes the subject type in `@UseAbility` binding: it must be the type of what the hook loads. The read action is `'read'` unless `forRoot` names another, and the guard and `assertCan` share the one implementation of this rule, so they cannot drift apart.

## Considered Options

- **404 whenever the denial is conditional** (upstream). Rejected: it hides records the user can plainly see.
- **Always 403.** Rejected: it confirms to anyone probing IDs that a record exists.
