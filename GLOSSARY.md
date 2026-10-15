# nest-casl

Authorization on top of CASL for server frameworks (NestJS, Next.js, TanStack Start): each feature declares what every Role may do, and the library turns the authenticated user into a CASL ability per request, answering denials the same way in every framework.

## Language

**Authorizable user**:
Whatever the app's auth layer says the request's user is, as long as it carries the names of its Roles. Nothing else is required of it (no identifier), and it may hold Roles no Role permissions map declares.
_Avoid_: principal, identity

**Unauthenticated request**:
A request for which the app's auth layer finds no Authorizable user. It gets no Ability at all, unlike an Authorizable user who holds no Roles, who still gets the Everyone permissions.
_Avoid_: anonymous user, guest

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
The CASL object built for one user from the Everyone permissions and every Role permissions entry of the Roles they hold. It is what the server asks "can this user do X?".
_Avoid_: permissions (for the built object)

**Denial rule**:
How a denied check answers: always 403 when the action is denied on the subject type, before any instance is loaded; otherwise 404 when the user cannot read the instance either (or there is no instance to load), and 403 when they can. It is the same in every framework, for reads and writes alike (ADR 0004, ADR 0005).
_Avoid_: policy, 404/403 policy

**Access conditions**:
What a record must satisfy for the Ability to allow one action on it, given only the subject type. They join every rule that allows the action and exclude every rule that denies it, so filtering by them returns exactly the records the user may act on.
_Avoid_: relevant rule conditions, filter, query

**Adapter**:
What connects the library to one framework or RPC layer (such as oRPC, which runs inside any of the frameworks): it finds the Authorizable user of a request, builds their Ability and turns the Denial rule's answer into that framework's own response. The Role permissions and the Denial rule never depend on which Adapter runs them.
_Avoid_: integration, plugin, binding

**Client ability**:
The Ability rebuilt in the browser from the rules the server built for the user. It only decides what the UI shows; what the server allows is decided by the server's Ability alone.
_Avoid_: frontend permissions, UI permissions

**Rules endpoint**:
The endpoint an app's server exposes for the browser to fetch the rules of the current user's Ability, from which the browser builds its Client ability. Every Adapter serves it with the same shape — over plain HTTP or as an RPC procedure — so the browser side does not care which framework is behind it.
_Avoid_: me endpoint, abilities endpoint
