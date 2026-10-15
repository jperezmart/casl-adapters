# A core that decides, an Adapter per framework that answers

The Role permissions, the Ability, the Denial rule and the Access conditions live in one framework-free core, and each framework gets its own Adapter package (`@jperezmart/nest-casl`, keeping its name, plus one for Next.js, one for TanStack Start and one for oRPC, which runs inside any of them). The core never throws a framework's error: a denied check returns which answer it is — unauthenticated, forbidden or not found — and the Adapter turns that into its framework's response. So the Denial rule has one implementation for every framework, and a breaking change in one framework's Adapter does not bump the others.

## Considered Options

- **One package with a subpath per framework** (`/nest`, `/next`, `/tanstack-start`) and optional peer dependencies. Rejected: every framework shares one version, so a breaking change for Next.js is a major release for NestJS users too.
- **No core: each Adapter carries its own copy of the logic.** Rejected: the Denial rule would drift between frameworks, which is what ADR 0004 exists to prevent.

## Consequences

The first release covers the Next.js Pages Router and TanStack Start (its server functions, in SPA mode or not). The App Router and React Server Components are left for a later major.
