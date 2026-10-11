# nest-casl

Authorization for NestJS on top of CASL: each feature declares what every Role may do, and the library turns the authenticated user into a CASL ability per request.

## Language

**Authorizable user**:
Whatever the app's auth layer puts on the request, as long as it carries the names of its Roles. Nothing else is required of it (no identifier), and it may hold Roles no Role permissions map declares.
_Avoid_: principal, identity

**Role**:
A name the Role permissions are keyed by. The user's Roles are plain strings; only the Roles an app declares in its Role permissions are typed. Roles do not inherit from one another: a Role that should include another's rules calls that Role's function itself.
_Avoid_: group, profile

**Role permissions**:
A map from Role to what that Role may do: `true` (everything), `false` (nothing) or a function that declares CASL rules for the user. Each feature contributes its own map, and the maps are merged.
_Avoid_: permissions (on its own), policy (in this repo), rules map

**Everyone permissions**:
The entry of a Role permissions map that applies to every authenticated user, whatever Roles they hold — including none. Because it lives under the key `everyone`, no Role can be named that.
_Avoid_: default role, base permissions, `every`

**Superuser role**:
The one Role that grants everything, skipping the Role permissions entirely.
_Avoid_: admin role

**Ability**:
The CASL object built for one user from the Everyone permissions and every Role permissions entry of the Roles they hold. It is what guards and handlers ask "can this user do X?".
_Avoid_: permissions (for the built object)

**Denial rule**:
How a denied check answers: 404 when the user cannot read the instance either (or a subject hook loaded nothing), 403 otherwise, and always 403 against a subject type. The guard and `assertCan` share its one implementation (ADR 0004).
_Avoid_: policy, 404/403 policy

**Access conditions**:
What a record must satisfy for the Ability to allow one action on it, given only the subject type. They join every rule that allows the action and exclude every rule that denies it, so filtering by them returns exactly the records the user may act on.
_Avoid_: relevant rule conditions, filter, query
